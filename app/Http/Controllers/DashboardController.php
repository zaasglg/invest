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

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request)
    {
        $stats = Cache::remember('dashboard.stats', 300, function () {
            return [
                'total_investment' => InvestmentProject::sum('total_investment'),
                'active_projects' => InvestmentProject::whereIn('status', ['implementation', 'launched'])->count(),
                'sez_count' => Sez::count(),
                'iz_count' => IndustrialZone::count(),
                'project_count' => InvestmentProject::count(),
            ];
        });

        // Investment by sector (including SEZ and IZ)
        $investmentsBySector = Cache::remember('dashboard.investments_by_sector', 300, function () {
            $data = [];

            // Projects linked to SEZ
            $sezProjectsInvestment = InvestmentProject::whereHas('sezs')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($sezProjectsInvestment > 0) {
                $data[] = ['name' => 'СЭЗ', 'value' => (float) $sezProjectsInvestment];
            }

            // Projects linked to Industrial Zones
            $izProjectsInvestment = InvestmentProject::whereHas('industrialZones')
                ->where('total_investment', '>', 0)
                ->sum('total_investment');
            if ($izProjectsInvestment > 0) {
                $data[] = ['name' => 'ИЗ', 'value' => (float) $izProjectsInvestment];
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

        $regions = Cache::remember('dashboard.regions.v2', 3600, function () {
            return Region::where('type', 'district')
                ->select('id', 'name', 'color', 'icon', 'geometry')
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
            // Organization counts
            $sezOrgCount = Sez::count();
            $izOrgCount = IndustrialZone::count();
            $subsoilOrgCount = SubsoilUser::count();

            // Project counts per sector (how many investment projects belong to each sector)
            $sezProjectCount = InvestmentProject::whereHas('sezs')->count();
            $izProjectCount = InvestmentProject::whereHas('industrialZones')->count();
            $subsoilProjectCount = InvestmentProject::whereHas('subsoilUsers')->count();
            $investProjectCount = InvestmentProject::count();

            // Investment from projects (not from SEZ/IZ entities)
            $sezInvestment = (float) InvestmentProject::whereHas('sezs')->sum('total_investment');
            $izInvestment = (float) InvestmentProject::whereHas('industrialZones')->sum('total_investment');
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
                    'projectCount' => $sezProjectCount,
                    'problemCount' => $sezIssues ?: 0,
                    'orgCount' => $sezOrgCount,
                ],
                'iz' => [
                    'investment' => $izInvestment,
                    'projectCount' => $izProjectCount,
                    'problemCount' => $izIssues ?: 0,
                    'orgCount' => $izOrgCount,
                ],
                'nedro' => [
                    'investment' => $nedroInvestment,
                    'projectCount' => $subsoilProjectCount,
                    'problemCount' => $subsoilIssues ?: 0,
                    'orgCount' => $subsoilOrgCount,
                ],
                'invest' => [
                    'investment' => $investInvestment,
                    'projectCount' => $investProjectCount,
                    'problemCount' => $projectIssues ?: 0,
                    'orgCount' => null,
                ],
            ];

            // --- Per-region grouped queries ---
            // SEZ org count per region
            $sezOrgByRegion = Sez::selectRaw('region_id, COUNT(*) as cnt')
                ->groupBy('region_id')->pluck('cnt', 'region_id')->toArray();

            // IZ org count per region
            $izOrgByRegion = IndustrialZone::selectRaw('region_id, COUNT(*) as cnt')
                ->groupBy('region_id')->pluck('cnt', 'region_id')->toArray();

            // SEZ project count & investment by region (through pivot)
            $sezProjectsByRegion = InvestmentProject::whereHas('sezs')
                ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment')
                ->groupBy('region_id')->get()->keyBy('region_id');

            // IZ project count & investment by region (through pivot)
            $izProjectsByRegion = InvestmentProject::whereHas('industrialZones')
                ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment')
                ->groupBy('region_id')->get()->keyBy('region_id');

            $subsoilByRegion = SubsoilUser::selectRaw('region_id, COUNT(*) as cnt')
                ->groupBy('region_id')->pluck('cnt', 'region_id')->toArray();

            $nedroByRegion = InvestmentProject::whereHas('subsoilUsers')
                ->selectRaw('region_id, COUNT(*) as cnt, COALESCE(SUM(total_investment), 0) as investment')
                ->groupBy('region_id')->get()->keyBy('region_id');

            $investByRegion = InvestmentProject::selectRaw('region_id, COALESCE(SUM(total_investment), 0) as investment')
                ->groupBy('region_id')->pluck('investment', 'region_id')->toArray();

            $investCountByRegion = InvestmentProject::selectRaw('region_id, COUNT(*) as cnt')
                ->groupBy('region_id')->pluck('cnt', 'region_id')->toArray();

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
                $sezProj = $sezProjectsByRegion->get($rid);
                $izProj = $izProjectsByRegion->get($rid);
                $nedroProj = $nedroByRegion->get($rid);

                $byRegion[$rid] = [
                    'sez' => [
                        'investment' => (float) ($sezProj?->investment ?? 0),
                        'projectCount' => (int) ($sezProj?->cnt ?? 0),
                        'problemCount' => (int) ($sezIssuesByRegion[$rid] ?? 0),
                        'orgCount' => (int) ($sezOrgByRegion[$rid] ?? 0),
                    ],
                    'iz' => [
                        'investment' => (float) ($izProj?->investment ?? 0),
                        'projectCount' => (int) ($izProj?->cnt ?? 0),
                        'problemCount' => (int) ($izIssuesByRegion[$rid] ?? 0),
                        'orgCount' => (int) ($izOrgByRegion[$rid] ?? 0),
                    ],
                    'nedro' => [
                        'investment' => (float) ($nedroProj?->investment ?? 0),
                        'projectCount' => (int) ($nedroProj?->cnt ?? 0),
                        'problemCount' => (int) ($subsoilIssuesByRegion[$rid] ?? 0),
                        'orgCount' => (int) ($subsoilByRegion[$rid] ?? 0),
                    ],
                    'invest' => [
                        'investment' => (float) ($investByRegion[$rid] ?? 0),
                        'projectCount' => (int) ($investCountByRegion[$rid] ?? 0),
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
