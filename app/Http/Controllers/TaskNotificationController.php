<?php

namespace App\Http\Controllers;

use App\Models\TaskNotification;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TaskNotificationController extends Controller
{
    public function index()
    {
        $notifications = TaskNotification::query()
            ->visibleTo(Auth::user())
            ->with([
                'task.project',
                'task.assignee',
                'subsoilTask.subsoilUser',
                'completion.submitter',
                'completion.reviewer',
                'completion.files',
                'subsoilCompletion.submitter',
                'subsoilCompletion.reviewer',
                'subsoilCompletion.files',
            ])
            ->orderByDesc('created_at')
            ->paginate(10);

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
        ]);
    }

    public function markAsRead(TaskNotification $notification)
    {
        if (! TaskNotification::query()
            ->visibleTo(Auth::user())
            ->whereKey($notification->id)
            ->exists()) {
            abort(403);
        }

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
        $count = TaskNotification::query()
            ->visibleTo(Auth::user())
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }
}
