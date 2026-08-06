<?php

namespace App\Http\Controllers;

use App\Models\PromZone;
use App\Models\Region;
use App\Services\InfrastructureUsageService;
use App\Services\SectorActivityLogService;
use App\Support\InfrastructureValidationRules;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PromZoneController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $isModerator = $user?->loadMissing('roleModel')
            ->roleModel?->name === 'moderator';

        $query = PromZone::with('region')
            ->withSum(['investmentProjects' => function ($q) use (
                $isModerator
            ) {
                $q->where('is_archived', false);
                if ($isModerator) {
                    $q->curatedByTurkistanInvest();
                }
            }], 'total_investment');

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

    public function store(
        Request $request,
        SectorActivityLogService $activity
    ) {
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
            ...InfrastructureValidationRules::zone(),
            'location' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        $promZone = PromZone::create($validated);

        $activity->record(
            auditable: $promZone,
            event: 'entity.created',
            category: 'entity',
            action: 'Пром зона құрылды',
            subject: $promZone,
            properties: [
                'details' => $activity->entitySnapshot($promZone),
            ]
        );

        return redirect()->route('prom-zones.index')->with('success', 'Пром зона құрылды.');
    }

    public function show(
        PromZone $promZone,
        InfrastructureUsageService $usageService,
    ) {
        $user = auth()->user();
        $isModerator = $user?->loadMissing('roleModel')
            ->roleModel?->name === 'moderator';

        $promZone->load(['region', 'deleter:id,full_name', 'issues', 'issues.creator:id,full_name', 'investmentProjects' => function ($q) use ($isModerator) {
            $q->where('is_archived', false)
                ->when(
                    $isModerator,
                    fn ($query) => $query->curatedByTurkistanInvest()
                )
                ->with('region');
        }])->loadCount('photos');

        $mainGalleryPhotos = $promZone->photos()
            ->where('photo_type', 'gallery')
            ->latest()
            ->get();
        $renderPhotos = $promZone->photos()->renderPhotos()->latest()->get();

        return Inertia::render('prom-zones/show', [
            'promZone' => $promZone,
            'infrastructureUsage' => $usageService->summarize(
                $promZone->infrastructure,
                $promZone->investmentProjects,
            ),
            'areaUsage' => $usageService->summarizeArea(
                $promZone->total_area,
                $promZone->investmentProjects,
            ),
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

    public function update(
        Request $request,
        PromZone $promZone,
        SectorActivityLogService $activity
    ) {
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
            ...InfrastructureValidationRules::zone(),
            'location' => 'nullable|array',
            'description' => 'nullable|string',
            'return_to' => 'nullable|string',
        ]);

        $returnTo = $validated['return_to'] ?? '';
        unset($validated['return_to']);

        $before = $activity->entitySnapshot($promZone);
        $promZone->update($validated);
        $promZone->refresh();

        $activity->record(
            auditable: $promZone,
            event: 'entity.updated',
            category: 'entity',
            action: 'Пром зона мәліметтері жаңартылды',
            subject: $promZone,
            properties: [
                'changes' => $activity->changes(
                    $before,
                    $activity->entitySnapshot($promZone),
                    $activity->entityLabels($promZone)
                ),
            ]
        );

        if (! empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'Пром зона жаңартылды.');
        }

        return redirect()->route('prom-zones.index')->with('success', 'Пром зона жаңартылды.');
    }

    public function deleted(Request $request)
    {
        $this->ensureSuperadmin($request);

        $search = trim((string) $request->input('search', ''));
        $query = PromZone::onlyDeleted()
            ->with(['region:id,name', 'deleter:id,full_name']);

        if ($search !== '') {
            $query->whereLike('name', "%{$search}%");
        }

        $items = $query
            ->latest('deleted_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (PromZone $zone) => [
                ...$zone->toArray(),
                'show_url' => route('prom-zones.show', $zone->id, false),
                'restore_url' => route(
                    'prom-zones.restore-deleted',
                    $zone->id,
                    false
                ),
            ]);

        return Inertia::render('deleted-entities/index', [
            'items' => $items,
            'filters' => ['search' => $search],
            'config' => [
                'title' => 'Өшірілген пром зоналар',
                'entityLabel' => 'Пром зона',
                'indexUrl' => route('prom-zones.index', absolute: false),
                'deletedUrl' => route(
                    'prom-zones.deleted',
                    absolute: false
                ),
            ],
        ]);
    }

    public function restoreDeleted(
        Request $request,
        int $promZoneId,
        SectorActivityLogService $activity
    ) {
        $this->ensureSuperadmin($request);

        $promZone = PromZone::onlyDeleted()->findOrFail($promZoneId);
        $promZone->restoreFromDeletion();

        $activity->record(
            auditable: $promZone,
            event: 'entity.restored',
            category: 'entity',
            action: 'Пром зона қалпына келтірілді',
            subject: $promZone
        );

        return redirect()->route('prom-zones.deleted')->with(
            'success',
            'Пром зона қалпына келтірілді.'
        );
    }

    public function destroy(
        Request $request,
        PromZone $promZone,
        SectorActivityLogService $activity
    ) {
        abort_if($promZone->is_deleted, 404);
        $promZone->markAsDeletedBy($request->user());

        $activity->record(
            auditable: $promZone,
            event: 'entity.deleted',
            category: 'entity',
            action: 'Пром зона өшірілген нысандар бөліміне жіберілді',
            subject: $promZone,
            properties: [
                'details' => [
                    'Өшірілген уақыт' => $promZone->deleted_at,
                ],
            ]
        );

        return redirect()->route('prom-zones.index')->with(
            'success',
            'Пром зона өшірілген нысандар бөліміне жіберілді.'
        );
    }

    private function ensureSuperadmin(Request $request): void
    {
        abort_unless(
            $request->user()?->roleModel?->name === 'superadmin',
            403,
            'Өшірілген пром зоналарды тек супер әкімші көре алады.'
        );
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
