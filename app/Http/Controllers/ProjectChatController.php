<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectChatAttachment;
use App\Services\ProjectChatService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Throwable;

class ProjectChatController extends Controller
{
    public function __construct(
        private readonly ProjectChatService $chatService
    ) {}

    public function index(
        Request $request,
        ?InvestmentProject $investmentProject = null
    ) {
        $user = $request->user();

        if ($investmentProject
            && ! $investmentProject->isChatParticipant($user)) {
            abort(403, 'Сіз бұл жоба чатының қатысушысы емессіз.');
        }

        $chatProjects = $this->chatService
            ->accessibleProjects($user)
            ->whereHas('chatMessages')
            ->with([
                'company:id,legal_form,name,bin',
                'region:id,name',
                'latestChatMessage.user:id,full_name,avatar',
                'latestChatMessage.attachments:id,project_chat_message_id,original_name',
            ])
            ->orderByDesc(
                \App\Models\ProjectChatMessage::select('created_at')
                    ->whereColumn(
                        'project_chat_messages.investment_project_id',
                        'investment_projects.id'
                    )
                    ->latest('created_at')
                    ->limit(1)
            )
            ->get();

        if (! $investmentProject && $chatProjects->isNotEmpty()) {
            $investmentProject = $chatProjects->first();
        }

        if ($investmentProject) {
            $this->chatService->markAsRead($investmentProject, $user);
        }

        $unreadCounts = $this->chatService->unreadCounts(
            $user,
            $chatProjects->pluck('id')
        );

        return Inertia::render('chats/index', [
            'chats' => $chatProjects->map(
                fn (InvestmentProject $project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'company_name' => $this->companyName($project),
                    'company_bin' => $project->company?->bin,
                    'region_name' => $project->region?->name,
                    'unread_count' => $unreadCounts->get($project->id, 0),
                    'last_message' => $project->latestChatMessage
                        ? [
                            'id' => $project->latestChatMessage->id,
                            'message' => $project->latestChatMessage->message,
                            'created_at' => $project
                                ->latestChatMessage
                                ->created_at
                                ->toISOString(),
                            'is_own' => $project
                                ->latestChatMessage
                                ->user_id === $user->id,
                            'user_name' => $project
                                ->latestChatMessage
                                ->user
                                ?->full_name,
                            'has_attachments' => $project
                                ->latestChatMessage
                                ->attachments
                                ->isNotEmpty(),
                            'attachment_name' => $project
                                ->latestChatMessage
                                ->attachments
                                ->first()
                                ?->original_name,
                        ]
                        : null,
                ]
            )->values(),
            'selectedChat' => $investmentProject
                ? $this->selectedChatData($investmentProject, $user->id)
                : null,
        ]);
    }

