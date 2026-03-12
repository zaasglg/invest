<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsoilTaskCompletion extends Model
{
    protected $fillable = [
        'task_id',
        'submitted_by',
        'comment',
        'status',
        'reviewer_comment',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function task()
    {
        return $this->belongsTo(SubsoilTask::class, 'task_id');
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function files()
    {
        return $this->hasMany(SubsoilTaskCompletionFile::class, 'completion_id');
    }
}
