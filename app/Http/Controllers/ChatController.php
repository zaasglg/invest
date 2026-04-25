<?php

namespace App\Http\Controllers;

use App\Services\ChatContextService;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function __construct(
        protected GeminiService $geminiService,
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

            // Сұрауды талдау (рөл бойынша сүзу)
            $entities = $this->geminiService->analyzeQuery($message, $user);

            // Деректерді жинау
            $contextData = $this->contextService->buildContext($message, $entities);

            // Gemini-ден жауап алу (рөлге қарай бейімделген промпт)
            $response = $this->geminiService->chat($message, [
                'query_results' => $contextData,
            ], $user);

            return response()->json([
                'message' => $response,
            ]);
        } catch (\Exception $e) {
            Log::error('Chat error: '.$e->getMessage());

            return response()->json([
                'message' => 'Кешіріңіз, AI қызметіне қосылу мүмкін болмады. Кейінірек қайталап көріңіз.',
            ]);
        }
    }
}