    public function store(
        Request $request,
        InvestmentProject $investmentProject
    ) {
        if (! $investmentProject->isChatParticipant($request->user())) {
            abort(403, 'Сіз бұл жоба чатының қатысушысы емессіз.');
        }

        $request->merge([
            'message' => trim((string) $request->input('message')),
        ]);

        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:5000'],
            'files' => ['nullable', 'array', 'max:8'],
            'files.*' => [
                'file',
                'max:20480',
                'mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip,rar',
            ],
        ]);

        $files = $request->file('files', []);

        if ($request->input('message') === '' && empty($files)) {
            throw ValidationException::withMessages([
                'message' => 'Хабарлама жазыңыз немесе файл тіркеңіз.',
            ]);
        }

        $storedPaths = [];

        DB::beginTransaction();

        try {
            $message = $investmentProject->chatMessages()->create([
                'user_id' => $request->user()->id,
                'message' => $validated['message'] ?? '',
            ]);

            foreach ($files as $file) {
                $extension = strtolower(
                    $file->getClientOriginalExtension()
                );
                $storedName = (string) Str::uuid()
                    .($extension !== '' ? '.'.$extension : '');
                $filePath = $file->storeAs(
                    'project-chats/'.$investmentProject->id,
                    $storedName,
                    'local'
                );

                if (! $filePath) {
                    throw new \RuntimeException(
                        'Чат файлын сақтау мүмкін болмады.'
                    );
                }

                $storedPaths[] = $filePath;

                $message->attachments()->create([
                    'original_name' => $file->getClientOriginalName(),
                    'file_path' => $filePath,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }

            KpiLog::activity(
                projectId: $investmentProject->id,
                event: 'chat.message_sent',
                category: 'chat',
                action: 'Жоба чатына хабарлама жіберілді',
                subject: $message,
                properties: [
                    'project_name' => $investmentProject->name,
                    'details' => [
                        'Хабарлама' => Str::limit(
                            $message->message,
                            160
                        ),
                        'Тіркемелер саны' => count($files),
                        'Тіркемелер' => collect($files)
                            ->map(
                                fn ($file) => $file->getClientOriginalName()
                            )
                            ->values()
                            ->all(),
                    ],
                ],
                actor: $request->user()
            );

            DB::commit();
        } catch (Throwable $exception) {
            DB::rollBack();
            Storage::disk('local')->delete($storedPaths);

            throw $exception;
        }

        $this->chatService->markAsRead($investmentProject, $request->user());

        return redirect()
            ->route('chats.index', $investmentProject)
            ->with('success', 'Хабарлама жіберілді.');
    }

    public function downloadAttachment(
        Request $request,
        ProjectChatAttachment $attachment
    ) {
        $this->ensureAttachmentAccess($request, $attachment);

        if (! Storage::disk('local')->exists($attachment->file_path)) {
            abort(404, 'Файл табылмады.');
        }

        $project = $attachment->message->project;
        KpiLog::activity(
            projectId: $project->id,
            event: 'download.chat_attachment',
            category: 'download',
            action: 'Чат тіркемесі жүктелді: "'
                .$attachment->original_name.'"',
            subject: $attachment,
            properties: [
                'project_name' => $project->name,
                'details' => [
                    'Файл атауы' => $attachment->original_name,
                    'Файл көлемі' => $attachment->size,
                ],
            ],
            actor: $request->user()
        );

        return Storage::disk('local')->download(
            $attachment->file_path,
            $attachment->original_name
        );
    }

    public function previewAttachment(
        Request $request,
        ProjectChatAttachment $attachment
    ) {
        $this->ensureAttachmentAccess($request, $attachment);

        if (! str_starts_with($attachment->mime_type ?? '', 'image/')) {
            abort(404);
        }

        if (! Storage::disk('local')->exists($attachment->file_path)) {
            abort(404, 'Файл табылмады.');
        }

        return Storage::disk('local')->response(
            $attachment->file_path,
            $attachment->original_name,
            ['Content-Disposition' => 'inline']
        );
    }

    public function unreadCount(Request $request)
    {
        return response()->json([
            'count' => $this->chatService->unreadMessageCount(
                $request->user()
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function selectedChatData(
        InvestmentProject $project,
        int $currentUserId
    ): array {
        $project->loadMissing([
            'company:id,legal_form,name,bin',
            'region:id,name',
        ]);

        $messages = $project->chatMessages()
            ->with([
                'user:id,full_name,avatar',
                'attachments',
            ])
            ->latest('id')
            ->limit(200)
            ->get()
            ->reverse()
            ->values()
            ->map(fn ($message) => [
                'id' => $message->id,
                'message' => $message->message,
                'created_at' => $message->created_at->toISOString(),
                'is_own' => $message->user_id === $currentUserId,
                'user' => [
                    'id' => $message->user->id,
                    'full_name' => $message->user->full_name,
                    'avatar_url' => $message->user->avatar_url,
                ],
                'attachments' => $message->attachments->map(
                    fn (ProjectChatAttachment $attachment) => [
                        'id' => $attachment->id,
                        'original_name' => $attachment->original_name,
                        'mime_type' => $attachment->mime_type,
                        'size' => $attachment->size,
                        'is_image' => str_starts_with(
                            $attachment->mime_type ?? '',
                            'image/'
                        ),
                        'download_url' => route(
                            'chats.attachments.download',
                            $attachment
                        ),
                        'preview_url' => str_starts_with(
                            $attachment->mime_type ?? '',
                            'image/'
                        )
                            ? route(
                                'chats.attachments.preview',
                                $attachment
                            )
                            : null,
                    ]
                )->values(),
            ]);

        $participants = $this->chatService->participants($project);

        return [
            'id' => $project->id,
            'name' => $project->name,
            'company_name' => $this->companyName($project),
            'company_bin' => $project->company?->bin,
            'region_name' => $project->region?->name,
            'participants' => $participants,
            'participant_count' => $participants->count(),
            'messages' => $messages,
        ];
    }

    private function companyName(InvestmentProject $project): ?string
    {
        return $project->company?->display_name
            ?? $project->company_name;
    }

    private function ensureAttachmentAccess(
        Request $request,
        ProjectChatAttachment $attachment
    ): void {
        $attachment->loadMissing('message.project');
        $project = $attachment->message?->project;

        if (! $project
            || ! $project->isChatParticipant($request->user())) {
            abort(403, 'Сізге бұл чат файлын көруге рұқсат жоқ.');
        }
    }
}
