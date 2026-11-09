<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ProjectWorklistService
{
    public function filter(Builder $projects, User $user, array $filters): void
    {
        if (! empty($filters['attraction_stage'])) {
            $projects->where('status', 'plan')->where('attraction_stage', $filters['attraction_stage']);
        }

        $workFilter = $filters['work_filter'] ?? null;
        $responsible = $workFilter === 'my' ? $user->id : ($filters['responsible_id'] ?? null);
        if (! $workFilter && ! $responsible) {
            return;
        }
        if ($user->roleModel?->name === 'ispolnitel') {
            $projects->where(function (Builder $involved) use ($user) {
                $involved->where('created_by', $user->id)
                    ->orWhereHas('executors', fn (Builder $people) => $people->whereKey($user->id))
                    ->orWhereHas('tasks', fn (Builder $task) => $task->where('assigned_to', $user->id))
                    ->orWhereHas('attractionActivities', fn (Builder $work) => $work->where('responsible_id', $user->id)->whereIn('status', ['planned', 'in_progress', 'pending_review']));
            });
        }

        $projects->where(function (Builder $work) use ($responsible, $workFilter) {
            $work->where(function (Builder $planned) use ($responsible, $workFilter) {
                $planned->where('status', 'plan')->where('attraction_stage', '!=', 'declined')
                    ->whereHas('attractionActivities', function (Builder $activity) use ($responsible, $workFilter) {
                        $activity->whereIn('status', ['planned', 'in_progress', 'pending_review']);
                        if ($responsible) {
                            $activity->where('responsible_id', $responsible);
                        }
                        if ($workFilter === 'pending_review') {
                            $activity->where('status', 'pending_review');
                        } elseif ($workFilter === 'overdue') {
                            $activity->whereDate('next_action_due_date', '<', today());
                        }
                    });
            })->orWhere(function (Builder $implementation) use ($responsible, $workFilter) {
                $implementation->where('status', '!=', 'plan')
                    ->whereHas('tasks', function (Builder $task) use ($responsible, $workFilter) {
                        $task->where('status', '!=', 'done')->where(function (Builder $approved) {
                            $approved->whereNull('approval_status')->orWhere('approval_status', 'approved');
                        });
                        if ($responsible) {
                            $task->where('assigned_to', $responsible);
                        }
                        if ($workFilter === 'pending_review') {
                            $task->whereHas('completions', fn (Builder $report) => $report->where('status', 'pending')
                                ->whereColumn('task_definition_version', 'project_tasks.definition_version'));
                        } elseif ($workFilter === 'overdue') {
                            $task->whereDate('due_date', '<', today());
                        }
                    });
            });
        });
    }

    public function nextAction(InvestmentProject $project, User $user, array $filters = []): ?array
    {
        if (in_array($user->roleModel?->name, ['ispolnitel', 'investor'], true)
            && ! $user->isInvolvedInProject($project)) {
            return null;
        }

        $workFilter = $filters['work_filter'] ?? null;
        $responsible = $workFilter === 'my' ? $user->id : ($filters['responsible_id'] ?? null);
        if ($project->status === 'plan') {
            if ($project->attraction_stage === 'declined') {
                return null;
            }
            $activity = $project->attractionActivities
                ->whereIn('status', ['planned', 'in_progress', 'pending_review'])
                ->when($responsible, fn ($rows) => $rows->where('responsible_id', $responsible))
                ->when($workFilter === 'pending_review', fn ($rows) => $rows->where('status', 'pending_review'))
                ->when($workFilter === 'overdue', fn ($rows) => $rows->filter(fn ($work) => $work->next_action_due_date?->lt(today())))
                ->sortBy(fn ($activity) => $activity->next_action_due_date?->getTimestamp() ?? PHP_INT_MAX)->first();

            return $activity ? [
                'id' => $activity->id, 'kind' => 'attraction', 'status' => $activity->status,
                'title' => $activity->next_action,
                'due_date' => $activity->next_action_due_date?->toDateString(),
                'is_overdue' => $activity->next_action_due_date?->lt(today()) ?? false,
                'responsible_id' => $activity->responsible_id,
                'responsible_name' => $activity->responsible?->full_name,
            ] : null;
        }

        $task = $project->tasks->filter(fn ($task) => $task->status !== 'done'
            && in_array($task->approval_status, [null, 'approved'], true))
            ->when($responsible, fn ($rows) => $rows->where('assigned_to', $responsible))
            ->when($workFilter === 'pending_review', fn ($rows) => $rows->filter(fn ($task) => $task->completions->contains(
                fn ($report) => $report->status === 'pending' && (int) $report->task_definition_version === (int) $task->definition_version)))
            ->when($workFilter === 'overdue', fn ($rows) => $rows->filter(fn ($task) => $task->due_date?->lt(today())))
            ->sortBy(fn ($task) => $task->due_date?->getTimestamp() ?? PHP_INT_MAX)->first();

        return $task ? [
            'id' => $task->id, 'kind' => 'task', 'status' => $task->status,
            'title' => $task->title, 'due_date' => $task->due_date?->toDateString(),
            'is_overdue' => $task->due_date?->lt(today()) ?? false,
            'responsible_id' => $task->assigned_to,
            'responsible_name' => $task->assignee?->full_name,
        ] : null;
    }
}
