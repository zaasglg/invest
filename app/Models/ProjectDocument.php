<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ProjectDocument extends Model
{
    protected $fillable = [
        'project_id',
        'name',
        'file_path',
        'type',
        'is_completed',
        'uploaded_by',
        'source',
        'source_task_id',
        'source_completion_id',
        'source_task_title',
        'task_assigned_at',
        'task_assigned_by',
        'submitted_at',
        'approved_by',
        'approved_at',
        'is_deleted',
        'deleted_by',
        'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
            'task_assigned_at' => 'datetime',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'is_deleted' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_deleted', false);
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function taskAssigner()
    {
        return $this->belongsTo(User::class, 'task_assigned_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function sourceTask()
    {
        return $this->belongsTo(ProjectTask::class, 'source_task_id');
    }

    public function sourceCompletion()
    {
        return $this->belongsTo(TaskCompletion::class, 'source_completion_id');
    }
}
