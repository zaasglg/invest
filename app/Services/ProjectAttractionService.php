<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectAttractionActivity;
use App\Models\TaskNotification;
use App\Models\User;
use App\Support\ProjectAttractionStages;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectAttractionService
{
    public function __construct(
        private readonly InvestmentProjectAccessService $access,
        private readonly ProjectAttractionReportService $reports,
        private readonly ProjectExecutorAssignmentService $executors
    ) {}

    public function canManage(User $user, InvestmentProject $project): bool
    {
        $user->loadMissing('roleModel');

        return $project->status === 'plan'
            && ! $project->is_archived && ! $project->is_deleted
            && in_array($user->roleModel?->name, ['superadmin', 'invest', 'moderator'], true)
            && $this->access->canManage($user, $project);
    }

    public function canEdit(User $user, InvestmentProject $project, ProjectAttractionActivity $activity): bool
    {
        return (int) $activity->project_id === (int) $project->id
            && $this->canManage($user, $project)
            && (! in_array($activity->status, ['pending_review', 'completed'], true)
                || $user->roleModel?->name === 'superadmin');
    }

    public function canDelete(User $user, InvestmentProject $project, ProjectAttractionActivity $activity): bool
    {
        return $this->canEdit($user, $project, $activity);
    }

    public function canReport(User $user, InvestmentProject $project, ProjectAttractionActivity $activity): bool
    {
        $user->loadMissing('roleModel');

        if ((int) $activity->project_id !== (int) $project->id
            || ! in_array($activity->status ?? 'planned', ['planned', 'in_progress'], true)
            || $project->status !== 'plan' || $project->is_archived || $project->is_deleted) {
            return false;
        }

        return in_array($user->roleModel?->name, ['superadmin', 'invest', 'moderator', 'ispolnitel', 'investor'], true)
            && (int) $activity->responsible_id === (int) $user->id
            && $this->access->canView($user, $project)
            && (! in_array($user->roleModel?->name, ['ispolnitel', 'investor'], true)
                || $user->isInvolvedInProject($project));
    }

    public function canReview(User $user, InvestmentProject $project, ProjectAttractionActivity $activity): bool
    {
        return (int) $activity->project_id === (int) $project->id
            && $activity->status === 'pending_review'
            && $this->canManage($user, $project)
            && ($user->roleModel?->name === 'superadmin'
                || ((int) $activity->reported_by !== (int) $user->id
                    && (int) $activity->responsible_id !== (int) $user->id));
    }

    public function responsibleUsers(InvestmentProject $project, User $actor, ?ProjectAttractionActivity $activity = null): Collection
    {
        return app(ProjectTaskAssigneeService::class)->attractionUsers($project, $activity?->responsible_id)
            ->map(fn (User $candidate) => [
                ...$candidate->only(['id', 'full_name', 'position', 'baskarma_type']),
                'role_model' => $candidate->roleModel?->only(['id', 'name', 'display_name']),
            ]);
    }

    public function save(
        User $actor,
        InvestmentProject $project,
        array $data,
        ?ProjectAttractionActivity $activity = null
    ): void {
        $submission = $data;
        $alreadyCompleted = ! $activity && (bool) ($data['already_completed'] ?? false);
        $data = Arr::only($data, ['next_action', 'description', 'next_action_due_date', 'responsible_id']);
        $this->reports->transaction(function (array &$paths) use ($actor, $project, $data, $activity, $submission, $alreadyCompleted) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless($this->canManage($actor, $locked), 403);
            $before = [];
            $responsibleChanged = false;
            $definitionChanged = false;

            if ($activity) {
                abort_unless((int) $activity->project_id === (int) $locked->id, 404);
                $activity = $locked->attractionActivities()->lockForUpdate()->findOrFail($activity->id);
                abort_unless($this->canEdit($actor, $locked, $activity), 403);
                $before = $activity->only($activity->getFillable());
                $this->validateResponsible($locked, $actor, $data, $activity);

                $responsibleChanged = (int) $activity->responsible_id !== (int) $data['responsible_id'];
                $definitionChanged = $responsibleChanged
                    || $activity->next_action !== $data['next_action']
                    || (array_key_exists('description', $data) && $activity->description !== $data['description'])
                    || $activity->next_action_due_date?->toDateString() !== Carbon::parse($data['next_action_due_date'])->toDateString();
                $reviewedOrPending = in_array($activity->status, ['pending_review', 'completed'], true);

                if ($responsibleChanged || ($reviewedOrPending && $definitionChanged)) {
                    $activity->reports()->where('status', 'pending')->update(['status' => 'superseded']);
                    $data = [
                        ...$data,
                        'status' => $activity->status === 'cancelled' ? 'cancelled' : 'planned',
                        'report_result' => null,
                        'reported_at' => null,
                        'reported_by' => null,
                        'reviewed_at' => null,
                        'reviewed_by' => null,
                        'reviewer_comment' => null,
                    ];
                }

                $activity->update($data);
            } else {
                $this->validateResponsible($locked, $actor, $data);
                $stage = $locked->attraction_stage ?? 'potential';
                ProjectAttractionStages::assertAvailableForActivity($locked, $stage);
                if ($stage === 'declined') {
                    throw ValidationException::withMessages([
                        'next_action' => 'Инвестор бас тартқан жобаға жаңа іс-шара қоспас бұрын жоба кезеңін өзгертіңіз.',
                    ]);
                }
                $activity = $locked->attractionActivities()->create([
                    ...$data,
                    'attraction_stage' => $stage,
                    'status' => 'planned',
                    'created_by' => $actor->id,
                ]);
            }

            if ($activity->responsible?->roleModel?->name === 'ispolnitel') {
                $this->executors->assignTaskExecutor($locked, (int) $activity->responsible_id);
            }
            if ($responsibleChanged && ($before['responsible_id'] ?? null)) {
                $this->executors->releaseTaskAssignment($locked, (int) $before['responsible_id']);
            }
            if ($alreadyCompleted) {
                $this->reports->submit($locked, $activity, $actor, $submission, true, $paths);
                $activity->update([
                    'status' => 'completed',
                    'report_result' => $submission['report_result'],
                    'reported_at' => now(),
                    'reported_by' => $actor->id,
                ]);
            }

            $locked->touch();

            KpiLog::activity(
                projectId: $locked->id,
                event: $activity->wasRecentlyCreated ? 'attraction.created' : 'attraction.updated',
                category: 'project',
                action: 'Инвестор тарту жұмысы '.($activity->wasRecentlyCreated ? 'қосылды' : 'өзгертілді'),
                subject: $activity,
                properties: [
                    'details' => $data,
                    'before' => $before,
                    'after' => $activity->only($activity->getFillable()),
                    'definition_changed' => $definitionChanged,
                ],
                actor: $actor
            );

            if ($alreadyCompleted) {
                KpiLog::activity(
                    projectId: $locked->id,
                    event: 'attraction.recorded_completed',
                    category: 'project',
                    action: 'Бұрын орындалған іс-шара тіркелді',
                    subject: $activity,
                    properties: ['details' => ['Орындалу нәтижесі' => $activity->report_result]],
                    actor: $actor
                );
            }

            $reopened = in_array($before['status'] ?? null, ['cancelled', 'completed'], true);

            if (($activity->wasRecentlyCreated || $responsibleChanged || $reopened)
                && in_array($activity->status, ['planned', 'in_progress'], true)
                && (int) $activity->responsible_id !== (int) $actor->id
                && ($responsible = $activity->responsible)
                && $this->canReport($responsible, $locked, $activity)) {
                TaskNotification::create([
                    'user_id' => $activity->responsible_id,
                    'project_id' => $locked->id,
                    'attraction_activity_id' => $activity->id,
                    'type' => 'attraction_assigned',
                    'message' => "Сізге инвестор тарту іс-шарасы берілді: \"{$activity->next_action}\" (Жоба: {$locked->name}). Орындалу мерзімі: ".$activity->next_action_due_date->format('d.m.Y'),
                    'action_url' => route('investment-projects.show', $locked, false).'#project-attraction',
                    'action_label' => 'Іс-шараға өту',
                ]);
            }
        });
    }

    public function delete(User $actor, InvestmentProject $project, ProjectAttractionActivity $activity): void
    {
        DB::transaction(function () use ($actor, $project, $activity) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless($this->canManage($actor, $locked), 403);
            abort_unless((int) $activity->project_id === (int) $locked->id, 404);
            $activity = $locked->attractionActivities()->lockForUpdate()->findOrFail($activity->id);
            abort_unless($this->canDelete($actor, $locked, $activity), 403);

            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.deleted',
                category: 'project',
                action: 'Инвестор тарту жұмысының жазбасы жойылды',
                subject: $activity,
                properties: ['details' => $activity->only($activity->getFillable())],
                actor: $actor
            );
            $responsibleId = $activity->responsible_id;
            $paths = $activity->reports()->with('files')->get()->flatMap(fn ($report) => $report->files->pluck('file_path'))->all();
            $activity->delete();
            if ($responsibleId) {
                $this->executors->releaseTaskAssignment($locked, (int) $responsibleId);
            }
            DB::afterCommit(function () use ($paths) {
                foreach ($paths as $path) {
                    app(PrivateFileService::class)->delete($path);
                }
            });

            $locked->touch();
        });
    }

    public function report(User $actor, InvestmentProject $project, ProjectAttractionActivity $activity, array $data): void
    {
        $this->reports->transaction(function (array &$paths) use ($actor, $project, $activity, $data) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless((int) $activity->project_id === (int) $locked->id, 404);
            $activity = $locked->attractionActivities()->lockForUpdate()->findOrFail($activity->id);
            abort_unless($this->canReport($actor, $locked, $activity), 403);

            // Submission proves the assignee saw this definition even if the
            // modal's independent receipt request has not reached the server.
            app(ProjectAttractionHistoryService::class)->markViewed($actor, $locked, $activity);
            $submitted = $data['status'] === 'pending_review';
            if ($submitted) {
                $this->reports->submit($locked, $activity, $actor, $data, false, $paths);
            }
            $activity->update([
                'status' => $data['status'],
                'report_result' => $data['report_result'] ?? $activity->report_result,
                'reported_at' => $submitted ? now() : $activity->reported_at,
                'reported_by' => $submitted ? $actor->id : $activity->reported_by,
                'reviewed_at' => $submitted ? null : $activity->reviewed_at,
                'reviewed_by' => $submitted ? null : $activity->reviewed_by,
                'reviewer_comment' => $submitted ? null : $activity->reviewer_comment,
            ]);
            $locked->touch();

            KpiLog::activity(
                projectId: $locked->id,
                event: $submitted ? 'attraction.report_submitted' : 'attraction.started',
                category: 'project',
                action: $submitted ? 'Инвестор тарту іс-шарасының нәтижесі тексеруге жіберілді' : 'Инвестор тарту іс-шарасы орындалуда',
                subject: $activity,
                properties: ['details' => [
                    'Іс-шара' => $activity->next_action,
                    'Орындалу нәтижесі' => $activity->report_result,
                ]],
                actor: $actor
            );
            if ($submitted) {
                User::query()->whereHas('roleModel', fn (Builder $query) => $query
                    ->whereIn('name', ['superadmin', 'invest', 'moderator']))
                    ->get()->filter(fn (User $reviewer) => $reviewer->id !== $actor->id && $this->canReview($reviewer, $locked, $activity))
                    ->each(fn (User $reviewer) => $this->notifyActivity(
                        $reviewer, $locked, $activity, 'attraction_report_submitted',
                        "Іс-шараның нәтижесі тексеруді күтуде: \"{$activity->next_action}\" (Жоба: {$locked->name})"
                    ));
            }
        });
    }

    public function review(User $actor, InvestmentProject $project, ProjectAttractionActivity $activity, array $data): void
    {
        if ($data['decision'] === 'rejected' && blank($data['reviewer_comment'] ?? null)) {
            throw ValidationException::withMessages(['reviewer_comment' => 'Нені түзету керегін жазыңыз.']);
        }
        $this->reports->transaction(function (array &$paths) use ($actor, $project, $activity, $data) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless((int) $activity->project_id === (int) $locked->id, 404);
            $activity = $locked->attractionActivities()->lockForUpdate()->findOrFail($activity->id);
            abort_unless($this->canReview($actor, $locked, $activity), 403);

            $approved = $data['decision'] === 'approved';
            $activity->update([
                'status' => $approved ? 'completed' : 'in_progress',
                'reviewed_at' => now(),
                'reviewed_by' => $actor->id,
                'reviewer_comment' => $data['reviewer_comment'] ?? null,
            ]);
            $this->reports->review($locked, $activity, $actor, $data, $paths);
            $locked->touch();

            KpiLog::activity(
                projectId: $locked->id,
                event: $approved ? 'attraction.report_approved' : 'attraction.report_rejected',
                category: 'project',
                action: $approved ? 'Инвестор тарту іс-шарасының орындалуы расталды' : 'Инвестор тарту іс-шарасының нәтижесі толықтыруға қайтарылды',
                subject: $activity,
                properties: ['details' => [
                    'Іс-шара' => $activity->next_action,
                    'Орындалу нәтижесі' => $activity->report_result,
                    'Тексерушінің түсіндірмесі' => $activity->reviewer_comment,
                ]],
                actor: $actor
            );
            User::query()->whereIn('id', array_filter([$activity->responsible_id, $activity->reported_by]))
                ->get()->filter(fn (User $recipient) => $recipient->id !== $actor->id && $this->access->canView($recipient, $locked))
                ->each(fn (User $recipient) => $this->notifyActivity(
                    $recipient, $locked, $activity,
                    $approved ? 'attraction_report_approved' : 'attraction_report_rejected',
                    'Іс-шараның нәтижесі '.($approved ? 'қабылданды' : 'толықтыруға қайтарылды').": \"{$activity->next_action}\" (Жоба: {$locked->name})"
                        .($approved ? '' : '. '.$activity->reviewer_comment)
                ));
        });
    }

    private function notifyActivity(User $recipient, InvestmentProject $project, ProjectAttractionActivity $activity, string $type, string $message): void
    {
        TaskNotification::create([
            'user_id' => $recipient->id,
            'project_id' => $project->id,
            'attraction_activity_id' => $activity->id,
            'type' => $type,
            'message' => $message,
            'action_url' => route('investment-projects.show', $project, false).'#project-attraction',
            'action_label' => 'Іс-шараны ашу',
        ]);
    }

    private function validateResponsible(InvestmentProject $project, User $actor, array $data, ?ProjectAttractionActivity $activity = null): void
    {
        if (! $this->responsibleUsers($project, $actor, $activity)->contains('id', (int) $data['responsible_id'])) {
            throw ValidationException::withMessages(['responsible_id' => 'Бұл адамды іс-шараға жауапты етіп тағайындауға болмайды.']);
        }
    }
}
