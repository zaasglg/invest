<?php

namespace App\Services;

use App\Models\InvestmentProject;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ProjectPassportSummaryService
{
    /**
     * @return array<string, mixed>
     */
    public function build(
        InvestmentProject $project,
        bool $includeOperationalDetails = true
    ): array {
        $isPlanned = $project->status === 'plan';
        $allTasks = $includeOperationalDetails && ! $isPlanned
            ? $project->tasks
            : collect();
        $tasks = $allTasks->filter(fn ($task) => in_array($task->approval_status, [null, 'approved'], true));
        $issues = $includeOperationalDetails
            ? $project->issues
            : collect();
        $attractionActivities = $includeOperationalDetails && $isPlanned
            ? $project->attractionActivities
            : collect();
        $openAttractionActivities = $attractionActivities
            ->filter(fn ($activity) => in_array(
                $activity->status ?? 'planned',
                ['planned', 'in_progress', 'pending_review'],
                true
            ));
        if ($project->attraction_stage === 'declined') {
            $openAttractionActivities = collect();
        }
        $nextAttractionActivity = $openAttractionActivities
            ->filter(fn ($activity) => filled($activity->next_action))
            ->sortBy(fn ($activity) => $activity->next_action_due_date?->getTimestamp()
                ?? PHP_INT_MAX)
            ->first();
        $attractionOverdue = $openAttractionActivities
            ->filter(fn ($activity) => $activity->next_action_due_date?->lt(today()))
            ->count();

        $taskTotal = $tasks->count();
        $taskCompleted = $tasks->where('status', 'done')->count();
        $taskOverdue = $tasks
            ->filter(fn ($task) => $task->status !== 'done'
                && $task->due_date?->lt(today()))
            ->count();
        $taskPendingApproval = $allTasks
            ->where('approval_status', 'pending')
            ->count();

        $openIssues = $issues
            ->whereNotIn('status', ['resolved']);
        $criticalIssues = $openIssues
            ->whereIn('severity', ['critical', 'high'])
            ->count();

        $taskProgress = $taskTotal > 0
            ? (int) round(($taskCompleted / $taskTotal) * 100)
            : 0;
        $timeline = $this->timeline($project);
        $completeness = $this->completeness($project);
        $nextTask = $tasks
            ->filter(fn ($task) => $task->status !== 'done'
                && in_array(
                    $task->approval_status,
                    [null, 'approved'],
                    true
                ))
            ->sortBy(fn ($task) => $task->due_date?->getTimestamp()
                ?? PHP_INT_MAX)
            ->first();
        $nextMilestone = $isPlanned
            ? ($nextAttractionActivity
                ? [
                    'id' => $nextAttractionActivity->id,
                    'kind' => 'attraction',
                    'status' => $nextAttractionActivity->status ?? 'planned',
                    'responsible_id' => $nextAttractionActivity->responsible_id,
                    'responsible_name' => $nextAttractionActivity->responsible?->full_name,
                    'title' => $nextAttractionActivity->next_action,
                    'due_date' => $nextAttractionActivity->next_action_due_date?->toDateString(),
                    'is_overdue' => $nextAttractionActivity->next_action_due_date?->lt(today())
                        ?? false,
                ]
                : null)
            : ($nextTask
                ? [
                    'id' => $nextTask->id,
                    'kind' => 'task',
                    'status' => $nextTask->status,
                    'responsible_id' => $nextTask->assigned_to,
                    'responsible_name' => $nextTask->assignee?->full_name,
                    'title' => $nextTask->title,
                    'due_date' => $nextTask->due_date?->toDateString(),
                    'is_overdue' => $nextTask->due_date?->lt(today()) ?? false,
                ]
                : null);

        if ($isPlanned && $includeOperationalDetails
            && $project->attraction_stage === 'paused'
            && $project->attraction_resume_on !== null
            && ($nextMilestone === null || $nextMilestone['due_date'] === null
                || $project->attraction_resume_on->toDateString() < $nextMilestone['due_date'])) {
            $nextMilestone = [
                'id' => $project->id,
                'kind' => 'resume',
                'status' => 'planned',
                'responsible_id' => $project->curators->first()?->id ?? $project->created_by,
                'responsible_name' => $project->curators->first()?->full_name ?? $project->creator?->full_name,
                'title' => 'Инвестормен қайта байланысу',
                'due_date' => $project->attraction_resume_on->toDateString(),
                'is_overdue' => $project->attraction_resume_on->lt(today()),
            ];
        }

        $health = $this->health(
            $project,
            $timeline,
            $taskProgress,
            $taskOverdue,
            $openIssues->count(),
            $criticalIssues,
            $completeness['percent'],
            $includeOperationalDetails,
            $isPlanned && ($attractionOverdue > 0 || ($nextMilestone['is_overdue'] ?? false))
        );

        return [
            'workflow' => $isPlanned ? 'attraction' : 'roadmap',
            'health' => $health,
            'progress_percent' => $taskProgress,
            'timeline' => $timeline,
            'tasks' => [
                'total' => $taskTotal,
                'completed' => $taskCompleted,
                'in_progress' => $tasks
                    ->where('status', 'in_progress')
                    ->count(),
                'overdue' => $taskOverdue,
                'pending_approval' => $taskPendingApproval,
            ],
            'attraction' => [
                'total' => $attractionActivities->count(),
                'open' => $openAttractionActivities->count(),
                'completed' => $attractionActivities->where('status', 'completed')->count(),
                'pending_review' => $openAttractionActivities->where('status', 'pending_review')->count(),
                'overdue' => $attractionOverdue,
            ],
            'issues' => [
                'total' => $issues->count(),
                'open' => $openIssues->count(),
                'critical' => $criticalIssues,
                'resolved' => $issues
                    ->where('status', 'resolved')
                    ->count(),
            ],
            'documents_count' => $includeOperationalDetails
                ? $project->documents->count()
                : 0,
            'photos_count' => (int) ($project->photos_count ?? 0),
            'completeness' => $completeness,
            'next_milestone' => $nextMilestone,
            'last_updated_at' => $this->lastUpdatedAt(
                $project,
                $allTasks,
                $issues,
                $attractionActivities
            )?->toISOString(),
        ];
    }

    /**
     * @return array{
     *     elapsed_percent: int,
     *     days_remaining: int|null,
     *     is_overdue: bool,
     *     has_dates: bool
     * }
     */
    private function timeline(InvestmentProject $project): array
    {
        if (! $project->start_date || ! $project->end_date) {
            return [
                'elapsed_percent' => 0,
                'days_remaining' => null,
                'is_overdue' => false,
                'has_dates' => false,
            ];
        }

        $start = $project->start_date->copy()->startOfDay();
        $end = $project->end_date->copy()->startOfDay();
        $today = today();
        $totalDays = max(1, $start->diffInDays($end));
        $elapsedDays = $start->diffInDays($today, false);
        $elapsedPercent = (int) round(
            min(100, max(0, ($elapsedDays / $totalDays) * 100))
        );
        $daysRemaining = $today->diffInDays($end, false);

        return [
            'elapsed_percent' => $elapsedPercent,
            'days_remaining' => $project->status === 'launched' ? null : $daysRemaining,
            'is_overdue' => $daysRemaining < 0
                && $project->status !== 'launched',
            'has_dates' => true,
        ];
    }

    /**
     * @return array{
     *     percent: int,
     *     completed: int,
     *     total: int,
     *     missing: array<int, string>
     * }
     */
    private function completeness(InvestmentProject $project): array
    {
        if ($project->status === 'plan') {
            $checks = [
                'Жоба атауы' => filled($project->name),
                'Аймақ' => $project->region !== null,
                'Инвестор тарту кезеңі' => filled($project->attraction_stage),
                'Жауапты тұлға' => $project->curators->isNotEmpty()
                    || $project->creator !== null,
            ];

            if ($project->attraction_stage === 'handover') {
                $checks['Сүйемелдеуді қабылдайтын жауапты'] = $project->attraction_handover_to_id !== null;
                $checks['Сүйемелдеуге берілген күні'] = $project->attraction_handover_requested_at !== null;
            } elseif ($project->attraction_stage === 'declined') {
                $checks['Инвестордың бас тарту себебі'] = filled($project->attraction_decline_reason);
            } elseif ($project->attraction_stage === 'paused') {
                $checks['Инвестормен қайта байланысу күні'] = $project->attraction_resume_on !== null;
            }
        } else {
            $checks = [
                'Жоба атауы' => filled($project->name),
                'Бастамашы компания' => $project->company_id !== null
                    || filled($project->company_name),
                'Аймақ' => $project->region !== null,
                'Жоба түрі' => ($project->relationLoaded('projectTypes')
                    && $project->projectTypes->isNotEmpty())
                    || $project->projectType !== null,
                'Жоба сипаттамасы' => filled($project->description),
                'Ағымдағы жағдай' => filled($project->current_status),
                'Инвестиция сомасы' => (float) $project->total_investment > 0,
                'Жұмыс орындары' => $project->jobs_count !== null,
                'Жоспарлы өндіріс' => $project->production_not_applicable
                    || ($project->relationLoaded('productionPlans')
                        ? $project->productionPlans->contains(
                            fn ($plan) => $plan->is_complete
                        )
                        : $project->productionPlans()
                            ->whereNotNull('planned_quantity')
                            ->whereNotNull('planned_amount')
                            ->exists()),
                'Басталу мерзімі' => $project->start_date !== null,
                'Аяқталу мерзімі' => $project->end_date !== null,
                'Жауапты тұлға' => $project->curators->isNotEmpty()
                    || $project->creator !== null,
                'Құжаттар' => $project->documents->isNotEmpty(),
                'Фотогалерея' => (int) ($project->photos_count ?? 0) > 0,
            ];
        }
        $missing = collect($checks)
            ->filter(fn (bool $complete) => ! $complete)
            ->keys()
            ->values()
            ->all();
        $completed = count($checks) - count($missing);

        return [
            'percent' => (int) round(($completed / count($checks)) * 100),
            'completed' => $completed,
            'total' => count($checks),
            'missing' => $missing,
        ];
    }

    /**
     * @param  array<string, mixed>  $timeline
     * @return array{level: string, label: string, reasons: array<int, string>}
     */
    private function health(
        InvestmentProject $project,
        array $timeline,
        int $taskProgress,
        int $taskOverdue,
        int $openIssues,
        int $criticalIssues,
        int $completeness,
        bool $includeOperationalDetails,
        bool $attractionOverdue = false
    ): array {
        if ($project->status === 'plan' && $project->attraction_stage === 'declined') {
            return [
                'level' => 'warning',
                'label' => 'Инвестор бас тартқан',
                'reasons' => ['Жоба белсенді инвестор тарту жұмыстарынан шығарылған. Тарихы сақталған.'],
            ];
        }

        $criticalReasons = [];
        $warningReasons = [];

        if ($project->status === 'suspended') {
            $criticalReasons[] = 'Жоба тоқтатылған';
        }

        if ($timeline['is_overdue']) {
            $criticalReasons[] = 'Жобаның жоспарлы мерзімі өтіп кеткен';
        }

        if ($includeOperationalDetails && $criticalIssues > 0) {
            $criticalReasons[] = "{$criticalIssues} жоғары/сыни мәселе ашық";
        }

        if ($includeOperationalDetails && $taskOverdue > 0) {
            $warningReasons[] = "{$taskOverdue} тапсырманың мерзімі өткен";
        }

        if ($includeOperationalDetails && $attractionOverdue) {
            $warningReasons[] = 'Инвестор тарту бойынша келесі іс-шараның мерзімі өткен';
        }

        if ($includeOperationalDetails
            && $openIssues > 0
            && $criticalIssues === 0) {
            $warningReasons[] = "{$openIssues} мәселе шешілмеген";
        }

        if ($includeOperationalDetails
            && $project->status === 'implementation'
            && $timeline['elapsed_percent'] - $taskProgress >= 25) {
            $warningReasons[] = 'Орындалу қарқыны күнтізбелік жоспардан қалып тұр';
        }

        if ($completeness < 70) {
            $warningReasons[] = 'Жоба паспорты толық толтырылмаған';
        }

        if ($criticalReasons !== []) {
            return [
                'level' => 'critical',
                'label' => 'Назар аударуды қажет етеді',
                'reasons' => [...$criticalReasons, ...$warningReasons],
            ];
        }

        if ($warningReasons !== []) {
            return [
                'level' => 'warning',
                'label' => 'Тәуекел бар',
                'reasons' => $warningReasons,
            ];
        }

        return [
            'level' => 'healthy',
            'label' => 'Жоспарға сай',
            'reasons' => ['Критикалық ауытқулар анықталған жоқ'],
        ];
    }

    private function lastUpdatedAt(
        InvestmentProject $project,
        Collection $tasks,
        Collection $issues,
        Collection $attractionActivities
    ): ?CarbonInterface {
        return collect([
            $project->updated_at,
            ...$attractionActivities->pluck('updated_at')->all(),
            ...$project->documents->pluck('updated_at')->all(),
            ...$tasks->pluck('updated_at')->all(),
            ...$issues->pluck('updated_at')->all(),
        ])
            ->filter()
            ->map(fn ($date) => $date instanceof CarbonInterface
                ? $date
                : Carbon::parse($date))
            ->sortByDesc(fn (CarbonInterface $date) => $date->getTimestamp())
            ->first();
    }
}
