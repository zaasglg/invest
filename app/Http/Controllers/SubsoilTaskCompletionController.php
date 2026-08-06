<?php

namespace App\Http\Controllers;

use App\Models\SubsoilTask;
use App\Models\SubsoilTaskCompletion;
use App\Models\SubsoilTaskCompletionFile;
use App\Models\SubsoilUser;
use App\Services\CompletionWorkflowService;
use App\Services\PrivateFileService;
use App\Services\SectorActivityLogService;
use Illuminate\Http\Request;

class SubsoilTaskCompletionController extends Controller
{
    public function __construct(
        private readonly PrivateFileService $files,
        private readonly CompletionWorkflowService $workflow,
        private readonly SectorActivityLogService $activity
    ) {}

    public function store(
        Request $request,
        SubsoilUser $subsoilUser,
        SubsoilTask $task
    ) {
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);

        $user = $request->user();
        abort_unless(
            $user && (int) $task->assigned_to === (int) $user->id,
            403,
            'Сіз бұл тапсырманы орындауға құқығыңыз жоқ.'
        );

        $validated = $request->validate([
            'comment' => 'nullable|string|max:2000',
            'documents' => 'nullable|array|max:10',
            'documents.*' => [
                'file',
                'max:20480',
                'mimes:'.PrivateFileService::DOCUMENT_MIMES,
            ],
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:20480',
        ]);

        $documents = $request->file('documents', []);
        $photos = $request->file('photos', []);
        $this->workflow->ensureUploadBudget($documents, $photos);
        $completion = $this->workflow->submitSubsoil(
            $task,
            $user,
            $validated['comment'] ?? null,
            $documents,
            $photos
        );

        $this->activity->record(
            auditable: $subsoilUser,
            event: 'completion.submitted',
            category: 'completion',
            action: 'Тапсырма нәтижесі тексеруге жіберілді: "'
                .$task->title.'"',
            subject: $completion,
            properties: [
                'details' => [
                    'Тапсырма' => $task->title,
                    'Пікір' => $validated['comment'] ?? null,
                    'Құжат саны' => count($documents),
                    'Фото саны' => count($photos),
                    'Күйі' => 'pending',
                ],
            ],
            actor: $user
        );

        return back()->with(
            'success',
            'Тапсырма орындалды және тексеруге жіберілді.'
        );
    }

    public function previewFile(
        SubsoilUser $subsoilUser,
        SubsoilTask $task,
        SubsoilTaskCompletion $completion,
        SubsoilTaskCompletionFile $file
    ) {
        $this->ensureFileBelongsToSubsoil(
            $subsoilUser,
            $task,
            $completion,
            $file
        );
        abort_unless($file->type === 'photo', 404);

        $this->activity->record(
            auditable: $subsoilUser,
            event: 'completion.file_previewed',
            category: 'download',
            action: 'Орындалу нәтижесінің фотосы ашылды',
            subject: $file,
            properties: [
                'details' => [
                    'Тапсырма' => $task->title,
                    'Файл атауы' => $file->file_name,
                ],
            ]
        );

        return $this->files->inline($file->file_path, $file->file_name);
    }

    public function downloadFile(
        SubsoilUser $subsoilUser,
        SubsoilTask $task,
        SubsoilTaskCompletion $completion,
        SubsoilTaskCompletionFile $file
    ) {
        $this->ensureFileBelongsToSubsoil(
            $subsoilUser,
            $task,
            $completion,
            $file
        );

        $this->activity->record(
            auditable: $subsoilUser,
            event: 'completion.file_downloaded',
            category: 'download',
            action: 'Орындалу нәтижесінің файлы жүктелді',
            subject: $file,
            properties: [
                'details' => [
                    'Тапсырма' => $task->title,
                    'Файл атауы' => $file->file_name,
                    'Файл түрі' => $file->type,
                ],
            ]
        );

        return $this->files->download($file->file_path, $file->file_name);
    }

    public function review(
        Request $request,
        SubsoilUser $subsoilUser,
        SubsoilTask $task,
        SubsoilTaskCompletion $completion
    ) {
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);
        abort_if($completion->task_id !== $task->id, 404);

        $user = $request->user();
        abort_unless(
            in_array(
                $user?->roleModel?->name,
                ['superadmin', 'invest'],
                true
            ),
            403,
            'Сізде тапсырма нәтижесін тексеру құқығы жоқ.'
        );
        abort_if(
            (int) $completion->submitted_by === (int) $user?->id,
            403,
            'Өзіңіз жіберген нәтижені тексере алмайсыз.'
        );

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'reviewer_comment' => 'nullable|string|max:2000',
        ]);

        $this->workflow->reviewSubsoil(
            $subsoilUser,
            $task,
            $completion,
            $user,
            $validated['status'],
            $validated['reviewer_comment'] ?? null
        );

        $statusLabel = $validated['status'] === 'approved'
            ? 'қабылданды'
            : 'қабылданбады';
        $this->activity->record(
            auditable: $subsoilUser,
            event: $validated['status'] === 'approved'
                ? 'completion.approved'
                : 'completion.rejected',
            category: 'completion',
            action: 'Тапсырма нәтижесі '.$statusLabel.': "'
                .$task->title.'"',
            subject: $completion,
            properties: [
                'details' => [
                    'Тапсырма' => $task->title,
                    'Шешім' => $validated['status'],
                    'Тексеруші пікірі' => $validated['reviewer_comment']
                        ?? null,
                ],
            ],
            actor: $user
        );

        return back()->with('success', 'Тексеру нәтижесі сақталды.');
    }

    private function ensureFileBelongsToSubsoil(
        SubsoilUser $subsoilUser,
        SubsoilTask $task,
        SubsoilTaskCompletion $completion,
        SubsoilTaskCompletionFile $file
    ): void {
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);
        abort_if($completion->task_id !== $task->id, 404);
        abort_if($file->completion_id !== $completion->id, 404);
    }
}
