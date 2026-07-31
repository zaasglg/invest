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
        'capacity',
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
        return $query->whereHas(
            'curators',
            fn (Builder $curator) => $curator
                ->where('users.invest_sub_role', 'turkistan_invest')
                ->whereHas(
                    'roleModel',
                    fn (Builder $role) => $role->where('name', 'invest')
                )
        );
    }

    public function scopeWhereChatParticipant(
        Builder $query,
        User $user
    ): Builder {
        $user->loadMissing('roleModel');

        if ($user->roleModel?->name === 'moderator') {
            return $query
                ->active()
                ->curatedByTurkistanInvest();
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
     * Investor accounts explicitly assigned to this project.
     */
    public function investors()
    {
        return $this->belongsToMany(User::class, 'investment_project_investor')
            ->withTimestamps();
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

        if ($user->roleModel?->name === 'moderator') {
            return ! $this->is_archived
                && self::query()
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
