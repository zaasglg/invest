<?php

namespace App\Http\Controllers;

use App\Models\Region;
use App\Models\Sez;
use App\Services\InfrastructureUsageService;
use App\Services\SectorActivityLogService;
use App\Support\InfrastructureValidationRules;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SezController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $isModerator = $user?->loadMissing('roleModel')
            ->roleModel?->name === 'moderator';

        $query = Sez::with('region')
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
                        $fail('АЭА-ны тек өз ауданыңызға қосуға болады.');
                    }
                },
            ],
            'total_area' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,developing',
            ...InfrastructureValidationRules::zone(),
            'location' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        $sez = Sez::create($validated);

        $activity->record(
            auditable: $sez,
            event: 'entity.created',
            category: 'entity',
            action: 'СЭЗ құрылды',
            subject: $sez,
            properties: [
                'details' => $activity->entitySnapshot($sez),
            ]
        );

        return redirect()->route('sezs.index')->with('success', 'АЭА құрылды.');
    }

    public function show(Sez $sez, InfrastructureUsageService $usageService)
    {
        $sez->load([
            'region',
            'deleter:id,full_name',
            'issues',
            'issues.creator:id,full_name',
        ])
            ->loadCount('photos');

        $mainGalleryPhotos = $sez->photos()
            ->where('photo_type', 'gallery')
            ->latest()
            ->get();
        $renderPhotos = $sez->photos()->renderPhotos()->latest()->get();

        $user = auth()->user();
        $isModerator = $user?->loadMissing('roleModel')
            ->roleModel?->name === 'moderator';

        $projectsQuery = $sez->investmentProjects()
            ->where('is_archived', false)
            ->when(
                $isModerator,
                fn ($query) => $query->curatedByTurkistanInvest()
            )
            ->with('region');
        $usageProjects = (clone $projectsQuery)->get();
        $investmentProjects = $projectsQuery
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('sezs/show', [
            'sez' => $sez,
            'mapProjects' => $usageProjects
                ->whereNotNull('geometry')
                ->values()
                ->map(fn ($project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'company_name' => $project->company_name,
                    'total_investment' => $project->total_investment,
                    'status' => $project->status,
                    'geometry' => $project->geometry,
                    'sezs' => [[
                        'id' => $sez->id,
                        'name' => $sez->name,
                    ]],
                ]),
            'infrastructureUsage' => $usageService->summarize(
                $sez->infrastructure,
                $usageProjects,
            ),
            'areaUsage' => $usageService->summarizeArea(
                $sez->total_area,
                $usageProjects,
            ),
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

    public function update(
        Request $request,
        Sez $sez,
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
                        $fail('АЭА-ны тек өз ауданыңызда өзгертуге болады.');
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

        $before = $activity->entitySnapshot($sez);
        $sez->update($validated);
        $sez->refresh();

        $activity->record(
            auditable: $sez,
            event: 'entity.updated',
            category: 'entity',
            action: 'СЭЗ мәліметтері жаңартылды',
            subject: $sez,
            properties: [
                'changes' => $activity->changes(
                    $before,
                    $activity->entitySnapshot($sez),
                    $activity->entityLabels($sez)
                ),
            ]
        );

        if (! empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'АЭА жаңартылды.');
        }

        return redirect()->route('sezs.index')->with('success', 'АЭА жаңартылды.');
    }

    public function deleted(Request $request)
    {
        $this->ensureSuperadmin($request);

        $search = trim((string) $request->input('search', ''));
        $query = Sez::onlyDeleted()
            ->with(['region:id,name', 'deleter:id,full_name']);

        if ($search !== '') {
            $query->whereLike('name', "%{$search}%");
        }

        $items = $query
            ->latest('deleted_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Sez $sez) => [
                ...$sez->toArray(),
                'show_url' => route('sezs.show', $sez->id, false),
                'restore_url' => route(
                    'sezs.restore-deleted',
                    $sez->id,
                    false
                ),
            ]);

        return Inertia::render('deleted-entities/index', [
            'items' => $items,
            'filters' => ['search' => $search],
            'config' => [
                'title' => 'Өшірілген арнайы экономикалық аймақтар',
                'entityLabel' => 'АЭА',
                'indexUrl' => route('sezs.index', absolute: false),
                'deletedUrl' => route('sezs.deleted', absolute: false),
            ],
        ]);
    }

    public function restoreDeleted(
        Request $request,
        int $sezId,
        SectorActivityLogService $activity
    ) {
        $this->ensureSuperadmin($request);

        $sez = Sez::onlyDeleted()->findOrFail($sezId);
        $sez->restoreFromDeletion();

        $activity->record(
            auditable: $sez,
            event: 'entity.restored',
            category: 'entity',
            action: 'СЭЗ қалпына келтірілді',
            subject: $sez
        );

        return redirect()->route('sezs.deleted')->with(
            'success',
            'АЭА қалпына келтірілді.'
        );
    }

    public function destroy(
        Request $request,
        Sez $sez,
        SectorActivityLogService $activity
    ) {
        abort_if($sez->is_deleted, 404);
        $sez->markAsDeletedBy($request->user());

        $activity->record(
            auditable: $sez,
            event: 'entity.deleted',
            category: 'entity',
            action: 'СЭЗ өшірілген нысандар бөліміне жіберілді',
            subject: $sez,
            properties: [
                'details' => [
                    'Өшірілген уақыт' => $sez->deleted_at,
                ],
            ]
        );

        return redirect()->route('sezs.index')->with(
            'success',
            'АЭА өшірілген нысандар бөліміне жіберілді.'
        );
    }

    private function ensureSuperadmin(Request $request): void
    {
        abort_unless(
            $request->user()?->roleModel?->name === 'superadmin',
            403,
            'Өшірілген АЭА-ларды тек супер әкімші көре алады.'
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
