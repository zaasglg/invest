<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
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
            'assigned_to' => [
                'required',
                'exists:users,id',
            ],
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $validated['project_id'] = $investmentProject->id;
        $validated['status'] = 'new';
        $validated['created_by'] = Auth::id();

        $task = ProjectTask::create($validated);

        // Auto-attach the assigned user as a project executor
        $investmentProject->executors()->syncWithoutDetaching([$validated['assigned_to']]);

        // Send notification to assigned user (ispolnitel)
        if ($validated['assigned_to'] != Auth::id()) {
            TaskNotification::create([
                'user_id' => $validated['assigned_to'],
                'task_id' => $task->id,
                'type' => 'task_assigned',
                'message' => "Сізге жаңа тапсырма берілді: \"{$task->title}\" (Жоба: {$investmentProject->name})",
            ]);
        }

        KpiLog::log($investmentProject->id, 'Кезең қосылды: "' . $task->title . '"');

        return redirect()->back()->with('success', 'Кезең қосылды.');
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

        $oldAssignedTo = $task->assigned_to;

        $task->update($validated);

        $newAssignedTo = $task->assigned_to;

        if ($oldAssignedTo !== $newAssignedTo) {
            if ($oldAssignedTo) {
                // Check for other tasks excluding the current one (since it's now reassigned)
                $hasOtherTasks = ProjectTask::where('project_id', $investmentProject->id)
                    ->where('assigned_to', $oldAssignedTo)
                    ->where('id', '!=', $task->id)
                    ->exists();

                if (!$hasOtherTasks) {
                    $investmentProject->executors()->detach($oldAssignedTo);
                }
            }

            if ($newAssignedTo) {
                $investmentProject->executors()->syncWithoutDetaching([$newAssignedTo]);
            }
        }

        KpiLog::log($investmentProject->id, 'Кезең жаңартылды: "' . $task->title . '"');

        return redirect()->back()->with('success', 'Кезең жаңартылды.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        KpiLog::log($investmentProject->id, 'Кезең жойылды: "' . $task->title . '"');

        $assignedTo = $task->assigned_to;

        $task->delete();

        if ($assignedTo) {
            $hasOtherTasks = ProjectTask::where('project_id', $investmentProject->id)
                ->where('assigned_to', $assignedTo)
                ->exists();

            if (!$hasOtherTasks) {
                $investmentProject->executors()->detach($assignedTo);
            }
        }

        return redirect()->back()->with('success', 'Кезең жойылды.');
    }
}
