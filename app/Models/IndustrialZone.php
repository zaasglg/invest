<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IndustrialZone extends Model
{
    protected $fillable = [
        'name',
        'region_id',
        'status',
        'total_area',
        'investment_total',
        'infrastructure',
        'location',
        'geometry',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'total_area' => 'decimal:2',
            'investment_total' => 'decimal:2',
            'infrastructure' => 'array',
            'location' => 'array',
            'geometry' => 'array',
        ];
    }

    public function issues()
    {
        return $this->hasMany(IndustrialZoneIssue::class);
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function investmentProjects()
    {
        return $this->belongsToMany(InvestmentProject::class, 'investment_project_industrial_zone');
    }
}
