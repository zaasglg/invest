<?php

namespace App\Http\Controllers;

use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BaskarmaRatingController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = $request->user();
        $currentUser->load('roleModel');
        $roleName = $currentUser->roleModel?->name;

        // Get all ispolnitel users with their region
        $ispolnitelUsers = User::whereHas('roleModel', fn ($q) => $q->where('name', 'ispolnitel'))
            ->with('region')
            ->get();

        $now = now()->startOfDay();

        // Get task stats for each ispolnitel user
        $ratings = $ispolnitelUsers->map(function (User $user) use ($now) {
            $tasks = ProjectTask::where('assigned_to', $user->id)->get();

            // Count distinct projects this ispolnitel is assigned to
            $projectCount = $tasks->pluck('project_id')->unique()->count();

            $completed = 0;
            $active = 0; // new, in_progress — not overdue
            $overdue = 0;

            foreach ($tasks as $task) {
                if ($task->status === 'done') {
                    $completed++;
                } elseif ($task->due_date && $task->due_date->startOfDay()->lt($now)) {
                    $overdue++;
                } else {
                    $active++;
                }
            }

            $total = $tasks->count();
            $kpd = $total > 0 ? round((1 - ($overdue / $total)) * 100, 1) : 0;

            return [
                'id' => $user->id,
                'full_name' => $user->full_name,
                'phone' => $user->phone,
                'position' => $user->position,
                'baskarma_type' => $user->baskarma_type,
                'region' => $user->region?->name,
                'avatar_url' => $user->avatar_url,
                'project_count' => $projectCount,
                'total' => $total,
                'completed' => $completed,
                'active' => $active,
                'overdue' => $overdue,
                'kpd' => $kpd,
            ];
        });

        // Split into district and oblast, sorted by KPD descending
        $districtRatings = $ratings
            ->filter(fn ($r) => $r['baskarma_type'] === 'district')
            ->sortByDesc('kpd')
            ->values();

        $oblastRatings = $ratings
            ->filter(fn ($r) => $r['baskarma_type'] === 'oblast')
            ->sortByDesc('kpd')
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
            'allowedIds' => $allowedIds,
        ]);
    }

    public function show(User $user)
    {
        $currentUser = request()->user();
        $currentUser->load('roleModel');
        $roleName = $currentUser->roleModel?->name;

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

        $user->load('region', 'roleModel');

        $now = now()->startOfDay();

        $tasks = ProjectTask::where('assigned_to', $user->id)
            ->with(['project:id,name,region_id', 'project.region:id,name', 'latestCompletion'])
            ->get();

        $completedTasks = [];
        $activeTasks = [];
        $overdueTasks = [];

        foreach ($tasks as $task) {
            $item = [
                'id' => $task->id,
                'title' => $task->title,
                'project_name' => $task->project?->name,
                'project_id' => $task->project_id,
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

        $projectCount = $tasks->pluck('project_id')->unique()->count();
        $total = $tasks->count();
        $kpd = $total > 0 ? round((1 - (count($overdueTasks) / $total)) * 100, 1) : 0;

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
            'projectCount' => $projectCount,
            'kpd' => $kpd,
            'completedTasks' => $completedTasks,
            'activeTasks' => $activeTasks,
            'overdueTasks' => $overdueTasks,
        ]);
    }
}
