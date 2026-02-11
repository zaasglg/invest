<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\Region;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IndustrialZoneController extends Controller
{
    public function index()
    {
        $industrialZones = IndustrialZone::with('region')->latest()->paginate(15)->withQueryString();

        return Inertia::render('industrial-zones/index', [
            'industrialZones' => $industrialZones,
        ]);
    }

    public function create()
    {
        $regions = Region::all();

        return Inertia::render('industrial-zones/create', [
            'regions' => $regions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'region_id' => 'required|exists:regions,id',
            'total_area' => 'nullable|numeric|min:0',
            'investment_total' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,developing',
            'infrastructure' => 'nullable|array',
            'location' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        IndustrialZone::create($validated);

        return redirect()->route('industrial-zones.index')->with('success', 'ИЗ создана.');
    }

    public function show(IndustrialZone $industrialZone)
    {
        $industrialZone->load(['region', 'issues', 'investmentProjects.region']);

        return Inertia::render('industrial-zones/show', [
            'industrialZone' => $industrialZone,
        ]);
    }

    public function edit(IndustrialZone $industrialZone)
    {
        $regions = Region::all();

        return Inertia::render('industrial-zones/edit', [
            'industrialZone' => $industrialZone->load('region'),
            'regions' => $regions,
        ]);
    }

    public function update(Request $request, IndustrialZone $industrialZone)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'region_id' => 'required|exists:regions,id',
            'total_area' => 'nullable|numeric|min:0',
            'investment_total' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,developing',
            'infrastructure' => 'nullable|array',
            'location' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        $industrialZone->update($validated);

        return redirect()->route('industrial-zones.index')->with('success', 'ИЗ обновлена.');
    }

    public function destroy(IndustrialZone $industrialZone)
    {
        $industrialZone->delete();

        return redirect()->back()->with('success', 'ИЗ удалена.');
    }
}
