<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProjectDocumentController extends Controller
{
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
            'ispolnitelCanWrite' => $this->ispolnitelCanWrite($user, $investmentProject),
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

        if (! Storage::disk('public')->exists($document->file_path)) {
            abort(404, 'Файл табылмады.');
        }

        return Storage::disk('public')->download(
            $document->file_path,
            $document->name.'.'.$document->type
        );
    }

    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'file' => 'required|file|max:10240', // 10MB max
            'type' => 'nullable|string|max:100',
            'is_completed' => 'nullable|boolean',
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('project-documents/'.$investmentProject->id, 'public');

            ProjectDocument::create([
                'project_id' => $investmentProject->id,
                'name' => $validated['name'],
                'file_path' => $path,
                'type' => $request->input('type') ?? $file->getClientOriginalExtension(),
                'is_completed' => $request->boolean('is_completed', false),
            ]);
        }

        KpiLog::log($investmentProject->id, 'Құжат жүктелді: "' . $validated['name'] . '"');

        return redirect()->back()->with('success', 'Құжат жүктелді.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectDocument $document)
    {
        $user = Auth::user();

        // Ispolnitel cannot delete documents
        if ($user->roleModel?->name === 'ispolnitel') {
            abort(403, 'Сізге құжатты жоюға рұқсат жоқ.');
        }

        if ($document->project_id !== $investmentProject->id) {
            abort(404);
        }

        // Delete file from storage
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        KpiLog::log($investmentProject->id, 'Құжат жойылды: "' . $document->name . '"');

        return redirect()->back()->with('success', 'Құжат жойылды.');
    }

    private function ispolnitelCanWrite($user, InvestmentProject $project): bool
    {
        if ($user->roleModel?->name !== 'ispolnitel') {
            return false;
        }

        if (! $user->isInvolvedInProject($project)) {
            return false;
        }

        // Both district and oblast ispolnitel have the same write permissions
        return true;
    }
}
