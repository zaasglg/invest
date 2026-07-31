<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectDocument;
use App\Services\PrivateFileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProjectDocumentController extends Controller
{
    public function __construct(
        private readonly PrivateFileService $files
    ) {}

    public function index(InvestmentProject $investmentProject)
    {
        $user = Auth::user();

        // Ispolnitel who is not involved cannot access documents page
        if ($user->roleModel?->name === 'ispolnitel' && ! $user->isInvolvedInProject($investmentProject)) {
            abort(403, 'Сіз бұл жобаға қатыспайсыз.');
        }

        $canDownload = $user->canDownloadFromProject($investmentProject);

        $completedDocuments = $investmentProject->documents()
            ->where('is_completed', true)
            ->latest()
            ->get();

        $documents = $investmentProject->documents()
            ->where('is_completed', false)
            ->latest()
            ->get();

        return Inertia::render('investment-projects/documents', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'completedDocuments' => $completedDocuments,
            'documents' => $documents,
            'canDownload' => $canDownload,
            'participantCanCreate' => $this->participantCanCreate(
                $user,
                $investmentProject
            ),
        ]);
    }

    public function download(InvestmentProject $investmentProject, ProjectDocument $document)
    {
        if ($document->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();

        if (! $user->canDownloadFromProject($investmentProject)) {
            abort(403, 'Сіздің бұл жобаның құжаттарына қол жеткізуіңіз жоқ.');
        }

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'download.document',
            category: 'download',
            action: 'Құжат жүктелді: "'.$document->name.'"',
            subject: $document,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Құжат атауы' => $document->name,
                    'Құжат түрі' => $document->type,
                ],
            ]
        );

        return $this->files->download(
            $document->file_path,
            $this->files->downloadName($document->name, $document->file_path)
        );
    }

    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $user = Auth::user();

        $this->ensureCanUploadDocuments($user, $investmentProject);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimes:'.PrivateFileService::DOCUMENT_MIMES,
            ],
            'type' => 'nullable|string|max:100',
            'is_completed' => 'nullable|boolean',
        ]);

        $isCompleted = $request->boolean('is_completed', false);

        if (in_array(
            $user->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        )) {
            $isCompleted = false;
        }

        $document = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store(
                'project-documents/'.$investmentProject->id,
                'local'
            );

            $document = ProjectDocument::create([
                'project_id' => $investmentProject->id,
                'name' => $validated['name'],
                'file_path' => $path,
                'type' => $request->input('type') ?? $file->getClientOriginalExtension(),
                'is_completed' => $isCompleted,
            ]);
        }

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'document.uploaded',
            category: 'document',
            action: 'Құжат қосылды: "'.$validated['name'].'"',
            subject: $document,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Құжат атауы' => $validated['name'],
                    'Құжат түрі' => $document?->type,
                    'Аяқталған құжат' => $isCompleted,
                ],
            ]
        );

        return redirect()->back()->with('success', 'Құжат жүктелді.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectDocument $document)
    {
        $user = Auth::user();

        // Project participants may add documents but cannot delete them.
        if (in_array(
            $user->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        )) {
            abort(403, 'Сізге құжатты жоюға рұқсат жоқ.');
        }

        if ($document->project_id !== $investmentProject->id) {
            abort(404);
        }

        $this->files->delete($document->file_path);

        $document->delete();

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'document.deleted',
            category: 'document',
            action: 'Құжат жойылды: "'.$document->name.'"',
            subject: $document,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Құжат атауы' => $document->name,
                    'Құжат түрі' => $document->type,
                    'Аяқталған құжат' => $document->is_completed,
                ],
            ]
        );

        return redirect()->back()->with('success', 'Құжат жойылды.');
    }

    private function participantCanCreate(
        $user,
        InvestmentProject $project
    ): bool {
        if (! in_array(
            $user->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        )) {
            return false;
        }

        if (! $user->isInvolvedInProject($project)) {
            return false;
        }

        // All ispolnitel types have the same write permissions
        return true;
    }

    private function ensureCanUploadDocuments($user, InvestmentProject $project): void
    {
        if (in_array(
            $user?->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        ) && ! $this->participantCanCreate($user, $project)) {
            abort(403, 'Сіз бұл жобаға құжат қоса алмайсыз.');
        }
    }
}
