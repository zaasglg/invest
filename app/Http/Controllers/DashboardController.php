<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\IndustrialZoneIssue;
use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use App\Models\Region;
use App\Models\Sez;
use App\Models\SezIssue;
use App\Models\SubsoilIssue;
use App\Models\SubsoilUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

/**
 * Clear all dashboard caches.
 */
function clearDashboardCache(): void
{
    $keys = [
        'dashboard.stats',
        'dashboard.investments_by_sector',
        'dashboard.projects_by_status',
        'dashboard.investment_trend',
        'dashboard.regions',
        'dashboard.region_stats',
        'dashboard.sector_summary',
    ];
    foreach ($keys as $key) {
        Cache::forget($key);
    }
}

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request)
    {
        $stats = Cache::remember('dashboard.stats', 300, function () {
            return [
                'total_investment' =>
                    InvestmentProject::sum('total_investment') +
                    Sez::sum('investment_total') +
                    IndustrialZone::sum('investment_total'),
                'active_projects' => InvestmentProject::whereIn('status', ['implementation', 'launched'])->count(),
                'sez_count' => Sez::count(),
                'iz_count' => IndustrialZone::count(),
                'project_count' => InvestmentProject::count(),
            ];
        });

        // Investment by sector (including SEZ and IZ)
        $investmentsBySector = Cache::remember('dashboard.investments_by_sector', 300, function () {
            $data = [];

            // Add SEZ with their investment
            $sezInvestment = Sez::sum('investment_total');
            if ($sezInvestment > 0) {
                $data[] = ['name' => 'СЭЗ', 'value' => $sezInvestment];
            }

            // Add Industrial Zones with their investment
            $izInvestment = IndustrialZone::sum('investment_total');
            if ($izInvestment > 0) {
                $data[] = ['name' => 'ИЗ', 'value' => $izInvestment];
            }

            // Add investment projects grouped by their associated entity (SEZ/IZ/Subsoil)
            // Projects linked to SEZ
            $sezProjectsInvestment = InvestmentProject::whereHas('sezs')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($sezProjectsInvestment > 0) {
                $data[] = ['name' => 'Проекты в СЭЗ', 'value' => (float) $sezProjectsInvestment];
            }

            // Projects linked to Industrial Zones
            $izProjectsInvestment = InvestmentProject::whereHas('industrialZones')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($izProjectsInvestment > 0) {
                $data[] = ['name' => 'Проекты в ИЗ', 'value' => (float) $izProjectsInvestment];
            }

            // Projects linked to Subsoil Users
            $subsoilProjectsInvestment = InvestmentProject::whereHas('subsoilUsers')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($subsoilProjectsInvestment > 0) {
                $data[] = ['name' => 'Недропользование', 'value' => (float) $subsoilProjectsInvestment];
            }

            // Other projects (not linked to any entity)
            $otherProjectsInvestment = InvestmentProject::whereDoesntHave('sezs')
                ->whereDoesntHave('industrialZones')
                ->whereDoesntHave('subsoilUsers')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($otherProjectsInvestment > 0) {
                $data[] = ['name' => 'Прочие проекты', 'value' => (float) $otherProjectsInvestment];
            }

            // Sort by value
            usort($data, fn($a, $b) => $b['value'] <=> $a['value']);

            return array_slice($data, 0, 10);
        });

        // Projects by status
        $projectsByStatus = Cache::remember('dashboard.projects_by_status', 300, function () {
            return [
                ['name' => 'Планирование', 'value' => InvestmentProject::where('status', 'plan')->count()],
                ['name' => 'Реализация', 'value' => InvestmentProject::where('status', 'implementation')->count()],
                ['name' => 'Запущен', 'value' => InvestmentProject::where('status', 'launched')->count()],
                ['name' => 'Приостановлен', 'value' => InvestmentProject::where('status', 'suspended')->count()],
            ];
        });

        // Monthly investment trend (last 6 months)
        $investmentTrend = Cache::remember('dashboard.investment_trend', 300, function () {
            $months = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $months[] = [
                    'name' => $date->format('M.Y'),
                    'value' => InvestmentProject::whereMonth('created_at', $date->month)
                        ->whereYear('created_at', $date->year)
                        ->sum('total_investment'),
                ];
            }
            return $months;
        });

        $regions = Cache::remember('dashboard.regions', 3600, function () {
            return Region::where('type', 'district')
                ->select('id', 'name', 'geometry')
                ->get();
        });

        $regionStats = Cache::remember('dashboard.region_stats', 300, function () {
            $investments = InvestmentProject::selectRaw('region_id, COALESCE(SUM(total_investment), 0) as total')
                ->groupBy('region_id')
                ->pluck('total', 'region_id')
                ->toArray();

            $izProjects = InvestmentProject::join('investment_project_industrial_zone as ipiz', 'investment_projects.id', '=', 'ipiz.investment_project_id')
                ->join('industrial_zones as iz', 'ipiz.industrial_zone_id', '=', 'iz.id')
                ->selectRaw('iz.region_id as region_id, COUNT(DISTINCT investment_projects.id) as cnt')
                ->groupBy('iz.region_id')
                ->pluck('cnt', 'region_id')
                ->toArray();

            $sezProjects = InvestmentProject::join('investment_project_sez as ips', 'investment_projects.id', '=', 'ips.investment_project_id')
                ->join('sezs as sez', 'ips.sez_id', '=', 'sez.id')
                ->selectRaw('sez.region_id as region_id, COUNT(DISTINCT investment_projects.id) as cnt')
                ->groupBy('sez.region_id')
                ->pluck('cnt', 'region_id')
                ->toArray();

            $subsoilUsers = SubsoilUser::selectRaw('region_id, COUNT(*) as cnt')
                ->groupBy('region_id')
                ->pluck('cnt', 'region_id')
                ->toArray();

            return [
                'investments' => $investments,
                'izProjects' => $izProjects,
                'sezProjects' => $sezProjects,
                'subsoilUsers' => $subsoilUsers,
            ];
        });

        return Inertia::render('dashboard', [
            'regions' => $regions,
            'stats' => $stats,
            'investmentsBySector' => $investmentsBySector,
            'projectsByStatus' => $projectsByStatus,
            'investmentTrend' => $investmentTrend,
            'regionStats' => $regionStats,
            'sectorSummary' => $this->getSectorSummary(),
        ]);
    }

    private function getSectorSummary(): array
    {
        return Cache::remember('dashboard.sector_summary', 300, function () {
            // --- Totals ---
            $sezInvestment = (float) Sez::sum('investment_total');
            $sezCount = Sez::count();
            $izInvestment = (float) IndustrialZone::sum('investment_total');
            $izCount = IndustrialZone::count();
            $subsoilCount = SubsoilUser::count();
            $nedroInvestment = (float) InvestmentProject::whereHas('subsoilUsers')->sum('total_investment');
            $investInvestment = (float) InvestmentProject::sum('total_investment');

            // Issue counts
            $sezIssues = SezIssue::count();
            $izIssues = IndustrialZoneIssue::count();
            $subsoilIssues = SubsoilIssue::count();
            $projectIssues = ProjectIssue::count();

            $total = [
                'sez' => [
                    'investment' => $sezInvestment,
                    'projectCount' => $sezCount,
                    'problemCount' => $sezIssues ?: 2,
                    'orgCount' => 1,
                ],
                'iz' => [
                    'investment' => $izInvestment,
                    'projectCount' => $izCount,
                    'problemCount' => $izIssues ?: 3,
                    'orgCount' => 2,
                ],
                'nedro' => [
                    'investment' => $nedroInvestment,
                    'projectCount' => $subsoilCount,
                    'problemCount' => $subsoilIssues ?: 4,
                    'orgCount' => 3,
                ],
                'invest' => [
                    'investment' => $investInvestment,
                    'projectCount' => null,
                    'problemCount' => $projectIssues ?: 1,
                    'orgCount' => null,
                ],
            ];

            // --- Per-region grouped queries ---
            $sezByRegion = Sez::selectRaw('region_id, COALESCE(SUM(investment_total), 0) as investment, COUNT(*) as cnt')
                ->groupBy('region_id')->get()->keyBy('region_id');

            $izByRegion = IndustrialZone::selectRaw('region_id, COALESCE(SUM(investment_total), 0) as investment, COUNT(*) as cnt')
                ->groupBy('region_id')->get()->keyBy('region_id');

            $subsoilByRegion = SubsoilUser::selectRaw('region_id, COUNT(*) as cnt')
                ->groupBy('region_id')->pluck('cnt', 'region_id')->toArray();

            $nedroInvestByRegion = InvestmentProject::whereHas('subsoilUsers')
                ->selectRaw('region_id, COALESCE(SUM(total_investment), 0) as investment')
                ->groupBy('region_id')->pluck('investment', 'region_id')->toArray();

            $investByRegion = InvestmentProject::selectRaw('region_id, COALESCE(SUM(total_investment), 0) as investment')
                ->groupBy('region_id')->pluck('investment', 'region_id')->toArray();

            // Issues by region (via parent entity)
            $sezIssuesByRegion = SezIssue::join('sezs', 'sez_issues.sez_id', '=', 'sezs.id')
                ->selectRaw('sezs.region_id, COUNT(*) as cnt')
                ->groupBy('sezs.region_id')->pluck('cnt', 'region_id')->toArray();

            $izIssuesByRegion = IndustrialZoneIssue::join('industrial_zones', 'industrial_zone_issues.industrial_zone_id', '=', 'industrial_zones.id')
                ->selectRaw('industrial_zones.region_id, COUNT(*) as cnt')
                ->groupBy('industrial_zones.region_id')->pluck('cnt', 'region_id')->toArray();

            $subsoilIssuesByRegion = SubsoilIssue::join('subsoil_users', 'subsoil_issues.subsoil_user_id', '=', 'subsoil_users.id')
                ->selectRaw('subsoil_users.region_id, COUNT(*) as cnt')
                ->groupBy('subsoil_users.region_id')->pluck('cnt', 'region_id')->toArray();

            $projectIssuesByRegion = ProjectIssue::join('investment_projects', 'project_issues.project_id', '=', 'investment_projects.id')
                ->selectRaw('investment_projects.region_id, COUNT(*) as cnt')
                ->groupBy('investment_projects.region_id')->pluck('cnt', 'region_id')->toArray();

            // Build per-region map
            $regionIds = Region::where('type', 'district')->pluck('id');
            $byRegion = [];

            foreach ($regionIds as $rid) {
                $sez = $sezByRegion->get($rid);
                $iz = $izByRegion->get($rid);

                $byRegion[$rid] = [
                    'sez' => [
                        'investment' => (float) ($sez?->investment ?? 0),
                        'projectCount' => (int) ($sez?->cnt ?? 0),
                        'problemCount' => (int) ($sezIssuesByRegion[$rid] ?? 0),
                        'orgCount' => 0,
                    ],
                    'iz' => [
                        'investment' => (float) ($iz?->investment ?? 0),
                        'projectCount' => (int) ($iz?->cnt ?? 0),
                        'problemCount' => (int) ($izIssuesByRegion[$rid] ?? 0),
                        'orgCount' => 0,
                    ],
                    'nedro' => [
                        'investment' => (float) ($nedroInvestByRegion[$rid] ?? 0),
                        'projectCount' => (int) ($subsoilByRegion[$rid] ?? 0),
                        'problemCount' => (int) ($subsoilIssuesByRegion[$rid] ?? 0),
                        'orgCount' => 0,
                    ],
                    'invest' => [
                        'investment' => (float) ($investByRegion[$rid] ?? 0),
                        'projectCount' => null,
                        'problemCount' => (int) ($projectIssuesByRegion[$rid] ?? 0),
                        'orgCount' => null,
                    ],
                ];
            }

            return [
                'total' => $total,
                'byRegion' => $byRegion,
            ];
        });
    }
}