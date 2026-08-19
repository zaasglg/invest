<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Services\InvestmentProjectAccessService;
use App\Services\SortOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use RuntimeException;
use Throwable;

class RegionController extends Controller
{
    public function __construct(
        private readonly InvestmentProjectAccessService $projectAccess,
        private readonly SortOrderService $sortOrder
    ) {}

    public function index(Request $request)
    {
        $regionsQuery = Region::query()->orderBy('sort_order', 'asc');

        $user = $request->user();
        if ($this->isIspolnitelUser($user)) {
            $regionsQuery->where('type', 'district');
        }

        $regions = $regionsQuery->paginate(15)->withQueryString();

        return Inertia::render('regions/index', [
            'regions' => $regions,
        ]);
    }

    public function moveToPage(Request $request, Region $region)
    {
        $request->validate([
            'target_page' => 'required|integer|min:1',
        ]);

        $targetPage = $request->target_page;
        $perPage = 20;

        $targetIndex = ($targetPage - 1) * $perPage;

        $regionIds = Region::query()
            ->orderBy('sort_order')
            ->where('id', '!=', $region->id)
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();
        array_splice($regionIds, $targetIndex, 0, [(int) $region->id]);
        $this->sortOrder->update(Region::class, $regionIds, 1);

        return redirect()->back()->with('success', 'Аймақтың орны ауыстырылды.');
    }

    public function create()
    {
        $parents = Region::where('type', 'oblast')->get();

        return Inertia::render('regions/create', [
            'parents' => $parents,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:regions',
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'icon_file' => 'nullable|image|mimes:png,jpg,jpeg,webp|max:2048',
            'area' => 'nullable|numeric|min:0',
            'type' => 'required|string|in:oblast,district',
            'subtype' => 'nullable|string|in:district,city',
            'parent_id' => 'required|exists:regions,id',
            'sort_order' => 'nullable|integer',
            'geometry' => 'nullable|array',
            'geometry.*' => 'array',
            'geometry.*.*.lat' => 'required|numeric',
            'geometry.*.*.lng' => 'required|numeric',
        ]);

        // Clear subtype if type is oblast
        if ($validated['type'] === 'oblast') {
            $validated['subtype'] = null;
        }

        if (! isset($validated['sort_order'])) {
            $validated['sort_order'] = \App\Models\Region::max('sort_order') + 1;
        }

        $storedIcon = null;
        if ($request->hasFile('icon_file')) {
            $storedIcon = $request->file('icon_file')
                ->store('region-icons', 'public');
            if (! is_string($storedIcon)) {
                throw new RuntimeException(
                    'The region icon could not be stored.'
                );
            }
            $validated['icon'] = $storedIcon;
        } else {
            $validated['icon'] = 'factory';
        }

        unset($validated['icon_file']);

        try {
            Region::create($validated);
        } catch (Throwable $exception) {
            if (is_string($storedIcon)) {
                Storage::disk('public')->delete($storedIcon);
            }

            throw $exception;
        }
        $this->clearDashboardRegionCache();

        return redirect()->route('regions.index')->with('success', 'Аймақ құрылды.');
    }

