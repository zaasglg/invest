<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectAttractionActivity;
use App\Models\TaskNotification;
use App\Models\User;
use App\Support\ProjectAttractionStages;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProjectAttractionService
{
    public function __construct(private readonly InvestmentProjectAccessService $access) {}

    public function canManage(User $user, InvestmentProject $project): bool
    {
        $user->loadMissing('roleModel');

        return $project->status === 'plan'
            && ! $project->is_archived && ! $project->is_deleted
            && in_array($user->roleModel?->name, ['superadmin', 'invest', 'moderator'], true)
            && $this->access->canView($user, $project);
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

        if ($this->canManage($user, $project)) {
            return true;
        }

        return in_array($user->roleModel?->name, ['ispolnitel', 'investor'], true)
            && (int) $activity->responsible_id === (int) $user->id
            && $this->access->canView($user, $project)
            && $user->isInvolvedInProject($project);
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

    public function responsibleUsers(InvestmentProject $project, User $actor): Collection
    {
        return User::query()->select('id', 'full_name', 'position')
            ->whereHas('roleModel', fn (Builder $query) => $query
                ->whereIn('name', ['superadmin', 'invest', 'moderator', 'ispolnitel', 'investor']))
            ->where(function (Builder $query) use ($project, $actor) {
                $query->whereKey($actor->id)
                    ->orWhere('id', $project->created_by)
                    ->orWhereIn('id', $project->curators()->select('users.id'))
                    ->orWhereIn('id', $project->executors()->select('users.id'))
                    ->orWhereIn('id', $project->investors()->select('users.id'));
            })
            ->orderBy('full_name')->get();
    }

    public function save(
        User $actor,
        InvestmentProject $project,
        array $data,
        ?ProjectAttractionActivity $activity = null
    ): void {
        DB::transaction(function () use ($actor, $project, $data, $activity) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless($this->canManage($actor, $locked), 403);
            ProjectAttractionStages::assertAvailableForActivity($locked, $data['attraction_stage']);
            $before = [];
            $responsibleChanged = false;

            if ($activity) {
                abort_unless((int) $activity->project_id === (int) $locked->id, 404);
                $activity = $locked->attractionActivities()->lockForUpdate()->findOrFail($activity->id);
                abort_unless($this->canEdit($actor, $locked, $activity), 403);
                $before = $activity->only($activity->getFillable());

                $responsibleChanged = (int) $activity->responsible_id !== (int) $data['responsible_id'];
                $definitionChanged = $responsibleChanged
                    || $activity->next_action !== $data['next_action']
                    || $activity->next_action_due_date?->toDateString() !== Carbon::parse($data['next_action_due_date'])->toDateString();
                $reviewedOrPending = in_array($activity->status, ['pending_review', 'completed'], true);
                $explicitReopen = array_key_exists('status', $data)
                    && $data['status'] !== $activity->status
                    && in_array($activity->status, ['pending_review', 'completed', 'cancelled'], true);

                if ($responsibleChanged || ($reviewedOrPending && $definitionChanged) || $explicitReopen) {
                    $data = [
                        ...$data,
                        'status' => $data['status'] ?? 'planned',
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
                $activity = $locked->attractionActivities()->create([
                    ...$data,
                    'status' => $data['status'] ?? 'planned',
                    'created_by' => $actor->id,
                ]);
            }

            // Editing history must not replace the stage of a newer entry.
            if ((int) $locked->attractionActivities()->reorder()->latest('id')->value('id') === (int) $activity->id) {
                $locked->update(['attraction_stage' => $data['attraction_stage']]);
            } else {
                $locked->touch();
            }

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
                ],
                actor: $actor
            );

            $reopened = in_array($before['status'] ?? null, ['cancelled', 'completed'], true);

            if (($activity->wasRecentlyCreated || $responsibleChanged || $reopened)
                && in_array($activity->status, ['planned', 'in_progress'], true)
                && (int) $activity->responsible_id !== (int) $actor->id
                && ($responsible = $activity->responsible)
                && $this->canReport($responsible, $locked, $activity)) {
                TaskNotification::create([
                    'user_id' => $activity->responsible_id,
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

            $isLatest = (int) $locked->attractionActivities()->reorder()->latest('id')->value('id') === (int) $activity->id;

            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.deleted',
                category: 'project',
                action: 'Инвестор тарту жұмысының жазбасы жойылды',
                subject: $activity,
                properties: ['details' => $activity->only($activity->getFillable())],
                actor: $actor
            );
            $activity->delete();

            if ($isLatest) {
                $restoredStage = $locked->attractionActivities()->reorder()->latest('id')->value('attraction_stage') ?? 'potential';
                $locked->attraction_stage = ProjectAttractionStages::canRestore($locked, $restoredStage)
                    ? $restoredStage : 'potential';
            }

            $locked->touch();
        });
    }

    public function report(User $actor, InvestmentProject $project, ProjectAttractionActivity $activity, array $data): void
    {
        DB::transaction(function () use ($actor, $project, $activity, $data) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless((int) $activity->project_id === (int) $locked->id, 404);
            $activity = $locked->attractionActivities()->lockForUpdate()->findOrFail($activity->id);
            abort_unless($this->canReport($actor, $locked, $activity), 403);

            $submitted = $data['status'] === 'pending_review';
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
        });
    }

    public function review(User $actor, InvestmentProject $project, ProjectAttractionActivity $activity, array $data): void
    {
        DB::transaction(function () use ($actor, $project, $activity, $data) {
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
        });
    }
}
