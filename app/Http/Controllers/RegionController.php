<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\Region;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RegionController extends Controller
{
    public function index()
    {
        $regions = Region::latest()->paginate(15)->withQueryString();

        return Inertia::render('regions/index', [
            'regions' => $regions,
        ]);
    }

    public function create()
    {
        $parents = Region::where('type', 'oblast')->get();

        return Inertia::render('regions/create', [
            'parents' => $parents,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:regions',
            'area' => 'nullable|numeric|min:0',
            'type' => 'required|string|in:oblast,district',
            'parent_id' => 'nullable|exists:regions,id',
            'geometry' => 'nullable|array',
            'geometry.*.lat' => 'required|numeric',
            'geometry.*.lng' => 'required|numeric',
        ]);

        Region::create($validated);

        return redirect()->route('regions.index')->with('success', 'Регион создан.');
    }

    public function show(Region $region)
    {
        $region->load(['sezs.issues', 'industrialZones.issues', 'subsoilUsers.issues', 'parent']);
        $projects = InvestmentProject::with(['sezs', 'industrialZones', 'subsoilUsers', 'projectType', 'executors'])
            ->where('region_id', $region->id)
            ->latest()
            ->get();

        // Stats for "Все" tab
        $totalArea = $region->area ?? 0;
        $projectsCount = $projects->count();
        $totalInvestment = $projects->sum('total_investment');
        $projectIssuesCount = \App\Models\ProjectIssue::whereIn(
            'project_id',
            $projects->pluck('id')
        )->count();

        // SEZ issues count
        $sezIssuesCount = \App\Models\SezIssue::whereIn(
            'sez_id',
            $region->sezs->pluck('id')
        )->count();

        // IZ issues count
        $izIssuesCount = \App\Models\IndustrialZoneIssue::whereIn(
            'industrial_zone_id',
            $region->industrialZones->pluck('id')
        )->count();

        // Subsoil issues count
        $subsoilIssuesCount = \App\Models\SubsoilIssue::whereIn(
            'subsoil_user_id',
            $region->subsoilUsers->pluck('id')
        )->count();

        return Inertia::render('regions/show', [
            'region' => $region,
            'projects' => $projects,
            'sezs' => $region->sezs,
            'industrialZones' => $region->industrialZones,
            'subsoilUsers' => $region->subsoilUsers,
            'stats' => [
                'totalArea' => round($totalArea, 2),
                'projectsCount' => $projectsCount,
                'totalInvestment' => $totalInvestment,
                'projectIssuesCount' => $projectIssuesCount,
                'sezIssuesCount' => $sezIssuesCount,
                'izIssuesCount' => $izIssuesCount,
                'subsoilIssuesCount' => $subsoilIssuesCount,
            ],
        ]);
    }

    public function edit(Region $region)
    {
        $parents = Region::where('type', 'oblast')
            ->where('id', '!=', $region->id)
            ->get();

        return Inertia::render('regions/edit', [
            'region' => $region,
            'parents' => $parents,
        ]);
    }

    public function update(Request $request, Region $region)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:regions,name,' . $region->id,
            'area' => 'nullable|numeric|min:0',
            'type' => 'required|string|in:oblast,district',
            'parent_id' => 'nullable|exists:regions,id',
            'geometry' => 'nullable|array',
            'geometry.*.lat' => 'required|numeric',
            'geometry.*.lng' => 'required|numeric',
        ]);

        $region->update($validated);

        return redirect()->route('regions.index')->with('success', 'Регион обновлен.');
    }

    public function destroy(Region $region)
    {
        $region->delete();

        return redirect()->back()->with('success', 'Регион удален.');
    }
}
