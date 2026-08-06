<?php

namespace App\Http\Controllers;

use App\Models\SubsoilDocument;
use App\Models\SubsoilUser;
use App\Services\PrivateFileService;
use App\Services\SectorActivityLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubsoilDocumentController extends Controller
{
    private const AUDIT_RELATIONS = [
        'uploader:id,full_name',
        'approver:id,full_name',
        'taskAssigner:id,full_name',
        'deleter:id,full_name',
        'sourceTask:id,title,created_at',
    ];

    public function __construct(
        private readonly PrivateFileService $files,
        private readonly SectorActivityLogService $activity
    ) {}

    public function index(SubsoilUser $subsoilUser)
    {
        $completedDocuments = $subsoilUser->documents()
            ->where('is_completed', true)
            ->with(self::AUDIT_RELATIONS)
            ->latest()
            ->get();

        $documents = $subsoilUser->documents()
            ->where('is_completed', false)
            ->with(self::AUDIT_RELATIONS)
            ->latest()
            ->get();

        $user = request()->user();
        $isSuperadmin = $user?->roleModel?->name === 'superadmin';

        return Inertia::render('subsoil-users/documents', [
            'subsoilUser' => $subsoilUser->load('region'),
            'completedDocuments' => $completedDocuments,
            'documents' => $documents,
            'canMarkAsCompleted' => $isSuperadmin,
            'canViewDeleted' => $isSuperadmin,
            'deletedDocumentsCount' => $isSuperadmin
                ? $subsoilUser->allDocuments()
                    ->where('is_deleted', true)
                    ->count()
                : 0,
        ]);
    }

    public function deleted(SubsoilUser $subsoilUser)
    {
        $this->ensureSuperadmin(request()->user());

        $documents = $subsoilUser->allDocuments()
            ->where('is_deleted', true)
            ->with(self::AUDIT_RELATIONS)
            ->latest('deleted_at')
            ->get();

        return Inertia::render('subsoil-users/deleted-documents', [
            'subsoilUser' => $subsoilUser->load('region'),
            'documents' => $documents,
        ]);
    }

    public function store(Request $request, SubsoilUser $subsoilUser)
    {
        $user = $request->user();
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

        $isCompleted = $user?->roleModel?->name === 'superadmin'
            && $request->boolean('is_completed', false);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store(
                'subsoil-documents/'.$subsoilUser->id,
                'local'
            );

            $document = SubsoilDocument::create([
                'subsoil_user_id' => $subsoilUser->id,
                'name' => $validated['name'],
                'file_path' => $path,
                'type' => $validated['type'] ?? $file->getClientOriginalExtension(),
                'is_completed' => $isCompleted,
                'uploaded_by' => $user?->id,
                'source' => 'manual',
                'approved_by' => $isCompleted ? $user?->id : null,
                'approved_at' => $isCompleted ? now() : null,
            ]);

            $this->activity->record(
                auditable: $subsoilUser,
                event: 'document.uploaded',
                category: 'document',
                action: 'Құжат жүктелді: "'.$document->name.'"',
                subject: $document,
                properties: [
                    'details' => [
                        'Құжат атауы' => $document->name,
                        'Түрі' => $document->type,
                        'Орындалған құжат' => $document->is_completed,
                        'Дереккөзі' => $document->source,
                    ],
                ]
            );
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

        if ($document->is_deleted
            && request()->user()?->roleModel?->name !== 'superadmin') {
            abort(404);
        }

        $this->activity->record(
            auditable: $subsoilUser,
            event: 'document.downloaded',
            category: 'download',
            action: 'Құжат жүктелді: "'.$document->name.'"',
            subject: $document,
            properties: [
                'details' => [
                    'Құжат атауы' => $document->name,
                    'Түрі' => $document->type,
                    'Өшірілген құжат' => $document->is_deleted,
                ],
            ]
        );

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

        abort_if($document->is_deleted, 404);

        $document->update([
            'is_deleted' => true,
            'deleted_by' => request()->user()?->id,
            'deleted_at' => now(),
        ]);

        $this->activity->record(
            auditable: $subsoilUser,
            event: 'document.deleted',
            category: 'document',
            action: 'Құжат өшірілген құжаттар бөліміне жіберілді',
            subject: $document,
            properties: [
                'details' => [
                    'Құжат атауы' => $document->name,
                    'Түрі' => $document->type,
                    'Өшірілген уақыт' => $document->deleted_at,
                ],
            ]
        );

        return redirect()->back()->with(
            'success',
            'Құжат өшірілген құжаттар бөліміне жіберілді.'
        );
    }

    private function ensureSuperadmin($user): void
    {
        abort_unless(
            $user?->roleModel?->name === 'superadmin',
            403,
            'Өшірілген құжаттарды тек супер әкімші көре алады.'
        );
    }
}
