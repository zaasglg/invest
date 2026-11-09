<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ProjectTaskAssigneeService
{
    public function __construct(private readonly InvestmentProjectAccessService $access) {}

    public function query(int $projectId): Builder
    {
        return User::query()
            ->select('id', 'full_name', 'role_id', 'baskarma_type', 'region_id', 'position', 'company_id')
            ->with('roleModel:id,name,display_name')
            ->where(function (Builder $query) use ($projectId) {
                $query->whereHas('roleModel', fn (Builder $role) => $role->where('name', 'ispolnitel'))
                    ->orWhere(fn (Builder $investor) => $investor
                        ->whereHas('roleModel', fn (Builder $role) => $role->where('name', 'investor'))
                        ->whereHas('investorProjects', fn (Builder $project) => $project
                            ->where('investment_projects.id', $projectId)));
            })
            ->orderBy('full_name');
    }

    public function validate(int $userId, InvestmentProject $project, string $field = 'assigned_to'): User
    {
        $assignee = $this->query($project->id)->whereKey($userId)->first();
        if (! $assignee) {
            throw ValidationException::withMessages([
                $field => 'Орындаушыны немесе осы жобаға бекітілген инвесторды таңдаңыз.',
            ]);
        }

        return $assignee;
    }

    /** @return Collection<int, User> */
    public function attractionUsers(InvestmentProject $project, ?int $existingResponsibleId = null): Collection
    {
        $users = $this->query($project->id)->get();

        // Preserve a legacy manager assignment when editing its own activity;
        // new activities use exactly the same assignee choices as the roadmap.
        if ($existingResponsibleId && ! $users->contains('id', $existingResponsibleId)) {
            $existing = User::with('roleModel')->find($existingResponsibleId);
            if ($existing && $this->access->canManage($existing, $project)) {
                $users->push($existing);
            }
        }

        return $users->sortBy('full_name')->values();
    }
}
