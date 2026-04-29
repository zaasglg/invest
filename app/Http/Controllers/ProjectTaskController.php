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
        $user = Auth::user();
        $creatorRole = $user?->roleModel?->name;

        // Moderator may only approve/reject tasks; not create them.
        if ($creatorRole === 'moderator') {
            abort(403, 'Сізде тапсырма енгізу құқығы жоқ.');
        }

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

        // Tasks created by superadmin are auto-approved; everyone else
        // must wait for a moderator's review before the task is visible
        // to the assigned executor.
        if ($creatorRole === 'superadmin') {
            $validated['approval_status'] = 'approved';
            $validated['approved_by'] = Auth::id();
            $validated['approved_at'] = now();
        } else {
            $validated['approval_status'] = 'pending';
        }

        $task = ProjectTask::create($validated);

        // Auto-attach the assigned user as a project executor
        $investmentProject->executors()->syncWithoutDetaching([$validated['assigned_to']]);

        // Notify assigned user only when the task is already visible to them.
        if ($task->approval_status === 'approved' && $validated['assigned_to'] != Auth::id()) {
            TaskNotification::create([
                'user_id' => $validated['assigned_to'],
                'task_id' => $task->id,
                'type' => 'task_assigned',
                'message' => "Сізге жаңа тапсырма берілді: \"{$task->title}\" (Жоба: {$investmentProject->name})",
            ]);
        }

        // Notify moderators about a new task awaiting approval.
        if ($task->approval_status === 'pending') {
            $moderatorIds = User::whereHas('roleModel', fn ($q) => $q->where('name', 'moderator'))
                ->pluck('id');
            foreach ($moderatorIds as $moderatorId) {
                if ((int) $moderatorId === (int) Auth::id()) {
                    continue;
                }
                TaskNotification::create([
                    'user_id' => $moderatorId,
                    'task_id' => $task->id,
                    'type' => 'task_pending_approval',
                    'message' => "Жаңа тапсырма растауды күтуде: \"{$task->title}\" (Жоба: {$investmentProject->name})",
                ]);
            }
        }

        KpiLog::log($investmentProject->id, 'Кезең қосылды: "'.$task->title.'"');

        return redirect()->back()->with('success', 'Кезең қосылды.');
    }

    public function approve(Request $request, InvestmentProject $investmentProject, ProjectTask $task)
    {
        return $this->reviewApproval($request, $investmentProject, $task, 'approved');
    }

    public function reject(Request $request, InvestmentProject $investmentProject, ProjectTask $task)
    {
        return $this->reviewApproval($request, $investmentProject, $task, 'rejected');
    }

    protected function reviewApproval(Request $request, InvestmentProject $investmentProject, ProjectTask $task, string $decision)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();
        $roleName = $user?->roleModel?->name;
        if (! in_array($roleName, ['moderator', 'superadmin'], true)) {
            abort(403, 'Сізде тапсырманы растау құқығы жоқ.');
        }

        $request->validate([
            'approval_comment' => 'nullable|string|max:2000',
        ]);

        $task->update([
            'approval_status' => $decision,
            'approval_comment' => $request->input('approval_comment'),
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        // Notification policy:
        //  - On approval: the executor (assignee) receives a regular
        //    "task_assigned" notification — moderation must be transparent
        //    to them; they should see it as a freshly assigned task, just
        //    like before the moderator role existed. The creator (invest)
        //    receives a "task_approved" notification.
        //  - On rejection: only the creator (invest) is notified. The
        //    executor was never aware of the task and must not be bothered.
        $reviewerName = $user?->full_name ?? 'Модератор';
        $statusKk = $decision === 'approved' ? 'қабылданды' : 'қабылданбады';

        if ($decision === 'approved') {
            // Executor — looks like a regular new task assignment.
            if ($task->assigned_to && (int) $task->assigned_to !== (int) Auth::id()) {
                TaskNotification::create([
                    'user_id' => $task->assigned_to,
                    'task_id' => $task->id,
                    'type' => 'task_assigned',
                    'message' => "Сізге жаңа тапсырма берілді: \"{$task->title}\" (Жоба: {$investmentProject->name})",
                ]);
            }

            // Creator — confirmation that moderator approved their task.
            if ($task->created_by
                && (int) $task->created_by !== (int) Auth::id()
                && (int) $task->created_by !== (int) $task->assigned_to) {
                TaskNotification::create([
                    'user_id' => $task->created_by,
                    'task_id' => $task->id,
                    'type' => 'task_approved',
                    'message' => "{$reviewerName} тапсырманы қабылдады: \"{$task->title}\"",
                ]);
            }
        } else {
            // Rejection — notify only the creator.
            if ($task->created_by && (int) $task->created_by !== (int) Auth::id()) {
                TaskNotification::create([
                    'user_id' => $task->created_by,
                    'task_id' => $task->id,
                    'type' => 'task_rejected',
                    'message' => "{$reviewerName} тапсырманы қабылдамады: \"{$task->title}\"",
                ]);
            }
        }

        KpiLog::log(
            $investmentProject->id,
            'Тапсырма '.$statusKk.': "'.$task->title.'"'
        );

        return redirect()->back()->with('success', 'Тапсырма '.$statusKk.'.');
    }

    public function update(Request $request, InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        $editorRole = Auth::user()?->roleModel?->name;
        if ($editorRole === 'moderator') {
            abort(403, 'Сізде тапсырманы өзгерту құқығыңыз жоқ.');
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
        $wasRejected = $task->approval_status === 'rejected';

        // Determine if this update is a content edit (not just a status toggle).
        // Status-only updates (e.g. mark as done) must not re-trigger moderation.
        $contentEdit = collect($validated)
            ->except('status')
            ->isNotEmpty();

        // If a previously rejected task is edited by invest (not superadmin),
        // resubmit it for moderator approval — clear the rejection and put it
        // back into pending state. Superadmin edits remain auto-approved.
        if ($wasRejected && $contentEdit && $editorRole !== 'superadmin') {
            $validated['approval_status'] = 'pending';
            $validated['approval_comment'] = null;
            $validated['approved_by'] = null;
            $validated['approved_at'] = null;
        }

        $task->update($validated);

        $newAssignedTo = $task->assigned_to;

        if ($oldAssignedTo !== $newAssignedTo) {
            if ($oldAssignedTo) {
                // Check for other tasks excluding the current one (since it's now reassigned)
                $hasOtherTasks = ProjectTask::where('project_id', $investmentProject->id)
                    ->where('assigned_to', $oldAssignedTo)
                    ->where('id', '!=', $task->id)
                    ->exists();

                if (! $hasOtherTasks) {
                    $investmentProject->executors()->detach($oldAssignedTo);
                }
            }

            if ($newAssignedTo) {
                $investmentProject->executors()->syncWithoutDetaching([$newAssignedTo]);
            }
        }

        // If we re-queued the task for moderation, notify moderators again.
        if ($wasRejected && $task->approval_status === 'pending') {
            $moderatorIds = User::whereHas('roleModel', fn ($q) => $q->where('name', 'moderator'))
                ->pluck('id');
            foreach ($moderatorIds as $moderatorId) {
                if ((int) $moderatorId === (int) Auth::id()) {
                    continue;
                }
                TaskNotification::create([
                    'user_id' => $moderatorId,
                    'task_id' => $task->id,
                    'type' => 'task_pending_approval',
                    'message' => "Тапсырма қайта жіберілді: \"{$task->title}\" (Жоба: {$investmentProject->name})",
                ]);
            }

            KpiLog::log(
                $investmentProject->id,
                'Тапсырма қайта расталуға жіберілді: "'.$task->title.'"'
            );

            return redirect()->back()->with('success', 'Тапсырма қайта расталуға жіберілді.');
        }

        KpiLog::log($investmentProject->id, 'Кезең жаңартылды: "'.$task->title.'"');

        return redirect()->back()->with('success', 'Кезең жаңартылды.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        if (Auth::user()?->roleModel?->name === 'moderator') {
            abort(403, 'Сізде тапсырманы жою құқығыңыз жоқ.');
        }

        KpiLog::log($investmentProject->id, 'Кезең жойылды: "'.$task->title.'"');

        $assignedTo = $task->assigned_to;

        $task->delete();

        if ($assignedTo) {
            $hasOtherTasks = ProjectTask::where('project_id', $investmentProject->id)
                ->where('assigned_to', $assignedTo)
                ->exists();

            if (! $hasOtherTasks) {
                $investmentProject->executors()->detach($assignedTo);
            }
        }

        return redirect()->back()->with('success', 'Кезең жойылды.');
    }
}
