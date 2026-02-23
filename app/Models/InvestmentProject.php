<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvestmentProject extends Model
{
    use HasFactory;
    protected $fillable = [
        'name',
        'company_name',
        'description',
        'region_id',
        'project_type_id',
        'total_investment',
        'status',
        'start_date',
        'end_date',
        'created_by',
        'geometry',
    ];

    protected function casts(): array
    {
        return [
            'total_investment' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'geometry' => 'array',
        ];
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function projectType()
    {
        return $this->belongsTo(ProjectType::class);
    }

    public function sezs()
    {
        return $this->belongsToMany(Sez::class, 'investment_project_sez');
    }

    public function industrialZones()
    {
        return $this->belongsToMany(IndustrialZone::class, 'investment_project_industrial_zone');
    }

    public function subsoilUsers()
    {
        return $this->belongsToMany(SubsoilUser::class, 'investment_project_subsoil_user');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Исполнитель (Executor)
    public function executor()
    {
        return $this->belongsTo(User::class, 'executor_id');
    }

    // Исполнители (Many to Many)
    public function executors()
    {
        return $this->belongsToMany(User::class, 'investment_project_user');
    }

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class, 'project_id');
    }

    public function issues()
    {
        return $this->hasMany(ProjectIssue::class, 'project_id');
    }

    public function kpiLogs()
    {
        return $this->hasMany(KpiLog::class, 'project_id');
    }

    public function documents()
    {
        return $this->hasMany(ProjectDocument::class, 'project_id');
    }

    public function photos()
    {
        return $this->hasMany(ProjectPhoto::class, 'project_id');
    }

    /**
     * Аяқталу мерзімі өтіп кеткен жобаны автоматты түрде тоқтату.
     */
    public function getIsExpiredAttribute(): bool
    {
        return $this->end_date !== null
            && $this->end_date->lt(now()->startOfDay())
            && $this->status !== 'suspended';
    }

    protected static function booted(): void
    {
        static::retrieved(function (InvestmentProject $project) {
            if ($project->is_expired) {
                $project->updateQuietly(['status' => 'suspended']);
                $project->setAttribute('status', 'suspended');
            }
        });
    }
}
