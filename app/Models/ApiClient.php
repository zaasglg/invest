<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ApiClient extends Model
{
    protected $fillable = [
        'name',
        'token_hash',
        'is_active',
        'last_used_at',
        'expires_at',
        'allowed_region_ids',
        'allowed_project_ids',
        'include_contacts',
        'include_internal',
    ];

    protected $hidden = [
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
            'allowed_region_ids' => 'array',
            'allowed_project_ids' => 'array',
            'include_contacts' => 'boolean',
            'include_internal' => 'boolean',
        ];
    }

    public function scopeProjects(Builder $query): Builder
    {
        if ($this->allowed_region_ids !== null) {
            $query->where(function (Builder $regions) {
                $regions->whereIn('region_id', $this->allowed_region_ids)
                    ->orWhereHas('region', fn (Builder $region) => $region->whereIn('parent_id', $this->allowed_region_ids));
            });
        }
        if ($this->allowed_project_ids !== null) {
            $query->whereKey($this->allowed_project_ids);
        }

        return $query;
    }

    public function scopeCompanies(Builder $query): Builder
    {
        if ($this->allowed_project_ids !== null) {
            return $query->whereHas('projects', fn (Builder $project) => $this->scopeProjects($project));
        }
        if ($this->allowed_region_ids !== null) {
            $query->where(function (Builder $companies) {
                $companies->whereIn('region_id', $this->allowed_region_ids)
                    ->orWhereHas('region', fn (Builder $region) => $region->whereIn('parent_id', $this->allowed_region_ids))
                    ->orWhereHas('projects', fn (Builder $project) => $this->scopeProjects($project));
            });
        }

        return $query;
    }
}
