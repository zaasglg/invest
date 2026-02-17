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
        'start_date',
        'due_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
        ];
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
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
}
