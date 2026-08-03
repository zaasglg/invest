<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ProjectExecutorAssignmentService
{
    /**
     * @return Collection<int, User>
     */
    public function districtExecutorsForRegion(?int $regionId): Collection
    {
        if (! $regionId) {
            return new Collection;
        }

        return User::query()
            ->where('region_id', $regionId)
            ->where('baskarma_type', 'district')
            ->whereHas(
                'roleModel',
                fn ($query) => $query->where('name', 'ispolnitel')
            )
            ->get();
    }

    /**
     * Keep manually selected executors and always include every district
     * executor belonging to the project's region.
     *
     * @param  array<int, int|string>  $selectedExecutorIds
     */
    public function syncProject(
        InvestmentProject $project,
        array $selectedExecutorIds
    ): void {
        $districtExecutorIds = $this->districtExecutorsForRegion(
            $project->region_id
        )->modelKeys();

        $executorIds = array_values(array_unique(array_map(
            'intval',
            [...$selectedExecutorIds, ...$districtExecutorIds]
        )));

        $project->executors()->sync($executorIds);
    }

    /**
     * Self-heal automatic assignments without removing manually selected
     * executors or task assignees.
     *
     * @return Collection<int, User>
     */
    public function attachDistrictExecutors(
        InvestmentProject $project
    ): Collection {
        $districtExecutors = $this->districtExecutorsForRegion(
            $project->region_id
        );

        if ($districtExecutors->isNotEmpty()) {
            $project->executors()->syncWithoutDetaching(
                $districtExecutors->modelKeys()
            );
        }

        return $districtExecutors;
    }

    /**
     * When a district executor is created or moved to another region, attach
     * the account to every project currently belonging to that region.
     */
    public function attachExecutorToRegionProjects(User $user): void
    {
        $user->loadMissing('roleModel');

        if ($user->roleModel?->name !== 'ispolnitel'
            || $user->baskarma_type !== 'district'
            || ! $user->region_id) {
            return;
        }

        InvestmentProject::query()
            ->where('region_id', $user->region_id)
            ->pluck('id')
            ->chunk(500)
            ->each(fn ($projectIds) => $user->involvedProjects()
                ->syncWithoutDetaching($projectIds->all()));
    }

    public function isAutomaticDistrictExecutor(
        InvestmentProject $project,
        int $userId
    ): bool {
        return User::query()
            ->whereKey($userId)
            ->where('region_id', $project->region_id)
            ->where('baskarma_type', 'district')
            ->whereHas(
                'roleModel',
                fn ($query) => $query->where('name', 'ispolnitel')
            )
            ->exists();
    }
}
