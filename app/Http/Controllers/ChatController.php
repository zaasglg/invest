<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Services\ChatContextService;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

        $message = $request->input('message');
        $user = Auth::user();

        // Анализируем запрос
        $entities = $this->geminiService->analyzeQuery($message);

        // Строим контекст из БД
        $contextData = $this->contextService->buildContext($message, $entities);

        // Получаем ответ от Gemini
        $response = $this->geminiService->chat($message, [
            'query_results' => $contextData,
        ]);

        // Сохраняем сообщение пользователя
        ChatMessage::create([
            'user_id' => $user->id,
            'message' => $message,
            'role' => 'user',
            'context' => $contextData,
        ]);

        // Сохраняем ответ ассистента
        ChatMessage::create([
            'user_id' => $user->id,
            'message' => $message,
            'response' => $response,
            'role' => 'assistant',
            'context' => $contextData,
        ]);

        return response()->json([
            'message' => $response,
            'context' => $contextData,
        ]);
    }

    public function history(): JsonResponse
    {
        $user = Auth::user();

        $messages = ChatMessage::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'role' => $msg->role,
                    'content' => $msg->role === 'user' ? $msg->message : $msg->response,
                    'created_at' => $msg->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'messages' => $messages->reverse()->values(),
        ]);
    }

    public function clear(): JsonResponse
    {
        $user = Auth::user();

        ChatMessage::where('user_id', $user->id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'История чата очищена',
        ]);
    }
}
