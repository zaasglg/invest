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
        $query = Sez::with('region');

        $user = auth()->user();
        if ($user && $user->isDistrictScoped()) {
            $query->where('region_id', $user->region_id);
        }

        $sezs = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('sezs/index', [
            'sezs' => $sezs,
        ]);
    }

    public function create()
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        if ($isDistrictScoped) {
            $regionsQuery->where('id', $user->region_id);
        }

        return Inertia::render('sezs/create', [
            'regions' => $regionsQuery->get(),
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int)$value !== (int)$user->region_id) {
                        $fail('Вы можете только добавить СЭЗ в свой район.');
                    }
                },
            ],
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

    public function show(Sez $sez)
    {
        $sez->load(['region', 'issues']);

        $investmentProjects = $sez->investmentProjects()
            ->with('region')
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('sezs/show', [
            'sez' => $sez,
            'investmentProjects' => $investmentProjects,
        ]);
    }

    public function edit(Sez $sez)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        if ($isDistrictScoped) {
            $regionsQuery->where('id', $user->region_id);
        }

        return Inertia::render('sezs/edit', [
            'sez' => $sez->load('region'),
            'regions' => $regionsQuery->get(),
        ]);
    }

    public function update(Request $request, Sez $sez)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int)$value !== (int)$user->region_id) {
                        $fail('Вы можете только изменить СЭЗ в своем районе.');
                    }
                },
            ],
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
