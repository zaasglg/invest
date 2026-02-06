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
    ];

    public function sez()
    {
        return $this->belongsTo(Sez::class);
    }
}
