<?php

namespace App\Services;

use App\Models\Region;
use App\Models\SubsoilUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class SubsoilIndexAnalyticsService
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array{subsoilUsers: LengthAwarePaginator, summary: array<string, int>, regions: Collection<int, Region>, mineralTypes: Collection<int, string>}
     */
    public function build(User $user, array $filters): array
    {
        $query = $this->baseQuery($user);
        $allUsers = (clone $query)->get();

        if (filled($filters['search'] ?? null)) {
            $search = trim((string) $filters['search']);
            $query->where(function (Builder $subsoil) use ($search): void {
                $subsoil->where('name', 'like', "%{$search}%")
                    ->orWhere('bin', 'like', "%{$search}%");
            });
        }

        if (filled($filters['region_id'] ?? null)) {
            $query->where('region_id', $filters['region_id']);
        }

        if (filled($filters['license_status'] ?? null)) {
            $query->where('license_status', $filters['license_status']);
        }

        if (filled($filters['mineral_type'] ?? null)) {
            $query->where(
                'mineral_type',
                'like',
                '%'.$filters['mineral_type'].'%'
            );
        }

        $subsoilUsers = $query
            ->orderByRaw(
                "CASE license_status WHEN 'illegal' THEN 0 WHEN 'expired' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END"
            )
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (SubsoilUser $subsoil): array => $this->present($subsoil)
            );

        return [
            'subsoilUsers' => $subsoilUsers,
            'summary' => $this->summary($allUsers),
            'regions' => $this->visibleRegions($user),
            'mineralTypes' => $allUsers
                ->pluck('mineral_type')
                ->filter()
                ->unique()
                ->sort()
                ->values(),
        ];
    }

    private function baseQuery(User $user): Builder
    {
        $query = SubsoilUser::query()
            ->with([
                'region:id,name,parent_id,type',
                'tasks' => fn ($tasks) => $tasks
                    ->where('status', '!=', 'done')
                    ->with('assignee:id,full_name')
                    ->select([
                        'id',
                        'subsoil_user_id',
                        'assigned_to',
                        'due_date',
                        'status',
                    ]),
            ])
            ->withCount([
                'issues as active_issues_count' => fn ($issues) => $issues->where('status', '!=', 'resolved'),
                'issues as critical_issues_count' => fn ($issues) => $issues
                    ->where('status', '!=', 'resolved')
                    ->where('severity', 'critical'),
                'tasks',
                'tasks as overdue_tasks_count' => fn ($tasks) => $tasks
                    ->where('status', '!=', 'done')
                    ->whereNotNull('due_date')
                    ->whereDate('due_date', '<', today()),
                'photos',
                'documents',
                'investmentProjects',
            ]);

        $this->scopeVisible($query, $user);

        return $query;
    }

    /** @return array<string, mixed> */
    private function present(SubsoilUser $subsoil): array
    {
        $isLicensed = $subsoil->license_status !== 'illegal';
        $checks = collect([
            filled($subsoil->bin),
            filled($subsoil->region_id),
            filled($subsoil->mineral_type),
            filled($subsoil->total_area),
            ! empty($subsoil->location),
            filled($subsoil->description),
        ]);

        if ($isLicensed) {
            $checks->push(filled($subsoil->license_start));
            $checks->push(filled($subsoil->license_end));
        }

        $responsible = $subsoil->tasks
            ->pluck('assignee.full_name')
            ->filter()
            ->unique()
            ->values();
        $riskLevel = match (true) {
            $subsoil->critical_issues_count > 0 => 'critical',
            $subsoil->license_status === 'illegal'
                && $subsoil->overdue_tasks_count > 0 => 'critical',
            $subsoil->license_status === 'illegal' => 'high',
            $subsoil->overdue_tasks_count > 0,
            $subsoil->license_status === 'expired' => 'high',
            $subsoil->license_status === 'suspended',
            $subsoil->active_issues_count > 0 => 'medium',
            default => 'normal',
        };

        return [
            'id' => $subsoil->id,
            'name' => $subsoil->name,
            'bin' => $subsoil->bin,
            'region' => $subsoil->region?->only(['id', 'name']),
            'mineral_type' => $subsoil->mineral_type,
            'total_area' => $subsoil->total_area,
            'license_status' => $subsoil->license_status,
            'license_start' => $subsoil->license_start?->toDateString(),
            'license_end' => $subsoil->license_end?->toDateString(),
            'updated_at' => $subsoil->updated_at?->toISOString(),
            'metrics' => [
                'active_issues_count' => (int) $subsoil
                    ->active_issues_count,
                'critical_issues_count' => (int) $subsoil
                    ->critical_issues_count,
                'tasks_count' => (int) $subsoil->tasks_count,
                'overdue_tasks_count' => (int) $subsoil
                    ->overdue_tasks_count,
                'photos_count' => (int) $subsoil->photos_count,
                'documents_count' => (int) $subsoil->documents_count,
                'projects_count' => (int) $subsoil
                    ->investment_projects_count,
                'responsible' => $responsible->all(),
                'data_completeness' => round(
                    ($checks->filter()->count() / $checks->count()) * 100,
                    1
                ),
                'risk_level' => $riskLevel,
                'recommended_action' => match ($riskLevel) {
                    'critical' => 'Мерзімі өткен бақылау әрекетін жедел қарау',
                    'high' => 'Заңдылық мәртебесін тексеріп, жауапты бекіту',
                    'medium' => 'Мәселе мен лицензия мәртебесін бақылау',
                    default => 'Жоспарлы мониторинг',
                },
            ],
        ];
    }

    /**
     * @param  Collection<int, SubsoilUser>  $items
     * @return array<string, int>
     */
    private function summary(Collection $items): array
    {
        return [
            'total' => $items->count(),
            'active' => $items->where('license_status', 'active')->count(),
            'illegal' => $items->where('license_status', 'illegal')->count(),
            'expired' => $items->where('license_status', 'expired')->count(),
            'suspended' => $items
                ->where('license_status', 'suspended')
                ->count(),
            'expiring_soon' => $items->filter(
                fn (SubsoilUser $item): bool => $item->license_status === 'active'
                    && $item->license_end
                    && $item->license_end->between(today(), today()->addDays(180))
            )->count(),
            'active_issues' => (int) $items->sum('active_issues_count'),
            'critical_issues' => (int) $items->sum('critical_issues_count'),
            'overdue_tasks' => (int) $items->sum('overdue_tasks_count'),
            'without_evidence' => $items->filter(
                fn (SubsoilUser $item): bool => (int) $item->photos_count === 0
                    && (int) $item->documents_count === 0
            )->count(),
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

    /** @return Collection<int, Region> */
    private function visibleRegions(User $user): Collection
    {
        $query = Region::query()->select('id', 'name');

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
