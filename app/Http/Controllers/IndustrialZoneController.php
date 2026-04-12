<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\Region;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IndustrialZoneController extends Controller
{
    public function index(Request $request)
    {
        $query = IndustrialZone::with('region')
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

        $industrialZones = $query->latest()->paginate(15)->withQueryString();

        $regionsQuery = Region::query();
        if ($user && $user->isDistrictScoped()) {
            $regionsQuery->where('id', $user->region_id);
        }

        return Inertia::render('industrial-zones/index', [
            'industrialZones' => $industrialZones,
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

        return Inertia::render('industrial-zones/create', [
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
                        $fail('ИА-ны тек өз ауданыңызға қосуға болады.');
                    }
                },
            ],
            'total_area' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,developing',
            'infrastructure' => 'nullable|array',
            'location' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        IndustrialZone::create($validated);

        return redirect()->route('industrial-zones.index')->with('success', 'ИА құрылды.');
    }

    public function show(IndustrialZone $industrialZone)
    {
        $industrialZone->load(['region', 'issues', 'investmentProjects' => function ($q) {
            $q->where('is_archived', false)->with('region');
        }])->loadCount('photos');

        $mainGalleryPhotos = $industrialZone->photos()
            ->where('photo_type', 'gallery')
            ->latest()
            ->get();
        $renderPhotos = $industrialZone->photos()->renderPhotos()->latest()->get();

        return Inertia::render('industrial-zones/show', [
            'industrialZone' => $industrialZone,
            'mainGallery' => $mainGalleryPhotos,
            'renderPhotos' => $renderPhotos,
        ]);
    }

    public function edit(IndustrialZone $industrialZone)
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

        return Inertia::render('industrial-zones/edit', [
            'industrialZone' => $industrialZone->load('region'),
            'regions' => $regionsQuery->get(),
            'isDistrictScoped' => $isDistrictScoped,
        ]);
    }

    public function update(Request $request, IndustrialZone $industrialZone)
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
                        $fail('ИА-ны тек өз ауданыңызда өзгертуге болады.');
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

        $industrialZone->update($validated);

        if (!empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'ИӘ жаңартылды.');
        }

        return redirect()->route('industrial-zones.index')->with('success', 'ИА жаңартылды.');
    }

    public function destroy(IndustrialZone $industrialZone)
    {
        $industrialZone->delete();

        return redirect()->back()->with('success', 'ИА жойылды.');
    }

    /**
     * Validate that the return URL is a safe local URL.
     */
    private function isValidReturnUrl(string $url): bool
    {
        if (str_starts_with($url, '/') && !str_starts_with($url, '//')) {
            return true;
        }

        $appUrl = config('app.url');
        if ($appUrl && str_starts_with($url, $appUrl)) {
            return true;
        }

        return false;
    }
}
