<?php

namespace App\Http\Controllers;

use App\Models\SubsoilTask;
use App\Models\SubsoilUser;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\SectorActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class SubsoilTaskController extends Controller
{
    public function store(
        Request $request,
        SubsoilUser $subsoilUser,
        SectorActivityLogService $activity
    ) {
        $this->authorizeTaskManagement($request);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $this->validateAssignee($validated['assigned_to'] ?? null);

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

        $activity->record(
            auditable: $subsoilUser,
            event: 'task.created',
            category: 'task',
            action: 'Жаңа кезең қосылды: "'.$task->title.'"',
            subject: $task,
            properties: [
                'details' => [
                    'Кезең атауы' => $task->title,
                    'Сипаттама' => $task->description,
                    'Орындаушы ID' => $task->assigned_to,
                    'Басталу күні' => $task->start_date,
                    'Аяқталу күні' => $task->due_date,
                ],
            ]
        );

        return redirect()->back()->with('success', 'Кезең қосылды.');
    }

    public function update(
        Request $request,
        SubsoilUser $subsoilUser,
        SubsoilTask $task,
        SectorActivityLogService $activity
    ) {
        $this->authorizeTaskManagement($request);
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'prohibited',
        ]);

        if (array_key_exists('assigned_to', $validated)) {
            $this->validateAssignee($validated['assigned_to']);
        }

        $fields = [
            'title',
            'description',
            'assigned_to',
            'start_date',
            'due_date',
        ];
        $before = $task->only($fields);
        $task->update($validated);

        if ($task->wasChanged($fields)) {
            $this->resolveAssignmentNotifications($task);

            $oldAssigneeId = (int) ($before['assigned_to'] ?? 0);
            if ($oldAssigneeId > 0
                && $oldAssigneeId !== (int) $task->assigned_to
                && $oldAssigneeId !== (int) Auth::id()) {
                TaskNotification::create([
                    'user_id' => $oldAssigneeId,
                    'type' => 'task_assignment_removed',
                    'message' => "Сізден тапсырма алынып, басқа орындаушыға берілді: \"{$task->title}\" (Жер қойнауын пайдаланушы: {$subsoilUser->name})",
                    'action_url' => route(
                        'notifications.index',
                        absolute: false
                    ),
                    'action_label' => 'Хабарламаларды ашу',
                ]);
            }

            if ($task->assigned_to
                && (int) $task->assigned_to !== (int) Auth::id()) {
                TaskNotification::create([
                    'user_id' => $task->assigned_to,
                    'subsoil_task_id' => $task->id,
                    'type' => 'task_assigned',
                    'message' => "Сізге тапсырманың жаңартылған нұсқасы берілді: \"{$task->title}\" (Жер қойнауын пайдаланушы: {$subsoilUser->name})",
                ]);
            }
        }

        $activity->record(
            auditable: $subsoilUser,
            event: 'task.updated',
            category: 'task',
            action: 'Кезең жаңартылды: "'.$task->title.'"',
            subject: $task,
            properties: [
                'changes' => $activity->changes(
                    $before,
                    $task->fresh()->only($fields),
                    [
                        'title' => 'Кезең атауы',
                        'description' => 'Сипаттама',
                        'assigned_to' => 'Орындаушы ID',
                        'start_date' => 'Басталу күні',
                        'due_date' => 'Аяқталу күні',
                    ]
                ),
            ]
        );

        return redirect()->back()->with('success', 'Кезең жаңартылды.');
    }

    public function destroy(
        Request $request,
        SubsoilUser $subsoilUser,
        SubsoilTask $task,
        SectorActivityLogService $activity
    ) {
        $this->authorizeTaskManagement($request);
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);

        $activity->record(
            auditable: $subsoilUser,
            event: 'task.deleted',
            category: 'task',
            action: 'Кезең жойылды: "'.$task->title.'"',
            subject: $task,
            properties: [
                'details' => [
                    'Кезең атауы' => $task->title,
                    'Күйі' => $task->status,
                    'Орындаушы ID' => $task->assigned_to,
                ],
            ]
        );

        $assignedTo = $task->assigned_to;
        $taskTitle = $task->title;
        $task->delete();

        if ($assignedTo && (int) $assignedTo !== (int) Auth::id()) {
            TaskNotification::create([
                'user_id' => $assignedTo,
                'type' => 'task_cancelled',
                'message' => "Сізге берілген тапсырма жойылды: \"{$taskTitle}\" (Жер қойнауын пайдаланушы: {$subsoilUser->name})",
                'action_url' => route(
                    'notifications.index',
                    absolute: false
                ),
                'action_label' => 'Хабарламаларды ашу',
            ]);
        }

        return redirect()->back()->with('success', 'Кезең жойылды.');
    }

    private function authorizeTaskManagement(Request $request): void
    {
        $roleName = $request->user()?->load('roleModel')->roleModel?->name;

        abort_unless(
            in_array($roleName, ['superadmin', 'invest'], true),
            403,
            'Сізде тапсырмаларды басқару құқығы жоқ.'
        );
    }

    private function validateAssignee(?int $userId): void
    {
        if ($userId === null) {
            return;
        }

        $assignee = User::with('roleModel')->findOrFail($userId);

        if ($assignee->roleModel?->name !== 'ispolnitel') {
            throw ValidationException::withMessages([
                'assigned_to' => 'Тапсырманы тек орындаушыға беруге болады.',
            ]);
        }
    }

    private function resolveAssignmentNotifications(SubsoilTask $task): void
    {
        $notifications = TaskNotification::query()
            ->where('subsoil_task_id', $task->id)
            ->where('type', 'task_assigned');

        (clone $notifications)
            ->whereIn('telegram_status', ['pending', 'retry'])
            ->update([
                'telegram_status' => 'skipped',
                'telegram_next_attempt_at' => null,
                'telegram_last_error' => null,
            ]);
        $notifications
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }
}
