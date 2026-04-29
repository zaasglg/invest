<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SezIssue extends Model
{
    protected $fillable = [
        'sez_id',
        'title',
        'description',
        'category',
        'severity',
        'status',
        'created_by',
    ];

    public function sez()
    {
        return $this->belongsTo(Sez::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
