<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromZoneIssue extends Model
{
    protected $fillable = [
        'prom_zone_id',
        'title',
        'description',
        'category',
        'severity',
        'status',
    ];

    public function promZone()
    {
        return $this->belongsTo(PromZone::class);
    }
}
