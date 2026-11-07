<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectTask;
use App\Models\ProjectTaskEvent;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectTaskRevisionService
{
    public function __construct(
        private readonly InvestmentProjectAccessService $access,
        private readonly ProjectExecutorAssignmentService $executors
    ) {}

    public function update(User $actor, InvestmentProject $project, ProjectTask $task, array $data): string
    {
        return DB::transaction(function () use ($actor, $project, $task, $data) {
            $lockedProject = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless($this->access->canManage($actor, $lockedProject), 403);
            abort_if($lockedProject->is_archived || $lockedProject->is_deleted || $lockedProject->status === 'plan', 409);
            $locked = $lockedProject->tasks()->lockForUpdate()->findOrFail($task->id);
            $protected = $locked->hasProtectedDefinition();
            $before = $locked->only($locked->getFillable());
            $previousReports = $locked->completions()->get()->map->only([
                'id', 'task_definition_version', 'status', 'submitted_by', 'reviewed_by', 'reviewed_at',
            ])->all();
            $oldAssignee = $locked->assigned_to;
            $locked->fill($data);
            $changed = $locked->isDirty(['title', 'description', 'assigned_to', 'start_date', 'due_date']);

            if (! $changed) {
                return 'Тапсырмада өзгеріс жоқ.';
            }
            if ($protected && $actor->roleModel?->name !== 'superadmin') {
                throw ValidationException::withMessages([
                    'title' => 'Расталуға жіберілген немесе бекітілген тапсырманы өзгертуге болмайды. Қайта ашу үшін әкімшіге жүгініңіз.',
                ]);
            }

            $requiresReview = $locked->requiresModeratorApproval();
            $locked->fill([
                'definition_version' => ((int) ($before['definition_version'] ?? 1)) + 1,
                'status' => 'new',
                'viewed_at' => null,
                'approval_status' => $requiresReview ? 'pending' : 'approved',
                'approval_comment' => null,
                'approved_by' => $requiresReview ? null : $actor->id,
                'approved_at' => $requiresReview ? null : now(),
            ])->save();

            $locked->completions()->where('status', 'pending')->update([
                'status' => 'rejected',
                'reviewed_by' => $actor->id,
                'reviewed_at' => now(),
                'reviewer_comment' => 'Тапсырманың мазмұны өзгеріп, жаңа нұсқасы ашылды. Бұл есеп алдыңғы нұсқаның тарихында сақталды.',
            ]);

            if ((int) $oldAssignee !== (int) $locked->assigned_to) {
                if ($oldAssignee) {
                    $this->executors->releaseTaskAssignment($lockedProject, (int) $oldAssignee);
                }
                if ($locked->assignee?->roleModel?->name !== 'investor') {
                    $this->executors->assignTaskExecutor($lockedProject, (int) $locked->assigned_to);
                }
            }

            ProjectTaskEvent::create([
                'task_id' => $locked->id,
                'user_id' => $actor->id,
                'type' => 'edited',
                'comment' => $protected ? 'Тапсырма жаңа нұсқа ретінде қайта ашылды. Бұрынғы нәтижелер тарихта сақталды.' : 'Тапсырма түзетіліп, орындауға қайта жіберілді.',
            ]);

            if ($requiresReview) {
                User::query()->whereHas('roleModel', fn ($query) => $query->where('name', 'moderator'))
                    ->get()->filter(fn (User $reviewer) => $reviewer->id !== $actor->id && $this->access->canManage($reviewer, $lockedProject))
                    ->each(fn (User $reviewer) => TaskNotification::create([
                        'user_id' => $reviewer->id,
                        'task_id' => $locked->id,
                        'type' => 'task_pending_approval',
                        'message' => "Тапсырманың жаңа нұсқасы растауды күтуде: \"{$locked->title}\" (Жоба: {$lockedProject->name})",
                    ]));
            } elseif ($locked->assigned_to && (int) $locked->assigned_to !== (int) $actor->id) {
                TaskNotification::create([
                    'user_id' => $locked->assigned_to,
                    'task_id' => $locked->id,
                    'type' => 'task_assigned',
                    'message' => "Сізге тапсырманың жаңартылған нұсқасы берілді: \"{$locked->title}\" (Жоба: {$lockedProject->name})",
                ]);
            }

            KpiLog::activity(
                projectId: $lockedProject->id,
                event: $protected ? 'task.reopened' : 'task.updated',
                category: 'task',
                action: 'Тапсырманың жаңа нұсқасы сақталды: "'.$locked->title.'"',
                subject: $locked,
                properties: [
                    'before' => $before,
                    'after' => $locked->only($locked->getFillable()),
                    'previous_reports' => $previousReports,
                ],
                actor: $actor
            );

            return $requiresReview ? 'Тапсырманың жаңа нұсқасы растауға жіберілді.' : 'Тапсырманың жаңа нұсқасы орындауға жіберілді.';
        });
    }
}
