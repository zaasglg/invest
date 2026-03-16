<?php

namespace App\Http\Controllers;

use App\Models\SubsoilDocument;
use App\Models\SubsoilUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SubsoilDocumentController extends Controller
{
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
            'file' => 'required|file|max:10240',
            'type' => 'nullable|string|max:100',
            'is_completed' => 'nullable|boolean',
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('subsoil-documents/'.$subsoilUser->id, 'public');

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

    public function destroy(SubsoilUser $subsoilUser, SubsoilDocument $document)
    {
        if ($document->subsoil_user_id !== $subsoilUser->id) {
            abort(404);
        }

        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return redirect()->back()->with('success', 'Құжат жойылды.');
    }
}
