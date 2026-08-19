<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class InvestmentApplication extends Model
{
    public const APPLICATION_KINDS = [
        'new_project' => 'Жаңа жоба',
        'expansion' => 'Бар жобаны кеңейту',
    ];

    public const STATUSES = [
        'draft' => 'Жоба нұсқасы',
        'submitted' => 'Жіберілді',
        'under_review' => 'Қаралуда',
        'needs_clarification' => 'Толықтыру қажет',
        'approved' => 'Қабылданды, резервте',
        'converted_to_project' => 'Инвестициялық жоба ашылды',
        'rejected' => 'Қабылданбады',
        'withdrawn' => 'Кері қайтарылды',
        'expired' => 'Резерв мерзімі аяқталды',
    ];

    public const EDITABLE_STATUSES = ['draft', 'needs_clarification'];

    public const WITHDRAWABLE_STATUSES = [
        'submitted',
        'under_review',
        'needs_clarification',
        'approved',
    ];

    protected $fillable = [
        'application_number',
        'user_id',
        'zoneable_type',
        'zoneable_id',
        'status',
        'application_kind',
        'source_investment_project_id',
        'project_name',
        'project_description',
        'activity_sector',
        'requested_area',
        'approved_area',
        'investment_amount',
        'jobs_count',
        'infrastructure_requirements',
        'company_legal_form',
        'company_name',
        'company_bin',
        'company_registration_date',
        'company_region_id',
        'director_full_name',
        'contact_person',
        'contact_phone',
        'contact_email',
        'legal_address',
        'reviewed_by',
        'reviewer_comment',
        'submitted_at',
        'reviewed_at',
        'reserved_until',
        'converted_at',
        'investment_project_id',
    ];

    protected $appends = [
        'status_label',
        'application_kind_label',
        'zone_type',
        'zone_type_label',
        'is_editable',
        'is_withdrawable',
    ];

    protected function casts(): array
    {
        return [
            'requested_area' => 'decimal:2',
            'approved_area' => 'decimal:2',
            'investment_amount' => 'decimal:2',
            'jobs_count' => 'integer',
            'infrastructure_requirements' => 'array',
            'company_registration_date' => 'date',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'reserved_until' => 'datetime',
            'converted_at' => 'datetime',
        ];
    }

    public function applicant()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function zoneable()
    {
        return $this->morphTo();
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function companyRegion()
    {
        return $this->belongsTo(Region::class, 'company_region_id');
    }

    public function investmentProject()
    {
        return $this->belongsTo(InvestmentProject::class);
    }

    public function sourceInvestmentProject()
    {
        return $this->belongsTo(
            InvestmentProject::class,
            'source_investment_project_id'
        );
    }

    public function projectTypes()
    {
        return $this->belongsToMany(
            ProjectType::class,
            'investment_application_project_type'
        )->withTimestamps();
    }

    public function documents()
    {
        return $this->hasMany(InvestmentApplicationDocument::class)->latest();
    }

    public function statusHistories()
    {
        return $this->hasMany(InvestmentApplicationStatusHistory::class)
            ->latest();
    }

    public function scopeActiveReservation(Builder $query): Builder
    {
        return $query
            ->where('status', 'approved')
            ->whereNotNull('reserved_until')
            ->where('reserved_until', '>', now());
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function getApplicationKindLabelAttribute(): string
    {
        return self::APPLICATION_KINDS[$this->application_kind]
            ?? $this->application_kind;
    }

    public function getZoneTypeAttribute(): string
    {
        return match ($this->zoneable_type) {
            Sez::class => 'sez',
            IndustrialZone::class => 'industrial-zone',
            PromZone::class => 'prom-zone',
            default => 'unknown',
        };
    }

    public function getZoneTypeLabelAttribute(): string
    {
        return match ($this->zone_type) {
            'sez' => 'АЭА',
            'industrial-zone' => 'ИА',
            'prom-zone' => 'Пром зона',
            default => 'Аймақ',
        };
    }

    public function getIsEditableAttribute(): bool
    {
        return in_array($this->status, self::EDITABLE_STATUSES, true);
    }

    public function getIsWithdrawableAttribute(): bool
    {
        return in_array($this->status, self::WITHDRAWABLE_STATUSES, true);
    }
}
