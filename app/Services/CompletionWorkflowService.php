<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectDocument;
use App\Models\ProjectTask;
use App\Models\ProjectTaskEvent;
use App\Models\SubsoilDocument;
use App\Models\SubsoilTask;
use App\Models\SubsoilTaskCompletion;
use App\Models\SubsoilUser;
use App\Models\TaskCompletion;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class CompletionWorkflowService
{
    public const MAX_TOTAL_UPLOAD_BYTES = 100 * 1024 * 1024;

    public function __construct(
        private readonly PrivateFileService $files
    ) {}

    /**
     * @param  array<int, UploadedFile>  $documents
     * @param  array<int, UploadedFile>  $photos
     */
    public function ensureUploadBudget(
        array $documents,
        array $photos
    ): void {
        $totalBytes = array_reduce(
            [...$documents, ...$photos],
            static fn (int $total, UploadedFile $file): int => $total
                + (int) $file->getSize(),
            0
        );

        if ($totalBytes > self::MAX_TOTAL_UPLOAD_BYTES) {
            throw ValidationException::withMessages([
                'documents' => 'Жүктелетін файлдардың жалпы көлемі 100 МБ-тан аспауы керек.',
            ]);
        }
    }

    /**
     * @param  array<int, UploadedFile>  $documents
     * @param  array<int, UploadedFile>  $photos
     */
    public function submitProject(
        ProjectTask $task,
        User $submitter,
        ?string $comment,
        array $documents,
        array $photos
    ): TaskCompletion {
        $storedPaths = [];

        try {
            return DB::transaction(function () use (
                $task,
                $submitter,
                $comment,
                $documents,
                $photos,
                &$storedPaths
            ): TaskCompletion {
                $lockedTask = ProjectTask::query()
                    ->whereKey($task->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                abort_unless(
                    in_array($lockedTask->status, ['new', 'rejected'], true),
                    409,
                    'Бұл тапсырма бойынша орындалу нәтижесі жіберіліп қойған.'
                );
                abort_if(
                    $lockedTask->completions()
                        ->where('status', 'pending')
                        ->exists(),
                    409,
                    'Бұл тапсырманың тексеруді күтіп тұрған нәтижесі бар.'
                );

                $completion = TaskCompletion::create([
                    'task_id' => $lockedTask->id,
                    'submitted_by' => $submitter->id,
                    'comment' => $comment,
                    'status' => 'pending',
                ]);

                $this->storeFiles(
                    $completion,
                    $documents,
                    $photos,
                    'task-completions',
                    $storedPaths
                );

                $taskUpdate = ['status' => 'in_progress'];
                $shouldLogView = $lockedTask->viewed_at === null;
                if ($shouldLogView) {
                    $taskUpdate['viewed_at'] = now();
                }
                $lockedTask->update($taskUpdate);

                if ($shouldLogView) {
                    ProjectTaskEvent::create([
                        'task_id' => $lockedTask->id,
                        'user_id' => $submitter->id,
                        'type' => 'viewed',
                    ]);
                }

                ProjectTaskEvent::create([
                    'task_id' => $lockedTask->id,
                    'user_id' => $submitter->id,
                    'type' => 'completion_submitted',
                    'comment' => $comment,
                ]);

                $this->notifySubmission(
                    $lockedTask,
                    $completion,
                    $submitter,
                    count($documents),
                    count($photos)
                );

                KpiLog::activity(
                    projectId: $lockedTask->project_id,
                    event: 'completion.submitted',
                    category: 'completion',
                    action: 'Тапсырма орындалып, тексеруге жіберілді: "'
                        .$lockedTask->title.'"',
                    subject: $completion,
                    properties: [
                        'details' => [
                            'Тапсырма' => $lockedTask->title,
                            'Пікір' => $comment,
                            'Құжаттар саны' => count($documents),
                            'Фотолар саны' => count($photos),
                        ],
                    ],
                    actor: $submitter
                );

                return $completion;
            });
        } catch (Throwable $exception) {
            $this->deletePrivateFiles($storedPaths);

            throw $exception;
        }
    }

    /**
     * @param  array<int, UploadedFile>  $documents
     * @param  array<int, UploadedFile>  $photos
     */
    public function submitSubsoil(
        SubsoilTask $task,
        User $submitter,
        ?string $comment,
        array $documents,
        array $photos
    ): SubsoilTaskCompletion {
        $storedPaths = [];

        try {
            return DB::transaction(function () use (
                $task,
                $submitter,
                $comment,
                $documents,
                $photos,
                &$storedPaths
            ): SubsoilTaskCompletion {
                $lockedTask = SubsoilTask::query()
                    ->whereKey($task->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                abort_unless(
                    in_array($lockedTask->status, ['new', 'rejected'], true),
                    409,
                    'Бұл тапсырма бойынша орындалу нәтижесі жіберіліп қойған.'
                );
                abort_if(
                    $lockedTask->completions()
                        ->where('status', 'pending')
                        ->exists(),
                    409,
                    'Бұл тапсырманың тексеруді күтіп тұрған нәтижесі бар.'
                );

                $completion = SubsoilTaskCompletion::create([
                    'task_id' => $lockedTask->id,
                    'submitted_by' => $submitter->id,
                    'comment' => $comment,
                    'status' => 'pending',
                ]);

                $this->storeFiles(
                    $completion,
                    $documents,
                    $photos,
                    'subsoil-task-completions',
                    $storedPaths
                );

                $lockedTask->update(['status' => 'in_progress']);

                $this->notifySubmission(
                    $lockedTask,
                    $completion,
                    $submitter,
                    count($documents),
                    count($photos)
                );

                return $completion;
            });
        } catch (Throwable $exception) {
            $this->deletePrivateFiles($storedPaths);

            throw $exception;
        }
    }

    public function reviewProject(
        InvestmentProject $project,
        ProjectTask $task,
        TaskCompletion $completion,
        User $reviewer,
        string $status,
        ?string $comment
    ): void {
        $copiedPaths = [];

        try {
            DB::transaction(function () use (
                $project,
                $task,
                $completion,
                $reviewer,
                $status,
                $comment,
                &$copiedPaths
            ): void {
                $lockedCompletion = TaskCompletion::query()
                    ->whereKey($completion->id)
                    ->where('task_id', $task->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                abort_unless(
                    $lockedCompletion->status === 'pending',
                    409,
                    'Бұл нәтиже бұған дейін тексерілген.'
                );

                $lockedTask = ProjectTask::query()
                    ->whereKey($task->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $lockedCompletion->update([
                    'status' => $status,
                    'reviewer_comment' => $comment,
                    'reviewed_by' => $reviewer->id,
                    'reviewed_at' => now(),
                ]);

                ProjectTaskEvent::create([
                    'task_id' => $lockedTask->id,
                    'user_id' => $reviewer->id,
                    'type' => $status === 'approved'
                        ? 'completion_approved'
                        : 'completion_rejected',
                    'comment' => $comment,
                ]);

                if ($status === 'approved') {
                    $lockedTask->update(['status' => 'done']);
                    $this->copyProjectDocuments(
                        $lockedCompletion,
                        $project,
                        $lockedTask,
                        $copiedPaths
                    );
                } else {
                    $lockedTask->update(['status' => 'rejected']);
                }

                $this->notifyReview(
                    $lockedTask,
                    $lockedCompletion,
                    $reviewer,
                    $status,
                    $comment
                );

                $statusLabel = $status === 'approved'
                    ? 'қабылданды'
                    : 'қабылданбады';
                KpiLog::activity(
                    projectId: $project->id,
                    event: $status === 'approved'
                        ? 'completion.approved'
                        : 'completion.rejected',
                    category: 'completion',
                    action: 'Тапсырма нәтижесі '.$statusLabel.': "'
                        .$lockedTask->title.'"',
                    subject: $lockedCompletion,
                    properties: [
                        'project_name' => $project->name,
                        'details' => [
                            'Тапсырма' => $lockedTask->title,
                            'Шешім' => $status,
                            'Тексеруші пікірі' => $comment,
                        ],
                    ],
                    actor: $reviewer
                );
            });
        } catch (Throwable $exception) {
            $this->deletePrivateFiles($copiedPaths);

            throw $exception;
        }
    }

    public function reviewSubsoil(
        SubsoilUser $subsoilUser,
        SubsoilTask $task,
        SubsoilTaskCompletion $completion,
        User $reviewer,
        string $status,
        ?string $comment
    ): void {
        $copiedPaths = [];

        try {
            DB::transaction(function () use (
                $subsoilUser,
                $task,
                $completion,
                $reviewer,
                $status,
                $comment,
                &$copiedPaths
            ): void {
                $lockedCompletion = SubsoilTaskCompletion::query()
                    ->whereKey($completion->id)
                    ->where('task_id', $task->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                abort_unless(
                    $lockedCompletion->status === 'pending',
                    409,
                    'Бұл нәтиже бұған дейін тексерілген.'
                );

                $lockedTask = SubsoilTask::query()
                    ->whereKey($task->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $lockedCompletion->update([
                    'status' => $status,
                    'reviewer_comment' => $comment,
                    'reviewed_by' => $reviewer->id,
                    'reviewed_at' => now(),
                ]);

                if ($status === 'approved') {
                    $lockedTask->update(['status' => 'done']);
                    $this->copySubsoilDocuments(
                        $lockedCompletion,
                        $subsoilUser,
                        $lockedTask,
                        $copiedPaths
                    );
                } else {
                    $lockedTask->update(['status' => 'rejected']);
                }

                $this->notifyReview(
                    $lockedTask,
                    $lockedCompletion,
                    $reviewer,
                    $status,
                    $comment
                );
            });
        } catch (Throwable $exception) {
            $this->deletePrivateFiles($copiedPaths);

            throw $exception;
        }
    }

    /**
     * @param  TaskCompletion|SubsoilTaskCompletion  $completion
     * @param  array<int, UploadedFile>  $documents
     * @param  array<int, UploadedFile>  $photos
     * @param  array<int, string>  $storedPaths
     */
    private function storeFiles(
        Model $completion,
        array $documents,
        array $photos,
        string $directory,
        array &$storedPaths
    ): void {
        foreach ([
            'document' => $documents,
            'photo' => $photos,
        ] as $type => $uploads) {
            foreach ($uploads as $file) {
                $path = $file->store($directory, 'local');

                if (! is_string($path)) {
                    throw new RuntimeException(
                        'The completion file could not be stored.'
                    );
                }

                $storedPaths[] = $path;
                $completion->files()->create([
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'type' => $type,
                ]);
            }
        }
    }

    private function notifySubmission(
        ProjectTask|SubsoilTask $task,
        TaskCompletion|SubsoilTaskCompletion $completion,
        User $submitter,
        int $documentCount,
        int $photoCount
    ): void {
        $recipientIds = collect([$task->created_by])
            ->merge(
                User::query()
                    ->whereHas(
                        'roleModel',
                        fn ($query) => $query->where('name', 'superadmin')
                    )
                    ->pluck('id')
            )
            ->filter()
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->reject(
                static fn (int $id): bool => $id === (int) $submitter->id
            )
            ->values();

        if ($recipientIds->isEmpty()) {
            return;
        }

        $fileParts = [];
        if ($documentCount > 0) {
            $fileParts[] = "{$documentCount} құжат";
        }
        if ($photoCount > 0) {
            $fileParts[] = "{$photoCount} фото";
        }
        $fileSummary = $fileParts === []
            ? ''
            : ' ('.implode(', ', $fileParts).')';
        $submitterName = $submitter->full_name ?? 'Орындаушы';
        $timestamp = now();

        $rows = $recipientIds->map(function (int $userId) use (
            $task,
            $completion,
            $submitterName,
            $fileSummary,
            $timestamp
        ): array {
            $isProjectTask = $task instanceof ProjectTask;

            return [
                'user_id' => $userId,
                'task_id' => $isProjectTask ? $task->id : null,
                'subsoil_task_id' => $isProjectTask ? null : $task->id,
                'completion_id' => $isProjectTask ? $completion->id : null,
                'subsoil_completion_id' => $isProjectTask
                    ? null
                    : $completion->id,
                'type' => 'completion_submitted',
                'message' => "{$submitterName} тапсырманы орындады: "
                    ."\"{$task->title}\"{$fileSummary}. Тексеру қажет.",
                'is_read' => false,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];
        })->all();

        // Create each notification through Eloquent so the notification
        // observer can send the corresponding Telegram message.
        foreach ($rows as $row) {
            TaskNotification::create($row);
        }
    }

    private function notifyReview(
        ProjectTask|SubsoilTask $task,
        TaskCompletion|SubsoilTaskCompletion $completion,
        User $reviewer,
        string $status,
        ?string $comment
    ): void {
        if ((int) $completion->submitted_by === (int) $reviewer->id) {
            return;
        }

        $isApproved = $status === 'approved';
        $isProjectTask = $task instanceof ProjectTask;
        $reviewerName = $reviewer->full_name ?? 'Тексеруші';
        $reason = ! $isApproved && $comment
            ? ' Себебі: '.$comment
            : '';

        TaskNotification::create([
            'user_id' => $completion->submitted_by,
            'task_id' => $isProjectTask ? $task->id : null,
            'subsoil_task_id' => $isProjectTask ? null : $task->id,
            'completion_id' => $isProjectTask ? $completion->id : null,
            'subsoil_completion_id' => $isProjectTask
                ? null
                : $completion->id,
            'type' => $isApproved
                ? 'completion_approved'
                : 'completion_rejected',
            'message' => $isApproved
                ? "{$reviewerName} тапсырманы қабылдады: \"{$task->title}\"."
                : "{$reviewerName} тапсырманы қабылдамады: "
                    ."\"{$task->title}\". Қайта орындаңыз.{$reason}",
        ]);
    }

    /**
     * @param  array<int, string>  $copiedPaths
     */
    private function copyProjectDocuments(
        TaskCompletion $completion,
        InvestmentProject $project,
        ProjectTask $task,
        array &$copiedPaths
    ): void {
        foreach ($completion->files()->where('type', 'document')->get() as $file) {
            $extension = pathinfo($file->file_name, PATHINFO_EXTENSION);
            $newPath = 'project-documents/'.$project->id.'/'.Str::uuid()
                .($extension !== '' ? '.'.$extension : '');

            if (! $this->files->copyToPrivate($file->file_path, $newPath)) {
                throw new RuntimeException(
                    "Completion file [{$file->id}] could not be copied."
                );
            }

            $copiedPaths[] = $newPath;
            ProjectDocument::create([
                'project_id' => $project->id,
                'name' => $file->file_name.' (Тапсырма: '.$task->title.')',
                'file_path' => $newPath,
                'type' => $extension ?: 'document',
                'is_completed' => true,
                'uploaded_by' => $completion->submitted_by,
                'source' => 'task_completion',
                'source_task_id' => $task->id,
                'source_completion_id' => $completion->id,
                'source_task_title' => $task->title,
                'task_assigned_at' => $task->created_at,
                'task_assigned_by' => $task->created_by,
                'submitted_at' => $completion->created_at,
                'approved_by' => $completion->reviewed_by,
                'approved_at' => $completion->reviewed_at,
            ]);
        }
    }

    /**
     * @param  array<int, string>  $copiedPaths
     */
    private function copySubsoilDocuments(
        SubsoilTaskCompletion $completion,
        SubsoilUser $subsoilUser,
        SubsoilTask $task,
        array &$copiedPaths
    ): void {
        foreach ($completion->files()->where('type', 'document')->get() as $file) {
            $extension = pathinfo($file->file_name, PATHINFO_EXTENSION);
            $newPath = 'subsoil-documents/'.$subsoilUser->id.'/'.Str::uuid()
                .($extension !== '' ? '.'.$extension : '');

            if (! $this->files->copyToPrivate($file->file_path, $newPath)) {
                throw new RuntimeException(
                    "Completion file [{$file->id}] could not be copied."
                );
            }

            $copiedPaths[] = $newPath;
            SubsoilDocument::create([
                'subsoil_user_id' => $subsoilUser->id,
                'name' => $file->file_name.' (Тапсырма: '.$task->title.')',
                'file_path' => $newPath,
                'type' => $extension ?: 'document',
                'is_completed' => true,
                'uploaded_by' => $completion->submitted_by,
                'source' => 'task_completion',
                'source_task_id' => $task->id,
                'source_completion_id' => $completion->id,
                'source_task_title' => $task->title,
                'task_assigned_at' => $task->created_at,
                'task_assigned_by' => $task->created_by,
                'submitted_at' => $completion->created_at,
                'approved_by' => $completion->reviewed_by,
                'approved_at' => $completion->reviewed_at,
            ]);
        }
    }

    /**
     * @param  array<int, string>  $paths
     */
    private function deletePrivateFiles(array $paths): void
    {
        if ($paths !== []) {
            Storage::disk('local')->delete($paths);
        }
    }
}
