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
        'created_by',
    ];

    public function promZone()
    {
        return $this->belongsTo(PromZone::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
