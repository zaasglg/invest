<?php

namespace App\Services;

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use App\Models\ProjectType;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\SezIssue;
use App\Models\SubsoilUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ChatContextService
{
    public function __construct(
        private readonly InvestmentRecommendationService $recommendations,
        private readonly InvestmentProjectAccessService $projectAccess
    ) {}

    public function buildContext(
        string $query,
        array $entities,
        ?User $user = null
    ): array {
        $user?->loadMissing(['roleModel', 'company.region']);

        // Минимальная статистика присутствует всегда
        $context = [
            'overview' => $this->getOverviewStats($user),
        ];

        if ($this->isInvestor($user)) {
            $context['investor_profile'] = $this->getInvestorProfile($user);
        }

        foreach ($entities as $entity) {
            switch ($entity) {
                case 'regions':
                    $context['regions'] = $this->getRegionsData($query);
                    break;
                case 'investment_projects':
                    $context['projects'] = $this->getProjectsData($query, $user);
                    break;
                case 'project_types':
                    $context['project_types'] = $this->getProjectTypesData();
                    break;
                case 'sezs':
                    $context['sezs'] = $this->getSezData($query, $user);
                    break;
                case 'industrial_zones':
                    $context['industrial_zones'] = $this
                        ->getIndustrialZonesData($query, $user);
                    break;
                case 'prom_zones':
                    $context['prom_zones'] = $this
                        ->getPromZonesData($query, $user);
                    break;
                case 'subsoil_users':
                    $context['subsoil_users'] = $this
                        ->getSubsoilUsersData($query, $user);
                    break;
                case 'issues':
                    $context['issues'] = $this->getIssuesData($query, $user);
                    break;
                case 'tasks':
                    $context['tasks'] = $this->getTasksData($query, $user);
                    break;
                case 'users':
                    $context['users'] = $this->getUsersData($query);
                    break;
                case 'gallery':
                    $context['gallery'] = $this->getGalleryData($query, $user);
                    break;
                case 'rating':
                    $context['rating'] = $this->getRatingData();
                    break;
                case 'support_measures':
                    $context['support_measures'] = $this->recommendations
                        ->supportMeasures($query, $user);
                    break;
                case 'regional_assets':
                    $context['regional_assets'] = $this->recommendations
                        ->regionalAssets($query, $user);
                    break;
            }
        }

        return $context;
    }

    protected function getOverviewStats(?User $user): array
    {
        $projects = $this->visibleProjects($user);

        $activeIssues = ProjectIssue::query()
            ->where('status', '!=', 'resolved')
            ->whereIn('project_id', (clone $projects)->select('id'));

        return [
            'total_projects' => (clone $projects)->count(),
            'total_investment' => (float) (clone $projects)
                ->sum('total_investment'),
            'total_sezs' => Sez::count(),
            'total_industrial_zones' => IndustrialZone::count(),
            'total_prom_zones' => PromZone::count(),
            'total_subsoil_users' => SubsoilUser::count(),
            'active_issues' => $activeIssues->count(),
        ];
    }

    protected function getInvestorProfile(User $user): array
    {
        return [
            'company' => $user->company?->display_name,
            'activity_type' => $user->company?->activity_type,
            'region' => $user->company?->region?->name,
        ];
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

    protected function getProjectsData(string $query, ?User $user): array
    {
        $projectsQuery = $this->visibleProjects($user)
            ->with(['region', 'issues']);

        if ($regionName = $this->extractRegionName($query)) {
            $projectsQuery->whereHas('region', fn ($q) => $q->where('name', 'ILIKE', "%{$regionName}%"));
        }

        $allProjects = (clone $projectsQuery)->get();
        $totalCount = $allProjects->count();

        // Агрегированная статистика по всем проектам
        $totalInvestment = $allProjects->sum('total_investment');
        $byStatus = $allProjects->groupBy(fn ($p) => $p->current_status ?? $p->status ?? 'unknown')
            ->map->count()
            ->toArray();

        $items = $allProjects->take(20)
            ->map(fn ($project) => [
                'name' => $project->name,
                'region' => $project->region->name ?? null,
                'status' => $project->current_status ?? $project->status,
                'total_investment' => $project->total_investment,
                'issues_count' => $project->issues->count(),
            ])
            ->values()
            ->toArray();

        return [
            'total_count' => $totalCount,
            'total_investment_sum' => $totalInvestment,
            'by_status' => $byStatus,
            'items' => $items,
        ];
    }

    protected function getSezData(string $query, ?User $user): array
    {
        $sezsQuery = Sez::with(['region', 'issues']);
        $this->scopeRegionalResource($sezsQuery, $user);
        $sezs = $sezsQuery->get();
        $totalCount = $sezs->count();

        $items = $sezs->take(10)->map(fn ($sez) => [
            'id' => $sez->id,
            'name' => $sez->name,
            'region' => $sez->region->name ?? null,
            'area' => $sez->total_area,
            'issues_count' => $sez->issues->count(),
        ])->toArray();

        return [
            'total_count' => $totalCount,
            'items' => $items,
        ];
    }

    protected function getIndustrialZonesData(
        string $query,
        ?User $user
    ): array {
        $zonesQuery = IndustrialZone::with(['region', 'issues']);
        $this->scopeRegionalResource($zonesQuery, $user);
        $zones = $zonesQuery->get();
        $totalCount = $zones->count();

        $items = $zones->take(10)->map(fn ($zone) => [
            'id' => $zone->id,
            'name' => $zone->name,
            'region' => $zone->region->name ?? null,
            'area' => $zone->total_area,
            'issues_count' => $zone->issues->count(),
        ])->toArray();

        return [
            'total_count' => $totalCount,
            'items' => $items,
        ];
    }

    protected function getSubsoilUsersData(
        string $query,
        ?User $user
    ): array {
        $usersQuery = SubsoilUser::with(['region', 'issues']);
        $this->scopeRegionalResource($usersQuery, $user);
        $users = $usersQuery->get();
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

    protected function getIssuesData(string $query, ?User $user): array
    {
        $visibleProjects = $this->visibleProjects($user);
        $projectIssues = ProjectIssue::with(['project.region'])
            ->where('status', '!=', 'resolved')
            ->whereIn('project_id', $visibleProjects->select('id'))
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

        $sezIssues = collect();

        if ($user?->roleModel?->name !== 'moderator') {
            $sezIssuesQuery = SezIssue::with(['sez'])
                ->where('status', '!=', 'resolved');

            if ($user?->isDistrictScoped()) {
                $sezIssuesQuery->whereHas(
                    'sez',
                    fn (Builder $sez) => $sez
                        ->where('region_id', $user->region_id)
                );
            }

            $sezIssues = $sezIssuesQuery
                ->limit(10)
                ->get()
                ->map(fn ($issue) => [
                    'type' => 'sez',
                    'id' => $issue->id,
                    'title' => $issue->title,
                    'status' => $issue->status,
                    'sez' => $issue->sez->name ?? null,
                ]);
        }

        return array_merge($projectIssues->toArray(), $sezIssues->toArray());
    }

    protected function getTasksData(string $query, ?User $user): array
    {
        $visibleProjects = $this->visibleProjects($user);
        $tasks = DB::table('project_tasks')
            ->join('investment_projects', 'project_tasks.project_id', '=', 'investment_projects.id')
            ->select(
                'project_tasks.id',
                'project_tasks.title',
                'project_tasks.status',
                'project_tasks.due_date',
                'investment_projects.name as project_name'
            )
            ->whereIn(
                'investment_projects.id',
                $visibleProjects->select('id')
            );

        if ($this->isInvestor($user)
            || $user?->roleModel?->name === 'ispolnitel') {
            $tasks->where('project_tasks.assigned_to', $user->id);
        }

        return $tasks
            ->limit(20)
            ->get()
            ->toArray();
    }

    protected function extractRegionName(string $query): ?string
    {
        $regions = Region::pluck('name')->toArray();

        // Суффиксы, которые не являются уникальными идентификаторами
        $genericSuffixes = ['ауданы', 'аудан', 'қаласы', 'қала', 'облысы', 'облыс'];

        // Шаг 1: Точное совпадение — название региона целиком в запросе
        foreach ($regions as $regionName) {
            if (mb_stripos($query, $regionName) !== false) {
                return $regionName;
            }
        }

        // Шаг 2: Совпадение по уникальному ключевому слову (исключая суффиксы)
        $lowerQuery = mb_strtolower($query);

        foreach ($regions as $regionName) {
            $words = explode(' ', mb_strtolower($regionName));
            foreach ($words as $word) {
                if (mb_strlen($word) < 4 || in_array($word, $genericSuffixes)) {
                    continue;
                }
                // Ищем слово как отдельный токен (с учётом казахских падежных окончаний)
                $root = mb_substr($word, 0, mb_strlen($word) - 1); // обрезаем 1 символ для падежей
                if (mb_strlen($root) >= 4 && mb_stripos($lowerQuery, $root) !== false) {
                    return $regionName;
                }
            }
        }

        return null;
    }

    protected function getProjectTypesData(): array
    {
        $types = ProjectType::withCount('projects')->get();

        return [
            'total_count' => $types->count(),
            'items' => $types->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'projects_count' => $t->projects_count,
            ])->toArray(),
        ];
    }

    protected function getPromZonesData(string $query, ?User $user): array
    {
        $zonesQuery = PromZone::with(['region', 'issues']);
        $this->scopeRegionalResource($zonesQuery, $user);
        $zones = $zonesQuery->get();
        $totalCount = $zones->count();

        $items = $zones->take(10)->map(fn ($zone) => [
            'id' => $zone->id,
            'name' => $zone->name,
            'region' => $zone->region->name ?? null,
            'area' => $zone->total_area ?? null,
            'issues_count' => $zone->issues->count(),
        ])->toArray();

        return [
            'total_count' => $totalCount,
            'items' => $items,
        ];
    }

    protected function getUsersData(string $query): array
    {
        $roles = Role::withCount('users')->get()->map(fn ($r) => [
            'name' => $r->name,
            'display_name' => $r->display_name,
            'users_count' => $r->users_count,
        ])->toArray();

        $totalUsers = User::count();

        return [
            'total_users' => $totalUsers,
            'roles' => $roles,
        ];
    }

    protected function getGalleryData(string $query, ?User $user): array
    {
        $visibleProjects = $this->visibleProjects($user);
        $photos = DB::table('project_photos')
            ->join(
                'investment_projects',
                'project_photos.project_id',
                '=',
                'investment_projects.id'
            )
            ->whereIn(
                'investment_projects.id',
                $visibleProjects->select('id')
            );

        $totalPhotos = (clone $photos)->count('project_photos.id');
        $recentPhotos = (clone $photos)
            ->select(
                'investment_projects.name as project_name',
                DB::raw('count(*) as photos_count'),
                DB::raw('max(project_photos.created_at) as last_upload')
            )
            ->groupBy('investment_projects.id', 'investment_projects.name')
            ->orderByDesc('last_upload')
            ->limit(10)
            ->get()
            ->toArray();

        return [
            'total_photos' => $totalPhotos,
            'recent_by_project' => $recentPhotos,
        ];
    }

    protected function isInvestor(?User $user): bool
    {
        return $user?->roleModel?->name === 'investor';
    }

    protected function visibleProjects(?User $user): Builder
    {
        $projects = InvestmentProject::query()->active();

        if ($user) {
            $this->projectAccess->scopeVisible($projects, $user);
        }

        return $projects;
    }

    protected function scopeRegionalResource(
        Builder $query,
        ?User $user
    ): void {
        if ($user?->isDistrictScoped()) {
            $query->where('region_id', $user->region_id);
        }
    }

    protected function getRatingData(): array
    {
        $users = User::whereHas('roleModel', fn ($q) => $q->where('name', 'ispolnitel'))
            ->with(['region', 'roleModel'])
            ->get()
            ->map(fn ($u) => [
                'name' => $u->full_name,
                'region' => $u->region->name ?? null,
                'position' => $u->position,
            ])->toArray();

        return [
            'total_ispolnitel' => count($users),
            'items' => $users,
        ];
    }
}
