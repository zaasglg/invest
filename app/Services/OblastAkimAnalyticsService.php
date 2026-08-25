<?php

namespace App\Services;

use App\Models\IndustrialZone;
use App\Models\InvestmentApplication;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
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
                'executor:id,full_name,position',
                'curators:id,full_name,position',
                'tasks:id,project_id,assigned_to,status,due_date,approval_status,updated_at',
                'tasks.completions:id,task_id,status,reviewed_at,created_at',
                'issues:id,project_id,title,status,severity,created_at,updated_at',
                'productionPlans.facts',
                'photos:id,project_id,created_at',
                'documents:id,project_id,created_at',
            ])
            ->get();

        $districtQuality = $this->districtQuality($districts, $projects);
        $managementQuality = $this->managementQuality($projects);
        $production = $this->productionPerformance($projects);
        $niches = $this->nicheAnalytics($projects);
        $summary = $this->summary($projects);
        $dataQuality = $this->dataQuality($projects, $production);
        $priorityProjects = $this->priorityProjects($projects, $production);
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
                'generated_at' => now()->toIso8601String(),
            ],
            'summary' => $summary,
            'status_distribution' => $this->statusDistribution($projects),
            'data_quality' => $dataQuality,
            'priority_projects' => $priorityProjects,
            'district_quality' => $districtQuality,
            'management_quality' => $managementQuality,
            'production_summary' => $production['summary'],
            'production_performance' => $production['projects'],
            'niche_analytics' => $niches,
            'regional_potential' => $regionalPotential,
            'activity_trend' => $this->activityTrend($projects),
            'application_funnel' => $this->applicationFunnel($regionIds),
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
            'data_quality' => $analytics['data_quality'],
            'priority_projects' => array_slice(
                $analytics['priority_projects'],
                0,
                5
            ),
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
            'activity_trend' => $analytics['activity_trend'],
            'application_funnel' => $analytics['application_funnel'],
        ];
    }

    /** @return array<string, int|float> */
    private function summary(Collection $projects): array
    {
        $allTasks = $projects->flatMap->tasks;
        $tasks = $allTasks->where('approval_status', 'approved');
        $issues = $projects->flatMap->issues;
        $overdueTasks = $tasks->filter(fn ($task): bool => $this->isOverdue($task));
        $activeIssues = $issues->where('status', '!=', 'resolved');
        $problemProjectIds = $activeIssues
            ->pluck('project_id')
            ->merge($overdueTasks->pluck('project_id'))
            ->unique();

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
            'active_issues' => $activeIssues->count(),
            'critical_issues' => $activeIssues
                ->where('severity', 'critical')
                ->count(),
            'problem_projects' => $problemProjectIds->count(),
            'projects_with_active_issues' => $activeIssues
                ->pluck('project_id')
                ->unique()
                ->count(),
            'projects_with_overdue_tasks' => $overdueTasks
                ->pluck('project_id')
                ->unique()
                ->count(),
            'all_tasks' => $allTasks->count(),
            'total_tasks' => $tasks->count(),
            'completed_tasks' => $tasks->where('status', 'done')->count(),
            'overdue_tasks' => $overdueTasks->count(),
            'tasks_without_deadline' => $tasks->whereNull('due_date')->count(),
            'pending_tasks' => $allTasks
                ->where('approval_status', 'pending')
                ->count(),
            'rejected_tasks' => $allTasks
                ->where('approval_status', 'rejected')
                ->count(),
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
            ->sort(fn (array $left, array $right): int => $this
                ->compareQualityRows($left, $right))
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
        $tasks = $projects->flatMap->tasks
            ->where('approval_status', 'approved');
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
                $metrics = $this->managementTaskMetrics($memberTasks);

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
                    ...$metrics,
                ];
            })
            ->sort(fn (array $left, array $right): int => $this
                ->compareQualityRows($left, $right))
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
        $tasks = $projects->flatMap->tasks
            ->where('approval_status', 'approved');
        $issues = $projects->flatMap->issues;
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 'done')->count();
        $overdueTasks = $tasks
            ->filter(fn ($task): bool => $this->isOverdue($task))
            ->count();
        $evaluatedTasks = $tasks->filter(
            fn ($task): bool => $task->status === 'done'
                || $this->isOverdue($task)
        );
        $tasksWithDeadline = $evaluatedTasks->whereNotNull('due_date');
        $totalIssues = $issues->count();
        $resolvedIssues = $issues->where('status', 'resolved')->count();
        $projectCount = $projects->count();
        $completionRate = $this->percentage(
            $evaluatedTasks->where('status', 'done')->count(),
            $evaluatedTasks->count()
        );
        $deadlineRate = $tasksWithDeadline->isEmpty()
            ? null
            : round((float) $tasksWithDeadline->average(
                fn ($task): int => $this->timelinessScore($task)
            ), 1);
        $issueResolutionRate = $totalIssues > 0
            ? $this->percentage($resolvedIssues, $totalIssues)
            : 100.0;
        $isPreliminary = $evaluatedTasks->count() < 3;
        $score = $isPreliminary || $completionRate === null
            || $deadlineRate === null
            ? null
            : round(
                ($completionRate * 0.4)
                + ($deadlineRate * 0.35)
                + ($issueResolutionRate * 0.25),
                1
            );
        $coveredProjectIds = $tasks->pluck('project_id')
            ->merge($issues->pluck('project_id'))
            ->unique();

        return [
            'project_count' => $projectCount,
            'investment' => (float) $projects->sum('total_investment'),
            'jobs_count' => (int) $projects->sum('jobs_count'),
            'total_tasks' => $totalTasks,
            'evaluated_tasks' => $evaluatedTasks->count(),
            'completed_tasks' => $completedTasks,
            'overdue_tasks' => $overdueTasks,
            'active_issues' => $issues->where('status', '!=', 'resolved')->count(),
            'critical_issues' => $issues
                ->where('status', '!=', 'resolved')
                ->where('severity', 'critical')
                ->count(),
            'completion_rate' => $completionRate,
            'deadline_rate' => $deadlineRate,
            'issue_resolution_rate' => $issueResolutionRate,
            'data_coverage' => $this->percentage(
                $coveredProjectIds->count(),
                $projectCount
            ),
            'is_preliminary' => $isPreliminary,
            'score' => $score,
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
        $projectsWithAnyPlan = $applicableProjects->filter(
            fn (InvestmentProject $project): bool => $project
                ->productionPlans->isNotEmpty()
        );
        $projectsWithCompletePlan = $applicableProjects->filter(
            fn (InvestmentProject $project): bool => $project->productionPlans
                ->contains(fn ($plan): bool => $plan->is_complete)
        );
        $incompletePlans = $applicableProjects->sum(
            fn (InvestmentProject $project): int => $project->productionPlans
                ->reject(fn ($plan): bool => $plan->is_complete)
                ->count()
        );
        $projectsNeedingCompletion = $applicableProjects->filter(
            fn (InvestmentProject $project): bool => $project
                ->productionPlans->isEmpty()
                || $project->productionPlans
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
                $rawVolumeRates = $plans->flatMap(
                    fn ($plan) => $plan->facts->map(
                        fn ($fact): float => $this->ratio(
                            (float) $fact->actual_quantity,
                            (float) $plan->planned_quantity
                        )
                    )
                );
                $rawAmountRate = $reportedPeriods > 0 && $plannedAmount > 0
                    ? $this->ratio($actualAmount, $plannedAmount)
                    : null;
                $hasAmountAnomaly = $rawAmountRate !== null
                    && ($rawAmountRate < 0 || $rawAmountRate > 200);
                $hasVolumeAnomaly = $rawVolumeRates->contains(
                    fn (float $rate): bool => $rate < 0 || $rate > 200
                );
                $validatedVolumeRates = $rawVolumeRates->filter(
                    fn (float $rate): bool => $rate >= 0 && $rate <= 200
                );
                $anomalies = collect([
                    $hasAmountAnomaly
                        ? 'Сома бойынша жоспар/факт қатынасы 200%-дан жоғары'
                        : null,
                    $hasVolumeAnomaly
                        ? 'Өнім көлемінің өлшем бірлігін тексеру қажет'
                        : null,
                ])->filter()->values()->all();

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
                    'raw_amount_completion_rate' => $rawAmountRate,
                    'amount_completion_rate' => $hasAmountAnomaly
                        ? null
                        : $rawAmountRate,
                    'volume_completion_rate' => $validatedVolumeRates
                        ->isNotEmpty()
                        ? round((float) $validatedVolumeRates->average(), 1)
                        : null,
                    'has_anomaly' => $anomalies !== [],
                    'anomalies' => $anomalies,
                    'data_status' => $anomalies !== []
                        ? 'anomaly'
                        : ($reportedPeriods > 0 ? 'reported' : 'no_report'),
                ];
            })
            ->filter()
            ->sort(function (array $left, array $right): int {
                $priority = static fn (array $item): int => match (true) {
                    $item['has_anomaly'] => 0,
                    $item['status'] === 'launched'
                        && $item['reported_periods'] === 0 => 1,
                    $item['reported_periods'] > 0 => 2,
                    default => 3,
                };

                return [$priority($left), $left['name']]
                    <=> [$priority($right), $right['name']];
            })
            ->values();

        $reportedRows = $rows->where('reported_periods', '>', 0);
        $reportedPlanAmount = (float) $reportedRows->sum(
            'planned_amount_for_reported_periods'
        );
        $actualAmount = (float) $reportedRows->sum('actual_amount');
        $rawAmountCompletionRate = $reportedRows->isNotEmpty()
            && $reportedPlanAmount > 0
            ? $this->ratio($actualAmount, $reportedPlanAmount)
            : null;
        $hasAmountAnomaly = $rawAmountCompletionRate !== null
            && ($rawAmountCompletionRate < 0
                || $rawAmountCompletionRate > 200);
        $volumeRates = $reportedRows
            ->pluck('volume_completion_rate')
            ->filter(fn ($rate): bool => $rate !== null);
        $reportedPeriodKeys = $applicableProjects
            ->flatMap->productionPlans
            ->flatMap->facts
            ->pluck('period_key')
            ->filter()
            ->unique();
        $launchedProjects = $applicableProjects->where('status', 'launched');
        $launchedReportingProjectIds = $launchedProjects
            ->filter(fn (InvestmentProject $project): bool => $project
                ->productionPlans
                ->flatMap->facts
                ->isNotEmpty())
            ->pluck('id');

        return [
            'summary' => [
                'applicable_projects' => $applicableProjects->count(),
                'projects_with_any_plan' => $projectsWithAnyPlan->count(),
                'projects_with_plans' => $projectsWithCompletePlan->count(),
                'projects_with_complete_plans' => $projectsWithCompletePlan
                    ->count(),
                'projects_without_any_plan' => $applicableProjects->count()
                    - $projectsWithAnyPlan->count(),
                'complete_plans' => (int) $rows->sum('products_count'),
                'projects_needing_plan_completion' => $projectsNeedingCompletion,
                'incomplete_plans' => $incompletePlans,
                'reporting_projects' => $reportedRows->count(),
                'launched_without_reports' => $launchedProjects->pluck('id')
                    ->diff($launchedReportingProjectIds)
                    ->count(),
                'reported_periods' => (int) $reportedRows
                    ->sum('reported_periods'),
                'distinct_reported_periods' => $reportedPeriodKeys->count(),
                'planned_amount_for_reported_periods' => $reportedPlanAmount,
                'actual_amount' => $actualAmount,
                'raw_amount_completion_rate' => $rawAmountCompletionRate,
                'amount_completion_rate' => $hasAmountAnomaly
                    ? null
                    : $rawAmountCompletionRate,
                'average_volume_completion_rate' => $volumeRates->isNotEmpty()
                    ? round((float) $volumeRates->average(), 1)
                    : null,
                'anomaly_projects' => $rows->where('has_anomaly', true)->count(),
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
                $investmentIndex = log1p(max(0, $item['investment']))
                    / log1p($maxInvestment) * 100;
                $jobsIndex = log1p(max(0, $item['jobs_count']))
                    / log1p($maxJobs) * 100;
                $pipelineIndex = (($item['plan_projects']
                    + $item['implementation_projects']) / $projects) * 100;
                $healthIndex = (($projects - $item['suspended_projects'])
                    / $projects) * 100;
                $issueFreeIndex = max(
                    0,
                    100 - (($item['active_issues'] / $projects) * 20)
                );

                $item['potential_score'] = round(
                    ($investmentIndex * 0.3)
                    + ($jobsIndex * 0.2)
                    + ($pipelineIndex * 0.2)
                    + ($healthIndex * 0.15)
                    + ($issueFreeIndex * 0.15),
                    1
                );
                $item['score_type'] = 'portfolio_momentum';

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
                ? "Портфель қарқыны жоғары бағыт: {$topNiche['name']} ({$topNiche['potential_score']} балл)."
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
                'sezs' => $this->assetStatusSummary(
                    Sez::query()->whereIn('region_id', $regionIds)->get(),
                    'status'
                ),
                'industrial_zones' => $this->assetStatusSummary(
                    IndustrialZone::query()
                        ->whereIn('region_id', $regionIds)
                        ->get(),
                    'status'
                ),
                'prom_zones' => $this->assetStatusSummary(
                    PromZone::query()->whereIn('region_id', $regionIds)->get(),
                    'status'
                ),
                'subsoil_users' => $this->assetStatusSummary(
                    SubsoilUser::query()
                        ->whereIn('region_id', $regionIds)
                        ->get(),
                    'license_status'
                ),
            ],
            'insights' => $insights,
        ];
    }

    /** @return array<string, mixed> */
    private function managementTaskMetrics(Collection $tasks): array
    {
        $evaluatedTasks = $tasks->filter(
            fn ($task): bool => $task->status === 'done'
                || $this->isOverdue($task)
        );
        $completedTasks = $tasks->where('status', 'done');
        $overdueTasks = $tasks->filter(
            fn ($task): bool => $this->isOverdue($task)
        );
        $tasksWithDeadline = $evaluatedTasks->whereNotNull('due_date');
        $completionRate = $this->percentage(
            $evaluatedTasks->where('status', 'done')->count(),
            $evaluatedTasks->count()
        );
        $deadlineRate = $tasksWithDeadline->isEmpty()
            ? null
            : round((float) $tasksWithDeadline->average(
                fn ($task): int => $this->timelinessScore($task)
            ), 1);
        $reviewedTasks = $tasks->filter(
            fn ($task): bool => $task->completions->contains(
                fn ($completion): bool => in_array(
                    $completion->status,
                    ['approved', 'rejected'],
                    true
                )
            )
        );
        $firstPassAccepted = $reviewedTasks->filter(
            fn ($task): bool => $task->completions
                ->sortBy([['created_at', 'asc'], ['id', 'asc']])
                ->first()?->status === 'approved'
        )->count();
        $qualityRate = $this->percentage(
            $firstPassAccepted,
            $reviewedTasks->count()
        );
        $components = collect([
            ['score' => $completionRate, 'weight' => 40],
            ['score' => $deadlineRate, 'weight' => 35],
            ['score' => $qualityRate, 'weight' => 25],
        ])->filter(fn (array $item): bool => $item['score'] !== null);
        $availableWeight = (int) $components->sum('weight');
        $rawScore = $availableWeight > 0
            ? round((float) $components->sum(
                fn (array $item): float => $item['score']
                    * ($item['weight'] / $availableWeight)
            ), 1)
            : null;
        $isPreliminary = $evaluatedTasks->count() < 3;

        return [
            'total_tasks' => $tasks->count(),
            'evaluated_tasks' => $evaluatedTasks->count(),
            'completed_tasks' => $completedTasks->count(),
            'active_tasks' => $tasks->count()
                - $completedTasks->count()
                - $overdueTasks->count(),
            'overdue_tasks' => $overdueTasks->count(),
            'completion_rate' => $completionRate,
            'deadline_rate' => $deadlineRate,
            'quality_rate' => $qualityRate,
            'is_preliminary' => $isPreliminary,
            'score' => $isPreliminary ? null : $rawScore,
        ];
    }

    private function compareQualityRows(array $left, array $right): int
    {
        $leftMissing = $left['score'] === null ? 1 : 0;
        $rightMissing = $right['score'] === null ? 1 : 0;

        if ($leftMissing !== $rightMissing) {
            return $leftMissing <=> $rightMissing;
        }

        $scoreComparison = (float) ($right['score'] ?? 0)
            <=> (float) ($left['score'] ?? 0);

        return $scoreComparison !== 0
            ? $scoreComparison
            : strnatcasecmp($left['name'], $right['name']);
    }

    /** @return array<string, mixed> */
    private function dataQuality(Collection $projects, array $production): array
    {
        $totalProjects = $projects->count();
        $approvedTasks = $projects->flatMap->tasks
            ->where('approval_status', 'approved');
        $issues = $projects->flatMap->issues;
        $applicableProjects = $projects->reject(
            fn (InvestmentProject $project): bool => $project
                ->production_not_applicable
        );
        $launchedProjects = $applicableProjects->where('status', 'launched');
        $projectsWithFacts = $applicableProjects->filter(
            fn (InvestmentProject $project): bool => $project
                ->productionPlans
                ->flatMap->facts
                ->isNotEmpty()
        );
        $components = [
            'task_project_coverage' => $this->percentage(
                $approvedTasks->pluck('project_id')->unique()->count(),
                $totalProjects
            ) ?? 0.0,
            'deadline_coverage' => $this->percentage(
                $approvedTasks->whereNotNull('due_date')->count(),
                $approvedTasks->count()
            ) ?? 0.0,
            'issue_project_coverage' => $this->percentage(
                $issues->pluck('project_id')->unique()->count(),
                $totalProjects
            ) ?? 0.0,
            'production_plan_coverage' => $this->percentage(
                $production['summary']['projects_with_complete_plans'],
                $applicableProjects->count()
            ) ?? 0.0,
            'production_fact_coverage' => $launchedProjects->isEmpty()
                ? null
                : $this->percentage(
                    $projectsWithFacts->pluck('id')
                        ->intersect($launchedProjects->pluck('id'))
                        ->count(),
                    $launchedProjects->count()
                ),
            'jobs_coverage' => $this->percentage(
                $projects->filter(
                    fn (InvestmentProject $project): bool => $project
                        ->jobs_count !== null && $project->jobs_count > 0
                )->count(),
                $totalProjects
            ) ?? 0.0,
            'dates_coverage' => $this->percentage(
                $projects->filter(
                    fn (InvestmentProject $project): bool => $project
                        ->start_date !== null && $project->end_date !== null
                )->count(),
                $totalProjects
            ) ?? 0.0,
            'photo_coverage' => $this->percentage(
                $projects->filter(
                    fn (InvestmentProject $project): bool => $project
                        ->photos->isNotEmpty()
                )->count(),
                $totalProjects
            ) ?? 0.0,
            'document_coverage' => $this->percentage(
                $projects->filter(
                    fn (InvestmentProject $project): bool => $project
                        ->documents->isNotEmpty()
                )->count(),
                $totalProjects
            ) ?? 0.0,
        ];
        $scoreComponents = collect($components)
            ->except(['issue_project_coverage', 'production_fact_coverage'])
            ->filter(fn ($value): bool => $value !== null);
        $overallScore = $scoreComponents->isEmpty()
            ? 0.0
            : round((float) $scoreComponents->average(), 1);
        $jobsTotal = (int) $projects->sum('jobs_count');
        $jobsMax = (int) $projects->max('jobs_count');
        $jobOutlierShare = $jobsTotal > 0
            ? round(($jobsMax / $jobsTotal) * 100, 1)
            : 0.0;
        $warnings = collect([
            $components['task_project_coverage'] < 50
                ? 'Жобалардың жартысынан азында бекітілген тапсырма бар.'
                : null,
            $components['deadline_coverage'] < 80
                ? 'Тапсырма мерзімдерінің толықтығы 80%-дан төмен.'
                : null,
            $components['production_plan_coverage'] < 80
                ? 'Толық өндіріс жоспары жеткіліксіз.'
                : null,
            $production['summary']['anomaly_projects'] > 0
                ? 'Өндіріс plan/fact деректерінде аномалия анықталды.'
                : null,
            $jobOutlierShare > 50
                ? "Бір жоба жұмыс орындарының {$jobOutlierShare}%-ын құрайды."
                : null,
        ])->filter()->values()->all();
        $facts = $applicableProjects->flatMap->productionPlans->flatMap->facts;

        return [
            'overall_score' => $overallScore,
            'status' => match (true) {
                $overallScore >= 80 => 'good',
                $overallScore >= 55 => 'attention',
                default => 'critical',
            },
            'components' => $components,
            'warnings' => $warnings,
            'job_outlier_share' => $jobOutlierShare,
            'freshness' => [
                'projects' => $this->dateIso($projects->max('updated_at')),
                'tasks' => $this->dateIso($approvedTasks->max('updated_at')),
                'issues' => $this->dateIso($issues->max('updated_at')),
                'production_facts' => $this->dateIso($facts->max('updated_at')),
            ],
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function priorityProjects(
        Collection $projects,
        array $production
    ): array {
        $productionRows = collect($production['projects'])->keyBy('id');

        return $projects
            ->map(function (InvestmentProject $project) use (
                $productionRows
            ): ?array {
                $activeIssues = $project->issues
                    ->where('status', '!=', 'resolved');
                $overdueTasks = $project->tasks
                    ->where('approval_status', 'approved')
                    ->filter(fn ($task): bool => $this->isOverdue($task));
                $productionRow = $productionRows->get($project->id);
                $hasProductionAnomaly = (bool) ($productionRow['has_anomaly']
                    ?? false);
                $launchedWithoutReport = $project->status === 'launched'
                    && ! $project->production_not_applicable
                    && $project->productionPlans->flatMap->facts->isEmpty();
                $criticalIssues = $activeIssues
                    ->where('severity', 'critical')->count();
                $highIssues = $activeIssues->where('severity', 'high')->count();
                $mediumIssues = $activeIssues
                    ->where('severity', 'medium')->count();
                $maxDaysOverdue = (int) $overdueTasks->max(
                    fn ($task): int => $task->due_date
                        ? (int) $task->due_date->startOfDay()
                            ->diffInDays(now()->startOfDay())
                        : 0
                );
                $riskScore = ($criticalIssues * 40)
                    + ($highIssues * 22)
                    + ($mediumIssues * 8)
                    + ($overdueTasks->count() * 12)
                    + min(30, $maxDaysOverdue)
                    + ($project->status === 'suspended' ? 35 : 0)
                    + ($hasProductionAnomaly ? 35 : 0)
                    + ($launchedWithoutReport ? 25 : 0);

                if ($riskScore === 0) {
                    return null;
                }

                $responsible = $project->executor
                    ?? $project->curators->first();
                $reasons = collect([
                    $criticalIssues > 0
                        ? "{$criticalIssues} критикалық мәселе"
                        : null,
                    $highIssues > 0 ? "{$highIssues} жоғары мәселе" : null,
                    $overdueTasks->isNotEmpty()
                        ? $overdueTasks->count().' кешіккен тапсырма'
                        : null,
                    $hasProductionAnomaly ? 'өндіріс дерегі күмәнді' : null,
                    $launchedWithoutReport ? 'өндіріс есебі жоқ' : null,
                    $project->status === 'suspended'
                        ? 'жоба тоқтатылған'
                        : null,
                ])->filter()->values()->all();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'region_name' => $project->region?->name,
                    'status' => $project->status,
                    'investment' => (float) $project->total_investment,
                    'risk_score' => $riskScore,
                    'risk_level' => match (true) {
                        $criticalIssues > 0 || $riskScore >= 70 => 'critical',
                        $riskScore >= 35 => 'high',
                        default => 'medium',
                    },
                    'active_issues' => $activeIssues->count(),
                    'critical_issues' => $criticalIssues,
                    'overdue_tasks' => $overdueTasks->count(),
                    'max_days_overdue' => $maxDaysOverdue,
                    'responsible' => $responsible
                        ? ($responsible->position ?: $responsible->full_name)
                        : null,
                    'reasons' => $reasons,
                    'recommended_action' => match (true) {
                        $criticalIssues > 0 => 'Критикалық мәселе бойынша шешім бекіту',
                        $hasProductionAnomaly => 'Plan/fact дерегін қайта тексеру',
                        $launchedWithoutReport => 'Өндіріс фактісін енгізу',
                        $overdueTasks->isNotEmpty() => 'Мерзімді қалпына келтіру жоспарын бекіту',
                        default => 'Жобаны жеке бақылауға алу',
                    },
                ];
            })
            ->filter()
            ->sort(function (array $left, array $right): int {
                $scoreComparison = $right['risk_score']
                    <=> $left['risk_score'];

                return $scoreComparison !== 0
                    ? $scoreComparison
                    : $right['investment'] <=> $left['investment'];
            })
            ->values()
            ->map(function (array $item, int $index): array {
                $item['rank'] = $index + 1;

                return $item;
            })
            ->take(10)
            ->all();
    }

    /** @return array<int, array<string, int|string>> */
    private function activityTrend(Collection $projects): array
    {
        $start = now()->startOfMonth()->subMonths(5);
        $projectIds = $projects->pluck('id');
        $logs = KpiLog::query()
            ->whereIn('project_id', $projectIds)
            ->where('created_at', '>=', $start)
            ->get(['created_at']);
        $completions = $projects->flatMap->tasks
            ->flatMap->completions
            ->where('created_at', '>=', $start);
        $issues = $projects->flatMap->issues
            ->where('created_at', '>=', $start);

        return collect(range(0, 5))->map(function (int $offset) use (
            $start,
            $logs,
            $completions,
            $issues
        ): array {
            $month = $start->copy()->addMonths($offset);
            $key = $month->format('Y-m');
            $inMonth = static fn ($item): bool => $item->created_at
                ?->format('Y-m') === $key;

            return [
                'period' => $key,
                'activity' => $logs->filter($inMonth)->count(),
                'completions' => $completions->filter($inMonth)->count(),
                'issues' => $issues->filter($inMonth)->count(),
            ];
        })->all();
    }

    /** @return array<string, mixed> */
    private function applicationFunnel(Collection $regionIds): array
    {
        $applications = InvestmentApplication::query()
            ->whereIn('company_region_id', $regionIds)
            ->get();

        return [
            'total' => $applications->count(),
            'investment' => (float) $applications->sum('investment_amount'),
            'jobs' => (int) $applications->sum('jobs_count'),
            'statuses' => $applications
                ->groupBy('status')
                ->map->count()
                ->sortKeys()
                ->all(),
        ];
    }

    /** @return array<string, int> */
    private function assetStatusSummary(
        Collection $items,
        string $statusColumn
    ): array {
        $statuses = $items->groupBy(
            fn ($item): string => strtolower(trim(
                (string) $item->{$statusColumn}
            ))
        )->map->count();

        return [
            'total' => $items->count(),
            'active' => (int) ($statuses['active'] ?? 0),
            'inactive' => (int) ($statuses['inactive'] ?? 0),
            'illegal' => (int) ($statuses['illegal'] ?? 0),
            'other' => $items->count()
                - (int) ($statuses['active'] ?? 0)
                - (int) ($statuses['inactive'] ?? 0)
                - (int) ($statuses['illegal'] ?? 0),
        ];
    }

    private function timelinessScore($task): int
    {
        $comparisonDate = $task->status === 'done'
            ? ($task->completions
                ->firstWhere('status', 'approved')?->reviewed_at
                ?? $task->updated_at)
            : now()->startOfDay();

        if (! $task->due_date || ! $comparisonDate) {
            return 100;
        }

        $daysLate = $task->due_date
            ->startOfDay()
            ->diffInDays($comparisonDate->startOfDay(), false);

        if ($daysLate <= 0) {
            return 100;
        }

        return match (true) {
            $daysLate <= 3 => 80,
            $daysLate <= 7 => 50,
            $daysLate <= 14 => 20,
            default => 0,
        };
    }

    private function dateIso(mixed $value): ?string
    {
        return $value
            ? \Illuminate\Support\Carbon::parse($value)->toIso8601String()
            : null;
    }

    private function isOverdue($task): bool
    {
        return $task->status !== 'done'
            && $task->due_date !== null
            && $task->due_date->startOfDay()->lt(now()->startOfDay());
    }

    private function percentage(int $value, int $total): ?float
    {
        return $total > 0 ? round(($value / $total) * 100, 1) : null;
    }

    private function ratio(float $value, float $total): float
    {
        return $total > 0 ? round(($value / $total) * 100, 1) : 0.0;
    }
}
