<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsoilTaskCompletionFile extends Model
{
    protected $fillable = [
        'completion_id',
        'file_path',
        'file_name',
        'type',
    ];

    public function completion()
    {
        return $this->belongsTo(SubsoilTaskCompletion::class, 'completion_id');
    }
}
