<?php

namespace App\Services;

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\PromZone;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Models\User;
use Illuminate\Support\Collection;

class OblastAkimAnalyticsService
{
    /**
     * Build a management overview for an oblast-scoped akim.
     *
     * @return array<string, mixed>
     */
    public function build(User $user): array
    {
        $user->loadMissing(['roleModel', 'region.children']);

        if (! $user->isOblastScopedAkim()) {
            return [];
        }

        $oblast = $user->region;
        $districts = $oblast->children
            ->where('type', 'district')
            ->sortBy('sort_order')
            ->values();
        $regionIds = $districts->pluck('id')
            ->push($oblast->id)
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values();

        $projects = InvestmentProject::query()
            ->active()
            ->whereIn('region_id', $regionIds)
            ->with([
                'region:id,name,parent_id,type',
                'projectType:id,name',
                'projectTypes:id,name',
                'tasks:id,project_id,assigned_to,status,due_date',
                'issues:id,project_id,status,severity',
                'productionPlans.facts',
            ])
            ->get();

        $districtQuality = $this->districtQuality($districts, $projects);
        $managementQuality = $this->managementQuality($projects);
        $production = $this->productionPerformance($projects);
        $niches = $this->nicheAnalytics($projects);
        $regionalPotential = $this->regionalPotential(
            $regionIds,
            $projects,
            $districtQuality,
            $niches
        );

        return [
            'scope' => [
                'oblast_id' => $oblast->id,
                'oblast_name' => $oblast->name,
                'districts_count' => $districts->count(),
                'description' => 'Облыс және оған бағынысты барлық аудан жобалары',
            ],
            'summary' => $this->summary($projects),
            'status_distribution' => $this->statusDistribution($projects),
            'district_quality' => $districtQuality,
            'management_quality' => $managementQuality,
            'production_summary' => $production['summary'],
            'production_performance' => $production['projects'],
            'niche_analytics' => $niches,
            'regional_potential' => $regionalPotential,
        ];
    }

    /**
     * Return a compact, prompt-friendly version of the analytics.
     *
     * @return array<string, mixed>
     */
    public function aiContext(User $user): array
    {
        $analytics = $this->build($user);

        if ($analytics === []) {
            return [];
        }

        return [
            'scope' => $analytics['scope'],
            'summary' => $analytics['summary'],
            'status_distribution' => $analytics['status_distribution'],
            'district_quality' => array_slice(
                $analytics['district_quality'],
                0,
                10
            ),
            'management_quality' => array_slice(
                $analytics['management_quality'],
                0,
                10
            ),
            'production_summary' => $analytics['production_summary'],
            'production_performance' => array_slice(
                $analytics['production_performance'],
                0,
                10
            ),
            'niche_analytics' => array_slice(
                $analytics['niche_analytics'],
                0,
                10
            ),
            'regional_potential' => $analytics['regional_potential'],
        ];
    }

    /** @return array<string, int|float> */
    private function summary(Collection $projects): array
    {
        $tasks = $projects->flatMap->tasks;
        $issues = $projects->flatMap->issues;
        $overdueTasks = $tasks->filter(fn ($task): bool => $this->isOverdue($task));

        return [
            'total_projects' => $projects->count(),
            'total_investment' => (float) $projects->sum('total_investment'),
            'jobs_count' => (int) $projects->sum('jobs_count'),
            'implementation_projects' => $projects
                ->where('status', 'implementation')
                ->count(),
            'launched_projects' => $projects
                ->where('status', 'launched')
                ->count(),
            'suspended_projects' => $projects
                ->where('status', 'suspended')
                ->count(),
            'active_issues' => $issues
                ->where('status', '!=', 'resolved')
                ->count(),
            'critical_issues' => $issues
                ->where('status', '!=', 'resolved')
                ->where('severity', 'critical')
                ->count(),
            'total_tasks' => $tasks->count(),
            'completed_tasks' => $tasks->where('status', 'done')->count(),
            'overdue_tasks' => $overdueTasks->count(),
        ];
    }

