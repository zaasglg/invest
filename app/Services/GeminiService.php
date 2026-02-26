<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;
    protected string $model;
    protected string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', '');
        $this->model = config('services.gemini.model', 'gemini-2.0-flash');
    }

    /**
     * Check if the service is configured.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->apiKey);
    }

    /**
     * Send a prompt to the Gemini API and return the text response.
     */
    public function generate(string $prompt, float $temperature = 0.7, int $maxTokens = 1024): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $url = "{$this->baseUrl}/{$this->model}:generateContent?key={$this->apiKey}";

        try {
            $response = Http::withoutVerifying()
                ->timeout(30)
                ->post($url, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => $temperature,
                        'maxOutputTokens' => $maxTokens,
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('Gemini API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return null;
            }

            $data = $response->json();

            return $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
        } catch (\Throwable $e) {
            Log::error('Gemini API exception', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Summarize a long text to fit within a presentation slide.
     * Returns the shortened version or the original if AI is unavailable.
     */
    public function summarizeForSlide(string $text, int $maxChars = 120): string
    {
        if (! $this->isConfigured() || mb_strlen($text) <= $maxChars) {
            return $text;
        }

        $prompt = <<<PROMPT
Мәтінді қысқарт, маңызды ақпаратты сақта. Максимум {$maxChars} символ болсын.
Тек қысқартылған мәтінді жаз, басқа ештеңе жазба.
Қазақ тілінде жауап бер.

Мәтін: {$text}
PROMPT;

        $result = $this->generate($prompt, 0.3, 256);

        if ($result && mb_strlen(trim($result)) > 0) {
            return mb_substr(trim($result), 0, $maxChars);
        }

        return mb_substr($text, 0, $maxChars);
    }

    /**
     * Generate a project statistics summary for a presentation slide.
     */
    public function generateProjectStats(array $projectData): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $json = json_encode($projectData, JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
Сен инвестициялық жоба талдаушысысың. Төменгі жоба деректерін талда және қысқаша статистика жаз.
Презентация слайдына арналған, сондықтан өте қысқа бол (maximum 200 символ).
Қазақ тілінде жауап бер.

Шаблон:
- Жалпы тапсырмалар: X
- Орындалды: X (X%)
- Орындалмады: X
- Жағдайы: [жақсы/орташа/нашар]

Жоба деректері: {$json}
PROMPT;

        return $this->generate($prompt, 0.3, 512);
    }
}
