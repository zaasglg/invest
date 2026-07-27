<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Services\ProjectChatService;
use Illuminate\Http\Request;
use Inertia\Inertia;

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
                'region:id,name',
                'latestChatMessage.user:id,full_name,avatar',
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
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $investmentProject->chatMessages()->create([
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
        ]);

        $this->chatService->markAsRead($investmentProject, $request->user());

        return redirect()
            ->route('chats.index', $investmentProject)
            ->with('success', 'Хабарлама жіберілді.');
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
        $project->loadMissing('region:id,name');

        $messages = $project->chatMessages()
            ->with('user:id,full_name,avatar')
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
            ]);

        $participants = $this->chatService->participants($project);

        return [
            'id' => $project->id,
            'name' => $project->name,
            'company_name' => $project->company_name,
            'region_name' => $project->region?->name,
            'participants' => $participants,
            'participant_count' => $participants->count(),
            'messages' => $messages,
        ];
    }
}
