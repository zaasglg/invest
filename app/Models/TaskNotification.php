<?php

namespace App\Models;

use App\Services\InvestmentProjectAccessService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TaskNotification extends Model
{
    public const ASSISTANT_TYPES = [
        'assistant_suggestion',
        'task_due_soon',
        'subsoil_task_due_soon',
        'task_overdue',
    ];

    protected $fillable = [
        'user_id',
        'task_id',
        'subsoil_task_id',
        'completion_id',
        'subsoil_completion_id',
        'attraction_activity_id',
        'type',
        'message',
        'action_url',
        'action_label',
        'is_read',
    ];

    protected $appends = [
        'destination_url',
        'is_assistant',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $query->where('user_id', $user->id)
            ->whereDoesntHave(
                'task.project',
                fn (Builder $project) => $project->where('status', 'plan')
            )
            ->whereDoesntHave(
                'completion.task.project',
                fn (Builder $project) => $project->where('status', 'plan')
            );
        $user->loadMissing('roleModel');

        $query->where(function (Builder $visible) use ($user) {
            $visible->whereNull('attraction_activity_id')
                ->orWhereHas('attractionActivity', function (Builder $activity) use ($user) {
                    if (! in_array($user->roleModel?->name, ['superadmin', 'invest', 'moderator', 'ispolnitel', 'investor'], true)) {
                        $activity->whereRaw('1 = 0');
                    }

                    $activity->where('responsible_id', $user->id)
                        ->whereHas('project', function (Builder $project) use ($user) {
                            app(InvestmentProjectAccessService::class)->scopeVisible($project->active(), $user);

                            if ($user->roleModel?->name === 'ispolnitel') {
                                $project->where(function (Builder $involved) use ($user) {
                                    $involved->where('created_by', $user->id)
                                        ->orWhereHas('executors', fn (Builder $executors) => $executors->where('users.id', $user->id))
                                        ->orWhereHas('tasks', fn (Builder $tasks) => $tasks->where('assigned_to', $user->id));
                                });
                            }
                        });
                });
        });

        if ($user->roleModel?->name !== 'moderator') {
            return $query;
        }

        $turkistanInvestTask = fn (Builder $task) => $task
            ->whereHas(
                'creator',
                fn (Builder $creator) => $creator
                    ->where('users.invest_sub_role', 'turkistan_invest')
                    ->whereHas(
                        'roleModel',
                        fn (Builder $role) => $role->where('name', 'invest')
                    )
            )
            ->whereHas(
                'project',
                fn (Builder $project) => $project
                    ->active()
                    ->curatedByTurkistanInvest()
            );

        return $query->where(function (Builder $visible) use (
            $turkistanInvestTask
        ) {
            $visible
                ->where(function (Builder $general) {
                    $general
                        ->whereNull('task_id')
                        ->whereNull('subsoil_task_id')
                        ->whereNull('completion_id')
                        ->whereNull('subsoil_completion_id');
                })
                ->orWhereHas('task', $turkistanInvestTask)
                ->orWhereHas('completion.task', $turkistanInvestTask);
        });
    }

    public function scopeAssistant(Builder $query): Builder
    {
        return $query->whereIn('type', self::ASSISTANT_TYPES);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function subsoilTask()
    {
        return $this->belongsTo(SubsoilTask::class, 'subsoil_task_id');
    }

    public function completion()
    {
        return $this->belongsTo(TaskCompletion::class, 'completion_id');
    }

    public function subsoilCompletion()
    {
        return $this->belongsTo(SubsoilTaskCompletion::class, 'subsoil_completion_id');
    }

    public function attractionActivity()
    {
        return $this->belongsTo(ProjectAttractionActivity::class, 'attraction_activity_id');
    }

    public function telegramProjectId(): ?int
    {
        $projectId = $this->task?->project_id
            ?? $this->completion?->task?->project_id
            ?? $this->attractionActivity?->project_id;

        return $projectId !== null ? (int) $projectId : null;
    }

    public function telegramSubsoilUserId(): ?int
    {
        $subsoilUserId = $this->subsoilTask?->subsoil_user_id
            ?? $this->subsoilCompletion?->task?->subsoil_user_id;

        return $subsoilUserId !== null ? (int) $subsoilUserId : null;
    }

    public function getDestinationUrlAttribute(): string
    {
        if ($this->hasSafeActionUrl()) {
            return $this->action_url;
        }

        if ($projectId = $this->telegramProjectId()) {
            return route('investment-projects.show', $projectId, false);
        }

        if ($subsoilUserId = $this->telegramSubsoilUserId()) {
            return route('subsoil-users.show', $subsoilUserId, false);
        }

        return route('notifications.index', absolute: false);
    }

    public function getIsAssistantAttribute(): bool
    {
        return in_array($this->type, self::ASSISTANT_TYPES, true);
    }

    private function hasSafeActionUrl(): bool
    {
        return is_string($this->action_url)
            && str_starts_with($this->action_url, '/')
            && ! str_starts_with($this->action_url, '//');
    }
}
