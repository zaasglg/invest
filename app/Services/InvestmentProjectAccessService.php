<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;

class InvestmentProjectAccessService
{
    public function scopeVisible(
        Builder|Relation $query,
        User $user
    ): Builder|Relation {
        $user->loadMissing(['roleModel', 'region']);
        $roleName = $user->roleModel?->name;

        if (! $user->hasSupportedRole() || $roleName === 'applicant') {
            return $query->whereRaw('1 = 0');
        }

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
                User::INVEST_SUB_ROLES,
                true
            )) {
                if ($user->isTurkistanInvestDirection()) {
                    $query->curatedByTurkistanInvest();
                    $this->scopeTurkistanInvestProjectStatus($query, $user);
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
        $user->loadMissing('roleModel');
        if ($project->is_deleted && $user->roleModel?->name === 'superadmin') {
            return true;
        }

        if ($user->isTurkistanInvestAccompaniment()
            && $this->canViewPendingReserve($user, $project)) {
            return true;
        }

        return $this->scopeVisible(
            InvestmentProject::query()->whereKey($project->id),
            $user
        )->exists();
    }

    public function canManage(User $user, InvestmentProject $project): bool
    {
        $user->loadMissing('roleModel');

        if ($project->is_deleted || ! in_array($user->roleModel?->name, ['superadmin', 'invest', 'moderator'], true)
            || ! $this->canView($user, $project)) {
            return false;
        }

        return $user->roleModel?->name !== 'invest'
            // Known Invest directions share management of their visible projects.
            // canView above still enforces the direction and regional boundaries.
            || in_array($user->invest_sub_role, User::INVEST_SUB_ROLES, true)
            || $project->curators()->whereKey($user->id)->exists()
            || (! $project->curators()->exists() && (int) $project->created_by === (int) $user->id);
    }

    private function scopeTurkistanInvestProjectStatus(
        Builder|Relation $query,
        User $user
    ): void {
        $model = $query instanceof Relation
            ? $query->getRelated()
            : $query->getModel();
        $statusColumn = $model->qualifyColumn('status');

        if ($user->isTurkistanInvestAttraction()) {
            $handoverToColumn = $model->qualifyColumn(
                'attraction_handover_to_id'
            );
            $handoverRequesterColumn = $model->qualifyColumn(
                'attraction_handover_requested_by'
            );
            $query
                ->where($statusColumn, 'plan')
                ->where(fn (Builder $visible) => $visible
                    ->withoutPendingAttractionReserve()
                    ->orWhere($handoverToColumn, $user->id)
                    ->orWhere($handoverRequesterColumn, $user->id));

            return;
        }

        $query->where($statusColumn, '!=', 'plan');
    }

    private function canViewPendingReserve(
        User $user,
        InvestmentProject $project
    ): bool {
        if ($user->region_id
            && (int) $project->region_id !== (int) $user->region_id) {
            return false;
        }

        return InvestmentProject::query()
            ->active()
            ->curatedByTurkistanInvest()
            ->whereKey($project->id)
            ->where('status', 'plan')
            ->where('attraction_stage', 'handover')
            ->whereNull('attraction_handover_to_id')
            ->whereNotNull('attraction_handover_requested_at')
            ->whereNull('attraction_handover_accepted_at')
            ->whereNull('attraction_handover_rejected_at')
            ->exists();
    }
}
