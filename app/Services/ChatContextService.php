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
            ->get();

        $totalProjects = 0;
        $totalSezs = 0;
        $totalIZ = 0;

        $items = $regions->map(function ($region) use (&$totalProjects, &$totalSezs, &$totalIZ) {
            $projectsCount = $region->investmentProjects->count();
            $sezsCount = $region->sezs->count();
            $izCount = $region->industrialZones->count();

            $totalProjects += $projectsCount;
            $totalSezs += $sezsCount;
            $totalIZ += $izCount;

            return [
                'id' => $region->id,
                'name' => $region->name,
                'type' => $region->type,
                'projects_count' => $projectsCount,
                'sezs_count' => $sezsCount,
                'industrial_zones_count' => $izCount,
            ];
        })->toArray();

        return [
            'total_regions' => count($items),
            'total_projects' => $totalProjects,
            'total_sezs' => $totalSezs,
            'total_industrial_zones' => $totalIZ,
            'items' => $items,
        ];
    }

    protected function getProjectsData(string $query): array
    {
        $projectsQuery = InvestmentProject::with(['region', 'issues']);

        if ($regionName = $this->extractRegionName($query)) {
            $projectsQuery->whereHas('region', fn ($q) => $q->where('name', 'ILIKE', "%{$regionName}%"));
        }

        // Жалпы санды алу
        $totalCount = (clone $projectsQuery)->count();

        $projects = $projectsQuery
            ->limit(20)
            ->get()
            ->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'region' => $project->region->name ?? null,
                'status' => $project->current_status ?? $project->status,
                'total_investment' => $project->total_investment,
                'issues_count' => $project->issues->count(),
            ])
            ->toArray();

        return [
            'total_count' => $totalCount,
            'shown_count' => count($projects),
            'items' => $projects,
        ];
    }

    protected function getSezData(string $query): array
    {
        $sezs = Sez::with(['region', 'issues'])->get();
        $totalCount = $sezs->count();

        $items = $sezs->take(10)->map(fn ($sez) => [
            'id' => $sez->id,
            'name' => $sez->name,
            'region' => $sez->region->name ?? null,
            'area' => $sez->area,
            'issues_count' => $sez->issues->count(),
        ])->toArray();

        return [
            'total_count' => $totalCount,
            'items' => $items,
        ];
    }

    protected function getIndustrialZonesData(string $query): array
    {
        $zones = IndustrialZone::with(['region', 'issues'])->get();
        $totalCount = $zones->count();

        $items = $zones->take(10)->map(fn ($zone) => [
            'id' => $zone->id,
            'name' => $zone->name,
            'region' => $zone->region->name ?? null,
            'area' => $zone->area,
            'issues_count' => $zone->issues->count(),
        ])->toArray();

        return [
            'total_count' => $totalCount,
            'items' => $items,
        ];
    }

    protected function getSubsoilUsersData(string $query): array
    {
        $users = SubsoilUser::with(['region', 'issues'])->get();
        $totalCount = $users->count();

        $items = $users->take(10)->map(fn ($user) => [
            'id' => $user->id,
            'name' => $user->name,
            'bin' => $user->bin,
            'region' => $user->region->name ?? null,
            'mineral_type' => $user->mineral_type,
            'license_status' => $user->license_status,
            'issues_count' => $user->issues->count(),
        ])->toArray();

        return [
            'total_count' => $totalCount,
            'items' => $items,
        ];
    }

    protected function getIssuesData(string $query): array
    {
        $projectIssues = ProjectIssue::with(['project.region'])
            ->where('status', '!=', 'resolved')
            ->limit(15)
            ->get()
            ->map(fn ($issue) => [
                'type' => 'project',
                'id' => $issue->id,
                'title' => $issue->title,
                'status' => $issue->status,
                'priority' => $issue->priority,
                'project' => $issue->project->name ?? null,
            ]);

        $sezIssues = SezIssue::with(['sez'])
            ->where('status', '!=', 'resolved')
            ->limit(10)
            ->get()
            ->map(fn ($issue) => [
                'type' => 'sez',
                'id' => $issue->id,
                'title' => $issue->title,
                'status' => $issue->status,
                'sez' => $issue->sez->name ?? null,
            ]);

        return array_merge($projectIssues->toArray(), $sezIssues->toArray());
    }

    protected function getTasksData(string $query): array
    {
        return DB::table('project_tasks')
            ->join('investment_projects', 'project_tasks.project_id', '=', 'investment_projects.id')
            ->select(
                'project_tasks.id',
                'project_tasks.title',
                'project_tasks.status',
                'project_tasks.due_date',
                'investment_projects.name as project_name'
            )
            ->limit(20)
            ->get()
            ->toArray();
    }

    protected function extractRegionName(string $query): ?string
    {
        $regions = ['Туркестанская', 'Шымкент', 'Кентау', 'Арысь', 'Түркістан'];

        foreach ($regions as $region) {
            if (stripos($query, $region) !== false) {
                return $region;
            }
        }

        return null;
    }
}
