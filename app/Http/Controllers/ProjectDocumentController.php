<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class ProjectDocumentController extends Controller
{
    public function index(InvestmentProject $investmentProject)
    {
        $documents = $investmentProject->documents()->latest()->get();

        return Inertia::render('investment-projects/documents', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'documents' => $documents,
        ]);
    }

    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'file' => 'required|file|max:10240', // 10MB max
            'type' => 'nullable|string|max:100',
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('project-documents/' . $investmentProject->id, 'public');

            ProjectDocument::create([
                'project_id' => $investmentProject->id,
                'name' => $validated['name'],
                'file_path' => $path,
                'type' => $request->input('type') ?? $file->getClientOriginalExtension(),
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
