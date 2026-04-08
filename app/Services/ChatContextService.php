<?php

namespace App\Services;

use App\Models\IndustrialZone;
use App\Models\IndustrialZoneIssue;
use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use App\Models\Region;
use App\Models\Sez;
use App\Models\SezIssue;
use App\Models\SubsoilIssue;
use App\Models\SubsoilUser;
use Illuminate\Support\Facades\DB;

class ChatContextService
{
    public function buildContext(string $query, array $entities): array
    {
        $context = [];

        foreach ($entities as $entity) {
            switch ($entity) {
                case 'regions':
                    $context['regions'] = $this->getRegionsData($query);
                    break;
                case 'investment_projects':
                    $context['projects'] = $this->getProjectsData($query);
                    break;
                case 'sezs':
                    $context['sezs'] = $this->getSezData($query);
                    break;
                case 'industrial_zones':
                    $context['industrial_zones'] = $this->getIndustrialZonesData($query);
                    break;
                case 'subsoil_users':
                    $context['subsoil_users'] = $this->getSubsoilUsersData($query);
                    break;
                case 'issues':
                    $context['issues'] = $this->getIssuesData($query);
                    break;
                case 'tasks':
                    $context['tasks'] = $this->getTasksData($query);
                    break;
            }
        }

        return $context;
    }

    protected function getRegionsData(string $query): array
    {
        $regions = Region::with(['investmentProjects', 'sezs', 'industrialZones'])
            ->limit(10)
            ->get()
            ->map(function ($region) {
                return [
                    'id' => $region->id,
                    'name' => $region->name,
                    'type' => $region->type,
                    'projects_count' => $region->investmentProjects->count(),
                    'sezs_count' => $region->sezs->count(),
                    'industrial_zones_count' => $region->industrialZones->count(),
                ];
            });

        return $regions->toArray();
    }

    protected function getProjectsData(string $query): array
    {
        $projects = InvestmentProject::with(['region', 'issues'])
            ->when($this->extractRegionName($query), function ($q, $regionName) {
                $q->whereHas('region', function ($rq) use ($regionName) {
                    $rq->where('name', 'ILIKE', "%{$regionName}%");
                });
            })
            ->limit(20)
            ->get()
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'region' => $project->region->name ?? null,
                    'status' => $project->current_status ?? $project->status,
                    'total_investment' => $project->total_investment,
                    'issues_count' => $project->issues->count(),
                    'is_archived' => $project->is_archived,
                ];
            });

        return $projects->toArray();
    }

    protected function getSezData(string $query): array
    {
        $sezs = Sez::with(['region', 'issues'])
            ->limit(10)
            ->get()
            ->map(function ($sez) {
                return [
                    'id' => $sez->id,
                    'name' => $sez->name,
                    'region' => $sez->region->name ?? null,
                    'area' => $sez->area,
                    'issues_count' => $sez->issues->count(),
                ];
            });

        return $sezs->toArray();
    }

    protected function getIndustrialZonesData(string $query): array
    {
        $zones = IndustrialZone::with(['region', 'issues'])
            ->limit(10)
            ->get()
            ->map(function ($zone) {
                return [
                    'id' => $zone->id,
                    'name' => $zone->name,
                    'region' => $zone->region->name ?? null,
                    'area' => $zone->area,
                    'issues_count' => $zone->issues->count(),
                ];
            });

        return $zones->toArray();
    }

    protected function getSubsoilUsersData(string $query): array
    {
        $users = SubsoilUser::with(['region', 'issues'])
            ->limit(10)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'bin' => $user->bin,
                    'region' => $user->region->name ?? null,
                    'mineral_type' => $user->mineral_type,
                    'license_status' => $user->license_status,
                    'issues_count' => $user->issues->count(),
                ];
            });

        return $users->toArray();
    }

    protected function getIssuesData(string $query): array
    {
        $issues = [];

        // Project issues
        $projectIssues = ProjectIssue::with(['project.region'])
            ->where('status', '!=', 'resolved')
            ->limit(20)
            ->get()
            ->map(function ($issue) {
                return [
                    'type' => 'project',
                    'id' => $issue->id,
                    'title' => $issue->title,
                    'status' => $issue->status,
                    'priority' => $issue->priority,
                    'project' => $issue->project->name ?? null,
                    'region' => $issue->project->region->name ?? null,
                ];
            });

        // SEZ issues
        $sezIssues = SezIssue::with(['sez.region'])
            ->where('status', '!=', 'resolved')
            ->limit(10)
            ->get()
            ->map(function ($issue) {
                return [
                    'type' => 'sez',
                    'id' => $issue->id,
                    'title' => $issue->title,
                    'status' => $issue->status,
                    'priority' => $issue->priority,
                    'sez' => $issue->sez->name ?? null,
                    'region' => $issue->sez->region->name ?? null,
                ];
            });

        // Industrial zone issues
        $industrialIssues = IndustrialZoneIssue::with(['industrialZone.region'])
            ->where('status', '!=', 'resolved')
            ->limit(10)
            ->get()
            ->map(function ($issue) {
                return [
                    'type' => 'industrial_zone',
                    'id' => $issue->id,
                    'title' => $issue->title,
                    'status' => $issue->status,
                    'priority' => $issue->priority,
                    'industrial_zone' => $issue->industrialZone->name ?? null,
                    'region' => $issue->industrialZone->region->name ?? null,
                ];
            });

        // Subsoil issues
        $subsoilIssues = SubsoilIssue::with(['subsoilUser.region'])
            ->where('status', '!=', 'resolved')
            ->limit(10)
            ->get()
            ->map(function ($issue) {
                return [
                    'type' => 'subsoil',
                    'id' => $issue->id,
                    'title' => $issue->title,
                    'status' => $issue->status,
                    'priority' => $issue->priority,
                    'subsoil_user' => $issue->subsoilUser->name ?? null,
                    'region' => $issue->subsoilUser->region->name ?? null,
                ];
            });

        return array_merge(
            $projectIssues->toArray(),
            $sezIssues->toArray(),
            $industrialIssues->toArray(),
            $subsoilIssues->toArray()
        );
    }

    protected function getTasksData(string $query): array
    {
        $tasks = DB::table('project_tasks')
            ->join('investment_projects', 'project_tasks.project_id', '=', 'investment_projects.id')
            ->select(
                'project_tasks.id',
                'project_tasks.name',
                'project_tasks.status',
                'project_tasks.due_date',
                'investment_projects.name as project_name'
            )
            ->limit(20)
            ->get()
            ->toArray();

        return $tasks;
    }

    protected function extractRegionName(string $query): ?string
    {
        $regions = ['Туркестанская', 'Шымкент', 'Кентау', 'Арысь'];

        foreach ($regions as $region) {
            if (stripos($query, $region) !== false) {
                return $region;
            }
        }

        return null;
    }
}
