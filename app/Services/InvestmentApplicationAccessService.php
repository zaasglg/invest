<?php

namespace App\Services;

use App\Models\IndustrialZone;
use App\Models\InvestmentApplication;
use App\Models\PromZone;
use App\Models\Sez;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class InvestmentApplicationAccessService
{
    public function scopeReviewable(Builder $query, User $user): Builder
    {
        $user->loadMissing('roleModel');
        $role = $user->roleModel?->name;
        $query->where('status', '!=', 'draft');

        if ($role === 'superadmin') {
            return $query;
        }

        if ($role !== 'invest') {
            return $query->whereRaw('1 = 0');
        }

        $zoneClasses = match ($user->invest_sub_role) {
            'aea' => [Sez::class],
            'ia' => [IndustrialZone::class],
            'prom_zone' => [PromZone::class],
            'turkistan_invest', null => [
                Sez::class,
                IndustrialZone::class,
                PromZone::class,
            ],
            default => [],
        };

        if ($zoneClasses === []) {
            return $query->whereRaw('1 = 0');
        }

        $query->whereIn('zoneable_type', $zoneClasses);

        if ($user->region_id) {
            $query->whereHasMorph(
                'zoneable',
                $zoneClasses,
                fn (Builder $zone) => $zone->where(
                    $zone->getModel()->qualifyColumn('region_id'),
                    $user->region_id
                )
            );
        }

        return $query;
    }

    public function canReview(User $user, InvestmentApplication $application): bool
    {
        return $this->scopeReviewable(
            InvestmentApplication::query()->whereKey($application->id),
            $user
        )->exists();
    }
}
