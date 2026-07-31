<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TaskNotification extends Model
{
    protected $fillable = [
        'user_id',
        'task_id',
        'subsoil_task_id',
        'completion_id',
        'subsoil_completion_id',
        'type',
        'message',
        'is_read',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $query->where('user_id', $user->id);
        $user->loadMissing('roleModel');

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

    public function telegramProjectId(): ?int
    {
        $projectId = $this->task?->project_id
            ?? $this->completion?->task?->project_id;

        return $projectId !== null ? (int) $projectId : null;
    }

    public function telegramSubsoilUserId(): ?int
    {
        $subsoilUserId = $this->subsoilTask?->subsoil_user_id
            ?? $this->subsoilCompletion?->task?->subsoil_user_id;

        return $subsoilUserId !== null ? (int) $subsoilUserId : null;
    }
}
