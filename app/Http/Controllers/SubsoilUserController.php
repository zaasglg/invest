<?php

namespace App\Http\Controllers;

use App\Models\Region;
use App\Models\SubsoilUser;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubsoilUserController extends Controller
{
    public function index()
    {
        $subsoilUsers = SubsoilUser::with('region')->latest()->get();

        return Inertia::render('subsoil-users/index', [
            'subsoilUsers' => $subsoilUsers,
        ]);
    }

    public function create()
    {
        $regions = Region::all();

        return Inertia::render('subsoil-users/create', [
            'regions' => $regions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bin' => 'required|string|max:20',
            'region_id' => 'required|exists:regions,id',
            'mineral_type' => 'required|string|max:255',
            'license_status' => 'required|in:active,expired,suspended',
            'license_start' => 'nullable|date',
            'license_end' => 'nullable|date|after_or_equal:license_start',
            'location' => 'nullable|array',
        ]);

        SubsoilUser::create($validated);

        return redirect()->route('subsoil-users.index')->with('success', 'Недропользователь создан.');
    }

    public function edit(SubsoilUser $subsoilUser)
    {
        $regions = Region::all();

        return Inertia::render('subsoil-users/edit', [
            'subsoilUser' => $subsoilUser->load('region'),
            'regions' => $regions,
        ]);
    }

    public function update(Request $request, SubsoilUser $subsoilUser)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bin' => 'required|string|max:20',
            'region_id' => 'required|exists:regions,id',
            'mineral_type' => 'required|string|max:255',
            'license_status' => 'required|in:active,expired,suspended',
            'license_start' => 'nullable|date',
            'license_end' => 'nullable|date|after_or_equal:license_start',
            'location' => 'nullable|array',
        ]);

        $subsoilUser->update($validated);

        return redirect()->route('subsoil-users.index')->with('success', 'Недропользователь обновлен.');
    }

    public function destroy(SubsoilUser $subsoilUser)
    {
        $subsoilUser->delete();

        return redirect()->back()->with('success', 'Недропользователь удален.');
    }
}
