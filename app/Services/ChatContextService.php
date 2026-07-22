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
use Illuminate\Support\Str;

class ChatContextService
{
    public function buildContext(
        string $query,
        array $entities,
        ?User $user = null,
    ): array
    {
        $context = [
            'overview' => $this->getOverviewStats($user),
        ];

        foreach ($entities as $entity) {
            switch ($entity) {
                case 'regions':
                    $context['regions'] = $this->getRegionsData($query, $user);
                    break;
                case 'investment_projects':
                    $context['projects'] = $this->getProjectsData($query, $user);
                    break;
                case 'project_types':
                    $context['project_types'] = $this->getProjectTypesData();
                    break;
                case 'sezs':
                    $context['sezs'] = $this->getSezData($query);
                    break;
                case 'industrial_zones':
                    $context['industrial_zones'] = $this->getIndustrialZonesData($query);
                    break;
                case 'prom_zones':
                    $context['prom_zones'] = $this->getPromZonesData($query);
                    break;
                case 'subsoil_users':
                    $context['subsoil_users'] = $this->getSubsoilUsersData($query);
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
                    $context['gallery'] = $this->getGalleryData($query);
                    break;
                case 'rating':
                    $context['rating'] = $this->getRatingData();
                    break;
            }
        }

        return $context;
    }

    protected function getOverviewStats(?User $user): array
    {
        $projects = InvestmentProject::query()->active();
        $this->scopeProjectsForUser($projects, $user);

        $projectIssues = ProjectIssue::query()
            ->where('status', '!=', 'resolved')
            ->whereHas('project', function (Builder $query) use ($user) {
                $query->active();
                $this->scopeProjectsForUser($query, $user);
            });

        return [
            'total_projects' => (clone $projects)->count(),
            'total_investment' => (float) (clone $projects)->sum('total_investment'),
            'total_sezs' => Sez::count(),
            'total_industrial_zones' => IndustrialZone::count(),
            'total_prom_zones' => PromZone::count(),
            'total_subsoil_users' => SubsoilUser::count(),
            'active_issues' => $projectIssues->count(),
        ];
    }

