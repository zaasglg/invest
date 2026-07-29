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
            $query->whereHas(
                'investors',
                fn (Builder $investors) => $investors
                    ->where('users.id', $user->id)
            );
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
                $query->whereHas(
                    'curators',
                    fn (Builder $curators) => $curators
                        ->where('users.invest_sub_role', $subRole)
                );
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
