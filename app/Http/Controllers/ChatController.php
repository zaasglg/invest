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
        ]);

        try {
            $message = $request->input('message');
            $user = $request->user();

            $entities = $this->localChat->analyzeQuery($message, $user);
            $contextData = $this->contextService->buildContext($message, $entities);

            // Сначала пробуем Gemini, при неудаче — локальный fallback
            $response = null;

            if ($this->gemini->isAvailable()) {
                $response = $this->gemini->chat($message, $contextData, $user);
            }

            if ($response === null) {
                Log::info('Gemini unavailable, using local fallback');
                $response = $this->localChat->respond($message, $contextData, $user);
            }

            return response()->json(['message' => $response]);
        } catch (\Exception $e) {
            Log::error('Chat error: '.$e->getMessage());

            return response()->json([
                'message' => 'Кешіріңіз, қате орын алды. Кейінірек қайталап көріңіз.',
            ]);
        }
    }
}
