<?php

namespace App\Http\Controllers;

use App\Models\PromZone;
use App\Models\Region;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PromZoneController extends Controller
{
    public function index(Request $request)
    {
        $query = PromZone::with('region')
            ->withSum(['investmentProjects' => function ($q) {
                $q->where('is_archived', false);
            }], 'total_investment');

        $user = auth()->user();
        if ($user && $user->isDistrictScoped()) {
            $query->where('region_id', $user->region_id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        if ($request->filled('region_id')) {
            $query->where('region_id', $request->region_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $promZones = $query->latest()->paginate(15)->withQueryString();

        $regionsQuery = Region::query();
        if ($user && $user->isDistrictScoped()) {
            $regionsQuery->where('id', $user->region_id);
        }

        return Inertia::render('prom-zones/index', [
            'promZones' => $promZones,
            'regions' => $regionsQuery->orderBy('name')->get(),
            'filters' => $request->only(['search', 'region_id', 'status']),
        ]);
    }

    public function create()
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        if ($isDistrictScoped) {
            $userRegion = Region::find($user->region_id);
            $regionIds = [$user->region_id];
            if ($userRegion && $userRegion->parent_id) {
                $regionIds[] = $userRegion->parent_id;
            }
            $regionsQuery->whereIn('id', $regionIds);
        }

        return Inertia::render('prom-zones/create', [
            'regions' => $regionsQuery->get(),
            'isDistrictScoped' => $isDistrictScoped,
            'userRegionId' => $isDistrictScoped ? $user->region_id : null,
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
                    if ($isDistrictScoped && (int) $value !== (int) $user->region_id) {
                        $fail('Пром зонаны тек өз ауданыңызға қосуға болады.');
                    }
                },
            ],
            'total_area' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,developing',
            'infrastructure' => 'nullable|array',
            'location' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        PromZone::create($validated);

        return redirect()->route('prom-zones.index')->with('success', 'Пром зона құрылды.');
    }

    public function show(PromZone $promZone)
    {
        $promZone->load(['region', 'issues', 'investmentProjects' => function ($q) {
            $q->where('is_archived', false)->with('region');
        }])->loadCount('photos');

        $mainGalleryPhotos = $promZone->photos()
            ->where('photo_type', 'gallery')
            ->latest()
            ->get();
        $renderPhotos = $promZone->photos()->renderPhotos()->latest()->get();

        return Inertia::render('prom-zones/show', [
            'promZone' => $promZone,
            'mainGallery' => $mainGalleryPhotos,
            'renderPhotos' => $renderPhotos,
        ]);
    }

    public function edit(PromZone $promZone)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        if ($isDistrictScoped) {
            $userRegion = Region::find($user->region_id);
            $regionIds = [$user->region_id];
            if ($userRegion && $userRegion->parent_id) {
                $regionIds[] = $userRegion->parent_id;
            }
            $regionsQuery->whereIn('id', $regionIds);
        }

        return Inertia::render('prom-zones/edit', [
            'promZone' => $promZone->load('region'),
            'regions' => $regionsQuery->get(),
            'isDistrictScoped' => $isDistrictScoped,
        ]);
    }

    public function update(Request $request, PromZone $promZone)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int) $value !== (int) $user->region_id) {
                        $fail('Пром зонаны тек өз ауданыңызда өзгертуге болады.');
                    }
                },
            ],
            'total_area' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,developing',
            'infrastructure' => 'nullable|array',
            'location' => 'nullable|array',
            'description' => 'nullable|string',
            'return_to' => 'nullable|string',
        ]);

        $returnTo = $validated['return_to'] ?? '';
        unset($validated['return_to']);

        $promZone->update($validated);

        if (! empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'Пром зона жаңартылды.');
        }

        return redirect()->route('prom-zones.index')->with('success', 'Пром зона жаңартылды.');
    }

    public function destroy(PromZone $promZone)
    {
        $promZone->delete();

        return redirect()->back()->with('success', 'Пром зона жойылды.');
    }

    /**
     * Validate that the return URL is a safe local URL.
     */
    private function isValidReturnUrl(string $url): bool
    {
        if (str_starts_with($url, '/') && ! str_starts_with($url, '//')) {
            return true;
        }

        $appUrl = config('app.url');
        if ($appUrl && str_starts_with($url, $appUrl)) {
            return true;
        }

        return false;
    }
}
