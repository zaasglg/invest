<?php

namespace App\Http\Controllers;

use App\Services\ChatContextService;
use App\Services\GeminiService;
use App\Services\LocalChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function __construct(
        protected LocalChatService $localChat,
        protected GeminiService $gemini,
        protected ChatContextService $contextService
    ) {}

    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'context_scope' => 'nullable|string|in:oblast_analytics',
        ]);

        $message = $request->input('message');
        $user = $request->user();
        $contextScope = $request->input('context_scope');

        if ($contextScope === 'oblast_analytics') {
            abort_unless($user?->isOblastScopedAkim(), 403);
        }

        try {
            $entities = $this->localChat->analyzeQuery($message, $user);
            if ($contextScope === 'oblast_analytics') {
                $entities[] = 'oblast_analytics';
                $entities = array_values(array_unique($entities));
            }
            $contextData = $this->contextService->buildContext(
                $message,
                $entities,
                $user
            );

            // Сначала пробуем Gemini, при неудаче — локальный fallback
            $response = null;
            $provider = 'local';

            if ($this->gemini->isAvailable()) {
                $response = $this->gemini->chat($message, $contextData, $user);
                if ($response !== null) {
                    $provider = 'gemini';
                }
            }

            if ($response === null) {
                Log::info('Gemini unavailable, using local fallback');
                $response = $this->localChat->respond($message, $contextData, $user);
            }

            return response()->json([
                'message' => $response,
                'provider' => $provider,
                'generated_at' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            Log::error('Chat error: '.$e->getMessage());

            return response()->json([
                'message' => 'Кешіріңіз, қате орын алды. Кейінірек қайталап көріңіз.',
            ]);
        }
    }
}
