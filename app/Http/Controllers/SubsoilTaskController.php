<?php

namespace App\Http\Controllers;

use App\Models\SubsoilTask;
use App\Models\SubsoilUser;
use App\Models\TaskNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SubsoilTaskController extends Controller
{
    public function store(Request $request, SubsoilUser $subsoilUser)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $validated['subsoil_user_id'] = $subsoilUser->id;
        $validated['status'] = 'new';
        $validated['created_by'] = Auth::id();

        $task = SubsoilTask::create($validated);

        // Send notification to assigned user
        if (! empty($validated['assigned_to']) && $validated['assigned_to'] != Auth::id()) {
            TaskNotification::create([
                'user_id' => $validated['assigned_to'],
                'subsoil_task_id' => $task->id,
                'type' => 'task_assigned',
                'message' => "Сізге жаңа тапсырма берілді: \"{$task->title}\" (Жер қойнауын пайдаланушы: {$subsoilUser->name})",
            ]);
        }

        return redirect()->back()->with('success', 'Кезең қосылды.');
    }

    public function update(Request $request, SubsoilUser $subsoilUser, SubsoilTask $task)
    {
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'sometimes|in:new,in_progress,done,rejected',
        ]);

        $task->update($validated);

        return redirect()->back()->with('success', 'Кезең жаңартылды.');
    }

    public function destroy(SubsoilUser $subsoilUser, SubsoilTask $task)
    {
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);

        $task->delete();

        return redirect()->back()->with('success', 'Кезең жойылды.');
    }
}
