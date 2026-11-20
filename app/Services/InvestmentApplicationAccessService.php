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
        $query->where('status', '!=', 'draft');

        if ($this->isSuperadmin($user)) {
            return $query;
        }

        if ($this->isAttractionManager($user)) {
            return $this->scopeRegion($query, $user, [
                Sez::class,
                IndustrialZone::class,
                PromZone::class,
            ]);
        }

        $zoneClass = $this->sectorZoneClass($user);

        if ($zoneClass === null) {
            return $query->whereRaw('1 = 0');
        }

        $query
            ->where('zoneable_type', $zoneClass)
            ->where('sector_review_status', '!=', 'not_requested');

        return $this->scopeRegion($query, $user, [$zoneClass]);
    }

    public function scopeAttractionManagers(
        Builder $query,
        InvestmentApplication $application
    ): Builder {
        $regionId = $this->applicationRegionId($application);

        return $query
            ->where(
                'invest_sub_role',
                User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION
            )
            ->whereHas(
                'roleModel',
                fn (Builder $role) => $role->where('name', 'invest')
            )
            ->when(
                $regionId !== null,
                fn (Builder $managers) => $managers->where(
                    fn (Builder $region) => $region
                        ->whereNull('region_id')
                        ->orWhere('region_id', $regionId)
                )
            );
    }

    public function canReview(
        User $user,
        InvestmentApplication $application
    ): bool {
        return $this->canView($user, $application);
    }

    public function canView(
        User $user,
        InvestmentApplication $application
    ): bool {
        return $this->scopeReviewable(
            InvestmentApplication::query()->whereKey($application->id),
            $user
        )->exists();
    }

    public function canAssign(
        User $user,
        InvestmentApplication $application
    ): bool {
        if (! $this->canView($user, $application)
            || ! in_array(
                $application->status,
                ['submitted', 'under_review', 'needs_clarification', 'approved'],
                true
            )) {
            return false;
        }

        if ($this->isSuperadmin($user)) {
            return true;
        }

        return $this->isAttractionManager($user)
            && $application->assigned_to === null;
    }

    public function canManage(
        User $user,
        InvestmentApplication $application
    ): bool {
        if (! $this->canView($user, $application)) {
            return false;
        }

        if ($this->isSuperadmin($user)) {
            return true;
        }

        return $this->isAttractionManager($user)
            && (int) $application->assigned_to === (int) $user->id;
    }

    public function canRequestSectorReview(
        User $user,
        InvestmentApplication $application
    ): bool {
        return $this->canManage($user, $application)
            && $application->assigned_to !== null
            && in_array($application->status, ['submitted', 'under_review'], true)
            && in_array(
                $application->sector_review_status,
                ['not_requested', 'rejected'],
                true
            );
    }

    public function canSectorReview(
        User $user,
        InvestmentApplication $application
    ): bool {
        return in_array(
            $application->status,
            ['submitted', 'under_review'],
            true
        )
            && $application->sector_review_status === 'pending'
            && $this->sectorZoneClass($user) === $application->zoneable_type
            && $this->regionMatches($user, $application);
    }

    public function isSuperadmin(User $user): bool
    {
        $user->loadMissing('roleModel');

        return $user->roleModel?->name === 'superadmin';
    }

    public function isAttractionManager(User $user): bool
    {
        $user->loadMissing('roleModel');

        return $user->roleModel?->name === 'invest'
            && $user->invest_sub_role
                === User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION;
    }

    public function isEligibleAttractionManager(
        User $user,
        InvestmentApplication $application
    ): bool {
        return $this->isAttractionManager($user)
            && $this->regionMatches($user, $application);
    }

    private function sectorZoneClass(User $user): ?string
    {
        $user->loadMissing('roleModel');

        if ($user->roleModel?->name !== 'invest') {
            return null;
        }

        return match ($user->invest_sub_role) {
            'aea' => Sez::class,
            'ia' => IndustrialZone::class,
            'prom_zone' => PromZone::class,
            default => null,
        };
    }

    /** @param array<int, class-string> $zoneClasses */
    private function scopeRegion(
        Builder $query,
        User $user,
        array $zoneClasses
    ): Builder {
        if (! $user->region_id) {
            return $query;
        }

        return $query->whereHasMorph(
            'zoneable',
            $zoneClasses,
            fn (Builder $zone) => $zone->where(
                $zone->getModel()->qualifyColumn('region_id'),
                $user->region_id
            )
        );
    }

    private function regionMatches(
        User $user,
        InvestmentApplication $application
    ): bool {
        if (! $user->region_id) {
            return true;
        }

        return (int) $user->region_id
            === (int) $this->applicationRegionId($application);
    }

    private function applicationRegionId(
        InvestmentApplication $application
    ): ?int {
        $application->loadMissing('zoneable');
        $regionId = $application->zoneable?->region_id;

        return $regionId !== null ? (int) $regionId : null;
    }
}
