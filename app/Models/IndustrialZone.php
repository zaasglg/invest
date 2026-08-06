<?php

namespace App\Models;

use App\Models\Concerns\HasLogicalDeletion;
use Illuminate\Database\Eloquent\Model;

class IndustrialZone extends Model
{
    use HasLogicalDeletion;

    protected $fillable = [
        'name',
        'region_id',
        'status',
        'total_area',
        'infrastructure',
        'location',
        'description',
        'geometry',
        'is_deleted',
        'deleted_by',
        'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'total_area' => 'decimal:2',
            'infrastructure' => 'array',
            'location' => 'array',
            'geometry' => 'array',
            'is_deleted' => 'boolean',
            'deleted_at' => 'datetime',
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

    public function photos()
    {
        return $this->hasMany(IndustrialZonePhoto::class);
    }

    public function allPhotos()
    {
        return $this->hasMany(IndustrialZonePhoto::class)
            ->withoutGlobalScope('not_deleted');
    }

    public function activityLogs()
    {
        return $this->morphMany(SectorActivityLog::class, 'auditable');
    }
}
