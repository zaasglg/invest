<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvestmentProject extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'company_name',
        'company_id',
        'description',
        'current_status',
        'region_id',
        'project_type_id',
        'jobs_count',
        'production_not_applicable',
        'total_investment',
        'status',
        'start_date',
        'end_date',
        'created_by',
        'geometry',
        'infrastructure',
        'sort_order',
        'is_archived',
    ];

    protected function casts(): array
    {
        return [
            'total_investment' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'geometry' => 'array',
            'infrastructure' => 'array',
            'is_archived' => 'boolean',
            'production_not_applicable' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }

    public function scopeArchived($query)
    {
        return $query->where('is_archived', true);
    }

    public function scopeCuratedByTurkistanInvest(Builder $query): Builder
    {
        return $query->whereHas('curators', function (Builder $curator) {
            $curator->where(function (Builder $turkistanInvest) {
                $turkistanInvest
                    ->where(function (Builder $invest) {
                        $invest
                            ->where('users.invest_sub_role', 'turkistan_invest')
                            ->whereHas(
                                'roleModel',
                                fn (Builder $role) => $role->where('name', 'invest')
                            );
                    })
                    ->orWhereHas(
                        'roleModel',
                        fn (Builder $role) => $role->where('name', 'moderator')
                    );
            });
        });
    }

    public function scopeWhereChatParticipant(
        Builder $query,
        User $user
    ): Builder {
        $user->loadMissing('roleModel');

        $query->active();

        if ($user->roleModel?->name === 'moderator') {
            return $query->curatedByTurkistanInvest();
        }

        return $query->where(function (Builder $participantQuery) use ($user) {
            $participantQuery
                ->whereHas(
                    'curators',
                    fn (Builder $query) => $query->whereKey($user->id)
                )
                ->orWhereHas(
                    'investors',
                    fn (Builder $query) => $query->whereKey($user->id)
                )
                ->orWhereHas(
                    'executors',
                    fn (Builder $query) => $query->whereKey($user->id)
                )
                ->orWhere(function (Builder $creatorQuery) use ($user) {
                    $creatorQuery
                        ->where('created_by', $user->id)
                        ->whereDoesntHave('curators');
                });
        });
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function projectType()
    {
        return $this->belongsTo(ProjectType::class);
    }

    public function projectTypes()
    {
        return $this->belongsToMany(
            ProjectType::class,
            'investment_project_project_type'
        )->withTimestamps();
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
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

    public function promZones()
    {
        return $this->belongsToMany(PromZone::class, 'investment_project_prom_zone');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Curators assigned to this project (admin-managed).
     * A project can have multiple curators.
     */
    public function curators()
    {
        return $this->belongsToMany(User::class, 'investment_project_curator')
            ->withTimestamps();
    }

    /**
     * The investor account of the company selected for this project.
     */
    public function investors()
    {
        return $this->hasMany(User::class, 'company_id', 'company_id')
            ->whereNotNull('users.company_id')
            ->whereHas(
                'roleModel',
                fn (Builder $query) => $query->where('name', 'investor')
            );
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
        return $this->hasMany(ProjectDocument::class, 'project_id')->active();
    }

    public function productionPlans()
    {
        return $this->hasMany(
            ProjectProductionPlan::class,
            'project_id'
        )->orderBy('sort_order');
    }

    public function allDocuments()
    {
        return $this->hasMany(ProjectDocument::class, 'project_id');
    }

    public function photos()
    {
        return $this->hasMany(ProjectPhoto::class, 'project_id');
    }

    public function chatMessages()
    {
        return $this->hasMany(
            ProjectChatMessage::class,
            'investment_project_id'
        );
    }

    public function latestChatMessage()
    {
        return $this->hasOne(
            ProjectChatMessage::class,
            'investment_project_id'
        )->latestOfMany();
    }

    public function chatReadStates()
    {
        return $this->hasMany(
            ProjectChatRead::class,
            'investment_project_id'
        );
    }

    public function isChatParticipant(User $user): bool
    {
        $user->loadMissing('roleModel');

        if ($this->is_archived) {
            return false;
        }

        if ($user->roleModel?->name === 'moderator') {
            return self::query()
                ->whereKey($this->id)
                ->curatedByTurkistanInvest()
                ->exists();
        }

        if ($this->curators()->whereKey($user->id)->exists()
            || $this->investors()->whereKey($user->id)->exists()
            || $this->executors()->whereKey($user->id)->exists()) {
            return true;
        }

        return (int) $this->created_by === (int) $user->id
            && ! $this->curators()->exists();
    }

    /**
     * Признак того, что срок проекта истек.
     */
    public function getIsExpiredAttribute(): bool
    {
        return $this->end_date !== null
            && $this->end_date->lt(now()->startOfDay())
            && $this->status !== 'suspended';
    }
}
