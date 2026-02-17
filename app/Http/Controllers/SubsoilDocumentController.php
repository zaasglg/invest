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
        $documents = $subsoilUser->documents()->latest()->get();

        return Inertia::render('subsoil-users/documents', [
            'subsoilUser' => $subsoilUser->load('region'),
            'documents' => $documents,
        ]);
    }

    public function store(Request $request, SubsoilUser $subsoilUser)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'file' => 'required|file|max:10240',
            'type' => 'nullable|string|max:100',
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('subsoil-documents/' . $subsoilUser->id, 'public');

            SubsoilDocument::create([
                'subsoil_user_id' => $subsoilUser->id,
                'name' => $validated['name'],
                'file_path' => $path,
                'type' => $request->input('type') ?? $file->getClientOriginalExtension(),
            ]);
        }

        return redirect()->back()->with('success', 'Документ загружен.');
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

        return redirect()->back()->with('success', 'Документ удален.');
    }
}
