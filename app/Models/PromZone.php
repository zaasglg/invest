<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromZone extends Model
{
    protected $fillable = [
        'name',
        'region_id',
        'status',
        'total_area',
        'infrastructure',
        'location',
        'description',
        'geometry',
    ];

    protected function casts(): array
    {
        return [
            'total_area' => 'decimal:2',
            'infrastructure' => 'array',
            'location' => 'array',
            'geometry' => 'array',
        ];
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function issues()
    {
        return $this->hasMany(PromZoneIssue::class);
    }

    public function investmentProjects()
    {
        return $this->belongsToMany(InvestmentProject::class, 'investment_project_prom_zone');
    }
}
