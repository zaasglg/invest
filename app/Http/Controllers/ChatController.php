<?php

namespace App\Http\Controllers;

use App\Services\ChatContextService;
use App\Services\GroqService;
use App\Services\LocalChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function __construct(
        protected LocalChatService $localChat,
        protected GroqService $groq,
        protected ChatContextService $contextService
    ) {}

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
            'history' => 'sometimes|array|max:8',
            'history.*.role' => 'required_with:history|in:user,assistant',
            'history.*.content' => 'required_with:history|string|max:2000',
        ]);

        try {
            $message = trim($validated['message']);
            $user = $request->user();
            $history = collect($validated['history'] ?? [])
                ->map(fn (array $item) => [
                    'role' => $item['role'],
                    'content' => trim($item['content']),
                ])
                ->filter(fn (array $item) => $item['content'] !== '')
                ->values()
                ->all();

            $analysisQuery = collect($history)
                ->where('role', 'user')
                ->pluck('content')
                ->push($message)
                ->take(-4)
                ->implode(' ');

            $entities = $this->localChat->analyzeQuery($analysisQuery, $user);

            if (empty($entities)) {
                return response()->json([
                    'message' => $this->localChat->respond($message, [], $user),
                    'source' => 'local',
                ]);
            }

            $contextData = $this->contextService->buildContext(
                $analysisQuery,
                $entities,
                $user,
            );

            $response = $this->groq->chat(
                $message,
                $contextData,
                $user,
                $history,
            );
            $source = 'groq';

            if ($response === null) {
                Log::info('Groq unavailable, using local chat fallback');
                $response = $this->localChat->respond(
                    $analysisQuery,
                    $contextData,
                    $user,
                );
                $source = 'local';
            }

            return response()->json([
                'message' => $response,
                'source' => $source,
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Кешіріңіз, AI-көмекші уақытша қолжетімсіз. '
                    .'AI-помощник временно недоступен. Попробуйте ещё раз.',
            ], 500);
        }
    }
}
