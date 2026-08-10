<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectTask;
use App\Models\TaskCompletion;
use App\Models\TaskCompletionFile;
use App\Services\CompletionWorkflowService;
use App\Services\PrivateFileService;
use Illuminate\Http\Request;

class TaskCompletionController extends Controller
{
    public function __construct(
        private readonly PrivateFileService $files,
        private readonly CompletionWorkflowService $workflow
    ) {}

    public function store(
        Request $request,
        InvestmentProject $investmentProject,
        ProjectTask $task
    ) {
        abort_if($task->project_id !== $investmentProject->id, 404);

        $user = $request->user();
        abort_unless(
            $user && (int) $task->assigned_to === (int) $user->id,
            403,
            'Сіз бұл тапсырманы орындауға құқығыңыз жоқ.'
        );
        abort_unless(
            ($task->approval_status ?? 'approved') === 'approved',
            403,
            'Бұл тапсырма әлі расталмаған.'
        );

        $validated = $request->validate([
            'comment' => 'nullable|string|max:2000',
            'documents' => 'required|array|min:1|max:10',
            'documents.*' => [
                'required',
                'file',
                'max:20480',
                'mimes:'.CompletionWorkflowService::PROJECT_DOCUMENT_MIMES,
            ],
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:20480',
        ], [
            'documents.required' => CompletionWorkflowService::PROJECT_DOCUMENT_REQUIRED_MESSAGE,
            'documents.min' => CompletionWorkflowService::PROJECT_DOCUMENT_REQUIRED_MESSAGE,
            'documents.*.required' => CompletionWorkflowService::PROJECT_DOCUMENT_REQUIRED_MESSAGE,
            'documents.*.mimes' => 'Құжат PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP немесе RAR форматында болуы керек. Суретті «Суреттер» бөліміне жүктеңіз.',
        ]);

        $documents = $request->file('documents', []);
        $photos = $request->file('photos', []);
        $this->workflow->ensureUploadBudget($documents, $photos);
        $this->workflow->submitProject(
            $task,
            $user,
            $validated['comment'] ?? null,
            $documents,
            $photos
        );

        return back()->with(
            'success',
            'Тапсырма орындалды және тексеруге жіберілді.'
        );
    }

    public function previewFile(
        InvestmentProject $investmentProject,
        ProjectTask $task,
        TaskCompletion $completion,
        TaskCompletionFile $file
    ) {
        $this->ensureFileBelongsToProject(
            $investmentProject,
            $task,
            $completion,
            $file
        );
        abort_unless($file->type === 'photo', 404);
        abort_unless(
            request()->user()?->canDownloadFromProject($investmentProject),
            403,
            'Сізде бұл файлды көруге рұқсат жоқ.'
        );

        return $this->files->inline($file->file_path, $file->file_name);
    }

    public function downloadFile(
        InvestmentProject $investmentProject,
        ProjectTask $task,
        TaskCompletion $completion,
        TaskCompletionFile $file
    ) {
        $this->ensureFileBelongsToProject(
            $investmentProject,
            $task,
            $completion,
            $file
        );
        abort_unless(
            request()->user()?->canDownloadFromProject($investmentProject),
            403,
            'Сізде бұл файлды жүктеуге рұқсат жоқ.'
        );

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'download.completion_file',
            category: 'download',
            action: 'Тапсырма нәтижесінің файлы жүктелді: "'
                .$file->file_name.'"',
            subject: $file,
            properties: [
                'project_name' => $investmentProject->name,
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
        InvestmentProject $investmentProject,
        ProjectTask $task,
        TaskCompletion $completion
    ) {
        abort_if($task->project_id !== $investmentProject->id, 404);
        abort_if($completion->task_id !== $task->id, 404);

        $user = $request->user();
        abort_unless(
            in_array(
                $user?->roleModel?->name,
                ['superadmin', 'invest', 'moderator'],
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

        $this->workflow->reviewProject(
            $investmentProject,
            $task,
            $completion,
            $user,
            $validated['status'],
            $validated['reviewer_comment'] ?? null
        );

        return back()->with('success', 'Тексеру нәтижесі сақталды.');
    }

    private function ensureFileBelongsToProject(
        InvestmentProject $project,
        ProjectTask $task,
        TaskCompletion $completion,
        TaskCompletionFile $file
    ): void {
        abort_if($task->project_id !== $project->id, 404);
        abort_if($completion->task_id !== $task->id, 404);
        abort_if($file->completion_id !== $completion->id, 404);
    }
}