    protected function getRegionsData(string $query, ?User $user): array
    {
        $regionsQuery = Region::query()->withCount(['sezs', 'industrialZones']);

        if ($user?->isDistrictScoped()) {
            $regionsQuery->whereKey($user->region_id);
        } elseif ($user?->isOblastScopedAkim()) {
            $regionsQuery->where(function (Builder $query) use ($user) {
                $query->whereKey($user->region_id)
                    ->orWhere('parent_id', $user->region_id);
            });
        }

        $regions = $regionsQuery->get();

        $projects = InvestmentProject::query()->active();
        $this->scopeProjectsForUser($projects, $user);
        $projectCounts = $projects
            ->selectRaw('region_id, count(*) as aggregate')
            ->groupBy('region_id')
            ->pluck('aggregate', 'region_id');

        $totalProjects = 0;
        $totalSezs = 0;
        $totalIZ = 0;

        $items = $regions->map(function ($region) use (
            $projectCounts,
            &$totalProjects,
            &$totalSezs,
            &$totalIZ,
        ) {
            $projectsCount = (int) ($projectCounts[$region->id] ?? 0);
            $sezsCount = (int) $region->sezs_count;
            $izCount = (int) $region->industrial_zones_count;

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
        $projectsQuery = InvestmentProject::query()
            ->active()
            ->with([
                'region',
                'projectType',
                'issues',
                'sezs:id,name',
                'industrialZones:id,name',
                'promZones:id,name',
                'subsoilUsers:id,name',
            ]);

        $this->scopeProjectsForUser($projectsQuery, $user);
        $totalAvailable = (clone $projectsQuery)->count();

        if ($regionName = $this->extractRegionName($query)) {
            $projectsQuery->whereHas('region', fn ($q) => $q->where('name', 'ILIKE', "%{$regionName}%"));
        }

        if ($status = $this->extractProjectStatus($query)) {
            $projectsQuery->where('status', $status);
        }

        $catalog = (clone $projectsQuery)
            ->limit(100)
            ->get()
            ->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'company' => $project->company_name,
                'region' => $project->region->name ?? null,
                'project_type' => $project->projectType->name ?? null,
                'status' => $project->current_status ?? $project->status,
            ])
            ->values()
            ->all();

        $searchTerms = $this->extractProjectSearchTerms($query, $regionName);
        if (! empty($searchTerms)) {
            $projectsQuery->where(function (Builder $searchQuery) use ($searchTerms) {
                foreach ($searchTerms as $term) {
                    $needle = match (true) {
                        mb_strlen($term) > 7 => mb_substr($term, 0, 6),
                        mb_strlen($term) > 5 => mb_substr($term, 0, -1),
                        default => $term,
                    };

                    $searchQuery->orWhere('name', 'ILIKE', "%{$needle}%")
                        ->orWhere('company_name', 'ILIKE', "%{$needle}%")
                        ->orWhere('description', 'ILIKE', "%{$needle}%")
                        ->orWhere('capacity', 'ILIKE', "%{$needle}%")
                        ->orWhereHas(
                            'projectType',
                            fn (Builder $typeQuery) => $typeQuery
                                ->where('name', 'ILIKE', "%{$needle}%"),
                        );
                }
            });
        }

        $allProjects = (clone $projectsQuery)->orderBy('sort_order')->get();
        $totalCount = $allProjects->count();

        $totalInvestment = $allProjects->sum('total_investment');
        $byStatus = $allProjects->groupBy(fn ($p) => $p->current_status ?? $p->status ?? 'unknown')
            ->map->count()
            ->toArray();

        $items = $allProjects->take(20)
            ->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'company' => $project->company_name,
                'description' => Str::limit((string) $project->description, 600),
                'region' => $project->region->name ?? null,
                'project_type' => $project->projectType->name ?? null,
                'sector' => $project->sector ?? null,
                'status' => $project->current_status ?? $project->status,
                'base_status' => $project->status,
                'total_investment' => $project->total_investment,
                'jobs_count' => $project->jobs_count,
                'capacity' => $project->capacity,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'end_date' => $project->end_date?->format('Y-m-d'),
                'infrastructure' => $project->infrastructure,
                'sezs' => $project->sezs->pluck('name')->values()->all(),
                'industrial_zones' => $project->industrialZones
                    ->pluck('name')->values()->all(),
                'prom_zones' => $project->promZones->pluck('name')->values()->all(),
                'subsoil_users' => $project->subsoilUsers
                    ->pluck('name')->values()->all(),
                'open_issues' => $project->issues
                    ->where('status', '!=', 'resolved')
                    ->take(5)
                    ->map(fn ($issue) => [
                        'title' => $issue->title,
                        'description' => Str::limit((string) $issue->description, 300),
                        'severity' => $issue->severity ?? $issue->priority,
                        'status' => $issue->status,
                    ])
                    ->values()
                    ->all(),
                'page_url' => '/investment-projects/'.$project->id,
            ])
            ->values()
            ->toArray();

        return [
            'total_available_for_user' => $totalAvailable,
            'total_count' => $totalCount,
            'total_investment_sum' => $totalInvestment,
            'by_status' => $byStatus,
            'search_terms' => $searchTerms,
            'region_filter' => $regionName,
            'items' => $items,
            'catalog' => $catalog,
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

    protected function getIssuesData(string $query, ?User $user): array
    {
        $projectIssues = ProjectIssue::with(['project.region'])
            ->where('status', '!=', 'resolved')
            ->whereHas('project', function (Builder $builder) use ($user) {
                $builder->active();
                $this->scopeProjectsForUser($builder, $user);
            })
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

    protected function getTasksData(string $query, ?User $user): array
    {
        $tasks = DB::table('project_tasks')
            ->join('investment_projects', 'project_tasks.project_id', '=', 'investment_projects.id')
            ->select(
                'project_tasks.id',
                'project_tasks.title',
                'project_tasks.status',
                'project_tasks.due_date',
                'investment_projects.name as project_name'
            );

        if ($user?->roleModel?->name === 'ispolnitel') {
            $tasks->where('project_tasks.assigned_to', $user->id);
        } elseif ($user?->isDistrictScoped()) {
            $tasks->where('investment_projects.region_id', $user->region_id);
        } elseif ($user?->isOblastScopedAkim()) {
            $regionIds = Region::query()
                ->whereKey($user->region_id)
                ->orWhere('parent_id', $user->region_id)
                ->pluck('id');
            $tasks->whereIn('investment_projects.region_id', $regionIds);
        }

        return $tasks
            ->limit(20)
            ->get()
            ->toArray();
    }

    protected function scopeProjectsForUser(
        Builder $query,
        ?User $user,
    ): void {
        if ($user?->isDistrictScoped()) {
            $query->where('region_id', $user->region_id);
        } elseif ($user?->isOblastScopedAkim()) {
            $query->where(function (Builder $builder) use ($user) {
                $builder->where('region_id', $user->region_id)
                    ->orWhereHas('region', fn (Builder $regionQuery) => $regionQuery
                        ->where('parent_id', $user->region_id));
            });
        }

        if ($user?->roleModel?->name === 'invest'
            && in_array(
                $user->invest_sub_role,
                ['turkistan_invest', 'aea', 'ia', 'prom_zone'],
                true,
            )) {
            $query->whereHas('curators', fn (Builder $curatorQuery) => $curatorQuery
                ->where('users.invest_sub_role', $user->invest_sub_role));
        }
    }

    protected function extractProjectStatus(string $query): ?string
    {
        return match (true) {
            (bool) preg_match('/(іске қос|запущен|действующ)/ui', $query) => 'launched',
            (bool) preg_match('/(іске ас|реализац|строит|орындал)/ui', $query) => 'implementation',
            (bool) preg_match('/(тоқтат|приостанов|заморож)/ui', $query) => 'suspended',
            (bool) preg_match('/(жоспар|планир|планда)/ui', $query) => 'plan',
            default => null,
        };
    }

    /**
     * @return array<int, string>
     */
    protected function extractProjectSearchTerms(
        string $query,
        ?string $regionName,
    ): array {
        $stopWords = [
            'есть', 'такие', 'какие', 'какой', 'какая', 'покажи', 'найди',
            'можно', 'ли', 'проекты', 'проект', 'жоба', 'жобалар', 'қандай',
            'көрсет', 'бар', 'ма', 'туралы', 'район', 'область', 'аудан',
            'облыс', 'инвестиция', 'инвестиционный', 'инвестициялық',
            'статус', 'мәртебе', 'система', 'сайт', 'бойынша', 'сколько',
            'қанша', 'всего', 'жалпы', 'которые', 'который', 'олардың',
            'запущен', 'действующий', 'реализация', 'планируется',
            'расскажи', 'подробно', 'этом', 'этот', 'этого', 'информация',
            'толық', 'осы', 'сол', 'айтшы', 'мәлімет', 'ақпарат',
        ];

        $regionWords = $regionName
            ? preg_split('/[^\pL\pN]+/u', mb_strtolower($regionName))
            : [];

        $terms = preg_split('/[^\pL\pN]+/u', mb_strtolower($query)) ?: [];

        return collect($terms)
            ->filter(fn (string $term) => mb_strlen($term) >= 4)
            ->reject(fn (string $term) => in_array($term, $stopWords, true))
            ->reject(fn (string $term) => in_array($term, $regionWords, true))
            ->unique()
            ->take(4)
            ->values()
            ->all();
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

    protected function getPromZonesData(string $query): array
    {
        $zones = PromZone::with(['region', 'issues'])->get();
        $totalCount = $zones->count();

        $items = $zones->take(10)->map(fn ($zone) => [
            'id' => $zone->id,
            'name' => $zone->name,
            'region' => $zone->region->name ?? null,
            'area' => $zone->area ?? null,
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

    protected function getGalleryData(string $query): array
    {
        $totalPhotos = DB::table('project_photos')->count();
        $recentPhotos = DB::table('project_photos')
            ->join('investment_projects', 'project_photos.project_id', '=', 'investment_projects.id')
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
