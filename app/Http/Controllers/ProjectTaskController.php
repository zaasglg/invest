<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProjectTaskController extends Controller
{
    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'required|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $validated['project_id'] = $investmentProject->id;
        $validated['status'] = 'new';

        $task = ProjectTask::create($validated);

        // Send notification to assigned user (baskarma)
        if ($validated['assigned_to'] != Auth::id()) {
            TaskNotification::create([
                'user_id' => $validated['assigned_to'],
                'task_id' => $task->id,
                'type' => 'task_assigned',
                'message' => "Сізге жаңа тапсырма берілді: \"{$task->title}\" (Жоба: {$investmentProject->name})",
            ]);
        }

        return redirect()->back()->with('success', 'Этап добавлен.');
    }

    public function update(Request $request, InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'sometimes|required|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'sometimes|in:new,in_progress,done,rejected',
        ]);

        $task->update($validated);

        return redirect()->back()->with('success', 'Этап обновлен.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        $task->delete();

        return redirect()->back()->with('success', 'Этап удален.');
    }
}
