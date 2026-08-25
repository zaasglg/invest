<?php

namespace App\Services;

use App\Models\InvestmentApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ZoneIndexAnalyticsService
{
    /** @var array<int, string> */
    private const PENDING_APPLICATION_STATUSES = [
        'submitted',
        'under_review',
        'needs_clarification',
    ];

    public function __construct(
        private readonly InfrastructureUsageService $usage
    ) {}

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $filters
     * @return array{zones: LengthAwarePaginator, summary: array<string, int|float>, regions: Collection<int, mixed>}
     */
    public function build(
        string $modelClass,
        User $user,
        array $filters,
        bool $moderator = false
    ): array {
        $query = $this->zoneQuery($modelClass, $user, $moderator);
        $allZones = (clone $query)->get();

        if (filled($filters['search'] ?? null)) {
            $query->where(
                'name',
                'like',
                '%'.trim((string) $filters['search']).'%'
            );
        }

        if (filled($filters['region_id'] ?? null)) {
            $query->where('region_id', $filters['region_id']);
        }

        if (filled($filters['status'] ?? null)) {
            $query->where('status', $filters['status']);
        }

        $zones = $query
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Model $zone): array => $this->present($zone));

        return [
            'zones' => $zones,
            'summary' => $this->summary($allZones),
            'regions' => $this->visibleRegions($user),
        ];
    }

    /** @param class-string<Model> $modelClass */
    private function zoneQuery(
        string $modelClass,
        User $user,
        bool $moderator
    ): Builder {
        $query = $modelClass::query();
        $this->scopeVisible($query, $user);

        return $query->with([
            'region:id,name,parent_id,type',
            'investmentProjects' => function ($projects) use (
                $moderator
            ): void {
                $projects
                    ->where('is_archived', false)
                    ->when(
                        $moderator,
                        fn ($query) => $query
                            ->curatedByTurkistanInvest()
                    )
                    ->select([
                        'investment_projects.id',
                        'name',
                        'jobs_count',
                        'total_investment',
                        'infrastructure',
                        'status',
                    ]);
            },
            'issues',
            'investmentApplications:id,zoneable_type,zoneable_id,status,approved_area,reserved_until',
        ])->withCount('photos');
    }

    /** @return array<string, mixed> */
    private function present(Model $zone): array
    {
        $metrics = $this->metrics($zone);

        return [
            'id' => (int) $zone->getKey(),
            'name' => $zone->name,
            'region' => $zone->region?->only(['id', 'name']),
            'status' => $zone->status,
            'total_area' => $zone->total_area,
            'updated_at' => $zone->updated_at?->toISOString(),
            'metrics' => $metrics,
        ];
    }

    /** @return array<string, mixed> */
    private function metrics(Model $zone): array
    {
        $projects = $zone->investmentProjects;
        $issues = $zone->issues;
        $applications = $zone->investmentApplications;
        $area = $this->usage->summarizeArea($zone->total_area, $projects);
        $reserved = (float) $applications
            ->filter(fn (InvestmentApplication $application): bool => $application->status === 'approved'
                && $application->reserved_until?->isFuture()
            )
            ->sum('approved_area');
        $available = max(
            0.0,
            (float) $area['total'] - (float) $area['occupied'] - $reserved
        );
        $infrastructure = collect($this->usage->summarize(
            $zone->infrastructure,
            $projects
        ));
        $overloadedResources = $infrastructure
            ->filter(fn (array $item): bool => $item['overused'] > 0)
            ->keys()
            ->values();
        $activeIssues = $issues->where('status', '!=', 'resolved');
        $criticalIssues = $activeIssues->where('severity', 'critical');
        $pendingApplications = $applications->whereIn(
            'status',
            self::PENDING_APPLICATION_STATUSES
        );
        $filledFields = collect([
            filled($zone->total_area),
            ! empty($zone->infrastructure),
            ! empty($zone->location),
            filled($zone->description),
            ! empty($zone->geometry),
        ])->filter()->count();
        $attentionReasons = collect();

        if ($criticalIssues->isNotEmpty()) {
            $attentionReasons->push('Критикалық мәселе бар');
        } elseif ($activeIssues->isNotEmpty()) {
            $attentionReasons->push('Ашық мәселе бар');
        }
        if ((float) $area['overused'] > 0) {
            $attentionReasons->push('Аумақ лимитінен асқан');
        }
        if ($overloadedResources->isNotEmpty()) {
            $attentionReasons->push('Инфрақұрылым жүктемесі жоғары');
        }
        if ($projects->isEmpty()) {
            $attentionReasons->push('Белсенді жоба жоқ');
        }
        if ($pendingApplications->isNotEmpty()) {
            $attentionReasons->push('Қаралатын өтінім бар');
        }

        return [
            'projects_count' => $projects->count(),
            'investment' => (float) $projects->sum('total_investment'),
            'jobs_count' => (int) $projects->sum('jobs_count'),
            'area' => [
                'total' => (float) $area['total'],
                'occupied' => (float) $area['occupied'],
                'reserved' => $reserved,
                'available' => $available,
                'overused' => (float) $area['overused'],
                'usage_rate' => (float) $area['total'] > 0
                    ? round(
                        min(
                            100,
                            (($area['occupied'] + $reserved) / $area['total'])
                                * 100
                        ),
                        1
                    )
                    : 0.0,
            ],
            'active_issues_count' => $activeIssues->count(),
            'critical_issues_count' => $criticalIssues->count(),
            'pending_applications_count' => $pendingApplications->count(),
            'active_reservations_count' => $applications
                ->filter(fn (InvestmentApplication $application): bool => $application->status === 'approved'
                    && $application->reserved_until?->isFuture()
                )
                ->count(),
            'photos_count' => (int) ($zone->photos_count ?? 0),
            'data_completeness' => round(($filledFields / 5) * 100, 1),
            'overloaded_resources' => $overloadedResources->all(),
            'requires_attention' => $attentionReasons->isNotEmpty(),
            'attention_reasons' => $attentionReasons->values()->all(),
        ];
    }

    /**
     * @param  Collection<int, Model>  $zones
     * @return array<string, int|float>
     */
    private function summary(Collection $zones): array
    {
        $metrics = $zones->map(fn (Model $zone): array => $this->metrics($zone));

        return [
            'total' => $zones->count(),
            'active' => $zones->where('status', 'active')->count(),
            'developing' => $zones->where('status', 'developing')->count(),
            'planned' => $zones->where('status', 'planned')->count(),
            'total_area' => round((float) $metrics->sum('area.total'), 2),
            'occupied_area' => round(
                (float) $metrics->sum('area.occupied'),
                2
            ),
            'reserved_area' => round(
                (float) $metrics->sum('area.reserved'),
                2
            ),
            'available_area' => round(
                (float) $metrics->sum('area.available'),
                2
            ),
            'projects_count' => (int) $metrics->sum('projects_count'),
            'investment' => (float) $metrics->sum('investment'),
            'jobs_count' => (int) $metrics->sum('jobs_count'),
            'active_issues' => (int) $metrics->sum('active_issues_count'),
            'critical_issues' => (int) $metrics->sum('critical_issues_count'),
            'pending_applications' => (int) $metrics
                ->sum('pending_applications_count'),
            'attention_count' => $metrics
                ->where('requires_attention', true)
                ->count(),
        ];
    }

    private function scopeVisible(Builder $query, User $user): void
    {
        $user->loadMissing(['roleModel', 'region']);

        if ($user->isDistrictScoped()) {
            $query->where('region_id', $user->region_id);

            return;
        }

        if ($user->isOblastScopedAkim()) {
            $oblastId = $user->region_id;
            $query->where(function (Builder $regions) use ($oblastId): void {
                $regions->where('region_id', $oblastId)
                    ->orWhereHas(
                        'region',
                        fn (Builder $region) => $region
                            ->where('parent_id', $oblastId)
                    );
            });
        }
    }

    /** @return Collection<int, mixed> */
    private function visibleRegions(User $user): Collection
    {
        $query = \App\Models\Region::query()->select('id', 'name');

        if ($user->isDistrictScoped()) {
            $query->whereKey($user->region_id);
        } elseif ($user->isOblastScopedAkim()) {
            $oblastId = $user->region_id;
            $query->where(
                fn (Builder $regions) => $regions
                    ->whereKey($oblastId)
                    ->orWhere('parent_id', $oblastId)
            );
        }

        return $query->orderBy('name')->get();
    }
}
