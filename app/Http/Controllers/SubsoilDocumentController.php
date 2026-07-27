<?php

namespace App\Http\Controllers;

use App\Models\SubsoilDocument;
use App\Models\SubsoilUser;
use App\Services\PrivateFileService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubsoilDocumentController extends Controller
{
    public function __construct(
        private readonly PrivateFileService $files
    ) {}

    public function index(SubsoilUser $subsoilUser)
    {
        $completedDocuments = $subsoilUser->documents()
            ->where('is_completed', true)->latest()->get();

        $documents = $subsoilUser->documents()
            ->where('is_completed', false)->latest()->get();

        return Inertia::render('subsoil-users/documents', [
            'subsoilUser' => $subsoilUser->load('region'),
            'completedDocuments' => $completedDocuments,
            'documents' => $documents,
        ]);
    }

    public function store(Request $request, SubsoilUser $subsoilUser)
    {
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

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store(
                'subsoil-documents/'.$subsoilUser->id,
                'local'
            );

            SubsoilDocument::create([
                'subsoil_user_id' => $subsoilUser->id,
                'name' => $validated['name'],
                'file_path' => $path,
                'type' => $request->input('type') ?? $file->getClientOriginalExtension(),
                'is_completed' => $request->boolean('is_completed'),
            ]);
        }

        return redirect()->back()->with('success', 'Құжат жүктелді.');
    }

    public function download(
        SubsoilUser $subsoilUser,
        SubsoilDocument $document
    ) {
        if ($document->subsoil_user_id !== $subsoilUser->id) {
            abort(404);
        }

        return $this->files->download(
            $document->file_path,
            $this->files->downloadName($document->name, $document->file_path)
        );
    }

    public function destroy(SubsoilUser $subsoilUser, SubsoilDocument $document)
    {
        if ($document->subsoil_user_id !== $subsoilUser->id) {
            abort(404);
        }

        $this->files->delete($document->file_path);

        $document->delete();

        return redirect()->back()->with('success', 'Құжат жойылды.');
    }
}
