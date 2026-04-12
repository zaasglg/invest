<?php

namespace App\Http\Controllers;

use App\Models\Region;
use App\Models\Sez;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SezController extends Controller
{
    public function index(Request $request)
    {
        $query = Sez::with('region')
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

        $sezs = $query->latest()->paginate(15)->withQueryString();

        $regionsQuery = Region::query();
        if ($user && $user->isDistrictScoped()) {
            $regionsQuery->where('id', $user->region_id);
        }

        return Inertia::render('sezs/index', [
            'sezs' => $sezs,
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

        return Inertia::render('sezs/create', [
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
                        $fail('АЭА-ны тек өз ауданыңызға қосуға болады.');
                    }
                },
            ],
            'total_area' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,developing',
            'infrastructure' => 'nullable|array',
            'location' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        Sez::create($validated);

        return redirect()->route('sezs.index')->with('success', 'АЭА құрылды.');
    }

    public function show(Sez $sez)
    {
        $sez->load(['region', 'issues'])
            ->loadCount('photos');

        $mainGalleryPhotos = $sez->photos()
            ->where('photo_type', 'gallery')
            ->latest()
            ->get();
        $renderPhotos = $sez->photos()->renderPhotos()->latest()->get();

        $investmentProjects = $sez->investmentProjects()
            ->where('is_archived', false)
            ->with('region')
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('sezs/show', [
            'sez' => $sez,
            'investmentProjects' => $investmentProjects,
            'mainGallery' => $mainGalleryPhotos,
            'renderPhotos' => $renderPhotos,
        ]);
    }

    public function edit(Sez $sez)
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

        return Inertia::render('sezs/edit', [
            'sez' => $sez->load('region'),
            'regions' => $regionsQuery->get(),
            'isDistrictScoped' => $isDistrictScoped,
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
                    if ($isDistrictScoped && (int) $value !== (int) $user->region_id) {
                        $fail('АЭА-ны тек өз ауданыңызда өзгертуге болады.');
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

        $sez->update($validated);

        if (!empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'АЭА жаңартылды.');
        }

        return redirect()->route('sezs.index')->with('success', 'АЭА жаңартылды.');
    }

    public function destroy(Sez $sez)
    {
        $sez->delete();

        return redirect()->back()->with('success', 'АЭА жойылды.');
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
