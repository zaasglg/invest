<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Sez;
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
        ]);
    }
}
