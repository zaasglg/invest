<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectTaskEvent extends Model
{
    protected $fillable = [
        'task_id',
        'user_id',
        'type',
        'comment',
    ];

    public function task()
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
