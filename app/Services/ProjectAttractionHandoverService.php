<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectAttractionHandoverService
{
    public function __construct(private readonly InvestmentProjectAccessService $access) {}

    public function candidates(User $actor, ?InvestmentProject $project = null): Collection
    {
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
            ->map(fn (User $user) => ['id' => $user->id, 'full_name' => $user->full_name])
            ->values();
    }

    public function prepare(array $validated, User $actor, ?InvestmentProject $project = null): array
    {
        if ($validated['status'] !== 'plan') {
            if (! $project && $actor->roleModel?->name !== 'superadmin') {
                throw ValidationException::withMessages([
                    'status' => 'Жаңа жобаны алдымен «Жоспарланған» мәртебесінде ашыңыз. Бұрыннан іске асырылып жатқан немесе тоқтатылған жобаны әкімші енгізе алады.',
                ]);
            }
            if ($project && $project->status !== $validated['status']) {
                $this->ensureWorkClosed($project, 'status');
            }
            if (in_array($validated['status'], ['implementation', 'launched'], true)
                && (! $project || $project->status !== $validated['status'])
                && $project && ($project->planning_started_at || $project->status === 'plan')
                && ! $project?->attraction_handover_accepted_at) {
                throw ValidationException::withMessages([
                    'status' => 'Алдымен жоспарланған жобаны сүйемелдеуге беріп, қабылдаушының растауын алыңыз. Бұрыннан іске асырылып жатқан жобаны әкімші енгізе алады.',
                ]);
            }
            if (in_array($validated['status'], ['implementation', 'launched'], true)
                && $project?->attraction_handover_requested_at
                && $project->attraction_handover_to_id
                && ! $project->attraction_handover_accepted_at) {
                throw ValidationException::withMessages([
                    'status' => 'Алдымен тағайындалған қабылдаушы жобаны сүйемелдеуге қабылдауы керек.',
                ]);
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
        }
        if ($stage === 'handover') {
            $receiverId = (int) ($validated['attraction_handover_to_id'] ?? 0);
            $candidateIds = $this->candidates($actor, $project)->pluck('id')->all();
            $newRequest = ! $project || $project->attraction_stage !== 'handover'
                || (int) $project->attraction_handover_to_id !== $receiverId;
            if (! in_array($receiverId, $candidateIds, true) || ($newRequest && $receiverId === (int) $actor->id)) {
                throw ValidationException::withMessages([
                    'attraction_handover_to_id' => 'Жобаға қолжетімділігі бар басқа қабылдаушыны таңдаңыз.',
                ]);
            }

            if ($newRequest) {
                $validated['attraction_handover_requested_at'] = now();
                $validated['attraction_handover_accepted_at'] = null;
                $validated['attraction_handover_accepted_by'] = null;
            }
        }

        return $validated;
    }

    public function canAccept(User $user, InvestmentProject $project): bool
    {
        $user->loadMissing('roleModel');

        return $project->status === 'plan' && $project->attraction_stage === 'handover'
            && $project->attraction_handover_requested_at !== null
            && ! $project->is_archived && ! $project->is_deleted
            && (int) $project->attraction_handover_to_id === (int) $user->id
            && ! $project->attraction_handover_accepted_at
            && in_array($user->roleModel?->name, ['superadmin', 'invest', 'moderator'], true)
            && $this->access->canView($user, $project);
    }

    public function accept(User $user, InvestmentProject $project): void
    {
        DB::transaction(function () use ($user, $project) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless($this->canAccept($user, $locked), 403);
            $locked->update([
                'attraction_handover_accepted_at' => now(),
                'attraction_handover_accepted_by' => $user->id,
            ]);
            $locked->curators()->syncWithoutDetaching([$user->id]);
            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.handover_accepted',
                category: 'project',
                action: 'Жоба сүйемелдеуге қабылданды',
                subject: $locked,
                actor: $user
            );
            $recipientIds = $locked->curators()->pluck('users.id')->push($locked->created_by)->unique()->filter();
            User::query()->whereIn('id', $recipientIds)->get()
                ->filter(fn (User $recipient) => $recipient->id !== $user->id && $this->access->canManage($recipient, $locked))
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

    public function notifyRequested(InvestmentProject $project): void
    {
        if (! $project->wasChanged(['attraction_handover_requested_at', 'attraction_handover_to_id'])
            && ! $project->wasRecentlyCreated) {
            return;
        }
        if (! $project->attraction_handover_requested_at || ! $project->attraction_handover_to_id) {
            return;
        }
        $receiverId = (int) $project->attraction_handover_to_id;
        $requestedAt = $project->attraction_handover_requested_at->toDateTimeString();
        DB::afterCommit(function () use ($project, $receiverId, $requestedAt) {
            $saved = $project->fresh();
            $recipient = User::find($receiverId);
            if (! $saved || ! $recipient || ! $this->canAccept($recipient, $saved)
                || $saved->attraction_handover_requested_at?->toDateTimeString() !== $requestedAt
                || TaskNotification::query()->where('project_id', $saved->id)
                    ->where('user_id', $receiverId)->where('type', 'attraction_handover_requested')
                    ->where('created_at', '>=', $requestedAt)->exists()) {
                return;
            }
            TaskNotification::create([
                'user_id' => $recipient->id,
                'project_id' => $saved->id,
                'type' => 'attraction_handover_requested',
                'message' => "Жобаны сүйемелдеуге қабылдауыңыз сұралды: {$saved->name}",
                'action_url' => route('investment-projects.show', $saved, false),
                'action_label' => 'Жобаны қабылдау',
            ]);
        });
    }

    private function ensureWorkClosed(InvestmentProject $project, string $field): void
    {
        $counts = $project->attractionActivities()
            ->whereIn('status', ['planned', 'in_progress', 'pending_review'])
            ->reorder()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $open = (int) $counts->get('planned', 0) + (int) $counts->get('in_progress', 0);
        $review = (int) $counts->get('pending_review', 0);
        if ($open + $review > 0) {
            throw ValidationException::withMessages([
                $field => "Аяқталмаған іс-шара: {$open}. Тексеруді күткен есеп: {$review}. Алдымен нәтижелерін тексеріп, қалған жұмыстарды аяқтаңыз немесе тоқтатыңыз.",
            ]);
        }
    }
}
