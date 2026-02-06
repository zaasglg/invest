<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegionRating extends Model
{
    protected $fillable = [
        'region_id',
        'rating_score',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'rating_score' => 'integer',
            'calculated_at' => 'datetime',
        ];
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }
}