    /** @return array<int, array{name: string, value: int}> */
    private function statusDistribution(Collection $projects): array
    {
        $labels = [
            'plan' => 'Жоспарлау',
            'implementation' => 'Іске асыру',
            'launched' => 'Іске қосылған',
            'suspended' => 'Тоқтатылған',
        ];

        return collect($labels)
            ->map(fn (string $label, string $status): array => [
                'name' => $label,
                'value' => $projects->where('status', $status)->count(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function districtQuality(
        Collection $districts,
        Collection $projects
    ): array {
        return $districts
            ->map(function ($district) use ($projects): array {
                $districtProjects = $projects->where('region_id', $district->id);
                $quality = $this->projectGroupQuality($districtProjects);

                return [
                    'id' => $district->id,
                    'name' => $district->name,
                    ...$quality,
                ];
            })
            ->sortBy([
                [fn (array $item): int => $item['score'] === null ? 1 : 0, 'asc'],
                [fn (array $item): float => (float) ($item['score'] ?? 0), 'desc'],
                ['name', 'asc'],
            ])
            ->values()
            ->map(function (array $item, int $index): array {
                $item['rank'] = $index + 1;

                return $item;
            })
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function managementQuality(Collection $projects): array
    {
        $tasks = $projects->flatMap->tasks;
        $assignedExecutorIds = $tasks->pluck('assigned_to')
            ->filter()
            ->unique()
            ->values();
        $executors = User::query()
            ->whereHas(
                'roleModel',
                fn ($query) => $query->where('name', 'ispolnitel')
            )
            ->whereIn('baskarma_type', ['oblast', 'additional'])
            ->whereIn('id', $assignedExecutorIds)
            ->with('region:id,name')
            ->get();

        $tasks = $tasks
            ->whereIn('assigned_to', $executors->pluck('id'));

        return $executors
            ->groupBy(fn (User $executor): string => trim(
                (string) ($executor->position ?: $executor->full_name)
            ))
            ->map(function (Collection $members, string $name) use ($tasks): array {
                $memberTasks = $tasks->whereIn('assigned_to', $members->pluck('id'));
                $total = $memberTasks->count();
                $completed = $memberTasks->where('status', 'done')->count();
                $overdue = $memberTasks
                    ->filter(fn ($task): bool => $this->isOverdue($task))
                    ->count();
                $completionRate = $this->percentage($completed, $total);
                $deadlineRate = $this->percentage($total - $overdue, $total);
                $score = $total > 0
                    ? round(($completionRate * 0.6) + ($deadlineRate * 0.4), 1)
                    : null;

                return [
                    'name' => $name,
                    'members_count' => $members->count(),
                    'regions' => $members->pluck('region.name')
                        ->filter()
                        ->unique()
                        ->values()
                        ->all(),
                    'project_count' => $memberTasks
                        ->pluck('project_id')
                        ->unique()
                        ->count(),
                    'total_tasks' => $total,
                    'completed_tasks' => $completed,
                    'active_tasks' => $memberTasks
                        ->whereNotIn('status', ['done', 'rejected'])
                        ->count(),
                    'overdue_tasks' => $overdue,
                    'completion_rate' => $completionRate,
                    'deadline_rate' => $deadlineRate,
                    'score' => $score,
                ];
            })
            ->sortBy([
                [fn (array $item): int => $item['score'] === null ? 1 : 0, 'asc'],
                [fn (array $item): float => (float) ($item['score'] ?? 0), 'desc'],
                ['name', 'asc'],
            ])
            ->values()
            ->map(function (array $item, int $index): array {
                $item['rank'] = $index + 1;

                return $item;
            })
            ->all();
    }

    /** @return array<string, mixed> */
    private function projectGroupQuality(Collection $projects): array
    {
        $tasks = $projects->flatMap->tasks;
        $issues = $projects->flatMap->issues;
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 'done')->count();
        $overdueTasks = $tasks
            ->filter(fn ($task): bool => $this->isOverdue($task))
            ->count();
        $totalIssues = $issues->count();
        $resolvedIssues = $issues->where('status', 'resolved')->count();
        $projectCount = $projects->count();
        $healthyProjects = $projects->where('status', '!=', 'suspended')->count();

        $metrics = [
            [$this->percentage($completedTasks, $totalTasks), 35, $totalTasks > 0],
            [$this->percentage($totalTasks - $overdueTasks, $totalTasks), 25, $totalTasks > 0],
            [$this->percentage($resolvedIssues, $totalIssues), 20, $totalIssues > 0],
            [$this->percentage($healthyProjects, $projectCount), 20, $projectCount > 0],
        ];

        return [
            'project_count' => $projectCount,
            'investment' => (float) $projects->sum('total_investment'),
            'jobs_count' => (int) $projects->sum('jobs_count'),
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'overdue_tasks' => $overdueTasks,
            'active_issues' => $issues->where('status', '!=', 'resolved')->count(),
            'critical_issues' => $issues
                ->where('status', '!=', 'resolved')
                ->where('severity', 'critical')
                ->count(),
            'completion_rate' => $this->percentage($completedTasks, $totalTasks),
            'deadline_rate' => $this->percentage(
                $totalTasks - $overdueTasks,
                $totalTasks
            ),
            'issue_resolution_rate' => $this->percentage(
                $resolvedIssues,
                $totalIssues
            ),
            'score' => $this->weightedScore($metrics),
        ];
    }

    /**
     * Compare every actual report with the plan for the same reporting period.
     * Product quantities are not summed because their units may differ.
     *
     * @return array{summary: array<string, int|float|null>, projects: array<int, array<string, mixed>>}
     */
    private function productionPerformance(Collection $projects): array
    {
        $applicableProjects = $projects->reject(
            fn (InvestmentProject $project): bool => $project
                ->production_not_applicable
        );
        $incompletePlans = $applicableProjects->sum(
            fn (InvestmentProject $project): int => $project->productionPlans
                ->reject(fn ($plan): bool => $plan->is_complete)
                ->count()
        );
        $projectsNeedingCompletion = $applicableProjects->filter(
            fn (InvestmentProject $project): bool => $project->productionPlans
                ->contains(fn ($plan): bool => ! $plan->is_complete)
        )->count();

        $rows = $applicableProjects
            ->map(function (InvestmentProject $project): ?array {
                $plans = $project->productionPlans
                    ->filter(fn ($plan): bool => $plan->is_complete)
                    ->values();

                if ($plans->isEmpty()) {
                    return null;
                }

                $reportedPeriods = $plans->sum(
                    fn ($plan): int => $plan->facts->count()
                );
                $plannedAmount = (float) $plans->sum(
                    fn ($plan): float => (float) $plan->planned_amount
                        * $plan->facts->count()
                );
                $actualAmount = (float) $plans->sum(
                    fn ($plan): float => (float) $plan->facts
                        ->sum('actual_amount')
                );
                $volumeRates = $plans->flatMap(
                    fn ($plan) => $plan->facts->map(
                        fn ($fact): float => $this->ratio(
                            (float) $fact->actual_quantity,
                            (float) $plan->planned_quantity
                        )
                    )
                );

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'region_name' => $project->region?->name,
                    'status' => $project->status,
                    'products' => $plans->pluck('product_name')->values()->all(),
                    'products_count' => $plans->count(),
                    'reported_periods' => $reportedPeriods,
                    'planned_amount_for_reported_periods' => $plannedAmount,
                    'actual_amount' => $actualAmount,
                    'amount_completion_rate' => $reportedPeriods > 0
                        && $plannedAmount > 0
                        ? $this->ratio($actualAmount, $plannedAmount)
                        : null,
                    'volume_completion_rate' => $volumeRates->isNotEmpty()
                        ? round((float) $volumeRates->average(), 1)
                        : null,
                ];
            })
            ->filter()
            ->sortBy([
                [fn (array $item): int => $item['status'] === 'launched'
                        && $item['reported_periods'] === 0 ? 0 : 1, 'asc'],
                [fn (array $item): float => (float) ($item['amount_completion_rate'] ?? 101), 'asc'],
                ['name', 'asc'],
            ])
            ->values();

        $reportedRows = $rows->where('reported_periods', '>', 0);
        $reportedPlanAmount = (float) $reportedRows->sum(
            'planned_amount_for_reported_periods'
        );
        $actualAmount = (float) $reportedRows->sum('actual_amount');
        $volumeRates = $reportedRows
            ->pluck('volume_completion_rate')
            ->filter(fn ($rate): bool => $rate !== null);

        return [
            'summary' => [
                'projects_with_plans' => $rows->count(),
                'complete_plans' => (int) $rows->sum('products_count'),
                'projects_needing_plan_completion' => $projectsNeedingCompletion,
                'incomplete_plans' => $incompletePlans,
                'reporting_projects' => $reportedRows->count(),
                'launched_without_reports' => $rows
                    ->where('status', 'launched')
                    ->where('reported_periods', 0)
                    ->count(),
                'reported_periods' => (int) $reportedRows
                    ->sum('reported_periods'),
                'planned_amount_for_reported_periods' => $reportedPlanAmount,
                'actual_amount' => $actualAmount,
                'amount_completion_rate' => $reportedRows->isNotEmpty()
                    && $reportedPlanAmount > 0
                    ? $this->ratio($actualAmount, $reportedPlanAmount)
                    : null,
                'average_volume_completion_rate' => $volumeRates->isNotEmpty()
                    ? round((float) $volumeRates->average(), 1)
                    : null,
            ],
            'projects' => $rows->all(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function nicheAnalytics(Collection $projects): array
    {
        $groups = collect();

        foreach ($projects as $project) {
            $types = $project->projectTypes;

            if ($types->isEmpty() && $project->projectType) {
                $types = collect([$project->projectType]);
            }

            if ($types->isEmpty()) {
                $groups->push([
                    'id' => null,
                    'name' => 'Санаты көрсетілмеген',
                    'project' => $project,
                ]);

                continue;
            }

            foreach ($types->unique('id') as $type) {
                $groups->push([
                    'id' => $type->id,
                    'name' => $type->name,
                    'project' => $project,
                ]);
            }
        }

        $aggregated = $groups
            ->groupBy(fn (array $item): string => (string) ($item['id'] ?? 'none'))
            ->map(function (Collection $items): array {
                $nicheProjects = $items->pluck('project')->unique('id');

                return [
                    'id' => $items->first()['id'],
                    'name' => $items->first()['name'],
                    'project_count' => $nicheProjects->count(),
                    'investment' => (float) $nicheProjects->sum('total_investment'),
                    'jobs_count' => (int) $nicheProjects->sum('jobs_count'),
                    'plan_projects' => $nicheProjects->where('status', 'plan')->count(),
                    'implementation_projects' => $nicheProjects
                        ->where('status', 'implementation')
                        ->count(),
                    'launched_projects' => $nicheProjects
                        ->where('status', 'launched')
                        ->count(),
                    'suspended_projects' => $nicheProjects
                        ->where('status', 'suspended')
                        ->count(),
                    'active_issues' => $nicheProjects->flatMap->issues
                        ->where('status', '!=', 'resolved')
                        ->count(),
                ];
            })
            ->values();

        $maxInvestment = max(1, (float) $aggregated->max('investment'));
        $maxJobs = max(1, (int) $aggregated->max('jobs_count'));

        return $aggregated
            ->map(function (array $item) use ($maxInvestment, $maxJobs): array {
                $projects = max(1, $item['project_count']);
                $investmentIndex = ($item['investment'] / $maxInvestment) * 100;
                $jobsIndex = ($item['jobs_count'] / $maxJobs) * 100;
                $pipelineIndex = (($item['plan_projects']
                    + $item['implementation_projects']) / $projects) * 100;
                $healthIndex = (($projects - $item['suspended_projects'])
                    / $projects) * 100;

                $item['potential_score'] = round(
                    ($investmentIndex * 0.3)
                    + ($jobsIndex * 0.25)
                    + ($pipelineIndex * 0.25)
                    + ($healthIndex * 0.2),
                    1
                );

                return $item;
            })
            ->sortByDesc('potential_score')
            ->values()
            ->map(function (array $item, int $index): array {
                $item['rank'] = $index + 1;

                return $item;
            })
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function regionalPotential(
        Collection $regionIds,
        Collection $projects,
        array $districtQuality,
        array $niches
    ): array {
        $pipelineProjects = $projects->whereIn(
            'status',
            ['plan', 'implementation']
        );
        $topDistrict = collect($districtQuality)
            ->first(fn (array $item): bool => $item['score'] !== null);
        $riskDistrict = collect($districtQuality)
            ->sortByDesc('overdue_tasks')
            ->first(fn (array $item): bool => $item['overdue_tasks'] > 0);
        $topNiche = collect($niches)->first();

        $insights = collect([
            $topNiche
                ? "Ең жоғары нишалық әлеует: {$topNiche['name']} ({$topNiche['potential_score']} балл)."
                : null,
            $topDistrict
                ? "Жұмыс сапасы бойынша көшбасшы: {$topDistrict['name']} ({$topDistrict['score']} балл)."
                : null,
            $riskDistrict
                ? "Мерзімдік тәуекел жоғары аудан: {$riskDistrict['name']} — {$riskDistrict['overdue_tasks']} кешіктірілген тапсырма."
                : null,
            $projects->where('status', 'suspended')->isNotEmpty()
                ? 'Тоқтатылған жобалар бойынша жеке қалпына келтіру жоспарын бекіту қажет.'
                : 'Тоқтатылған жоба жоқ, негізгі назар іске асыру мерзімдерін сақтауға аударылады.',
        ])->filter()->values()->all();

        return [
            'pipeline_projects' => $pipelineProjects->count(),
            'pipeline_investment' => (float) $pipelineProjects
                ->sum('total_investment'),
            'pipeline_jobs' => (int) $pipelineProjects->sum('jobs_count'),
            'assets' => [
                'sezs' => Sez::query()->whereIn('region_id', $regionIds)->count(),
                'industrial_zones' => IndustrialZone::query()
                    ->whereIn('region_id', $regionIds)
                    ->count(),
                'prom_zones' => PromZone::query()
                    ->whereIn('region_id', $regionIds)
                    ->count(),
                'subsoil_users' => SubsoilUser::query()
                    ->whereIn('region_id', $regionIds)
                    ->count(),
            ],
            'insights' => $insights,
        ];
    }

    private function isOverdue($task): bool
    {
        return $task->status !== 'done'
            && $task->due_date !== null
            && $task->due_date->startOfDay()->lt(now()->startOfDay());
    }

    private function percentage(int $value, int $total): float
    {
        return $total > 0 ? round(($value / $total) * 100, 1) : 0.0;
    }

    private function ratio(float $value, float $total): float
    {
        return $total > 0 ? round(($value / $total) * 100, 1) : 0.0;
    }

    /**
     * @param  array<int, array{0: float, 1: int, 2: bool}>  $metrics
     */
    private function weightedScore(array $metrics): ?float
    {
        $applicable = collect($metrics)->where(2, true);
        $weight = (int) $applicable->sum(1);

        if ($weight === 0) {
            return null;
        }

        return round(
            (float) $applicable->sum(
                fn (array $metric): float => $metric[0] * $metric[1]
            ) / $weight,
            1
        );
    }
}
