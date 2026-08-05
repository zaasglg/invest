<?php

namespace App\Http\Controllers;

use App\Models\TaskNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TaskNotificationController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'filter' => ['nullable', Rule::in(['all', 'unread', 'assistant', 'tasks'])],
        ]);
        $filter = $validated['filter'] ?? 'all';
        $user = Auth::user();

        $baseQuery = TaskNotification::query()->visibleTo($user);

        $summary = [
            'total' => (clone $baseQuery)->count(),
            'unread' => (clone $baseQuery)->where('is_read', false)->count(),
            'assistant' => (clone $baseQuery)->assistant()->count(),
        ];

        $notifications = (clone $baseQuery)
            ->with([
                'task.project',
                'task.assignee',
                'subsoilTask.subsoilUser',
                'completion.task.project',
                'completion.submitter',
                'subsoilCompletion.task.subsoilUser',
                'subsoilCompletion.submitter',
            ])
            ->when(
                $filter === 'unread',
                fn ($query) => $query->where('is_read', false)
            )
            ->when(
                $filter === 'assistant',
                fn ($query) => $query->assistant()
            )
            ->when(
                $filter === 'tasks',
                fn ($query) => $query->whereNotIn(
                    'type',
                    TaskNotification::ASSISTANT_TYPES
                )
            )
            ->orderByDesc('created_at')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'notificationSummary' => $summary,
            'filter' => $filter,
        ]);
    }

    public function open(TaskNotification $notification)
    {
        $this->ensureVisible($notification);

        $notification->loadMissing([
            'task:id,project_id',
            'completion:id,task_id',
            'completion.task:id,project_id',
            'subsoilTask:id,subsoil_user_id',
            'subsoilCompletion:id,task_id',
            'subsoilCompletion.task:id,subsoil_user_id',
        ]);
        $notification->update(['is_read' => true]);

        return redirect()->to($notification->destination_url);
    }

    public function markAsRead(TaskNotification $notification)
    {
        $this->ensureVisible($notification);

        $notification->update(['is_read' => true]);

        return redirect()->back();
    }

    public function markAllAsRead()
    {
        TaskNotification::query()
            ->visibleTo(Auth::user())
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return redirect()->back();
    }

    /**
     * Return unread notification count for the header bell.
     */
    public function unreadCount()
    {
        $query = TaskNotification::query()
            ->visibleTo(Auth::user())
            ->where('is_read', false);

        $count = (clone $query)->count();
        $assistantCount = (clone $query)->assistant()->count();

        return response()->json([
            'count' => $count,
            'assistant_count' => $assistantCount,
        ]);
    }

    private function ensureVisible(TaskNotification $notification): void
    {
        if (! TaskNotification::query()
            ->visibleTo(Auth::user())
            ->whereKey($notification->id)
            ->exists()) {
            abort(403);
        }
    }
}
