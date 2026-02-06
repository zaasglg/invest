<?php

namespace App\Http\Controllers;

use App\Models\Region;
use App\Models\Sez;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SezController extends Controller
{
    public function index()
    {
        $sezs = Sez::with('region')->latest()->get();

        return Inertia::render('sezs/index', [
            'sezs' => $sezs,
        ]);
    }

    public function create()
    {
        $regions = Region::all();

        return Inertia::render('sezs/create', [
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

        Sez::create($validated);

        return redirect()->route('sezs.index')->with('success', 'СЭЗ создана.');
    }

    public function edit(Sez $sez)
    {
        $regions = Region::all();

        return Inertia::render('sezs/edit', [
            'sez' => $sez->load('region'),
            'regions' => $regions,
        ]);
    }

    public function update(Request $request, Sez $sez)
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

        $sez->update($validated);

        return redirect()->route('sezs.index')->with('success', 'СЭЗ обновлена.');
    }

    public function destroy(Sez $sez)
    {
        $sez->delete();

        return redirect()->back()->with('success', 'СЭЗ удалена.');
    }
}
