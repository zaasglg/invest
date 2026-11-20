<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

class ProjectAttractionHandoverService
{
    public function __construct(private readonly InvestmentProjectAccessService $access) {}

    public function candidates(User $actor, ?InvestmentProject $project = null): Collection
    {
        $actor->loadMissing('roleModel');

        if ($actor->isTurkistanInvestAttraction()) {
            return $this->attractionUsers($actor, $project)
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'full_name' => $user->full_name,
                ])
                ->values();
        }

        // Keep the legacy named-receiver workflow for generic Invest and
        // administrator projects.
        return User::query()->whereHas('roleModel', fn ($query) => $query
            ->whereIn('name', ['superadmin', 'invest', 'moderator']))
            ->with('roleModel:id,name')->orderBy('full_name')->get()
            ->filter(fn (User $user) => $user->id !== $actor->id
                || (int) $project?->attraction_handover_to_id === (int) $user->id)
            ->filter(fn (User $user) => $project
                ? $this->access->canView($user, $project)
                : $user->roleModel?->name === 'superadmin'
                    || $user->id === $actor->id
                    || ($actor->roleModel?->name === 'superadmin'))
            ->map(fn (User $user) => [
                'id' => $user->id,
                'full_name' => $user->full_name,
            ])
            ->values();
    }

    public function prepare(array $validated, User $actor, ?InvestmentProject $project = null): array
    {
        $actor->loadMissing('roleModel');
        $isAccompaniment = $actor->isTurkistanInvestAccompaniment();
        $isAttraction = $actor->isTurkistanInvestAttraction();
        $isReserveEdit = $isAccompaniment
            && $project
            && $this->canReviewReserve($actor, $project);

        if ($isAttraction && $validated['status'] !== 'plan') {
            throw ValidationException::withMessages([
                'status' => 'Инвестор тарту бағыты жобаны сүйемелдеуге беру арқылы ғана іске асыру мәртебесіне өткізе алады.',
            ]);
        }

        if ($isAccompaniment && $validated['status'] === 'plan'
            && ! $isReserveEdit) {
            throw ValidationException::withMessages([
                'status' => 'Жоспарланған жобалар инвестор тарту бағытына жатады. Сүйемелдеу бағыты іске асырылып жатқан, іске қосылған немесе тоқтатылған жобалармен жұмыс істейді.',
            ]);
        }

        if ($isReserveEdit) {
            if ($validated['status'] !== 'plan') {
                throw ValidationException::withMessages([
                    'status' => 'Резервтегі жобаның мәртебесі қабылдау әрекеті арқылы ғана өзгереді.',
                ]);
            }

            $validated['status'] = 'plan';
            $validated['attraction_stage'] = 'handover';
            foreach ([
                'attraction_handover_to_id',
                'attraction_handover_requested_at',
                'attraction_handover_requested_by',
                'attraction_handover_accepted_at',
                'attraction_handover_accepted_by',
                'attraction_handover_rejection_reason',
                'attraction_handover_rejected_at',
                'attraction_handover_rejected_by',
            ] as $field) {
                $validated[$field] = $project->getAttribute($field);
            }

            return $validated;
        }

        if ($validated['status'] !== 'plan') {
            if (! $project
                && $actor->roleModel?->name !== 'superadmin'
                && ! $isAccompaniment) {
                throw ValidationException::withMessages([
                    'status' => 'Жаңа жобаны алдымен «Жоспарланған» мәртебесінде ашыңыз. Бұрыннан іске асырылып жатқан немесе тоқтатылған жобаны әкімші енгізе алады.',
                ]);
            }
            if ($project && $project->status !== $validated['status']) {
                $this->ensureWorkClosed($project, 'status');
            }

            return $validated;
        }

        $stage = $validated['attraction_stage'];
        if ($stage === 'declined' && $project && $project->attraction_stage !== 'declined') {
            $this->ensureWorkClosed($project, 'attraction_stage');
        }
        if ($stage !== 'handover' && $project?->attraction_handover_requested_at
            && ! $project->attraction_handover_accepted_at) {
            $validated['attraction_handover_to_id'] = null;
            $validated['attraction_handover_requested_at'] = null;
            $validated['attraction_handover_requested_by'] = null;
        }
        if ($stage === 'handover') {
            $receiverId = (int) ($validated['attraction_handover_to_id'] ?? 0);
            $candidateIds = $this->candidates($actor, $project)->pluck('id')->all();

            if ($receiverId === 0) {
                throw ValidationException::withMessages([
                    'attraction_handover_to_id' => $isAttraction
                        ? 'Қабылдайтын инвестор тарту маманын таңдаңыз.'
                        : 'Жобаға қолжетімділігі бар қабылдаушыны таңдаңыз.',
                ]);
            }
            if (! in_array($receiverId, $candidateIds, true)) {
                throw ValidationException::withMessages([
                    'attraction_handover_to_id' => $isAttraction
                        ? 'Инвестор тарту бағытының осы жоба өңіріне қолжетімді маманын таңдаңыз.'
                        : 'Жобаға қолжетімділігі бар қабылдаушыны таңдаңыз.',
                ]);
            }
            if (! $isAttraction && $receiverId === (int) $actor->id) {
                throw ValidationException::withMessages([
                    'attraction_handover_to_id' => 'Жобаны қабылдайтын басқа жауапты адамды таңдаңыз.',
                ]);
            }

            $newRequest = ! $project
                || $project->attraction_stage !== 'handover'
                || ! $project->attraction_handover_requested_at
                || $project->attraction_handover_rejected_at
                || (int) $project->attraction_handover_to_id !== $receiverId;

            if ($newRequest) {
                $validated['attraction_handover_to_id'] = $receiverId;
                $validated['attraction_handover_requested_at'] = now();
                $validated['attraction_handover_requested_by'] = $actor->id;
                $validated['attraction_handover_accepted_at'] = null;
                $validated['attraction_handover_accepted_by'] = null;
                $validated['attraction_handover_rejection_reason'] = null;
                $validated['attraction_handover_rejected_at'] = null;
                $validated['attraction_handover_rejected_by'] = null;
            }
        }

        return $validated;
    }

    public function pendingFor(User $user): Builder
    {
        $this->assertReserveRole($user);

        return InvestmentProject::query()
            ->active()
            ->where('status', 'plan')
            ->where('attraction_stage', 'handover')
            ->whereNull('attraction_handover_to_id')
            ->whereNotNull('attraction_handover_requested_at')
            ->whereNull('attraction_handover_accepted_at')
            ->whereNull('attraction_handover_rejected_at')
            ->where(function (Builder $origin): void {
                $origin
                    ->whereHas('curators', fn (Builder $curators) => $curators
                        ->where(
                            'users.invest_sub_role',
                            User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION
                        )
                        ->whereHas(
                            'roleModel',
                            fn (Builder $role) => $role->where('name', 'invest')
                        ))
                    ->orWhereHas('creator', fn (Builder $creator) => $creator
                        ->where(
                            'users.invest_sub_role',
                            User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION
                        )
                        ->whereHas(
                            'roleModel',
                            fn (Builder $role) => $role->where('name', 'invest')
                        ));
            })
            ->when(
                $user->isTurkistanInvestAccompaniment() && $user->region_id,
                fn (Builder $query) => $query->where(
                    'investment_projects.region_id',
                    $user->region_id
                )
            );
    }

    public function canReviewReserve(User $user, InvestmentProject $project): bool
    {
        $user->loadMissing('roleModel');

        if (! $this->hasReserveRole($user)) {
            return false;
        }

        return $this->pendingFor($user)->whereKey($project->id)->exists();
    }

    public function isPendingReserveProject(
        InvestmentProject $project
    ): bool {
        return $this->isPendingReserve($project);
    }

    public function decisionMode(
        User $user,
        InvestmentProject $project
    ): ?string {
        $namedReceiver = $this->namedAttractionReceiver($project);
        if ($namedReceiver?->is($user)
            && $this->canAcceptNamedAttraction($user, $project)) {
            return 'named-attraction';
        }

        if ($this->canReviewReserve($user, $project)) {
            return 'support-reserve';
        }

        return null;
    }

    public function canResubmitReturned(
        User $user,
        InvestmentProject $project
    ): bool {
        $user->loadMissing('roleModel');
        if (! $user->isTurkistanInvestAttraction()
            || $project->status !== 'plan'
            || $project->attraction_stage !== 'handover'
            || $project->attraction_handover_requested_at !== null
            || $project->attraction_handover_rejected_at === null
            || (int) $project->attraction_handover_to_id !== (int) $user->id) {
            return false;
        }

        $rejector = User::query()
            ->with('roleModel:id,name')
            ->find($project->attraction_handover_rejected_by);

        return ($rejector?->isTurkistanInvestAccompaniment() === true
                || $rejector?->isTurkistanInvestAttraction() === true)
            && $this->access->canView($user, $project);
    }

    public function authorizeReserveDecision(
        User $user,
        InvestmentProject $project
    ): void {
        $this->assertReserveRole($user);

        if (! $this->isDirectionReserveProject($project)) {
            abort(403, 'Бұл жоба сүйемелдеу резервіне жатпайды.');
        }
        if ($user->isTurkistanInvestAccompaniment()
            && $user->region_id
            && (int) $project->region_id !== (int) $user->region_id) {
            abort(403, 'Бұл жоба сіздің өңіріңізге жатпайды.');
        }
    }

    public function acceptReserve(User $user, InvestmentProject $project): InvestmentProject
    {
        return DB::transaction(function () use ($user, $project) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            $this->assertCanDecideReserve($user, $locked);
            $this->ensureWorkClosed($locked, 'reserve');
            $submitterId = (int) $locked->attraction_handover_requested_by;
            $requestedAt = $locked->attraction_handover_requested_at
                ?->toDateTimeString();
            $acceptedAt = now();

            $locked->update([
                'status' => 'implementation',
                'attraction_handover_accepted_at' => $acceptedAt,
                'attraction_handover_accepted_by' => $user->id,
                'attraction_handover_rejection_reason' => null,
                'attraction_handover_rejected_at' => null,
                'attraction_handover_rejected_by' => null,
            ]);
            $locked->curators()->syncWithoutDetaching([$user->id]);
            $this->resolvePendingDecisionNotifications(
                $locked,
                $requestedAt
            );

            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.reserve_accepted',
                category: 'project',
                action: 'Резервтегі жоба сүйемелдеуге қабылданды',
                subject: $locked,
                actor: $user,
                properties: [
                    'project_name' => $locked->name,
                    'accepted_by' => $user->full_name,
                    'accepted_at' => $acceptedAt->toISOString(),
                    'status' => 'implementation',
                ]
            );

            DB::afterCommit(function () use (
                $acceptedAt,
                $locked,
                $submitterId,
                $user
            ): void {
                if ($submitterId > 0 && $submitterId !== (int) $user->id) {
                    TaskNotification::firstOrCreate([
                        'dedupe_key' => "reserve-accepted:{$locked->id}:{$acceptedAt}:{$submitterId}",
                    ], [
                        'user_id' => $submitterId,
                        'project_id' => null,
                        'type' => 'attraction_handover_accepted',
                        'message' => "{$user->full_name} «{$locked->name}» жобасын сүйемелдеуге сәтті қабылдады.",
                        'action_url' => $this->receiptUrl(
                            $locked,
                            $submitterId
                        ),
                        'action_label' => 'Қабылдау нәтижесін ашу',
                    ]);
                }
            });

            return $locked->fresh();
        });
    }

    public function rejectReserve(
        User $user,
        InvestmentProject $project,
        string $reason
    ): InvestmentProject {
        return DB::transaction(function () use ($user, $project, $reason) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            $this->assertCanDecideReserve($user, $locked);
            $submitterId = (int) $locked->attraction_handover_requested_by;
            $requestedAt = $locked->attraction_handover_requested_at
                ?->toDateTimeString();
            $rejectedAt = now();
            $reason = trim($reason);

            $locked->update([
                'attraction_handover_to_id' => $submitterId ?: null,
                'attraction_handover_requested_at' => null,
                'attraction_handover_accepted_at' => null,
                'attraction_handover_accepted_by' => null,
                'attraction_handover_rejection_reason' => $reason,
                'attraction_handover_rejected_at' => $rejectedAt,
                'attraction_handover_rejected_by' => $user->id,
            ]);
            $this->resolvePendingDecisionNotifications(
                $locked,
                $requestedAt
            );

            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.reserve_rejected',
                category: 'project',
                action: 'Резервтегі жоба инвестор тарту бағытына қайтарылды',
                subject: $locked,
                actor: $user,
                properties: [
                    'project_name' => $locked->name,
                    'rejected_by' => $user->full_name,
                    'rejected_at' => $rejectedAt->toISOString(),
                    'reason' => $reason,
                ]
            );

            DB::afterCommit(function () use (
                $locked,
                $reason,
                $rejectedAt,
                $submitterId,
                $user
            ): void {
                if ($submitterId > 0 && $submitterId !== (int) $user->id) {
                    TaskNotification::firstOrCreate([
                        'dedupe_key' => "reserve-rejected:{$locked->id}:{$rejectedAt}:{$submitterId}",
                    ], [
                        'user_id' => $submitterId,
                        'project_id' => $locked->id,
                        'type' => 'attraction_handover_rejected',
                        'message' => "{$user->full_name} «{$locked->name}» жобасын инвестор тарту бағытына қайтарды. Себебі: {$reason}",
                        'action_url' => route(
                            'investment-projects.show',
                            $locked->id,
                            false
                        ),
                        'action_label' => 'Жобаны ашу',
                    ]);
                }
            });

            return $locked->fresh();
        });
    }

    public function reject(
        User $user,
        InvestmentProject $project,
        string $reason
    ): void {
        $namedReceiver = $this->namedAttractionReceiver($project);
        if ($namedReceiver) {
            abort_unless($namedReceiver->is($user), 403);
            $this->rejectNamedAttraction($user, $project, $reason);

            return;
        }

        if ($this->canReviewReserve($user, $project)) {
            $this->rejectReserve($user, $project, $reason);

            return;
        }

        abort(403);
    }

    public function resubmitReturned(
        User $user,
        InvestmentProject $project
    ): InvestmentProject {
        return DB::transaction(function () use ($user, $project) {
            $locked = InvestmentProject::query()
                ->lockForUpdate()
                ->findOrFail($project->id);
            abort_unless($this->canResubmitReturned($user, $locked), 403);
            $this->ensureWorkClosed($locked, 'attraction_stage');
            $submittedAt = now()->startOfSecond();
            if ($locked->attraction_handover_rejected_at
                && ! $submittedAt->gt(
                    $locked->attraction_handover_rejected_at
                )) {
                $submittedAt = $locked->attraction_handover_rejected_at
                    ->copy()
                    ->addSecond();
            }
            $previousRejector = User::query()
                ->with('roleModel:id,name')
                ->find($locked->attraction_handover_rejected_by);
            $namedReceiverId = $previousRejector
                ?->isTurkistanInvestAttraction()
                ? $previousRejector->id
                : null;

            $locked->update([
                'attraction_handover_to_id' => $namedReceiverId,
                'attraction_handover_requested_at' => $submittedAt,
                'attraction_handover_requested_by' => $user->id,
                'attraction_handover_accepted_at' => null,
                'attraction_handover_accepted_by' => null,
                'attraction_handover_rejection_reason' => null,
                'attraction_handover_rejected_at' => null,
                'attraction_handover_rejected_by' => null,
            ]);

            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.reserve_resubmitted',
                category: 'project',
                action: 'Кері қайтарылған жоба резервке қайта жіберілді',
                subject: $locked,
                actor: $user,
                properties: [
                    'project_name' => $locked->name,
                    'submitted_at' => $submittedAt->toISOString(),
                    'receiver_id' => $namedReceiverId,
                ]
            );

            return $locked->fresh();
        });
    }

    public function accept(User $user, InvestmentProject $project): void
    {
        $namedReceiver = $this->namedAttractionReceiver($project);
        if ($namedReceiver) {
            abort_unless($namedReceiver->is($user), 403);
            $this->acceptNamedAttraction($user, $project);

            return;
        }

        if ($this->isDirectionReserveProject($project)) {
            $this->acceptReserve($user, $project);

            return;
        }

        DB::transaction(function () use ($user, $project) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless($this->canAccept($user, $locked), 403);
            $requestedAt = $locked->attraction_handover_requested_at
                ?->toDateTimeString();
            $locked->update([
                'attraction_handover_accepted_at' => now(),
                'attraction_handover_accepted_by' => $user->id,
            ]);
            $locked->curators()->syncWithoutDetaching([$user->id]);
            $this->resolvePendingDecisionNotifications(
                $locked,
                $requestedAt
            );
            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.handover_accepted',
                category: 'project',
                action: 'Жоба сүйемелдеуге қабылданды',
                subject: $locked,
                actor: $user
            );
            $recipientIds = $locked->curators()->pluck('users.id')
                ->push($locked->created_by)->unique()->filter();
            User::query()->whereIn('id', $recipientIds)->get()
                ->filter(fn (User $recipient) => $recipient->id !== $user->id
                    && $this->access->canManage($recipient, $locked))
                ->each(fn (User $recipient) => TaskNotification::create([
                    'user_id' => $recipient->id,
                    'project_id' => $locked->id,
                    'type' => 'attraction_handover_accepted',
                    'message' => "{$user->full_name} жобаны сүйемелдеуге қабылдады: {$locked->name}",
                    'action_url' => route('investment-projects.show', $locked, false),
                    'action_label' => 'Жобаны ашу',
                ]));
        });
    }

    public function canAccept(User $user, InvestmentProject $project): bool
    {
        $namedReceiver = $this->namedAttractionReceiver($project);
        if ($namedReceiver) {
            return $namedReceiver->is($user)
                && $this->canAcceptNamedAttraction($user, $project);
        }

        if ($this->isDirectionReserveProject($project)) {
            return $this->canReviewReserve($user, $project);
        }

        $user->loadMissing('roleModel');

        return $project->status === 'plan'
            && $project->attraction_stage === 'handover'
            && $project->attraction_handover_requested_at !== null
            && ! $project->is_archived && ! $project->is_deleted
            && (int) $project->attraction_handover_to_id === (int) $user->id
            && ! $project->attraction_handover_accepted_at
            && in_array(
                $user->roleModel?->name,
                ['superadmin', 'invest', 'moderator'],
                true
            )
            && $this->access->canView($user, $project);
    }

    public function notifyRequested(InvestmentProject $project): void
    {
        $wasJustCreated = $project->wasRecentlyCreated
            && $project->getRawOriginal($project->getKeyName()) === null;

        if (! $project->wasChanged([
            'attraction_handover_requested_at',
            'attraction_handover_to_id',
        ]) && ! $wasJustCreated) {
            return;
        }
        $this->notifyPreviousNamedReceiver($project);
        if (! $project->attraction_handover_requested_at) {
            return;
        }

        $projectId = (int) $project->id;
        $requestedAt = $project->attraction_handover_requested_at
            ->toDateTimeString();

        DB::afterCommit(function () use ($projectId, $requestedAt): void {
            $saved = InvestmentProject::find($projectId);
            if (! $saved
                || $saved->attraction_handover_requested_at?->toDateTimeString()
                    !== $requestedAt) {
                return;
            }

            $namedReceiver = $this->namedAttractionReceiver($saved);
            $isReserveSubmission = ! $namedReceiver
                && $this->isDirectionReserveProject($saved);
            KpiLog::activity(
                projectId: $saved->id,
                event: $isReserveSubmission
                    ? 'attraction.reserve_submitted'
                    : 'attraction.handover_requested',
                category: 'project',
                action: $isReserveSubmission
                    ? 'Жоба сүйемелдеу резервіне түсті'
                    : 'Жобаны сүйемелдеуге қабылдау сұрауы жіберілді',
                subject: $saved,
                actor: User::find($saved->attraction_handover_requested_by),
                properties: [
                    'project_name' => $saved->name,
                    'requested_at' => $requestedAt,
                    'receiver_id' => $saved->attraction_handover_to_id,
                ]
            );

            if ($namedReceiver
                && $this->isPendingNamedAttractionApproval($saved)) {
                TaskNotification::firstOrCreate([
                    'dedupe_key' => "handover-request:{$saved->id}:{$requestedAt}:{$namedReceiver->id}",
                ], [
                    'user_id' => $namedReceiver->id,
                    'project_id' => $saved->id,
                    'type' => 'attraction_handover_requested',
                    'message' => "Жобаны сүйемелдеуге қабылдауыңыз сұралды: {$saved->name}",
                    'action_url' => route(
                        'investment-projects.show',
                        $saved,
                        false
                    ),
                    'action_label' => 'Жобаны қабылдау',
                ]);

                return;
            }

            if ($this->isDirectionReserveProject($saved)) {
                foreach ($this->accompanimentUsers($saved) as $recipient) {
                    if (! $this->canReviewReserve($recipient, $saved)) {
                        continue;
                    }

                    TaskNotification::firstOrCreate([
                        'dedupe_key' => "reserve-request:{$saved->id}:{$requestedAt}:{$recipient->id}",
                    ], [
                        'user_id' => $recipient->id,
                        'project_id' => null,
                        'type' => 'attraction_handover_requested',
                        'message' => "Сүйемелдеу резервіне жаңа жоба түсті. Қабылдау немесе кері қайтару туралы шешім қажет: {$saved->name}",
                        'action_url' => route(
                            'investment-projects.show',
                            $saved,
                            false
                        ),
                        'action_label' => 'Жобаны ашу',
                    ]);
                }

                return;
            }

            $receiverId = (int) $saved->attraction_handover_to_id;
            $recipient = User::find($receiverId);
            if (! $recipient || ! $this->canAccept($recipient, $saved)) {
                return;
            }
            TaskNotification::firstOrCreate([
                'dedupe_key' => "handover-request:{$saved->id}:{$requestedAt}:{$receiverId}",
            ], [
                'user_id' => $recipient->id,
                'project_id' => $saved->id,
                'type' => 'attraction_handover_requested',
                'message' => "Жобаны сүйемелдеуге қабылдауыңыз сұралды: {$saved->name}",
                'action_url' => route('investment-projects.show', $saved, false),
                'action_label' => 'Жобаны қабылдау',
            ]);
        });
    }

    private function acceptNamedAttraction(
        User $user,
        InvestmentProject $project
    ): void {
        DB::transaction(function () use ($user, $project): void {
            $locked = InvestmentProject::query()
                ->lockForUpdate()
                ->findOrFail($project->id);
            abort_unless(
                $this->canAcceptNamedAttraction($user, $locked),
                403
            );
            $this->ensureWorkClosed($locked, 'attraction_stage');

            $originalRequesterId = (int) $locked
                ->attraction_handover_requested_by;
            $requestedAt = $locked->attraction_handover_requested_at
                ?->toDateTimeString();
            $submittedAt = now();
            $locked->update([
                'attraction_handover_to_id' => null,
                'attraction_handover_requested_at' => $submittedAt,
                'attraction_handover_requested_by' => $user->id,
                'attraction_handover_accepted_at' => null,
                'attraction_handover_accepted_by' => null,
                'attraction_handover_rejection_reason' => null,
                'attraction_handover_rejected_at' => null,
                'attraction_handover_rejected_by' => null,
            ]);
            $this->resolvePendingDecisionNotifications(
                $locked,
                $requestedAt
            );

            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.handover_approved',
                category: 'project',
                action: 'Жоба сүйемелдеу резервіне жіберілді',
                subject: $locked,
                actor: $user,
                properties: [
                    'project_name' => $locked->name,
                    'approved_by' => $user->full_name,
                    'submitted_at' => $submittedAt->toISOString(),
                    'status' => 'plan',
                ]
            );

            DB::afterCommit(function () use (
                $locked,
                $originalRequesterId,
                $submittedAt,
                $user
            ): void {
                if ($originalRequesterId > 0
                    && $originalRequesterId !== (int) $user->id) {
                    TaskNotification::firstOrCreate([
                        'dedupe_key' => "handover-approved:{$locked->id}:{$submittedAt}:{$originalRequesterId}",
                    ], [
                        'user_id' => $originalRequesterId,
                        'project_id' => null,
                        'type' => 'attraction_handover_accepted',
                        'message' => "{$user->full_name} «{$locked->name}» жобасын сәтті қабылдап, сүйемелдеу резервіне жіберді.",
                        'action_url' => $this->receiptUrl(
                            $locked,
                            $originalRequesterId
                        ),
                        'action_label' => 'Қабылдау нәтижесін ашу',
                    ]);
                }
            });
        });
    }

    private function rejectNamedAttraction(
        User $user,
        InvestmentProject $project,
        string $reason
    ): void {
        DB::transaction(function () use ($user, $project, $reason): void {
            $locked = InvestmentProject::query()
                ->lockForUpdate()
                ->findOrFail($project->id);
            abort_unless(
                $this->canAcceptNamedAttraction($user, $locked),
                403
            );

            $reason = trim($reason);
            if (mb_strlen($reason) < 3) {
                throw ValidationException::withMessages([
                    'rejection_reason' => 'Кері қайтару себебін кемінде 3 таңбамен жазыңыз.',
                ]);
            }

            $requesterId = (int) $locked->attraction_handover_requested_by;
            $requestedAt = $locked->attraction_handover_requested_at
                ?->toDateTimeString();
            $rejectedAt = now();
            $locked->update([
                'attraction_handover_to_id' => $requesterId ?: null,
                'attraction_handover_requested_at' => null,
                'attraction_handover_accepted_at' => null,
                'attraction_handover_accepted_by' => null,
                'attraction_handover_rejection_reason' => $reason,
                'attraction_handover_rejected_at' => $rejectedAt,
                'attraction_handover_rejected_by' => $user->id,
            ]);
            $this->resolvePendingDecisionNotifications(
                $locked,
                $requestedAt
            );

            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.handover_rejected',
                category: 'project',
                action: 'Сүйемелдеуге беру сұрауы кері қайтарылды',
                subject: $locked,
                actor: $user,
                properties: [
                    'project_name' => $locked->name,
                    'rejected_by' => $user->full_name,
                    'rejected_at' => $rejectedAt->toISOString(),
                    'reason' => $reason,
                ]
            );

            DB::afterCommit(function () use (
                $locked,
                $reason,
                $rejectedAt,
                $requesterId,
                $user
            ): void {
                if ($requesterId > 0
                    && $requesterId !== (int) $user->id) {
                    TaskNotification::firstOrCreate([
                        'dedupe_key' => "handover-rejected:{$locked->id}:{$rejectedAt}:{$requesterId}",
                    ], [
                        'user_id' => $requesterId,
                        'project_id' => $locked->id,
                        'type' => 'attraction_handover_rejected',
                        'message' => "{$user->full_name} «{$locked->name}» жобасын кері қайтарды. Себебі: {$reason}",
                        'action_url' => route(
                            'investment-projects.show',
                            $locked,
                            false
                        ),
                        'action_label' => 'Жобаны ашу',
                    ]);
                }
            });
        });
    }

    private function canAcceptNamedAttraction(
        User $user,
        InvestmentProject $project
    ): bool {
        $user->loadMissing('roleModel');

        return $user->isTurkistanInvestAttraction()
            && (int) $project->attraction_handover_to_id === (int) $user->id
            && $this->isPendingNamedAttractionApproval($project)
            && $this->access->canView($user, $project);
    }

    private function isPendingNamedAttractionApproval(
        InvestmentProject $project
    ): bool {
        return $project->status === 'plan'
            && $project->attraction_stage === 'handover'
            && $project->attraction_handover_to_id !== null
            && $project->attraction_handover_requested_at !== null
            && $project->attraction_handover_accepted_at === null
            && $project->attraction_handover_rejected_at === null
            && ! $project->is_archived
            && ! $project->is_deleted;
    }

    private function namedAttractionReceiver(
        InvestmentProject $project
    ): ?User {
        if (! $project->attraction_handover_to_id
            || ! $this->isDirectionReserveProject($project)) {
            return null;
        }

        $receiver = User::query()
            ->with('roleModel:id,name')
            ->find($project->attraction_handover_to_id);

        return $receiver?->isTurkistanInvestAttraction() ? $receiver : null;
    }

    private function notifyPreviousNamedReceiver(
        InvestmentProject $project
    ): void {
        $newReceiverId = (int) $project->attraction_handover_to_id;
        $wasReassigned = $project->attraction_handover_requested_at
            && $newReceiverId > 0;
        $wasCancelled = ! $project->attraction_handover_requested_at
            && ! $project->attraction_handover_rejected_at;

        if (! $wasReassigned && ! $wasCancelled) {
            return;
        }

        $projectId = (int) $project->id;
        $projectName = $project->name;
        DB::afterCommit(function () use (
            $newReceiverId,
            $projectId,
            $projectName,
            $wasReassigned
        ): void {
            $pendingRequests = TaskNotification::query()
                ->where('project_id', $projectId)
                ->where('type', 'attraction_handover_requested')
                ->where('is_read', false)
                ->when(
                    $wasReassigned,
                    fn (Builder $query) => $query->where(
                        'user_id',
                        '!=',
                        $newReceiverId
                    )
                )
                ->get();

            if ($pendingRequests->isEmpty()) {
                return;
            }

            foreach ($pendingRequests as $pendingRequest) {
                if (in_array(
                    $pendingRequest->telegram_status,
                    ['pending', 'retry'],
                    true
                )) {
                    $pendingRequest->forceFill([
                        'telegram_status' => 'skipped',
                        'telegram_next_attempt_at' => null,
                    ]);
                }
                $pendingRequest->is_read = true;
                $pendingRequest->saveQuietly();

                TaskNotification::firstOrCreate([
                    'dedupe_key' => "handover-cancelled:{$projectId}:{$pendingRequest->id}:{$pendingRequest->user_id}",
                ], [
                    'user_id' => $pendingRequest->user_id,
                    'project_id' => null,
                    'type' => 'attraction_handover_cancelled',
                    'message' => $wasReassigned
                        ? "«{$projectName}» жобасын қабылдау сұрауы басқа маманға берілді."
                        : "«{$projectName}» жобасын қабылдау сұрауы тоқтатылды.",
                    'action_url' => route(
                        'attraction-handovers.index',
                        absolute: false
                    ),
                    'action_label' => 'Сүйемелдеуді ашу',
                ]);
            }
        });
    }

    private function resolvePendingDecisionNotifications(
        InvestmentProject $project,
        ?string $requestedAt
    ): void {
        $notifications = TaskNotification::query()
            ->where('type', 'attraction_handover_requested')
            ->where(function (Builder $query) use ($project, $requestedAt) {
                $query->where('project_id', $project->id);
                if ($requestedAt) {
                    $query->orWhere(
                        'dedupe_key',
                        'like',
                        "reserve-request:{$project->id}:{$requestedAt}:%"
                    );
                }
            });

        (clone $notifications)
            ->whereIn('telegram_status', ['pending', 'retry'])
            ->update([
                'telegram_status' => 'skipped',
                'telegram_next_attempt_at' => null,
            ]);
        $notifications->where('is_read', false)->update(['is_read' => true]);
    }

    private function receiptUrl(
        InvestmentProject $project,
        int $recipientId
    ): string {
        return URL::signedRoute(
            'attraction-handovers.index',
            [
                'project' => $project->id,
                'recipient' => $recipientId,
            ],
            null,
            false
        );
    }

    private function attractionUsers(
        User $actor,
        ?InvestmentProject $project = null
    ): Collection {
        $regionId = $project?->region_id ?? $actor->region_id;

        return User::query()
            ->where(
                'invest_sub_role',
                User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION
            )
            ->whereHas(
                'roleModel',
                fn (Builder $role) => $role->where('name', 'invest')
            )
            ->when(
                $regionId,
                fn (Builder $users) => $users->where(
                    fn (Builder $scope) => $scope
                        ->whereNull('region_id')
                        ->orWhere('region_id', $regionId)
                )
            )
            ->with('roleModel:id,name')
            ->orderBy('full_name')
            ->get();
    }

    private function accompanimentUsers(?InvestmentProject $project = null): Collection
    {
        return User::query()
            ->where(
                'invest_sub_role',
                User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT
            )
            ->whereHas(
                'roleModel',
                fn (Builder $role) => $role->where('name', 'invest')
            )
            ->when(
                $project?->region_id,
                fn (Builder $users, $regionId) => $users->where(
                    fn (Builder $scope) => $scope
                        ->whereNull('region_id')
                        ->orWhere('region_id', $regionId)
                )
            )
            ->with('roleModel:id,name')
            ->orderBy('full_name')
            ->get();
    }

    private function assertCanDecideReserve(
        User $user,
        InvestmentProject $project
    ): void {
        $this->authorizeReserveDecision($user, $project);

        if (! $this->isPendingReserve($project)) {
            abort(409, 'Бұл резервтік жоба бойынша шешім бұрын қабылданған.');
        }
    }

    private function assertReserveRole(User $user): void
    {
        $user->loadMissing('roleModel');
        abort_unless(
            $this->hasReserveRole($user),
            403,
            'Резервтер бөлімі тек сүйемелдеу бағытына қолжетімді.'
        );
    }

    private function hasReserveRole(User $user): bool
    {
        return $user->isTurkistanInvestAccompaniment()
            || $user->roleModel?->name === 'superadmin';
    }

    private function isPendingReserve(InvestmentProject $project): bool
    {
        return $project->status === 'plan'
            && $project->attraction_stage === 'handover'
            && $project->attraction_handover_to_id === null
            && $project->attraction_handover_requested_at !== null
            && $project->attraction_handover_accepted_at === null
            && $project->attraction_handover_rejected_at === null
            && ! $project->is_archived
            && ! $project->is_deleted;
    }

    private function isDirectionReserveProject(InvestmentProject $project): bool
    {
        return $project->curators()
            ->where(
                'users.invest_sub_role',
                User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION
            )
            ->whereHas(
                'roleModel',
                fn (Builder $role) => $role->where('name', 'invest')
            )
            ->exists()
            || $project->creator()
                ->where(
                    'users.invest_sub_role',
                    User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION
                )
                ->whereHas(
                    'roleModel',
                    fn (Builder $role) => $role->where('name', 'invest')
                )
                ->exists();
    }

    private function ensureWorkClosed(InvestmentProject $project, string $field): void
    {
        $counts = $project->attractionActivities()
            ->whereIn('status', ['planned', 'in_progress', 'pending_review'])
            ->reorder()->selectRaw('status, count(*) as total')
            ->groupBy('status')->pluck('total', 'status');
        $open = (int) $counts->get('planned', 0)
            + (int) $counts->get('in_progress', 0);
        $review = (int) $counts->get('pending_review', 0);
        if ($open + $review > 0) {
            throw ValidationException::withMessages([
                $field => "Аяқталмаған іс-шара: {$open}. Тексеруді күткен есеп: {$review}. Алдымен нәтижелерін тексеріп, қалған жұмыстарды аяқтаңыз немесе тоқтатыңыз.",
            ]);
        }
    }
}
