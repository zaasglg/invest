<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sez extends Model
{
    protected $fillable = [
        'name',
        'region_id',
        'total_area',
        'investment_total',
        'status',
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

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function issues()
    {
        return $this->hasMany(SezIssue::class);
    }

    public function investmentProjects()
    {
        return $this->belongsToMany(InvestmentProject::class, 'investment_project_sez');
    }
}
