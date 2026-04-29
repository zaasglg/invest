<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectTask extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'description',
        'assigned_to',
        'created_by',
        'start_date',
        'due_date',
        'status',
        'approval_status',
        'approval_comment',
        'approved_by',
        'approved_at',
        'viewed_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
            'approved_at' => 'datetime',
            'viewed_at' => 'datetime',
        ];
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function completions()
    {
        return $this->hasMany(TaskCompletion::class, 'task_id');
    }

    public function latestCompletion()
    {
        return $this->hasOne(TaskCompletion::class, 'task_id')->latestOfMany();
    }

    public function notifications()
    {
        return $this->hasMany(TaskNotification::class, 'task_id');
    }

    public function events()
    {
        return $this->hasMany(ProjectTaskEvent::class, 'task_id');
    }
}
