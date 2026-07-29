<?php

namespace App\Http\Controllers;

use App\Models\SubsoilTask;
use App\Models\SubsoilUser;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class SubsoilTaskController extends Controller
{
    public function store(Request $request, SubsoilUser $subsoilUser)
    {
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

        return redirect()->back()->with('success', 'Кезең қосылды.');
    }

    public function update(Request $request, SubsoilUser $subsoilUser, SubsoilTask $task)
    {
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

        $task->update($validated);

        return redirect()->back()->with('success', 'Кезең жаңартылды.');
    }

    public function destroy(
        Request $request,
        SubsoilUser $subsoilUser,
        SubsoilTask $task
    ) {
        $this->authorizeTaskManagement($request);
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);

        $task->delete();

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
}
