<?php

namespace App\Http\Controllers;

use App\Models\TaskNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TaskNotificationController extends Controller
{
    public function index()
    {
        $notifications = TaskNotification::where('user_id', Auth::id())
            ->with([
                'task.project',
                'task.assignee',
                'completion.submitter',
                'completion.reviewer',
                'completion.files',
            ])
            ->orderByDesc('created_at')
            ->paginate(10);

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
        ]);
    }

    public function markAsRead(TaskNotification $notification)
    {
        if ($notification->user_id !== Auth::id()) {
            abort(403);
        }

        $notification->update(['is_read' => true]);

        return redirect()->back();
    }

    public function markAllAsRead()
    {
        TaskNotification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return redirect()->back();
    }

    /**
     * Return unread notification count for the header bell.
     */
    public function unreadCount()
    {
        $count = TaskNotification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }
}
