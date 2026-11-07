<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectExecutorAssignmentService
{
    /** @return Collection<int, User> */
    public function districtExecutorsForRegion(?int $regionId): Collection
    {
        if (! $regionId) {
            return new Collection;
        }

        return User::query()->where('region_id', $regionId)
            ->where('baskarma_type', 'district')
            ->whereHas('roleModel', fn ($query) => $query->where('name', 'ispolnitel'))
            ->get();
    }

    /** @param array<int, int|string> $selectedExecutorIds */
    public function syncProject(InvestmentProject $project, array $selectedExecutorIds): void
    {
        $selected = array_values(array_unique(array_map('intval', $selectedExecutorIds)));
        $automatic = $project->status === 'plan' ? []
            : $this->districtExecutorsForRegion($project->region_id)->modelKeys();
        $activeResponsible = $project->attractionActivities()
            ->whereIn('status', ['planned', 'in_progress', 'pending_review'])
            ->whereNotNull('responsible_id')->pluck('responsible_id')->map(fn ($id) => (int) $id)->all();
        $currentExecutors = $project->executors()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        if (array_diff(array_intersect($activeResponsible, $currentExecutors), $selected, $automatic)) {
            throw ValidationException::withMessages([
                'executor_ids' => 'Аяқталмаған іс-шараның жауаптысын алып тастауға болмайды. Алдымен жұмысты аяқтаңыз, тоқтатыңыз немесе басқа адамға беріңіз.',
            ]);
        }

        $records = [];
        $manual = $project->executors()->wherePivot('assignment_source', 'manual')->pluck('users.id')->all();
        foreach (array_unique([...$selected, ...$automatic]) as $id) {
            $records[$id] = ['assignment_source' => in_array($id, $automatic, true)
                && ! in_array($id, $manual, true) ? 'automatic' : 'manual'];
        }
        $project->executors()->sync($records);
    }

    /** @return Collection<int, User> */
    public function attachDistrictExecutors(InvestmentProject $project): Collection
    {
        $automatic = $project->status === 'plan' || $project->is_archived || $project->is_deleted
            ? new Collection : $this->districtExecutorsForRegion($project->region_id);
        $automaticIds = $automatic->modelKeys();
        $obsolete = $project->executors()->wherePivot('assignment_source', 'automatic')
            ->whereNotIn('users.id', $automaticIds)->pluck('users.id');

        foreach ($obsolete as $userId) {
            if ($this->hasAssignedWork($project, (int) $userId)) {
                $project->executors()->updateExistingPivot($userId, ['assignment_source' => 'task']);
            } else {
                $project->executors()->detach($userId);
            }
        }

        $existing = $project->executors()->pluck('users.id')->all();
        foreach (array_diff($automaticIds, $existing) as $id) {
            $project->executors()->syncWithoutDetaching([$id => ['assignment_source' => 'automatic']]);
        }

        return $automatic;
    }

    public function attachExecutorToRegionProjects(User $user): void
    {
        $user->load('roleModel');
        $isDistrict = $user->roleModel?->name === 'ispolnitel'
            && $user->baskarma_type === 'district' && $user->region_id;
        $automaticProjects = DB::table('investment_project_user')
            ->where('user_id', $user->id)->where('assignment_source', 'automatic')
            ->pluck('investment_project_id');

        InvestmentProject::query()->whereIn('id', $automaticProjects)->get()
            ->each(fn (InvestmentProject $project) => $this->attachDistrictExecutors($project));

        if ($isDistrict) {
            InvestmentProject::query()->active()->where('status', '!=', 'plan')
                ->where('region_id', $user->region_id)->get()
                ->each(fn (InvestmentProject $project) => $this->attachDistrictExecutors($project));
        }
    }

    public function isAutomaticDistrictExecutor(InvestmentProject $project, int $userId): bool
    {
        return $project->status !== 'plan'
            && User::query()->whereKey($userId)->where('region_id', $project->region_id)
                ->where('baskarma_type', 'district')
                ->whereHas('roleModel', fn ($query) => $query->where('name', 'ispolnitel'))->exists();
    }

    public function assignTaskExecutor(InvestmentProject $project, int $userId): void
    {
        if (! $project->executors()->whereKey($userId)->exists()) {
            $project->executors()->syncWithoutDetaching([$userId => ['assignment_source' => 'task']]);
        }
    }

    public function releaseTaskAssignment(InvestmentProject $project, int $userId): void
    {
        if (! $this->hasAssignedWork($project, $userId)) {
            $project->executors()->wherePivot('assignment_source', 'task')->detach($userId);
        }
    }

    private function hasAssignedWork(InvestmentProject $project, int $userId): bool
    {
        return $project->tasks()->where('assigned_to', $userId)->exists()
            || $project->attractionActivities()->where('responsible_id', $userId)
                ->whereIn('status', ['planned', 'in_progress', 'pending_review'])->exists();
    }
}
