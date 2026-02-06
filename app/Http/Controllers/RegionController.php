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
        $regions = Region::latest()->get();

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
        $region->load(['sezs', 'industrialZones', 'subsoilUsers', 'parent']);
        $projects = InvestmentProject::with(['sezs', 'industrialZones', 'subsoilUsers'])
            ->where('region_id', $region->id)
            ->latest()
            ->get();

        return Inertia::render('regions/show', [
            'region' => $region,
            'projects' => $projects,
            'sezs' => $region->sezs,
            'industrialZones' => $region->industrialZones,
            'subsoilUsers' => $region->subsoilUsers,
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
