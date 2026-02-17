<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskNotification extends Model
{
    protected $fillable = [
        'user_id',
        'task_id',
        'completion_id',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function completion()
    {
        return $this->belongsTo(TaskCompletion::class, 'completion_id');
    }
}
