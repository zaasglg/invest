<?php

namespace App\Models;

use App\Models\Concerns\HasLogicalDeletion;
use Illuminate\Database\Eloquent\Model;

class Sez extends Model
{
    use HasLogicalDeletion;

    protected $fillable = [
        'name',
        'region_id',
        'total_area',
        'status',
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

    public function photos()
    {
        return $this->hasMany(SezPhoto::class);
    }

    public function allPhotos()
    {
        return $this->hasMany(SezPhoto::class)
            ->withoutGlobalScope('not_deleted');
    }

    public function activityLogs()
    {
        return $this->morphMany(SectorActivityLog::class, 'auditable');
    }
}
