<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\Region;
use App\Services\InfrastructureUsageService;
use App\Services\SectorActivityLogService;
use App\Services\ZoneIndexAnalyticsService;
use App\Support\InfrastructureValidationRules;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IndustrialZoneController extends Controller
{
    public function index(
        Request $request,
        ZoneIndexAnalyticsService $analytics
    ) {
        $user = $request->user();
        $isModerator = $user->loadMissing('roleModel')
            ->roleModel?->name === 'moderator';
        $filters = $request->only(['search', 'region_id', 'status']);
        $data = $analytics->build(
            IndustrialZone::class,
            $user,
            $filters,
            $isModerator
        );

        return Inertia::render('industrial-zones/index', [
            'industrialZones' => $data['zones'],
            'summary' => $data['summary'],
            'regions' => $data['regions'],
            'filters' => $filters,
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
                        $fail('ИА-ны тек өз ауданыңызға қосуға болады.');
                    }
                },
            ],
            'total_area' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,developing',
            ...InfrastructureValidationRules::zone(),
            'location' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        $industrialZone = IndustrialZone::create($validated);

        $activity->record(
            auditable: $industrialZone,
            event: 'entity.created',
            category: 'entity',
            action: 'Индустриялық аймақ құрылды',
            subject: $industrialZone,
            properties: [
                'details' => $activity->entitySnapshot($industrialZone),
            ]
        );

        return redirect()->route('industrial-zones.index')->with('success', 'ИА құрылды.');
    }

    public function show(
        IndustrialZone $industrialZone,
        InfrastructureUsageService $usageService,
    ) {
        $user = auth()->user();
        $isModerator = $user?->loadMissing('roleModel')
            ->roleModel?->name === 'moderator';

        $industrialZone->load(['region', 'deleter:id,full_name', 'issues', 'issues.creator:id,full_name', 'investmentProjects' => function ($q) use ($isModerator) {
            $q->where('is_archived', false)
                ->when(
                    $isModerator,
                    fn ($query) => $query->curatedByTurkistanInvest()
                )
                ->with('region');
        }])->loadCount('photos');

        $mainGalleryPhotos = $industrialZone->photos()
            ->where('photo_type', 'gallery')
            ->latest()
            ->get();
        $renderPhotos = $industrialZone->photos()->renderPhotos()->latest()->get();

        return Inertia::render('industrial-zones/show', [
            'industrialZone' => $industrialZone,
            'infrastructureUsage' => $usageService->summarize(
                $industrialZone->infrastructure,
                $industrialZone->investmentProjects,
            ),
            'areaUsage' => $usageService->summarizeArea(
                $industrialZone->total_area,
                $industrialZone->investmentProjects,
            ),
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

    public function update(
        Request $request,
        IndustrialZone $industrialZone,
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
                        $fail('ИА-ны тек өз ауданыңызда өзгертуге болады.');
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

        $before = $activity->entitySnapshot($industrialZone);
        $industrialZone->update($validated);
        $industrialZone->refresh();

        $activity->record(
            auditable: $industrialZone,
            event: 'entity.updated',
            category: 'entity',
            action: 'Индустриялық аймақ мәліметтері жаңартылды',
            subject: $industrialZone,
            properties: [
                'changes' => $activity->changes(
                    $before,
                    $activity->entitySnapshot($industrialZone),
                    $activity->entityLabels($industrialZone)
                ),
            ]
        );

        if (! empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'ИӘ жаңартылды.');
        }

        return redirect()->route('industrial-zones.index')->with('success', 'ИА жаңартылды.');
    }

    public function deleted(Request $request)
    {
        $this->ensureSuperadmin($request);

        $search = trim((string) $request->input('search', ''));
        $query = IndustrialZone::onlyDeleted()
            ->with(['region:id,name', 'deleter:id,full_name']);

        if ($search !== '') {
            $query->whereLike('name', "%{$search}%");
        }

        $items = $query
            ->latest('deleted_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (IndustrialZone $zone) => [
                ...$zone->toArray(),
                'show_url' => route(
                    'industrial-zones.show',
                    $zone->id,
                    false
                ),
                'restore_url' => route(
                    'industrial-zones.restore-deleted',
                    $zone->id,
                    false
                ),
            ]);

        return Inertia::render('deleted-entities/index', [
            'items' => $items,
            'filters' => ['search' => $search],
            'config' => [
                'title' => 'Өшірілген индустриялық аймақтар',
                'entityLabel' => 'Индустриялық аймақ',
                'indexUrl' => route(
                    'industrial-zones.index',
                    absolute: false
                ),
                'deletedUrl' => route(
                    'industrial-zones.deleted',
                    absolute: false
                ),
            ],
        ]);
    }

    public function restoreDeleted(
        Request $request,
        int $industrialZoneId,
        SectorActivityLogService $activity
    ) {
        $this->ensureSuperadmin($request);

        $industrialZone = IndustrialZone::onlyDeleted()
            ->findOrFail($industrialZoneId);
        $industrialZone->restoreFromDeletion();

        $activity->record(
            auditable: $industrialZone,
            event: 'entity.restored',
            category: 'entity',
            action: 'Индустриялық аймақ қалпына келтірілді',
            subject: $industrialZone
        );

        return redirect()->route('industrial-zones.deleted')->with(
            'success',
            'Индустриялық аймақ қалпына келтірілді.'
        );
    }

    public function destroy(
        Request $request,
        IndustrialZone $industrialZone,
        SectorActivityLogService $activity
    ) {
        abort_if($industrialZone->is_deleted, 404);
        $industrialZone->markAsDeletedBy($request->user());

        $activity->record(
            auditable: $industrialZone,
            event: 'entity.deleted',
            category: 'entity',
            action: 'Индустриялық аймақ өшірілген нысандар бөліміне жіберілді',
            subject: $industrialZone,
            properties: [
                'details' => [
                    'Өшірілген уақыт' => $industrialZone->deleted_at,
                ],
            ]
        );

        return redirect()->route('industrial-zones.index')->with(
            'success',
            'Индустриялық аймақ өшірілген нысандар бөліміне жіберілді.'
        );
    }

    private function ensureSuperadmin(Request $request): void
    {
        abort_unless(
            $request->user()?->roleModel?->name === 'superadmin',
            403,
            'Өшірілген индустриялық аймақтарды тек супер әкімші көре алады.'
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
