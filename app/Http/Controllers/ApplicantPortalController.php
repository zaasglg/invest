<?php

namespace App\Http\Controllers;

use App\Models\InvestmentApplication;
use App\Models\InvestmentProject;
use App\Services\InvestmentProjectAccessService;
use App\Services\ZoneCapacityService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

class ApplicantPortalController extends Controller
{
    public function __construct(
        private readonly ZoneCapacityService $capacity,
        private readonly InvestmentProjectAccessService $projectAccess
    ) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'type' => 'nullable|in:sez,industrial-zone,prom-zone',
            'region_id' => 'nullable|integer|exists:regions,id',
            'has_available_area' => 'nullable|boolean',
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $zoneType = $validated['type'] ?? null;
        $zoneTypes = $zoneType
            ? [$zoneType => ZoneCapacityService::ZONE_TYPES[$zoneType]]
            : ZoneCapacityService::ZONE_TYPES;

        $zones = collect($zoneTypes)
            ->flatMap(function (string $model) use ($validated) {
                return $model::query()
                    ->with('region:id,name,type')
                    ->when(
                        $validated['region_id'] ?? null,
                        fn ($query, $regionId) => $query->where('region_id', $regionId)
                    )
                    ->orderBy('name')
                    ->get();
            })
            ->when(
                $search !== '',
                fn ($items) => $items->filter(
                    fn ($zone) => str_contains(
                        mb_strtolower($zone->name.' '.$zone->region?->name),
                        mb_strtolower($search)
                    )
                )
            )
            ->map(fn ($zone) => $this->capacity->present($zone))
            ->when(
                filter_var(
                    $validated['has_available_area'] ?? false,
                    FILTER_VALIDATE_BOOL
                ),
                fn ($items) => $items->filter(
                    fn (array $zone) => $zone['area']['available'] > 0
                )
            )
            ->sortBy([
                ['area.available', 'desc'],
                ['name', 'asc'],
            ])
            ->values();

        $page = max(1, (int) $request->integer('page', 1));
        $perPage = 12;
        $paginator = new LengthAwarePaginator(
            $zones->forPage($page, $perPage)->values(),
            $zones->count(),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        $applicationQuery = InvestmentApplication::query()
            ->where('user_id', $request->user()->id);

        return Inertia::render('applicant/portal', [
            'accountRole' => $request->user()
                ->loadMissing('roleModel')
                ->roleModel?->name,
            'zones' => $paginator,
            'filters' => [
                'search' => $search,
                'type' => $validated['type'] ?? '',
                'region_id' => (string) ($validated['region_id'] ?? ''),
                'has_available_area' => (bool) ($validated['has_available_area'] ?? false),
            ],
            'regions' => \App\Models\Region::query()
                ->where('type', 'district')
                ->orderBy('sort_order')
                ->get(['id', 'name']),
            'applicationStats' => [
                'total' => (clone $applicationQuery)->count(),
                'in_progress' => (clone $applicationQuery)
                    ->whereIn('status', [
                        'submitted',
                        'under_review',
                        'needs_clarification',
                    ])->count(),
                'approved' => (clone $applicationQuery)
                    ->where('status', 'approved')
                    ->count(),
                'converted' => (clone $applicationQuery)
                    ->where('status', 'converted_to_project')
                    ->count(),
            ],
        ]);
    }

    public function show(Request $request, string $zoneType, int $zone)
    {
        $zoneModel = $this->capacity->resolve($zoneType, $zone);
        $user = $request->user()->loadMissing('roleModel');
        $roleName = $user->roleModel?->name;
        $presentedZone = $this->capacity->present($zoneModel, true);
        $projectPage = max(1, $request->integer('projects_page', 1));
        $investmentProjects = new LengthAwarePaginator(
            [],
            0,
            10,
            $projectPage,
            [
                'path' => $request->url(),
                'pageName' => 'projects_page',
                'query' => $request->query(),
            ]
        );
        $mapProjects = collect();

        if ($roleName === 'investor') {
            $zoneRelation = match ($zoneType) {
                'sez' => 'sezs',
                'industrial-zone' => 'industrialZones',
                'prom-zone' => 'promZones',
            };
            $projectsQuery = InvestmentProject::query()
                ->where('is_archived', false)
                ->whereHas(
                    $zoneRelation,
                    fn ($query) => $query->whereKey($zoneModel->getKey())
                )
                ->with('region:id,name');
            $this->projectAccess->scopeVisible($projectsQuery, $user);

            $presentProject = static fn (InvestmentProject $project): array => [
                'id' => (int) $project->id,
                'name' => $project->name,
                'company_name' => (string) ($project->company_name ?? ''),
                'total_investment' => $project->total_investment,
                'status' => $project->status,
                'geometry' => $project->geometry,
                'region' => $project->region?->only(['id', 'name']),
            ];

            $mapProjects = (clone $projectsQuery)
                ->whereNotNull('geometry')
                ->get()
                ->map($presentProject)
                ->values();
            $investmentProjects = (clone $projectsQuery)
                ->latest()
                ->paginate(10, ['*'], 'projects_page')
                ->withQueryString()
                ->through($presentProject);
        }

        $area = $presentedZone['area'];

        return Inertia::render('sezs/show', [
            'sez' => [
                'id' => (int) $zoneModel->getKey(),
                'name' => $zoneModel->name,
                'region_id' => (int) $zoneModel->region_id,
                'region' => $presentedZone['region'],
                'total_area' => (float) $area['total'],
                'location' => $presentedZone['location'],
                'status' => $zoneModel->status,
                'infrastructure' => collect($zoneModel->infrastructure)
                    ->map(fn (mixed $resource): array => [
                        'available' => is_array($resource)
                            ? (bool) ($resource['available'] ?? false)
                            : (bool) $resource,
                        'capacity' => is_array($resource)
                            && isset($resource['capacity'])
                            ? (string) $resource['capacity']
                            : null,
                        'distance' => is_array($resource)
                            && isset($resource['distance'])
                            ? (string) $resource['distance']
                            : null,
                        'type' => is_array($resource)
                            && isset($resource['type'])
                            ? (string) $resource['type']
                            : null,
                    ])->all(),
                'description' => $presentedZone['description'],
                'created_at' => $zoneModel->created_at?->toISOString(),
            ],
            'portalContext' => [
                'accountRole' => $roleName,
                'zoneType' => $zoneType,
                'typeLabel' => $presentedZone['type_label'],
                'availableArea' => (float) $area['available'],
            ],
            'areaUsage' => [
                'total' => (float) $area['total'],
                'occupied' => max(
                    0,
                    (float) $area['total'] - (float) $area['available']
                ),
                'available' => (float) $area['available'],
                'overused' => 0,
                'consumers' => [],
            ],
            'infrastructureUsage' => collect(
                $presentedZone['infrastructure']
            )->map(fn (array $resource): array => [
                'total' => (float) $resource['total'],
                'used' => (float) $resource['used'],
                'remaining' => (float) $resource['remaining'],
            ])->all(),
            'investmentProjects' => $investmentProjects,
            'mapProjects' => $mapProjects,
            'mainGallery' => $presentedZone['main_gallery'],
            'renderPhotos' => $presentedZone['render_photos'],
        ]);
    }
}
