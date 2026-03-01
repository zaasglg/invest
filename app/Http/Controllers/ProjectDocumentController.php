<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class ProjectDocumentController extends Controller
{
    public function index(InvestmentProject $investmentProject)
    {
        $user = Auth::user();
        $canDownload = $user->canDownloadFromProject($investmentProject);

        // Baskarma who is not involved in the project cannot see documents
        if ($user->roleModel?->name === 'baskarma' && ! $user->isInvolvedInProject($investmentProject)) {
            $completedDocuments = collect();
            $documents = collect();
        } else {
            $completedDocuments = $investmentProject->documents()
                ->where('is_completed', true)
                ->latest()
                ->get();

            $documents = $investmentProject->documents()
                ->where('is_completed', false)
                ->latest()
                ->get();
        }

        return Inertia::render('investment-projects/documents', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'completedDocuments' => $completedDocuments,
            'documents' => $documents,
            'canDownload' => $canDownload,
        ]);
    }

    public function download(InvestmentProject $investmentProject, ProjectDocument $document)
    {
        if ($document->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();

        if (! $user->canDownloadFromProject($investmentProject)) {
            abort(403, 'Сізде осы проекттің документтерін жүктеуге рұқсат жоқ.');
        }

        if (! Storage::disk('public')->exists($document->file_path)) {
            abort(404, 'Файл табылмады.');
        }

        return Storage::disk('public')->download(
            $document->file_path,
            $document->name . '.' . $document->type
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
            $path = $file->store('project-documents/' . $investmentProject->id, 'public');

            ProjectDocument::create([
                'project_id' => $investmentProject->id,
                'name' => $validated['name'],
                'file_path' => $path,
                'type' => $request->input('type') ?? $file->getClientOriginalExtension(),
                'is_completed' => $request->boolean('is_completed', false),
            ]);
        }

        return redirect()->back()->with('success', 'Документ загружен.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectDocument $document)
    {
        if ($document->project_id !== $investmentProject->id) {
            abort(404);
        }

        // Delete file from storage
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return redirect()->back()->with('success', 'Документ удален.');
    }
}
