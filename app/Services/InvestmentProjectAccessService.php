<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class InvestmentProjectAccessService
{
    public function scopeVisible(Builder $query, User $user): Builder
    {
        $user->loadMissing(['roleModel', 'region']);
        $roleName = $user->roleModel?->name;

        if ($roleName === 'investor') {
            if ($user->company_id === null) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where('company_id', $user->company_id);
            }
        }

        if ($roleName === 'moderator') {
            $query->curatedByTurkistanInvest();
        }

        if ($user->isDistrictScoped()) {
            $query->where('region_id', $user->region_id);
        } elseif ($user->isOblastScopedAkim()) {
            $oblastId = $user->region_id;
            $query->where(function (Builder $regions) use ($oblastId) {
                $regions->where('region_id', $oblastId)
                    ->orWhereHas(
                        'region',
                        fn (Builder $region) => $region
                            ->where('parent_id', $oblastId)
                    );
            });
        }

        if ($roleName === 'invest') {
            $subRole = $user->invest_sub_role;

            if (in_array(
                $subRole,
                ['turkistan_invest', 'aea', 'ia', 'prom_zone'],
                true
            )) {
                if ($subRole === 'turkistan_invest') {
                    $query->curatedByTurkistanInvest();
                } else {
                    $query->whereHas(
                        'curators',
                        fn (Builder $curators) => $curators
                            ->where('users.invest_sub_role', $subRole)
                    );
                }
            } else {
                $query->whereHas(
                    'curators',
                    fn (Builder $curators) => $curators
                        ->where('users.id', $user->id)
                );
            }
        }

        return $query;
    }

    public function canView(User $user, InvestmentProject $project): bool
    {
        return $this->scopeVisible(
            InvestmentProject::query()->whereKey($project->id),
            $user
        )->exists();
    }
}
