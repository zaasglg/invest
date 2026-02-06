<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IndustrialPlot extends Model
{
    protected $fillable = [
        'industrial_zone_id',
        'area',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'area' => 'decimal:2',
        ];
    }

    public function industrialZone()
    {
        return $this->belongsTo(IndustrialZone::class);
    }
}
