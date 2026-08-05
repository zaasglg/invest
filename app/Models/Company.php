<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;

    public const LEGAL_FORMS = [
        'too' => 'ЖШС (ТОО)',
        'ao' => 'АҚ (АО)',
        'ip' => 'ЖК (ИП)',
        'cooperative' => 'ӨК',
        'public_foundation' => 'Қоғамдық қор',
        'state_enterprise' => 'Мемлекеттік кәсіпорын',
        'branch' => 'Филиал',
        'other' => 'Басқа',
    ];

    public const STATUSES = [
        'active' => 'Белсенді',
        'inactive' => 'Белсенді емес',
        'liquidating' => 'Таратылу үстінде',
    ];

    protected $fillable = [
        'legal_form',
        'name',
        'bin',
        'registration_date',
        'region_id',
        'activity_type',
        'director_full_name',
        'contact_person',
        'phone',
        'email',
        'website',
        'legal_address',
        'actual_address',
        'licenses_and_regulatory_documents',
        'status',
        'notes',
        'created_by',
    ];

    protected $appends = [
        'display_name',
        'legal_form_label',
        'status_label',
        'is_profile_complete',
    ];

    protected function casts(): array
    {
        return [
            'registration_date' => 'date',
        ];
    }

    public function getDisplayNameAttribute(): string
    {
        $prefix = match ($this->legal_form) {
            'too' => 'ЖШС',
            'ao' => 'АҚ',
            'ip' => 'ЖК',
            'cooperative' => 'ӨК',
            'public_foundation' => 'ҚҚ',
            'state_enterprise' => 'МК',
            'branch' => 'Филиал',
            default => '',
        };

        return $prefix !== ''
            ? $prefix.' «'.$this->name.'»'
            : $this->name;
    }

    public function getLegalFormLabelAttribute(): string
    {
        return self::LEGAL_FORMS[$this->legal_form] ?? $this->legal_form;
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function getIsProfileCompleteAttribute(): bool
    {
        return $this->bin !== null
            && $this->registration_date !== null
            && $this->region_id !== null
            && filled($this->activity_type)
            && filled($this->director_full_name)
            && filled($this->phone)
            && filled($this->legal_address);
    }

    public function scopeProfileComplete(Builder $query): Builder
    {
        return $query
            ->whereNotNull('bin')
            ->whereNotNull('registration_date')
            ->whereNotNull('region_id')
            ->whereNotNull('activity_type')
            ->whereNotNull('director_full_name')
            ->whereNotNull('phone')
            ->whereNotNull('legal_address');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function projects()
    {
        return $this->hasMany(InvestmentProject::class);
    }

    public function documents()
    {
        return $this->hasMany(CompanyDocument::class)->latest();
    }

    public function investor()
    {
        return $this->hasOne(User::class)
            ->whereHas(
                'roleModel',
                fn (Builder $query) => $query->where('name', 'investor')
            );
    }
}
