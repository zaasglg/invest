<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\IndustrialZoneIssue;
use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use App\Models\PromZone;
use App\Models\PromZoneIssue;
use App\Models\Region;
use App\Models\Sez;
use App\Models\SezIssue;
use App\Models\SubsoilIssue;
use App\Models\SubsoilUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    private bool $moderatorProjectScope = false;

    /** @var list<int> */
    private array $regionScopeIds = [];

    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $roleName = $user?->load(['roleModel', 'region'])->roleModel?->name;

        if ($roleName === 'applicant') {
            return redirect()->route('applicant.portal');
        }
        $investSubRole = ($roleName === 'invest'
            && in_array($user->invest_sub_role, ['turkistan_invest', 'aea', 'ia', 'prom_zone'], true))
            ? $user->invest_sub_role
            : null;
        $investorId = $roleName === 'investor' ? $user->id : null;
        $this->moderatorProjectScope = $roleName === 'moderator';
        $this->regionScopeIds = $this->resolveRegionScopeIds($user);
        $hasScopedProjects = (bool) (
            $investSubRole
            || $investorId
            || $this->moderatorProjectScope
            || $this->hasRegionScope()
        );

        // Scoped roles must never consume or populate the shared global cache.
        $stats = $hasScopedProjects
            ? $this->buildStats($investSubRole, $investorId)
            : Cache::remember('dashboard.stats', 300, fn () => $this->buildStats(null));

        // Investment by sector (including SEZ and IZ)
        $buildInvestmentsBySector = function () use (
            $investSubRole,
            $investorId
        ) {
            $data = [];

            // Projects linked to SEZ
            $sezProjectsInvestment = $this->projects($investSubRole, $investorId)->whereHas('sezs')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($sezProjectsInvestment > 0) {
                $data[] = ['name' => 'АЭА', 'value' => (float) $sezProjectsInvestment];
            }

            // Projects linked to Industrial Zones
            $izProjectsInvestment = $this->projects($investSubRole, $investorId)->whereHas('industrialZones')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($izProjectsInvestment > 0) {
                $data[] = ['name' => 'ИА', 'value' => (float) $izProjectsInvestment];
            }

            // Projects linked to Subsoil Users
            $subsoilProjectsInvestment = $this->projects($investSubRole, $investorId)->whereHas('subsoilUsers')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($subsoilProjectsInvestment > 0) {
                $data[] = ['name' => 'Жер қойнауын пайдалану', 'value' => (float) $subsoilProjectsInvestment];
            }

            // Other projects (not linked to any entity)
            $otherProjectsInvestment = $this->projects($investSubRole, $investorId)->whereDoesntHave('sezs')
                ->whereDoesntHave('industrialZones')
                ->whereDoesntHave('subsoilUsers')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($otherProjectsInvestment > 0) {
                $data[] = ['name' => 'Басқа жобалар', 'value' => (float) $otherProjectsInvestment];
            }

            // Sort by value
            usort($data, fn ($a, $b) => $b['value'] <=> $a['value']);

            return array_slice($data, 0, 10);
        };
        $investmentsBySector = $hasScopedProjects
            ? $buildInvestmentsBySector()
            : Cache::remember(
                'dashboard.investments_by_sector',
                300,
                $buildInvestmentsBySector
            );

        // Projects by status
        $buildProjectsByStatus = function () use (
            $investSubRole,
            $investorId
        ) {
            return [
                ['name' => 'Жоспарлау', 'value' => $this->projects($investSubRole, $investorId)->where('status', 'plan')->count()],
                ['name' => 'Іске асыру', 'value' => $this->projects($investSubRole, $investorId)->where('status', 'implementation')->count()],
                ['name' => 'Іске қосылған', 'value' => $this->projects($investSubRole, $investorId)->where('status', 'launched')->count()],
                ['name' => 'Тоқтатылған', 'value' => $this->projects($investSubRole, $investorId)->where('status', 'suspended')->count()],
            ];
        };
        $projectsByStatus = $hasScopedProjects
            ? $buildProjectsByStatus()
            : Cache::remember(
                'dashboard.projects_by_status',
                300,
                $buildProjectsByStatus
            );

        // Monthly investment trend (last 6 months)
        $buildInvestmentTrend = function () use (
            $investSubRole,
            $investorId
        ) {
            $months = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $months[] = [
                    'name' => $date->format('M.Y'),
                    'value' => $this->projects($investSubRole, $investorId)->whereMonth('created_at', $date->month)
                        ->whereYear('created_at', $date->year)
                        ->sum('total_investment'),
                ];
            }

            return $months;
        };
        $investmentTrend = $hasScopedProjects
            ? $buildInvestmentTrend()
            : Cache::remember(
                'dashboard.investment_trend',
                300,
                $buildInvestmentTrend
            );

        // $regions = Cache::remember('dashboard.regions.v2', 3600, function () {
        //     return Region::where('type', 'district')
        //         ->select('id', 'name', 'color', 'icon', 'subtype', 'geometry', 'sort_order')
        //         ->orderBy('sort_order','asc')
        //         ->get();
        // });
        $regions = Region::where('type', 'district')
            ->select('id', 'name', 'color', 'icon', 'subtype', 'geometry', 'sort_order')
            ->when(
                $this->hasRegionScope(),
                fn ($query) => $query->whereIn(
                    'id',
                    $this->regionScopeIds
                )
            )
            ->when($investorId, function ($query) use ($investorId) {
                $query->whereHas(
                    'investmentProjects.investors',
                    fn ($investorQuery) => $investorQuery
                        ->where('users.id', $investorId)
                );
            })
            ->orderBy('sort_order', 'asc')
            ->get();
        // dd($regions);

        $regionStats = $hasScopedProjects
            ? $this->buildRegionStats($investSubRole, $investorId)
            : Cache::remember('dashboard.region_stats', 300, fn () => $this->buildRegionStats(null));

        $regionYearly = $hasScopedProjects
            ? $this->buildRegionYearlyStats($investSubRole, $investorId)
            : Cache::remember(
                'dashboard.region_yearly.start_date',
                300,
                fn () => $this->buildRegionYearlyStats(null)
            );

        return Inertia::render('dashboard', [
            'regions' => $regions,
            'stats' => $stats,
            'investmentsBySector' => $investmentsBySector,
            'projectsByStatus' => $projectsByStatus,
            'investmentTrend' => $investmentTrend,
            'regionStats' => $regionStats,
            'regionYearly' => $regionYearly,
            'sectorSummary' => $this->buildSectorSummary(
                $investSubRole,
                $investorId
            ),
        ]);
    }

    /**
     * Base InvestmentProject query scoped to an invest sub-role when provided.
     */
    private function projects(
        ?string $subRole = null,
        ?int $investorId = null
    ): Builder {
        return InvestmentProject::active()
            ->when(
                $this->hasRegionScope(),
                fn ($query) => $query->whereIn(
                    'investment_projects.region_id',
                    $this->regionScopeIds
                )
            )
            ->when(
                $this->moderatorProjectScope,
                fn ($query) => $query->curatedByTurkistanInvest()
            )
            ->when(
                $subRole,
                function ($query) use ($subRole) {
                    if ($subRole === 'turkistan_invest') {
                        $query->curatedByTurkistanInvest();

                        return;
                    }

                    $query->whereHas(
                        'curators',
                        fn ($curators) => $curators
                            ->where('users.invest_sub_role', $subRole)
                    );
                }
            )
            ->when(
                $investorId,
                fn ($q) => $q->whereHas(
                    'investors',
                    fn ($iq) => $iq->where('users.id', $investorId)
                )
            );
    }

    private function buildStats(
        ?string $subRole,
        ?int $investorId = null
    ): array {
        $sezCount = Sez::query()
            ->when(
                $this->hasRegionScope(),
                fn ($query) => $query->whereIn(
                    'region_id',
                    $this->regionScopeIds
                )
            )
            ->when(
                $investorId,
                fn ($query) => $query->whereHas(
                    'investmentProjects.investors',
                    fn ($investorQuery) => $investorQuery
                        ->where('users.id', $investorId)
                )
            )
            ->count();
        $izCount = IndustrialZone::query()
            ->when(
                $this->hasRegionScope(),
                fn ($query) => $query->whereIn(
                    'region_id',
                    $this->regionScopeIds
                )
            )
            ->when(
                $investorId,
                fn ($query) => $query->whereHas(
                    'investmentProjects.investors',
                    fn ($investorQuery) => $investorQuery
                        ->where('users.id', $investorId)
                )
            )
            ->count();

        return [
            'total_investment' => $this->projects($subRole, $investorId)
                ->sum('total_investment'),
            'active_projects' => $this->projects($subRole, $investorId)
                ->whereIn('status', ['implementation', 'launched'])
                ->count(),
            'sez_count' => $sezCount,
            'iz_count' => $izCount,
            'project_count' => $this->projects($subRole, $investorId)->count(),
        ];
    }

    private function buildRegionStats(
        ?string $subRole,
        ?int $investorId = null
    ): array {
        $investments = $this->projects($subRole, $investorId)
            ->selectRaw('region_id, COALESCE(SUM(total_investment), 0) as total')
            ->groupBy('region_id')
            ->pluck('total', 'region_id')
            ->toArray();

        $izProjects = $this->projects($subRole, $investorId)
            ->join('investment_project_industrial_zone as ipiz', 'investment_projects.id', '=', 'ipiz.investment_project_id')
            ->join('industrial_zones as iz', 'ipiz.industrial_zone_id', '=', 'iz.id')
            ->selectRaw('iz.region_id as region_id, COUNT(DISTINCT investment_projects.id) as cnt')
            ->groupBy('iz.region_id')
            ->pluck('cnt', 'region_id')
            ->toArray();

        $sezProjects = $this->projects($subRole, $investorId)
            ->join('investment_project_sez as ips', 'investment_projects.id', '=', 'ips.investment_project_id')
            ->join('sezs as sez', 'ips.sez_id', '=', 'sez.id')
            ->selectRaw('sez.region_id as region_id, COUNT(DISTINCT investment_projects.id) as cnt')
            ->groupBy('sez.region_id')
            ->pluck('cnt', 'region_id')
            ->toArray();

        $subsoilUsers = SubsoilUser::query()
            ->when(
                $this->hasRegionScope(),
                fn ($query) => $query->whereIn(
                    'region_id',
                    $this->regionScopeIds
                )
            )
            ->when(
                $investorId,
                fn ($query) => $query->whereHas(
                    'investmentProjects.investors',
                    fn ($investorQuery) => $investorQuery
                        ->where('users.id', $investorId)
                )
            )
            ->selectRaw('region_id, COUNT(*) as cnt')
            ->groupBy('region_id')
            ->pluck('cnt', 'region_id')
            ->toArray();

        $promProjects = $this->projects($subRole, $investorId)
            ->join('investment_project_prom_zone as ippz', 'investment_projects.id', '=', 'ippz.investment_project_id')
            ->join('prom_zones as pz', 'ippz.prom_zone_id', '=', 'pz.id')
            ->selectRaw('pz.region_id as region_id, COUNT(DISTINCT investment_projects.id) as cnt')
            ->groupBy('pz.region_id')
            ->pluck('cnt', 'region_id')
            ->toArray();

        return [
            'investments' => $investments,
            'izProjects' => $izProjects,
            'sezProjects' => $sezProjects,
            'subsoilUsers' => $subsoilUsers,
            'promProjects' => $promProjects,
        ];
    }

    /**
     * Investment / project / jobs series grouped by project start year.
     *
     * @return array{
     *     years: list<int>,
     *     total: array{investment: list<float>, projects: list<int>, jobs: list<int>},
     *     byRegion: array<int, array{investment: list<float>, projects: list<int>, jobs: list<int>}>
     * }
     */
    private function buildRegionYearlyStats(
        ?string $subRole,
        ?int $investorId = null
    ): array {
        $currentYear = (int) now()->year;
        $years = range($currentYear - 4, $currentYear);
        $yearExpr = match (DB::getDriverName()) {
            'pgsql' => 'EXTRACT(YEAR FROM investment_projects.start_date)::int',
            'sqlite' => "CAST(strftime('%Y', investment_projects.start_date) AS INTEGER)",
            default => 'YEAR(investment_projects.start_date)',
        };

        $rows = $this->projects($subRole, $investorId)
            ->whereNotNull('region_id')
            ->whereNotNull('investment_projects.start_date')
            ->where(
                'investment_projects.start_date',
                '>=',
                now()->subYears(4)->startOfYear()
            )
            ->selectRaw("
                region_id,
                {$yearExpr} as year,
                COUNT(*) as projects,
                COALESCE(SUM(total_investment), 0) as investment,
                COALESCE(SUM(jobs_count), 0) as jobs
            ")
            ->groupBy('region_id')
            ->groupBy(DB::raw($yearExpr))
            ->get();

        $emptySeries = [
            'investment' => array_fill(0, count($years), 0.0),
            'projects' => array_fill(0, count($years), 0),
            'jobs' => array_fill(0, count($years), 0),
        ];

        $byRegion = [];
        $total = [
            'investment' => array_fill(0, count($years), 0.0),
            'projects' => array_fill(0, count($years), 0),
            'jobs' => array_fill(0, count($years), 0),
        ];

        $yearIndex = array_flip($years);

        foreach ($rows as $row) {
            $year = (int) $row->year;
            if (! isset($yearIndex[$year])) {
                continue;
            }

            $index = $yearIndex[$year];
            $regionId = (int) $row->region_id;

            if (! isset($byRegion[$regionId])) {
                $byRegion[$regionId] = [
                    'investment' => [...$emptySeries['investment']],
                    'projects' => [...$emptySeries['projects']],
                    'jobs' => [...$emptySeries['jobs']],
                ];
            }

            $investment = (float) $row->investment;
            $projects = (int) $row->projects;
            $jobs = (int) $row->jobs;

            $byRegion[$regionId]['investment'][$index] = $investment;
            $byRegion[$regionId]['projects'][$index] = $projects;
            $byRegion[$regionId]['jobs'][$index] = $jobs;

            $total['investment'][$index] += $investment;
            $total['projects'][$index] += $projects;
            $total['jobs'][$index] += $jobs;
        }

        return [
            'years' => $years,
            'total' => $total,
            'byRegion' => $byRegion,
        ];
    }

    private function buildSectorSummary(
        ?string $subRole,
        ?int $investorId = null
    ): array {
        if ($subRole
            || $investorId
            || $this->moderatorProjectScope
            || $this->hasRegionScope()) {
            return $this->computeSectorSummary($subRole, $investorId);
        }

        return Cache::remember('dashboard.sector_summary', 300, fn () => $this->computeSectorSummary(null));
    }

    private function computeSectorSummary(
        ?string $subRole,
        ?int $investorId = null
    ): array {
        // Shorthand for a fresh scoped query
        $p = fn () => $this->projects($subRole, $investorId);
        $pti = $investorId
            ? fn () => $p()
            : fn () => $p()->curatedByTurkistanInvest();

        // Job counts per sector
        $sezJobCount = (int) $p()->whereHas('sezs')->sum('jobs_count');
        $izJobCount = (int) $p()->whereHas('industrialZones')->sum('jobs_count');
        $promJobCount = (int) $p()->whereHas('promZones')->sum('jobs_count');
        $subsoilJobCount = (int) $p()->whereHas('subsoilUsers')->sum('jobs_count');

        $allJobCount = (int) $p()->sum('jobs_count');
        $investJobCount = (int) $pti()->sum('jobs_count');

        // Project counts per sector (how many investment projects belong to each sector)
        $sezProjectCount = $p()->whereHas('sezs')->count();
        $izProjectCount = $p()->whereHas('industrialZones')->count();
        $promProjectCount = $p()->whereHas('promZones')->count();
        $subsoilProjectCount = $p()->whereHas('subsoilUsers')->count();

        $allProjectCount = $p()->count();
        $investProjectCount = $pti()->count();

        // Investment from projects (not from SEZ/IZ entities)
        $sezInvestment = (float) $p()->whereHas('sezs')->sum('total_investment');
        $izInvestment = (float) $p()->whereHas('industrialZones')->sum('total_investment');
        $promInvestment = (float) $p()->whereHas('promZones')->sum('total_investment');
        $nedroInvestment = (float) $p()->whereHas('subsoilUsers')->sum('total_investment');

        $allInvestment = (float) $p()->sum('total_investment');
        $investInvestment = (float) $pti()->sum('total_investment');

        // Entity issue counts — only for sections the sub-role can access.
        // aea → SEZ only | ia → IZ only | prom_zone → prom only | turkistan_invest/null → all.
        $canSeeSez = ! $subRole || in_array($subRole, ['aea', 'turkistan_invest'], true);
        $canSeeIz = ! $subRole || in_array($subRole, ['ia', 'turkistan_invest'], true);
        $canSeeProm = ! $subRole || in_array($subRole, ['prom_zone', 'turkistan_invest'], true);
        $canSeeSubsoil = ! $subRole || $subRole === 'turkistan_invest';

        $sezIds = ($investorId || $this->hasRegionScope())
            ? Sez::query()
                ->when(
                    $this->hasRegionScope(),
                    fn ($query) => $query->whereIn(
                        'region_id',
                        $this->regionScopeIds
                    )
                )
                ->when(
                    $investorId,
                    fn ($query) => $query->whereHas(
                        'investmentProjects.investors',
                        fn ($investorQuery) => $investorQuery
                            ->where('users.id', $investorId)
                    )
                )
                ->pluck('id')
            : null;
        $izIds = ($investorId || $this->hasRegionScope())
            ? IndustrialZone::query()
                ->when(
                    $this->hasRegionScope(),
                    fn ($query) => $query->whereIn(
                        'region_id',
                        $this->regionScopeIds
                    )
                )
                ->when(
                    $investorId,
                    fn ($query) => $query->whereHas(
                        'investmentProjects.investors',
                        fn ($investorQuery) => $investorQuery
                            ->where('users.id', $investorId)
                    )
                )
                ->pluck('id')
            : null;
        $promZoneIds = ($investorId || $this->hasRegionScope())
            ? PromZone::query()
                ->when(
                    $this->hasRegionScope(),
                    fn ($query) => $query->whereIn(
                        'region_id',
                        $this->regionScopeIds
                    )
                )
                ->when(
                    $investorId,
                    fn ($query) => $query->whereHas(
                        'investmentProjects.investors',
                        fn ($investorQuery) => $investorQuery
                            ->where('users.id', $investorId)
                    )
                )
                ->pluck('id')
            : null;
        $subsoilUserIds = ($investorId || $this->hasRegionScope())
            ? SubsoilUser::query()
                ->when(
                    $this->hasRegionScope(),
                    fn ($query) => $query->whereIn(
                        'region_id',
                        $this->regionScopeIds
                    )
                )
                ->when(
                    $investorId,
                    fn ($query) => $query->whereHas(
                        'investmentProjects.investors',
                        fn ($investorQuery) => $investorQuery
                            ->where('users.id', $investorId)
                    )
                )
                ->pluck('id')
            : null;

        $sezIssues = $canSeeSez
            ? SezIssue::when(
                $sezIds !== null,
                fn ($query) => $query->whereIn('sez_id', $sezIds)
            )->count()
            : 0;
        $izIssues = $canSeeIz
            ? IndustrialZoneIssue::when(
                $izIds !== null,
                fn ($query) => $query->whereIn('industrial_zone_id', $izIds)
            )->count()
            : 0;
        $promIssues = $canSeeProm
            ? PromZoneIssue::when(
                $promZoneIds !== null,
                fn ($query) => $query->whereIn('prom_zone_id', $promZoneIds)
            )->count()
            : 0;
        $subsoilIssues = $canSeeSubsoil
            ? SubsoilIssue::when(
                $subsoilUserIds !== null,
                fn ($query) => $query
                    ->whereIn('subsoil_user_id', $subsoilUserIds)
            )->count()
            : 0;

        // Project issues — only for the sub-role's scoped projects.
        $allProjectIssues = ProjectIssue::whereIn('project_id', $p()->pluck('id'))->count();
        $investProjectIssues = ProjectIssue::whereIn('project_id', $pti()->pluck('id'))->count();

        $total = [
            'sez' => [
                'investment' => $sezInvestment,
                'projectCount' => $sezProjectCount,
                'problemCount' => $sezIssues ?: 0,
                'jobCount' => $sezJobCount,
            ],
            'iz' => [
                'investment' => $izInvestment,
                'projectCount' => $izProjectCount,
                'problemCount' => $izIssues ?: 0,
                'jobCount' => $izJobCount,
            ],
            'prom' => [
                'investment' => $promInvestment,
                'projectCount' => $promProjectCount,
                'problemCount' => $promIssues ?: 0,
                'jobCount' => $promJobCount,
            ],
            'nedro' => [
                'investment' => $nedroInvestment,
                'projectCount' => $subsoilProjectCount,
                'problemCount' => $subsoilIssues ?: 0,
                'jobCount' => $subsoilJobCount,
            ],
            'invest' => [
                'investment' => $investInvestment,
                'projectCount' => $investProjectCount,
                'problemCount' => $investProjectIssues ?: 0,
                'jobCount' => $investJobCount,
            ],
            'all_projects' => [
                'investment' => $allInvestment,
                'projectCount' => $allProjectCount,
                'problemCount' => $allProjectIssues ?: 0,
                'jobCount' => $allJobCount,
            ],
        ];

        // --- Per-region grouped queries ---
        // SEZ project count, investment & jobs by region (through pivot)
        $sezProjectsByRegion = $p()->whereHas('sezs')
            ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment, COALESCE(SUM(jobs_count), 0) as jobs')
            ->groupBy('region_id')->get()->keyBy('region_id');

        // IZ project count, investment & jobs by region (through pivot)
        $izProjectsByRegion = $p()->whereHas('industrialZones')
            ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment, COALESCE(SUM(jobs_count), 0) as jobs')
            ->groupBy('region_id')->get()->keyBy('region_id');

        // Prom Zone project count, investment & jobs by region (through pivot)
        $promProjectsByRegion = $p()->whereHas('promZones')
            ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment, COALESCE(SUM(jobs_count), 0) as jobs')
            ->groupBy('region_id')->get()->keyBy('region_id');

        // Subsoil project count, investment & jobs by region (through pivot)
        $nedroByRegion = $p()->whereHas('subsoilUsers')
            ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment, COALESCE(SUM(jobs_count), 0) as jobs')
            ->groupBy('region_id')->get()->keyBy('region_id');

        // All project count, investment & jobs by region
        $allProjectsByRegion = $p()
            ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment, COALESCE(SUM(jobs_count), 0) as jobs')
            ->groupBy('region_id')->get()->keyBy('region_id');

        // Invest project count, investment & jobs by region
        $investProjectsByRegion = $pti()
            ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment, COALESCE(SUM(jobs_count), 0) as jobs')
            ->groupBy('region_id')->get()->keyBy('region_id');

        // Per-region issue counts — apply same section visibility rules as totals.
        $sezIssuesByRegion = $canSeeSez
            ? SezIssue::join('sezs', 'sez_issues.sez_id', '=', 'sezs.id')
                ->when(
                    $sezIds !== null,
                    fn ($query) => $query
                        ->whereIn('sez_issues.sez_id', $sezIds)
                )
                ->selectRaw('sezs.region_id, COUNT(*) as cnt')
                ->groupBy('sezs.region_id')->pluck('cnt', 'region_id')->toArray()
            : [];

        $izIssuesByRegion = $canSeeIz
            ? IndustrialZoneIssue::join('industrial_zones', 'industrial_zone_issues.industrial_zone_id', '=', 'industrial_zones.id')
                ->when(
                    $izIds !== null,
                    fn ($query) => $query
                        ->whereIn(
                            'industrial_zone_issues.industrial_zone_id',
                            $izIds
                        )
                )
                ->selectRaw('industrial_zones.region_id, COUNT(*) as cnt')
                ->groupBy('industrial_zones.region_id')->pluck('cnt', 'region_id')->toArray()
            : [];

        $promIssuesByRegion = $canSeeProm
            ? PromZoneIssue::join('prom_zones', 'prom_zone_issues.prom_zone_id', '=', 'prom_zones.id')
                ->when(
                    $promZoneIds !== null,
                    fn ($query) => $query
                        ->whereIn('prom_zone_issues.prom_zone_id', $promZoneIds)
                )
                ->selectRaw('prom_zones.region_id, COUNT(*) as cnt')
                ->groupBy('prom_zones.region_id')->pluck('cnt', 'region_id')->toArray()
            : [];

        $subsoilIssuesByRegion = $canSeeSubsoil
            ? SubsoilIssue::join('subsoil_users', 'subsoil_issues.subsoil_user_id', '=', 'subsoil_users.id')
                ->when(
                    $subsoilUserIds !== null,
                    fn ($query) => $query
                        ->whereIn(
                            'subsoil_issues.subsoil_user_id',
                            $subsoilUserIds
                        )
                )
                ->selectRaw('subsoil_users.region_id, COUNT(*) as cnt')
                ->groupBy('subsoil_users.region_id')->pluck('cnt', 'region_id')->toArray()
            : [];

        // Project issues by region — scoped to the filtered project set.
        $scopedProjectIds = $p()->pluck('id');
        $allProjectIssuesByRegion = ProjectIssue::join('investment_projects', 'project_issues.project_id', '=', 'investment_projects.id')
            ->whereIn('project_issues.project_id', $scopedProjectIds)
            ->selectRaw('investment_projects.region_id, COUNT(*) as cnt')
            ->groupBy('investment_projects.region_id')->pluck('cnt', 'region_id')->toArray();

        $tiProjectIds = $pti()->pluck('id');
        $investProjectIssuesByRegion = ProjectIssue::join('investment_projects', 'project_issues.project_id', '=', 'investment_projects.id')
            ->whereIn('project_issues.project_id', $tiProjectIds)
            ->selectRaw('investment_projects.region_id, COUNT(*) as cnt')
            ->groupBy('investment_projects.region_id')->pluck('cnt', 'region_id')->toArray();

        // Build per-region map
        $regionIds = Region::where('type', 'district')
            ->when(
                $this->hasRegionScope(),
                fn ($query) => $query->whereIn(
                    'id',
                    $this->regionScopeIds
                )
            )
            ->when($investorId, function ($query) use ($investorId) {
                $query->whereHas(
                    'investmentProjects.investors',
                    fn ($investorQuery) => $investorQuery
                        ->where('users.id', $investorId)
                );
            })
            ->pluck('id');
        $byRegion = [];

        foreach ($regionIds as $rid) {
            $sezProj = $sezProjectsByRegion->get($rid);
            $izProj = $izProjectsByRegion->get($rid);
            $promProj = $promProjectsByRegion->get($rid);
            $nedroProj = $nedroByRegion->get($rid);
            $allProj = $allProjectsByRegion->get($rid);
            $investProj = $investProjectsByRegion->get($rid);

            $byRegion[$rid] = [
                'sez' => [
                    'investment' => (float) ($sezProj?->investment ?? 0),
                    'projectCount' => (int) ($sezProj?->cnt ?? 0),
                    'problemCount' => (int) ($sezIssuesByRegion[$rid] ?? 0),
                    'jobCount' => (int) ($sezProj?->jobs ?? 0),
                ],
                'iz' => [
                    'investment' => (float) ($izProj?->investment ?? 0),
                    'projectCount' => (int) ($izProj?->cnt ?? 0),
                    'problemCount' => (int) ($izIssuesByRegion[$rid] ?? 0),
                    'jobCount' => (int) ($izProj?->jobs ?? 0),
                ],
                'prom' => [
                    'investment' => (float) ($promProj?->investment ?? 0),
                    'projectCount' => (int) ($promProj?->cnt ?? 0),
                    'problemCount' => (int) ($promIssuesByRegion[$rid] ?? 0),
                    'jobCount' => (int) ($promProj?->jobs ?? 0),
                ],
                'nedro' => [
                    'investment' => (float) ($nedroProj?->investment ?? 0),
                    'projectCount' => (int) ($nedroProj?->cnt ?? 0),
                    'problemCount' => (int) ($subsoilIssuesByRegion[$rid] ?? 0),
                    'jobCount' => (int) ($nedroProj?->jobs ?? 0),
                ],
                'invest' => [
                    'investment' => (float) ($investProj?->investment ?? 0),
                    'projectCount' => (int) ($investProj?->cnt ?? 0),
                    'problemCount' => (int) ($investProjectIssuesByRegion[$rid] ?? 0),
                    'jobCount' => (int) ($investProj?->jobs ?? 0),
                ],
                'all_projects' => [
                    'investment' => (float) ($allProj?->investment ?? 0),
                    'projectCount' => (int) ($allProj?->cnt ?? 0),
                    'problemCount' => (int) ($allProjectIssuesByRegion[$rid] ?? 0),
                    'jobCount' => (int) ($allProj?->jobs ?? 0),
                ],
            ];
        }

        return [
            'total' => $total,
            'byRegion' => $byRegion,
        ];
    }

    /**
     * @return list<int>
     */
    private function resolveRegionScopeIds(?User $user): array
    {
        if (! $user) {
            return [];
        }

        if ($user->isDistrictScoped()) {
            return [(int) $user->region_id];
        }

        if ($user->isOblastScopedAkim()) {
            return Region::query()
                ->where('id', $user->region_id)
                ->orWhere('parent_id', $user->region_id)
                ->pluck('id')
                ->map(static fn ($id): int => (int) $id)
                ->all();
        }

        return [];
    }

    private function hasRegionScope(): bool
    {
        return $this->regionScopeIds !== [];
    }
}
