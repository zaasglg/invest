<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsoilUser extends Model
{
    protected $fillable = [
        'name',
        'bin',
        'region_id',
        'mineral_type',
        'license_status',
        'license_start',
        'license_end',
        'location',
    ];

    protected function casts(): array
    {
        return [
            'license_start' => 'date',
            'license_end' => 'date',
            'location' => 'array',
        ];
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function issues()
    {
        return $this->hasMany(SubsoilIssue::class);
    }

    public function investmentProjects()
    {
        return $this->belongsToMany(InvestmentProject::class, 'investment_project_subsoil_user');
    }
}