    public function show(Region $region)
    {
        $user = request()->user();
        $this->authorizeRegionAccess($region, $user);
        $user?->loadMissing('roleModel');
        $roleName = $user?->roleModel?->name;
        $isInvestor = $roleName === 'investor';

        $region->load([
            'subsoilUsers' => function ($query) use ($isInvestor) {
                if (! $isInvestor) {
                    $query->withCount('issues');
                }
            },
            'parent',
        ]);
        $region->load([
            'sezs' => function ($query) use ($isInvestor) {
                if (! $isInvestor) {
                    $query->withCount('issues');
                }
            },
        ]);
        $region->load([
            'industrialZones' => function ($query) use ($isInvestor) {
                if (! $isInvestor) {
                    $query->withCount('issues');
                }
            },
        ]);
        $region->load([
            'promZones' => function ($query) use ($isInvestor) {
                if (! $isInvestor) {
                    $query->withCount('issues');
                }
            },
        ]);

        $projectsQuery = InvestmentProject::active()
            ->with([
                'sezs',
                'industrialZones',
                'promZones',
                'subsoilUsers',
                'projectType',
                'projectTypes',
                'executors',
            ])
            ->where('region_id', $region->id)
            ->orderBy('sort_order');

        if ($user) {
            $this->projectAccess->scopeVisible($projectsQuery, $user);
        }

        $projects = $projectsQuery->get();

        // Stats for "Все" tab
        $totalArea = $region->area ?? 0;
        $projectsCount = $projects->count();
        $totalInvestment = $projects->sum('total_investment');
        $projectIssuesCount = \App\Models\ProjectIssue::whereIn(
            'project_id',
            $projects->pluck('id')
        )->count();

        // Determine which entity sections the invest sub-role can access.
        $subRole = ($roleName === 'invest') ? $user->invest_sub_role : null;
        $canSeeSez = ! $subRole || in_array($subRole, ['aea', 'turkistan_invest'], true);
        $canSeeIz = ! $subRole || in_array($subRole, ['ia', 'turkistan_invest'], true);
        $canSeeProm = ! $subRole || in_array($subRole, ['prom_zone', 'turkistan_invest'], true);
        $canSeeSubsoil = ! $subRole || $subRole === 'turkistan_invest';

        // SEZ issues count
        $sezIssuesCount = $canSeeSez && ! $isInvestor
            ? \App\Models\SezIssue::whereIn('sez_id', $region->sezs->pluck('id'))->count()
            : 0;

        // IZ issues count
        $izIssuesCount = $canSeeIz && ! $isInvestor
            ? \App\Models\IndustrialZoneIssue::whereIn('industrial_zone_id', $region->industrialZones->pluck('id'))->count()
            : 0;

        // Prom zone issues count
        $promIssuesCount = $canSeeProm && ! $isInvestor
            ? \App\Models\PromZoneIssue::whereIn('prom_zone_id', $region->promZones->pluck('id'))->count()
            : 0;

        // Subsoil issues count
        $subsoilIssuesCount = $canSeeSubsoil && ! $isInvestor
            ? \App\Models\SubsoilIssue::whereIn('subsoil_user_id', $region->subsoilUsers->pluck('id'))->count()
            : 0;

        return Inertia::render('regions/show', [
            'region' => $region,
            'projects' => $projects,
            'sezs' => $region->sezs,
            'industrialZones' => $region->industrialZones,
            'promZones' => $region->promZones,
            'subsoilUsers' => $region->subsoilUsers,
            'stats' => [
                'totalArea' => round($totalArea, 2),
                'projectsCount' => $projectsCount,
                'totalInvestment' => $totalInvestment,
                'projectIssuesCount' => $projectIssuesCount,
                'sezIssuesCount' => $sezIssuesCount,
                'izIssuesCount' => $izIssuesCount,
                'promIssuesCount' => $promIssuesCount,
                'subsoilIssuesCount' => $subsoilIssuesCount,
            ],
        ]);
    }

    public function reorder(Request $request)
    {
        $user = $request->user();
        $roleName = $user?->load('roleModel')->roleModel?->name;

        if (! in_array($roleName, ['superadmin'])) {
            abort(403);
        }

        $validated = $request->validate([
            'region_ids' => 'required|array|min:1',
            'region_ids.*' => 'integer|distinct|exists:regions,id',
            'page' => 'sometimes|integer|min:1',
        ]);

        // Using page to calculate relative sort_order offsets if necessary,
        // but simple array order starts from base index:
        $page = $validated['page'] ?? 1;
        $perPage = 15; // default pagination in index
        $offset = ($page - 1) * $perPage;

        $this->sortOrder->update(
            Region::class,
            array_map('intval', $validated['region_ids']),
            $offset
        );

        return response()->json(['success' => true]);
    }

