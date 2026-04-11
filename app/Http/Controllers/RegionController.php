<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class RegionController extends Controller
{
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

        $regions = Region::orderBy('sort_order', 'asc')->where('id', '!=', $region->id)->get();
        $regions->splice($targetIndex, 0, [$region]);

        $index = 1;
        foreach ($regions as $r) {
            $r->update(['sort_order' => $index++]);
        }

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
            'icon_file' => 'nullable|file|mimes:png,jpg,jpeg,webp,svg',
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

        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = \App\Models\Region::max('sort_order') + 1;
        }

        if ($request->hasFile('icon_file')) {
            $validated['icon'] = $request->file('icon_file')->store('region-icons', 'public');
        } else {
            $validated['icon'] = 'factory';
        }

        unset($validated['icon_file']);

        Region::create($validated);
        $this->clearDashboardRegionCache();

        return redirect()->route('regions.index')->with('success', 'Аймақ құрылды.');
    }

    public function show(Region $region)
    {
        $user = request()->user();

        $region->load([
            'subsoilUsers' => function ($query) {
                $query->withCount('issues');
            },
            'subsoilUsers.issues',
            'parent',
        ]);
        $region->load([
            'sezs' => function ($query) {
                $query->withCount('issues');
            },
            'sezs.issues',
        ]);
        $region->load([
            'industrialZones' => function ($query) {
                $query->withCount('issues');
            },
            'industrialZones.issues',
        ]);
        $region->load([
            'promZones' => function ($query) {
                $query->withCount('issues');
            },
            'promZones.issues',
        ]);
        $projectsQuery = InvestmentProject::active()->with(['sezs', 'industrialZones', 'promZones', 'subsoilUsers', 'projectType', 'executors'])
            ->where('region_id', $region->id)
            ->orderBy('sort_order');

        $projects = $projectsQuery->get();

        // Stats for "Все" tab
        $totalArea = $region->area ?? 0;
        $projectsCount = $projects->count();
        $totalInvestment = $projects->sum('total_investment');
        $projectIssuesCount = \App\Models\ProjectIssue::whereIn(
            'project_id',
            $projects->pluck('id')
        )->count();

        // SEZ issues count
        $sezIssuesCount = \App\Models\SezIssue::whereIn(
            'sez_id',
            $region->sezs->pluck('id')
        )->count();

        // IZ issues count
        $izIssuesCount = \App\Models\IndustrialZoneIssue::whereIn(
            'industrial_zone_id',
            $region->industrialZones->pluck('id')
        )->count();

        // Prom zone issues count
        $promIssuesCount = \App\Models\PromZoneIssue::whereIn(
            'prom_zone_id',
            $region->promZones->pluck('id')
        )->count();

        // Subsoil issues count
        $subsoilIssuesCount = \App\Models\SubsoilIssue::whereIn(
            'subsoil_user_id',
            $region->subsoilUsers->pluck('id')
        )->count();

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
        
        if (!in_array($roleName, ['superadmin'])) {
            abort(403);
        }

        $validated = $request->validate([
            'region_ids' => 'required|array',
            'region_ids.*' => 'integer|exists:regions,id',
            'page' => 'integer',
        ]);

        // Using page to calculate relative sort_order offsets if necessary, 
        // but simple array order starts from base index:
        $page = $validated['page'] ?? 1;
        $perPage = 15; // default pagination in index
        $offset = ($page - 1) * $perPage;

        foreach ($validated['region_ids'] as $index => $regionId) {
            Region::where('id', $regionId)
                ->update(['sort_order' => $offset + $index]);
        }

        return response()->json(['success' => true]);
    }

    public function reorderProjects(Request $request, Region $region)
    {
        $user = $request->user();
        $role = $user?->load('roleModel')->roleModel?->name;
        
        if (!in_array($role, ['superadmin', 'invest'])) {
            abort(403);
        }

        $validated = $request->validate([
            'project_ids' => 'required|array',
            'project_ids.*' => 'integer|exists:investment_projects,id',
        ]);

        foreach ($validated['project_ids'] as $index => $projectId) {
            InvestmentProject::where('id', $projectId)
                ->where('region_id', $region->id)
                ->update(['sort_order' => $index]);
        }

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
            'icon_file' => 'nullable|file|mimes:png,jpg,jpeg,webp,svg',
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

        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = $region->sort_order;
        }

        if ($request->hasFile('icon_file')) {
            if ($region->icon && str_contains($region->icon, '/')) {
                Storage::disk('public')->delete($region->icon);
            }

            $validated['icon'] = $request->file('icon_file')->store('region-icons', 'public');
        }

        unset($validated['icon_file']);

        $region->update($validated);
        $this->clearDashboardRegionCache();

        return redirect()->route('regions.index')->with('success', 'Аймақ жаңартылды.');
    }

    public function destroy(Region $region)
    {
        if ($region->icon && str_contains($region->icon, '/')) {
            Storage::disk('public')->delete($region->icon);
        }

        $region->delete();
        $this->clearDashboardRegionCache();

        return redirect()->back()->with('success', 'Аймақ жойылды.');
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
