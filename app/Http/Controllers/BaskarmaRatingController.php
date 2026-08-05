<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\User;
use App\Services\BaskarmaKpiService;
use App\Services\InvestmentProjectAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BaskarmaRatingController extends Controller
{
    public function __construct(
        private readonly InvestmentProjectAccessService $projectAccess,
        private readonly BaskarmaKpiService $kpi
    ) {}

    public function index(Request $request)
    {
        $currentUser = $request->user();
        $currentUser->load('roleModel');
        $roleName = $currentUser->roleModel?->name;

        // Get all ispolnitel users with their region
        $ispolnitelUsers = User::whereHas('roleModel', fn ($q) => $q->where('name', 'ispolnitel'))
            ->with('region')
            ->get();

        $kpiByUser = $this->kpi->calculateMany($ispolnitelUsers);

        $ratings = $ispolnitelUsers->map(function (User $user) use (
            $kpiByUser
        ) {
            $kpi = $kpiByUser->get($user->id);
            $stats = $kpi['stats'];

            return [
                'id' => $user->id,
                'full_name' => $user->full_name,
                'phone' => $user->phone,
                'position' => $user->position,
                'baskarma_type' => $user->baskarma_type,
                'region' => $user->region?->name,
                'avatar_url' => $user->avatar_url,
                'project_count' => $stats['project_count'],
                'total' => $stats['total'],
                'completed' => $stats['completed'],
                'active' => $stats['active'],
                'overdue' => $stats['overdue'],
                'kpd' => $kpi['score'],
                'kpi' => $kpi,
            ];
        });

        // Split into all three ispolnitel types, sorted by KPD descending
        $districtRatings = $ratings
            ->filter(fn ($r) => $r['baskarma_type'] === 'district')
            ->sortByDesc(fn ($rating) => $rating['kpd'] ?? -1)
            ->values();

        $oblastRatings = $ratings
            ->filter(fn ($r) => $r['baskarma_type'] === 'oblast')
            ->sortByDesc(fn ($rating) => $rating['kpd'] ?? -1)
            ->values();

        $additionalRatings = $ratings
            ->filter(fn ($r) => $r['baskarma_type'] === 'additional')
            ->sortByDesc(fn ($rating) => $rating['kpd'] ?? -1)
            ->values();

        // For ispolnitel: collect IDs they are allowed to view
        $allowedIds = null;
        if ($roleName === 'ispolnitel') {
            // Ispolnitel can only view their own show page
            $allowedIds = [$currentUser->id];
        } elseif ($roleName === 'akim' && $currentUser->region_id) {
            // District akim can only view ispolnitel users of their own district
            $currentUser->loadMissing('region');
            $isDistrictAkim = $currentUser->region && $currentUser->region->type !== 'oblast';
            if ($isDistrictAkim) {
                $allowedIds = $ispolnitelUsers
                    ->where('region_id', $currentUser->region_id)
                    ->pluck('id')
                    ->values()
                    ->all();
            }
        }

        return Inertia::render('baskarma-rating/index', [
            'districtRatings' => $districtRatings,
            'oblastRatings' => $oblastRatings,
            'additionalRatings' => $additionalRatings,
            'allowedIds' => $allowedIds,
        ]);
    }

    public function show(User $user)
    {
        $currentUser = request()->user();
        $currentUser->load('roleModel');
        $roleName = $currentUser->roleModel?->name;
        $user->load('region', 'roleModel');

        abort_unless(
            $user->roleModel?->name === 'ispolnitel'
                && in_array(
                    $user->baskarma_type,
                    User::BASKARMA_TYPES,
                    true
                ),
            404
        );

        // Ispolnitel can only see their own page
        if ($roleName === 'ispolnitel' && $currentUser->id !== $user->id) {
            abort(403, 'Сіздің бұл бетке қол жеткізуіңіз жоқ.');
        }

        // District akim can only see ispolnitel users of their own district
        if ($roleName === 'akim' && $currentUser->region_id) {
            $currentUser->loadMissing('region');
            $isDistrictAkim = $currentUser->region && $currentUser->region->type !== 'oblast';
            if ($isDistrictAkim && $user->region_id !== $currentUser->region_id) {
                abort(403, 'Сіздің бұл бетке қол жеткізуіңіз жоқ.');
            }
        }

        $now = now()->startOfDay();

        $tasks = ProjectTask::where('assigned_to', $user->id)
            ->where('approval_status', 'approved')
            ->whereHas('project', fn ($project) => $project->active())
            ->with(['project:id,name,region_id', 'project.region:id,name', 'latestCompletion'])
            ->get();
        $visibleProjectIds = array_fill_keys(
            $this->visibleProjectIds(
                $currentUser,
                $tasks->pluck('project_id')->all()
            ),
            true
        );

        $completedTasks = [];
        $activeTasks = [];
        $overdueTasks = [];

        foreach ($tasks as $task) {
            $item = [
                'id' => $task->id,
                'title' => $task->title,
                'project_name' => $task->project?->name,
                'project_id' => $task->project_id,
                'can_view_project' => isset(
                    $visibleProjectIds[(int) $task->project_id]
                ),
                'region' => $task->project?->region?->name,
                'start_date' => $task->start_date?->toDateString(),
                'due_date' => $task->due_date?->toDateString(),
                'status' => $task->status,
                'completion_status' => $task->latestCompletion?->status,
                'completed_at' => $task->latestCompletion?->created_at?->toDateString(),
            ];

            if ($task->status === 'done') {
                $completedTasks[] = $item;
            } elseif ($task->due_date && $task->due_date->startOfDay()->lt($now)) {
                $overdueTasks[] = $item;
            } else {
                $activeTasks[] = $item;
            }
        }

        $kpi = $this->kpi->calculate($user);

        return Inertia::render('baskarma-rating/show', [
            'user' => [
                'id' => $user->id,
                'full_name' => $user->full_name,
                'phone' => $user->phone,
                'position' => $user->position,
                'baskarma_type' => $user->baskarma_type,
                'region' => $user->region?->name,
                'avatar_url' => $user->avatar_url,
            ],
            'projectCount' => $kpi['stats']['project_count'],
            'kpd' => $kpi['score'],
            'kpi' => $kpi,
            'completedTasks' => $completedTasks,
            'activeTasks' => $activeTasks,
            'overdueTasks' => $overdueTasks,
        ]);
    }

    /**
     * @param  array<int, int|string>  $projectIds
     * @return array<int, int>
     */
    private function visibleProjectIds(User $user, array $projectIds): array
    {
        $query = InvestmentProject::query()->whereIn('id', $projectIds);
        $this->projectAccess->scopeVisible($query, $user);

        if (! in_array(
            $user->roleModel?->name,
            ['superadmin', 'invest', 'prokuror'],
            true
        )) {
            $query->active();
        }

        return $query
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();
    }
}
