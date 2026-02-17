<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskCompletionFile extends Model
{
    protected $fillable = [
        'completion_id',
        'file_path',
        'file_name',
        'type',
    ];

    public function completion()
    {
        return $this->belongsTo(TaskCompletion::class, 'completion_id');
    }
}
