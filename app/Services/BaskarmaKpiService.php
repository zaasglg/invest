<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\ProjectPhoto;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class BaskarmaKpiService
{
    private const DISTRICT_WEIGHTS = [
        'completion' => 35,
        'timeliness' => 30,
        'quality' => 20,
        'photo_reporting' => 15,
    ];

    private const MANAGEMENT_WEIGHTS = [
        'completion' => 40,
        'timeliness' => 35,
        'quality' => 25,
    ];

    /**
     * Calculate KPI snapshots for a collection of ispolnitel accounts.
     * Tasks are intentionally selected only by assigned_to: a district
     * executor may receive work from projects outside their home district.
     *
     * @param  EloquentCollection<int, User>  $users
     * @return Collection<int, array<string, mixed>>
     */
    public function calculateMany(EloquentCollection $users): Collection
    {
        if ($users->isEmpty()) {
            return collect();
        }

        $users->loadMissing('region');
        $userIds = $users->modelKeys();
        $tasksByUser = ProjectTask::query()
            ->whereIn('assigned_to', $userIds)
            ->where('approval_status', 'approved')
            ->whereHas('project', fn ($project) => $project->active())
            ->with([
                'completions' => fn ($completions) => $completions
                    ->orderBy('created_at')
                    ->orderBy('id'),
            ])
            ->get()
            ->groupBy('assigned_to');

        $districtRegionIds = $users
            ->where('baskarma_type', 'district')
            ->pluck('region_id')
            ->filter()
            ->unique()
            ->values();
        $projectsByRegion = InvestmentProject::query()
            ->active()
            ->whereIn('region_id', $districtRegionIds)
            ->get(['id', 'region_id'])
            ->groupBy('region_id');
        $recentPhotoProjectIdsByUser = ProjectPhoto::query()
            ->whereIn('uploaded_by', $users
                ->where('baskarma_type', 'district')
                ->modelKeys())
            ->where('photo_type', 'gallery')
            ->where('created_at', '>=', now()->subDays(7))
            ->get(['project_id', 'uploaded_by'])
            ->groupBy('uploaded_by')
            ->map(fn (Collection $photos) => $photos
                ->pluck('project_id')
                ->map(fn ($id): int => (int) $id)
                ->unique()
                ->values());

        return $users->mapWithKeys(function (User $user) use (
            $tasksByUser,
            $projectsByRegion,
            $recentPhotoProjectIdsByUser
        ): array {
            $tasks = $tasksByUser->get($user->id, collect());
            $districtProjects = $user->baskarma_type === 'district'
                && $user->region_id
                ? $projectsByRegion->get($user->region_id, collect())
                : collect();
            $recentPhotoProjectIds = $recentPhotoProjectIdsByUser
                ->get($user->id, collect());

            return [
                $user->id => $this->calculateSnapshot(
                    $user,
                    $tasks,
                    $districtProjects,
                    $recentPhotoProjectIds
                ),
            ];
        });
    }

    /** @return array<string, mixed> */
    public function calculate(User $user): array
    {
        return $this->calculateMany(new EloquentCollection([$user]))
            ->get($user->id);
    }

    /**
     * @param  Collection<int, ProjectTask>  $tasks
     * @param  Collection<int, InvestmentProject>  $districtProjects
     * @param  Collection<int, int>  $recentPhotoProjectIds
     * @return array<string, mixed>
     */
    private function calculateSnapshot(
        User $user,
        Collection $tasks,
        Collection $districtProjects,
        Collection $recentPhotoProjectIds
    ): array {
        $today = now()->startOfDay();
        $evaluatedTasks = $tasks->filter(
            fn (ProjectTask $task): bool => $task->status === 'done'
                || ($task->due_date
                    && $task->due_date->startOfDay()->lt($today))
        );
        $completedTasks = $tasks->where('status', 'done');
        $overdueTasks = $tasks->filter(
            fn (ProjectTask $task): bool => $task->status !== 'done'
                && $task->due_date
                && $task->due_date->startOfDay()->lt($today)
        );
        $activeTasks = $tasks->reject(
            fn (ProjectTask $task): bool => $task->status === 'done'
                || $overdueTasks->contains('id', $task->id)
        );

        $completion = $this->component(
            label: 'Тапсырмаларды орындау',
            score: $this->percentage(
                $evaluatedTasks->where('status', 'done')->count(),
                $evaluatedTasks->count()
            ),
            numerator: $evaluatedTasks->where('status', 'done')->count(),
            denominator: $evaluatedTasks->count(),
            description: 'Қабылданған және мерзімі келген тапсырмалар үлесі'
        );

        $tasksWithDeadline = $evaluatedTasks->filter(
            fn (ProjectTask $task): bool => $task->due_date !== null
        );
        $timeliness = $this->component(
            label: 'Мерзімді сақтау',
            score: $tasksWithDeadline->isEmpty()
                ? null
                : round((float) $tasksWithDeadline
                    ->average(fn (ProjectTask $task): int => $this
                        ->timelinessScore($task, $today)), 1),
            numerator: $tasksWithDeadline->filter(
                fn (ProjectTask $task): bool => $this
                    ->timelinessScore($task, $today) === 100
            )->count(),
            denominator: $tasksWithDeadline->count(),
            description: 'Уақытында орындау және кешіккен күндер деңгейі'
        );

        $reviewedTasks = $tasks->filter(
            fn (ProjectTask $task): bool => $task->completions->contains(
                fn ($completion): bool => in_array(
                    $completion->status,
                    ['approved', 'rejected'],
                    true
                )
            )
        );
        $firstPassAccepted = $reviewedTasks->filter(
            fn (ProjectTask $task): bool => $task->completions
                ->first()?->status === 'approved'
        )->count();
        $quality = $this->component(
            label: 'Орындалу сапасы',
            score: $this->percentage(
                $firstPassAccepted,
                $reviewedTasks->count()
            ),
            numerator: $firstPassAccepted,
            denominator: $reviewedTasks->count(),
            description: 'Бірінші тексерістен қабылданған нәтижелер үлесі'
        );

        $weights = $user->baskarma_type === 'district'
            ? self::DISTRICT_WEIGHTS
            : self::MANAGEMENT_WEIGHTS;
        $components = [
            'completion' => $completion,
            'timeliness' => $timeliness,
            'quality' => $quality,
        ];

        if ($user->baskarma_type === 'district') {
            $ownProjectIds = $districtProjects
                ->pluck('id')
                ->map(fn ($id): int => (int) $id);
            $reportedProjects = $recentPhotoProjectIds
                ->intersect($ownProjectIds)
                ->count();
            $components['photo_reporting'] = $this->component(
                label: 'Апталық фотоесеп',
                score: $this->percentage(
                    $reportedProjects,
                    $ownProjectIds->count()
                ),
                numerator: $reportedProjects,
                denominator: $ownProjectIds->count(),
                description: 'Соңғы 7 күнде өз ауданындағы жобаларға жүктелген фото'
            );
        }

        $availableWeight = collect(array_keys($components))
            ->filter(
                fn (string $key): bool => $components[$key]['score'] !== null
            )
            ->sum(fn (string $key): int => $weights[$key]);
        $score = null;

        foreach ($components as $key => &$component) {
            $baseWeight = $weights[$key];
            $component['weight'] = $baseWeight;
            $component['effective_weight'] = $component['score'] !== null
                && $availableWeight > 0
                ? round(($baseWeight / $availableWeight) * 100, 1)
                : 0.0;
            $component['weighted_score'] = $component['score'] !== null
                && $availableWeight > 0
                ? round(
                    $component['score'] * ($baseWeight / $availableWeight),
                    1
                )
                : null;
        }
        unset($component);

        if ($availableWeight > 0) {
            $score = round((float) collect($components)
                ->sum('weighted_score'), 1);
        }

        return [
            'score' => $score,
            'formula_type' => $user->baskarma_type === 'district'
                ? 'district'
                : 'management',
            'formula' => $user->baskarma_type === 'district'
                ? '35% орындау + 30% мерзім + 20% сапа + 15% фотоесеп'
                : '40% орындау + 35% мерзім + 25% сапа',
            'is_preliminary' => $evaluatedTasks->count() < 3,
            'components' => $components,
            'stats' => [
                'project_count' => $tasks->pluck('project_id')->unique()->count(),
                'total' => $tasks->count(),
                'completed' => $completedTasks->count(),
                'active' => $activeTasks->count(),
                'overdue' => $overdueTasks->count(),
                'evaluated_tasks' => $evaluatedTasks->count(),
            ],
        ];
    }

    private function timelinessScore(
        ProjectTask $task,
        mixed $today
    ): int {
        $comparisonDate = $task->status === 'done'
            ? ($task->completions
                ->firstWhere('status', 'approved')?->reviewed_at
                ?? $task->updated_at)
            : $today;

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

    /** @return array<string, mixed> */
    private function component(
        string $label,
        ?float $score,
        int $numerator,
        int $denominator,
        string $description
    ): array {
        return [
            'label' => $label,
            'score' => $score,
            'numerator' => $numerator,
            'denominator' => $denominator,
            'description' => $description,
        ];
    }

    private function percentage(int $value, int $total): ?float
    {
        return $total > 0 ? round(($value / $total) * 100, 1) : null;
    }
}
