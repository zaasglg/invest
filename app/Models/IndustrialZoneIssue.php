<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IndustrialZoneIssue extends Model
{
    protected $fillable = [
        'industrial_zone_id',
        'title',
        'description',
        'category',
        'severity',
        'status',
    ];

    public function industrialZone()
    {
        return $this->belongsTo(IndustrialZone::class);
    }
}