    public function reorderProjects(Request $request, Region $region)
    {
        $user = $request->user();
        $role = $user?->load('roleModel')->roleModel?->name;

        if (! in_array($role, ['superadmin', 'invest'])) {
            abort(403);
        }

        $validated = $request->validate([
            'project_ids' => 'required|array|min:1',
            'project_ids.*' => 'integer|distinct|exists:investment_projects,id',
        ]);

        $projectIds = $validated['project_ids'];
        $allowedProjectCount = $this->projectAccess->scopeVisible(
            InvestmentProject::query()
                ->where('region_id', $region->id)
                ->whereIn('id', $projectIds),
            $user
        )->count();

        abort_unless($allowedProjectCount === count($projectIds), 403);

        $this->sortOrder->update(
            InvestmentProject::class,
            array_map('intval', $projectIds)
        );

        return response()->noContent();
    }

    public function edit(Region $region)
    {
        $parents = Region::where('type', 'oblast')
            ->where('id', '!=', $region->id)
            ->get();

        return Inertia::render('regions/edit', [
            'region' => $region,
            'parents' => $parents,
        ]);
    }

    public function update(Request $request, Region $region)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:regions,name,'.$region->id,
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'icon_file' => 'nullable|image|mimes:png,jpg,jpeg,webp|max:2048',
            'area' => 'nullable|numeric|min:0',
            'type' => 'required|string|in:oblast,district',
            'subtype' => 'nullable|string|in:district,city',
            'parent_id' => 'required|exists:regions,id',
            'sort_order' => 'nullable|integer',
            'geometry' => 'nullable|array',
            'geometry.*' => 'array',
            'geometry.*.*.lat' => 'required|numeric',
            'geometry.*.*.lng' => 'required|numeric',
        ]);

        // Clear subtype if type is oblast
        if ($validated['type'] === 'oblast') {
            $validated['subtype'] = null;
        }

        if (! isset($validated['sort_order'])) {
            $validated['sort_order'] = $region->sort_order;
        }

        $oldIcon = $region->icon;
        $storedIcon = null;
        if ($request->hasFile('icon_file')) {
            $storedIcon = $request->file('icon_file')
                ->store('region-icons', 'public');
            if (! is_string($storedIcon)) {
                throw new RuntimeException(
                    'The region icon could not be stored.'
                );
            }
            $validated['icon'] = $storedIcon;
        }

        unset($validated['icon_file']);

        try {
            $region->update($validated);
        } catch (Throwable $exception) {
            if (is_string($storedIcon)) {
                Storage::disk('public')->delete($storedIcon);
            }

            throw $exception;
        }

        if ($storedIcon
            && $oldIcon
            && str_contains($oldIcon, '/')) {
            Storage::disk('public')->delete($oldIcon);
        }
        $this->clearDashboardRegionCache();

        return redirect()->route('regions.index')->with('success', 'Аймақ жаңартылды.');
    }

    public function destroy(Region $region)
    {
        return redirect()->back()->with(
            'error',
            'Аймақтарды жоюға тыйым салынған.'
        );
    }

    private function clearDashboardRegionCache(): void
    {
        Cache::forget('dashboard.regions');
        Cache::forget('dashboard.regions.v2');
    }

    private function isIspolnitelUser($user): bool
    {
        if (! $user) {
            return false;
        }

        $user->loadMissing('roleModel');

        return $user->roleModel?->name === 'ispolnitel';
    }

    private function authorizeRegionAccess(Region $region, $user): void
    {
        if (! $user) {
            return;
        }

        $user->loadMissing(['roleModel', 'region']);

        if ($user->isDistrictScoped()
            && (int) $region->id !== (int) $user->region_id) {
            abort(403, 'Сіздің бұл аймаққа қол жеткізу құқығыңыз жоқ.');
        }

        if ($user->isOblastScopedAkim()) {
            $isInOwnOblast = (int) $region->id === (int) $user->region_id
                || (int) $region->parent_id === (int) $user->region_id;

            abort_unless(
                $isInOwnOblast,
                403,
                'Сіздің бұл аймаққа қол жеткізу құқығыңыз жоқ.'
            );
        }
    }

    private function hasProjectParticipationInRegion(int $regionId, int $userId): bool
    {
        return InvestmentProject::active()
            ->where('region_id', $regionId)
            ->where(function ($query) use ($userId) {
                $query->where('created_by', $userId)
                    ->orWhereHas('executors', function ($executorQuery) use ($userId) {
                        $executorQuery->where('users.id', $userId);
                    });
            })
            ->exists();
    }
}
