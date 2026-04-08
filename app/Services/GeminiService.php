<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;

    protected string $apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key');
    }

    public function chat(string $message, array $context = []): string
    {
        try {
            $systemPrompt = $this->buildSystemPrompt($context);

            $url = $this->apiUrl.'?key='.$this->apiKey;

            $response = Http::timeout(60)->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $systemPrompt."\n\nВопрос пользователя: ".$message],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.7,
                    'topK' => 40,
                    'topP' => 0.95,
                    'maxOutputTokens' => 2048,
                ],
            ]);

            if ($response->successful()) {
                $data = $response->json();

                return $data['candidates'][0]['content']['parts'][0]['text'] ?? 'Извините, не удалось получить ответ.';
            }

            Log::error('Gemini API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return 'Извините, произошла ошибка при обработке запроса.';
        } catch (\Exception $e) {
            Log::error('Gemini service error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return 'Извините, сервис временно недоступен.';
        }
    }

    protected function buildSystemPrompt(array $context): string
    {
        $prompt = 'Ты - AI помощник системы Turkistan Invest. ';
        $prompt .= "Ты помогаешь пользователям получать информацию о:\n";
        $prompt .= "- Регионах и их инвестиционных показателях\n";
        $prompt .= "- Инвестиционных проектах\n";
        $prompt .= "- СЭЗ (Специальных экономических зонах)\n";
        $prompt .= "- Индустриальных зонах\n";
        $prompt .= "- Недропользователях и их участках\n";
        $prompt .= "- Проблемных вопросах по проектам\n";
        $prompt .= "- Задачах и их статусах\n\n";

        if (! empty($context['database_schema'])) {
            $prompt .= "Структура базы данных:\n".$context['database_schema']."\n\n";
        }

        if (! empty($context['query_results'])) {
            $prompt .= "Данные по запросу:\n".json_encode($context['query_results'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)."\n\n";
        }

        $prompt .= 'Отвечай на русском языке, кратко и по существу. ';
        $prompt .= 'Если нужна дополнительная информация для точного ответа, попроси её у пользователя.';

        return $prompt;
    }

    public function analyzeQuery(string $query): array
    {
        $query = mb_strtolower($query);
        $entities = [];

        // Определяем о чем спрашивает пользователь
        if (preg_match('/(регион|область|район)/ui', $query)) {
            $entities[] = 'regions';
        }
        if (preg_match('/(проект|инвестиц)/ui', $query)) {
            $entities[] = 'investment_projects';
        }
        if (preg_match('/(сэз|экономическ|зона)/ui', $query)) {
            $entities[] = 'sezs';
        }
        if (preg_match('/(индустриальн|промышленн)/ui', $query)) {
            $entities[] = 'industrial_zones';
        }
        if (preg_match('/(недропользовател|участок)/ui', $query)) {
            $entities[] = 'subsoil_users';
        }
        if (preg_match('/(проблем|вопрос|issue)/ui', $query)) {
            $entities[] = 'issues';
        }
        if (preg_match('/(задач|task)/ui', $query)) {
            $entities[] = 'tasks';
        }

        return $entities;
    }
}
