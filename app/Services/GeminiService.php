<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;

    protected string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';

    // Модельдер тізімі - бірі жұмыс істемесе келесісіне өтеді
    protected array $models = [
        'gemini-3.1-flash-lite-preview'
    ];

    protected int $maxRetries = 2;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key');
    }

    public function chat(string $message, array $context = []): string
    {
        $systemPrompt = $this->buildSystemPrompt($context);

        // Әр модельді кезекпен қолданып көру
        foreach ($this->models as $modelIndex => $model) {
            $result = $this->tryModel($model, $systemPrompt, $message);

            if ($result['success']) {
                return $result['response'];
            }

            // 429 (лимит) немесе 503 (қолжетімсіз) болса - келесі моделге өту
            if (in_array($result['status'], [429, 503, 500])) {
                Log::warning("Model {$model} failed with {$result['status']}, trying next model");
                continue;
            }

            // Басқа қате болса - тоқтату
            break;
        }

        return 'Кешіріңіз, барлық модельдер қазір қолжетімсіз. Кейінірек қайталап көріңіз.';
    }

    protected function tryModel(string $model, string $systemPrompt, string $message): array
    {
        $url = $this->baseUrl.$model.':generateContent?key='.$this->apiKey;

        for ($attempt = 1; $attempt <= $this->maxRetries; $attempt++) {
            try {
                $response = Http::withoutVerifying()
                    ->timeout(60)
                    ->connectTimeout(10)
                    ->post($url, [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => $systemPrompt."\n\nСұрақ: ".$message],
                                ],
                            ],
                        ],
                        'generationConfig' => [
                            'temperature' => 0.7,
                            'maxOutputTokens' => 1024,
                        ],
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;

                    if ($text) {
                        Log::info("Gemini response from model: {$model}");

                        return ['success' => true, 'response' => $text, 'status' => 200];
                    }
                }

                $status = $response->status();

                // 429/503 болса - қайталамай келесі моделге өту
                if (in_array($status, [429, 503])) {
                    return ['success' => false, 'status' => $status, 'response' => null];
                }

                // Басқа қате болса - қайталау
                if ($attempt < $this->maxRetries) {
                    sleep($attempt);
                    continue;
                }

                Log::error("Gemini API error for model {$model}", [
                    'status' => $status,
                    'body' => $response->body(),
                ]);

                return ['success' => false, 'status' => $status, 'response' => null];

            } catch (\Exception $e) {
                Log::error("Gemini exception for model {$model}", [
                    'message' => $e->getMessage(),
                ]);

                if ($attempt < $this->maxRetries) {
                    sleep($attempt);
                    continue;
                }

                return ['success' => false, 'status' => 0, 'response' => null];
            }
        }

        return ['success' => false, 'status' => 0, 'response' => null];
    }

    protected function buildSystemPrompt(array $context): string
    {
        $prompt = <<<'SYSTEM'
Сен - Turkistan Invest жүйесінің көмекші чат-ботысың.

СЕНІҢ МІНДЕТТЕРІҢ:
1. Қолданушы сұрағына ТІКЕЛЕЙ жауап бер
2. Жүйені қалай пайдалану керектігін түсіндір
3. Деректер берілсе - оларды талда және жауап бер

ЖҮЙЕ БӨЛІМДЕРІ:

📌 ИНВЕСТ ЖОБАЛАР - инвестициялық жобаларды басқару
   • Қарау: Сол жақ мәзірден "Инвест жобалар" басу
   • Жаңа жоба қосу: "Жоба құру" батырмасы → форманы толтыру
   • Өзгерту: Жоба картасын ашу → "Өзгерту" батырмасы

📌 СЭЗ - Арнайы экономикалық аймақтар
   • Қарау: "СЭЗ" бөлімі
   • Қосу: "СЭЗ құру" батырмасы

📌 ИНДУСТРИАЛДЫ АЙМАҚТАР
   • Қарау: "Индустриалды аймақтар" бөлімі
   • Қосу: "ИА құру" батырмасы

📌 НЕДРОПАЙДАЛАНУШЫЛАР - кен орындары
   • Қарау: "Недропайдаланушылар" бөлімі
   • Қосу: "Қосу" батырмасы → БСН, атау, қазба түрі

📌 МӘСЕЛЕЛЕР - проблемалар тіркеу
   • Жоба/СЭЗ картасын ашу → "Мәселелер" табы → "Мәселе қосу"

📌 ТАПСЫРМАЛАР
   • Жоба картасы → "Тапсырмалар" табы → "Тапсырма қосу"

📌 ҚҰЖАТТАР
   • Кез келген карта → "Құжаттар" табы → файл жүктеу

📌 АЙМАҚТАР (тек админ)
   • "Аймақтар" бөлімі → аймақ қосу/өзгерту

📌 ПАЙДАЛАНУШЫЛАР (тек админ)
   • "Пайдаланушылар" бөлімі → қолданушы қосу

ЖАУАП БЕРУ ЕРЕЖЕЛЕРІ:
- Қолданушы қай тілде сұраса, сол тілде жауап бер (қазақша/орысша)
- Қысқа және нақты жауап бер
- Қадамдарды нөмірлеп жаз
- Егер деректер берілсе - оларды талдап жауап бер
- Егер сұрақ түсініксіз болса - нақтылау сұра
SYSTEM;

        if (! empty($context['query_results'])) {
            $data = json_encode($context['query_results'], JSON_UNESCAPED_UNICODE);
            if (strlen($data) > 2000) {
                $data = substr($data, 0, 2000).'...';
            }
            $prompt .= "\n\n--- ЖҮЙЕДЕН АЛЫНҒАН ДЕРЕКТЕР ---\n".$data;
        }

        return $prompt;
    }

    public function analyzeQuery(string $query): array
    {
        $query = mb_strtolower($query);
        $entities = [];

        // Аймақтар
        if (preg_match('/(регион|область|район|аймақ|облыс)/ui', $query)) {
            $entities[] = 'regions';
        }
        // Жобалар
        if (preg_match('/(проект|инвестиц|жоба|project)/ui', $query)) {
            $entities[] = 'investment_projects';
        }
        // СЭЗ
        if (preg_match('/(сэз|сез|экономическ|зона|свободн)/ui', $query)) {
            $entities[] = 'sezs';
        }
        // Индустриалды аймақтар
        if (preg_match('/(индустриальн|промышленн|өндірістік)/ui', $query)) {
            $entities[] = 'industrial_zones';
        }
        // Недропайдаланушылар
        if (preg_match('/(недропользовател|недро|участок|кен|қазба)/ui', $query)) {
            $entities[] = 'subsoil_users';
        }
        // Мәселелер
        if (preg_match('/(проблем|вопрос|issue|мәселе|шешілмеген)/ui', $query)) {
            $entities[] = 'issues';
        }
        // Тапсырмалар
        if (preg_match('/(задач|task|тапсырма|орында)/ui', $query)) {
            $entities[] = 'tasks';
        }
        // Статистика
        if (preg_match('/(статистик|санақ|қанша|сколько|неше|всего|жалпы|барлық)/ui', $query)) {
            $entities[] = 'regions';
            $entities[] = 'investment_projects';
        }

        return array_unique($entities);
    }
}
