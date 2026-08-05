<?php

namespace App\Http\Controllers;

use App\Models\TaskNotification;
use Illuminate\Http\Request;

class ProactiveAssistantController extends Controller
{
    public function index(Request $request)
    {
        $notifications = TaskNotification::query()
            ->visibleTo($request->user())
            ->assistant()
            ->with([
                'task.project:id,name',
                'completion.task.project:id,name',
                'subsoilTask.subsoilUser:id,name',
                'subsoilCompletion.task.subsoilUser:id,name',
            ])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (TaskNotification $notification) => [
                'id' => $notification->id,
                'type' => $notification->type,
                'message' => $notification->message,
                'is_read' => $notification->is_read,
                'created_at' => $notification->created_at,
                'destination_url' => $notification->destination_url,
                'action_label' => $notification->action_label ?? 'Ашу',
            ]);

        return response()->json(['notifications' => $notifications]);
    }

    public function markAllAsRead(Request $request)
    {
        TaskNotification::query()
            ->visibleTo($request->user())
            ->assistant()
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $unreadQuery = TaskNotification::query()
            ->visibleTo($request->user())
            ->where('is_read', false);

        return response()->json([
            'count' => (clone $unreadQuery)->count(),
            'assistant_count' => (clone $unreadQuery)->assistant()->count(),
        ]);
    }
}
