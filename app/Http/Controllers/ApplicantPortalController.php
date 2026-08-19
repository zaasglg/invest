<?php

namespace App\Http\Controllers;

use App\Models\InvestmentApplication;
use App\Services\ZoneCapacityService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

class ApplicantPortalController extends Controller
{
    public function __construct(
        private readonly ZoneCapacityService $capacity
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

        return Inertia::render('applicant/zones/show', [
            'accountRole' => $request->user()
                ->loadMissing('roleModel')
                ->roleModel?->name,
            'zone' => $this->capacity->present($zoneModel, true),
        ]);
    }
}
