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
        'created_by',
    ];

    public function industrialZone()
    {
        return $this->belongsTo(IndustrialZone::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
