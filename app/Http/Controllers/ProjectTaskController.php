<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectTask;
use App\Models\ProjectTaskEvent;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\ProjectExecutorAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class ProjectTaskController extends Controller
{
    public function __construct(
        private readonly ProjectExecutorAssignmentService $projectExecutors
    ) {}

    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $user = Auth::user();
        $creatorRole = $user?->roleModel?->name;

        $this->authorizeTaskManagement($investmentProject, true);

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

        $assignee = $this->validatedAssignee(
            (int) $validated['assigned_to'],
            $investmentProject
        );

        $validated['project_id'] = $investmentProject->id;
        $validated['status'] = 'new';
        $validated['created_by'] = Auth::id();

        $requiresModeratorApproval = $creatorRole === 'invest'
            && $user?->invest_sub_role === 'turkistan_invest';

        // Only tasks issued by Turkistan Invest wait for moderator review.
        // Every other direction sends its task straight to the assignee.
        if (! $requiresModeratorApproval) {
            $validated['approval_status'] = 'approved';
            $validated['approved_by'] = Auth::id();
            $validated['approved_at'] = now();
        } else {
            $validated['approval_status'] = 'pending';
        }

        $task = ProjectTask::create($validated);

        ProjectTaskEvent::create([
            'task_id' => $task->id,
            'user_id' => Auth::id(),
            'type' => 'created',
        ]);

        // A direct dispatch is not a moderator approval. Keep it as a
        // distinct event so the timeline never claims a moderator acted.
        if ($task->approval_status === 'approved') {
            ProjectTaskEvent::create([
                'task_id' => $task->id,
                'user_id' => Auth::id(),
                'type' => 'dispatched',
            ]);
        }

        // Investor participation is stored in its own pivot and must not be
        // mixed into the regular executors list.
        if ($assignee->roleModel?->name !== 'investor') {
            $investmentProject->executors()
                ->syncWithoutDetaching([$validated['assigned_to']]);
        }

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

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'task.created',
            category: 'task',
            action: 'Кезең қосылды: "'.$task->title.'"',
            subject: $task,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Жауапты' => $assignee->full_name,
                    'Басталу күні' => $task->start_date,
                    'Аяқталу күні' => $task->due_date,
                    'Модерация статусы' => $task->approval_status,
                    'Сипаттама' => $task->description,
                ],
            ]
        );

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

        abort_unless(
            $task->approval_status === 'pending',
            409,
            'Бұл тапсырма бойынша шешім бұрын қабылданған.'
        );
        abort_unless(
            $task->requiresModeratorApproval(),
            409,
            'Бұл тапсырма модератордың растауын қажет етпейді.'
        );

        $request->validate([
            'approval_comment' => [
                $decision === 'rejected' ? 'required' : 'nullable',
                'string',
                'max:2000',
            ],
        ]);

        $task->update([
            'approval_status' => $decision,
            'approval_comment' => $request->input('approval_comment'),
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        ProjectTaskEvent::create([
            'task_id' => $task->id,
            'user_id' => Auth::id(),
            'type' => $decision, // 'approved' | 'rejected'
            'comment' => $request->input('approval_comment'),
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

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: $decision === 'approved'
                ? 'task.approved'
                : 'task.rejected',
            category: 'task',
            action: 'Тапсырма '.$statusKk.': "'.$task->title.'"',
            subject: $task,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Шешім' => $decision,
                    'Пікір' => $request->input('approval_comment'),
                ],
            ]
        );

        return redirect()->back()->with('success', 'Тапсырма '.$statusKk.'.');
    }

    public function update(Request $request, InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        $editorRole = Auth::user()?->roleModel?->name;
        $this->authorizeTaskManagement($investmentProject);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'sometimes|required|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'prohibited',
        ]);

        $newAssignee = array_key_exists('assigned_to', $validated)
            ? $this->validatedAssignee(
                (int) $validated['assigned_to'],
                $investmentProject
            )
            : null;

        $oldAssignedTo = $task->assigned_to;
        $wasRejected = $task->approval_status === 'rejected';
        $trackedFields = [
            'title',
            'description',
            'assigned_to',
            'start_date',
            'due_date',
            'approval_status',
        ];
        $before = $task->only($trackedFields);

        // Determine if this update is a content edit (not just a status toggle).
        // Status-only updates (e.g. mark as done) must not re-trigger moderation.
        $contentEdit = collect($validated)
            ->except('status')
            ->isNotEmpty();

        // The original task author determines its moderation path. Editing a
        // Turkistan Invest task from another account must not bypass review.
        if ($wasRejected && $contentEdit) {
            if ($task->requiresModeratorApproval()
                && $editorRole !== 'superadmin') {
                $validated['approval_status'] = 'pending';
                $validated['approval_comment'] = null;
                $validated['approved_by'] = null;
                $validated['approved_at'] = null;
            } else {
                $validated['approval_status'] = 'approved';
                $validated['approval_comment'] = null;
                $validated['approved_by'] = Auth::id();
                $validated['approved_at'] = now();
            }
        }

        $task->update($validated);

        // Log a content-edit event so it appears on the task timeline.
        // Especially useful when a rejected task is edited and resubmitted —
        // the timeline must show the moment of editing.
        if ($contentEdit) {
            ProjectTaskEvent::create([
                'task_id' => $task->id,
                'user_id' => Auth::id(),
                'type' => 'edited',
            ]);
        }

        $newAssignedTo = $task->assigned_to;

        if ($oldAssignedTo !== $newAssignedTo) {
            if ($oldAssignedTo) {
                $this->detachExecutorIfNoTasksRemain(
                    $investmentProject,
                    (int) $oldAssignedTo
                );
            }

            if ($newAssignedTo) {
                if ($newAssignee?->roleModel?->name !== 'investor') {
                    $investmentProject->executors()
                        ->syncWithoutDetaching([$newAssignedTo]);
                }
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

            KpiLog::activity(
                projectId: $investmentProject->id,
                event: 'task.resubmitted',
                category: 'task',
                action: 'Тапсырма қайта расталуға жіберілді: "'.$task->title.'"',
                subject: $task,
                properties: [
                    'project_name' => $investmentProject->name,
                    'changes' => KpiLog::changes(
                        $before,
                        $task->only($trackedFields),
                        $this->activityLabels()
                    ),
                ]
            );

            return redirect()->back()->with('success', 'Тапсырма қайта расталуға жіберілді.');
        }

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'task.updated',
            category: 'task',
            action: 'Кезең жаңартылды: "'.$task->title.'"',
            subject: $task,
            properties: [
                'project_name' => $investmentProject->name,
                'changes' => KpiLog::changes(
                    $before,
                    $task->only($trackedFields),
                    $this->activityLabels()
                ),
            ]
        );

        return redirect()->back()->with('success', 'Кезең жаңартылды.');
    }

    public function markViewed(InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        // Only the assigned executor can mark a task as viewed, and only
        // once the moderator has approved it (otherwise it shouldn't be
        // visible to them at all).
        if ((int) $task->assigned_to !== (int) Auth::id()) {
            abort(403);
        }

        if (($task->approval_status ?? 'approved') !== 'approved') {
            abort(403);
        }

        if ($task->viewed_at === null) {
            $task->update(['viewed_at' => now()]);
            ProjectTaskEvent::create([
                'task_id' => $task->id,
                'user_id' => Auth::id(),
                'type' => 'viewed',
            ]);
            KpiLog::activity(
                projectId: $investmentProject->id,
                event: 'task.viewed',
                category: 'task',
                action: 'Орындаушы тапсырманы көрді: "'.$task->title.'"',
                subject: $task,
                properties: [
                    'project_name' => $investmentProject->name,
                ]
            );
        }

        return redirect()->back();
    }

    public function destroy(InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        $this->authorizeTaskManagement($investmentProject);

        $assignedTo = $task->assigned_to;

        $task->delete();

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'task.deleted',
            category: 'task',
            action: 'Кезең жойылды: "'.$task->title.'"',
            subject: $task,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Жауапты ID' => $assignedTo,
                    'Басталу күні' => $task->start_date,
                    'Аяқталу күні' => $task->due_date,
                    'Статус' => $task->status,
                    'Сипаттама' => $task->description,
                ],
            ]
        );

        if ($assignedTo) {
            $this->detachExecutorIfNoTasksRemain(
                $investmentProject,
                (int) $assignedTo
            );
        }

        return redirect()->back()->with('success', 'Кезең жойылды.');
    }

    /**
     * @return array<string, string>
     */
    private function activityLabels(): array
    {
        return [
            'title' => 'Тақырып',
            'description' => 'Сипаттама',
            'assigned_to' => 'Жауапты пайдаланушы ID',
            'start_date' => 'Басталу күні',
            'due_date' => 'Аяқталу күні',
            'approval_status' => 'Модерация статусы',
        ];
    }

    private function detachExecutorIfNoTasksRemain(
        InvestmentProject $project,
        int $userId
    ): void {
        $hasOtherTasks = ProjectTask::query()
            ->where('project_id', $project->id)
            ->where('assigned_to', $userId)
            ->exists();

        if ($hasOtherTasks || $this->isAutomaticDistrictExecutor(
            $project,
            $userId
        )) {
            return;
        }

        $project->executors()->detach($userId);
    }

    private function isAutomaticDistrictExecutor(
        InvestmentProject $project,
        int $userId
    ): bool {
        return $this->projectExecutors->isAutomaticDistrictExecutor(
            $project,
            $userId
        );
    }

    private function validatedAssignee(
        int $userId,
        InvestmentProject $investmentProject
    ): User {
        $assignee = User::with('roleModel')->findOrFail($userId);

        if (! in_array(
            $assignee->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        )) {
            throw ValidationException::withMessages([
                'assigned_to' => 'Тапсырманы тек орындаушыға немесе жоба инвесторына беруге болады.',
            ]);
        }

        if ($assignee->roleModel?->name === 'investor'
            && ! $investmentProject->investors()
                ->where('users.id', $assignee->id)
                ->exists()) {
            throw ValidationException::withMessages([
                'assigned_to' => 'Инвестор бұл жобаға бекітілмеген.',
            ]);
        }

        return $assignee;
    }

    private function authorizeTaskManagement(
        InvestmentProject $project,
        bool $allowProkuror = false
    ): void {
        $roleName = Auth::user()?->roleModel?->name;
        $allowedRoles = $allowProkuror
            ? ['superadmin', 'invest', 'prokuror']
            : ['superadmin', 'invest'];

        abort_unless(
            in_array($roleName, $allowedRoles, true),
            403,
            'Сізде тапсырмаларды басқару құқығы жоқ.'
        );

        $user = Auth::user();
        if ($user?->isDistrictScoped()
            && $project->region_id !== $user->region_id) {
            abort(403, 'Сіздің бұл жобаға қол жеткізуіңіз жоқ.');
        }
    }
}
