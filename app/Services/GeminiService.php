<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;

    protected string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';

    // Только рабочие модели — минимум для быстрого fallback
    protected array $models = [
        'gemini-2.5-flash-lite',
        'gemini-3.1-flash-lite',
    ];

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', '');
    }

    public function isAvailable(): bool
    {
        return ! empty($this->apiKey);
    }

    public function chat(string $message, array $contextData, ?User $user = null): ?string
    {
        if (! $this->isAvailable()) {
            return null;
        }

        $prompt = $this->buildPrompt($message, $contextData, $user);

        foreach ($this->models as $model) {
            $result = $this->callApi($model, $prompt);

            if ($result !== null) {
                return $result;
            }
        }

        return null;
    }

    protected function callApi(string $model, string $prompt): ?string
    {
        $url = $this->baseUrl.$model.':generateContent?key='.$this->apiKey;

        try {
            $response = Http::withoutVerifying()
                ->timeout(12)
                ->connectTimeout(5)
                ->post($url, [
                    'contents' => [
                        [
                            'parts' => [['text' => $prompt]],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.2,
                        'maxOutputTokens' => 600,
                    ],
                    'safetySettings' => [
                        ['category' => 'HARM_CATEGORY_HARASSMENT', 'threshold' => 'BLOCK_NONE'],
                        ['category' => 'HARM_CATEGORY_HATE_SPEECH', 'threshold' => 'BLOCK_NONE'],
                    ],
                ]);

            if ($response->successful()) {
                $text = $response->json('candidates.0.content.parts.0.text');
                if (! empty($text)) {
                    Log::info("Gemini OK: {$model}");

                    return trim($text);
                }
            }

            $status = $response->status();
            Log::warning("Gemini {$model} failed: {$status}");

            return null;
        } catch (\Exception $e) {
            Log::warning("Gemini {$model} exception: ".$e->getMessage());

            return null;
        }
    }

    protected function buildPrompt(string $message, array $contextData, ?User $user): string
    {
        $lang = $this->detectLanguage($message);
        $userName = $user?->full_name ?? '';
        $roleName = $user?->roleModel?->name ?? '';

        $contextText = $this->formatContext($contextData, $lang);
        $hasData = ! empty($contextData);

        if ($lang === 'ru') {
            $userInfo = $userName ? "Пользователь: {$userName} (роль: {$roleName})\n" : '';

            return <<<PROMPT
Ты — AI-помощник системы Turkistan Invest (инвестиционная платформа Туркестанской области Казахстана).
{$userInfo}
ВАЖНО: Ниже приведены РЕАЛЬНЫЕ данные из базы данных системы. Отвечай ТОЛЬКО на основе этих данных. Не говори что данных нет, если они есть ниже.

=== ДАННЫЕ ИЗ БАЗЫ ДАННЫХ ===
{$contextText}
=============================

Правила:
- Используй данные выше — они актуальные и реальные
- Отвечай кратко (2-4 предложения или список)
- Числа форматируй читаемо (например: 1 500 000 000 ₸)
- Не добавляй markdown звёздочки (**) — пиши простым текстом
- Не упоминай JSON, поля базы данных, технические термины
- Отвечай на русском языке

Вопрос: {$message}
PROMPT;
        }

        $userInfo = $userName ? "Пайдаланушы: {$userName} (рөл: {$roleName})\n" : '';

        return <<<PROMPT
Сен — Turkistan Invest жүйесінің AI-көмекшісісің (Қазақстанның Түркістан облысының инвестициялық платформасы).
{$userInfo}
МАҢЫЗДЫ: Төменде жүйенің дерекқорынан алынған НАҚТЫ деректер берілген. Тек осы деректер негізінде жауап бер. Деректер бар болса "жоқ" деме.

=== ДЕРЕКҚОРДАН АЛЫНҒАН МӘЛІМЕТТЕР ===
{$contextText}
========================================

Ережелер:
- Жоғарыдағы деректерді пайдалан — олар нақты және өзекті
- Қысқа жауап бер (2-4 сөйлем немесе тізім)
- Сандарды оқуға ыңғайлы жаз (мысалы: 1 500 000 000 ₸)
- Markdown жұлдызшалар (**) қолданба — қарапайым мәтін жаз
- JSON, дерекқор өрістері, техникалық терминдер айтпа
- Қазақ тілінде жауап бер

Сұрақ: {$message}
PROMPT;
    }

    protected function formatContext(array $contextData, string $lang): string
    {
        if (empty($contextData)) {
            return $lang === 'ru' ? 'Данные не найдены.' : 'Деректер табылмады.';
        }

        $parts = [];

        foreach ($contextData as $key => $data) {
            if (empty($data)) {
                continue;
            }

            $section = $this->formatSection($key, $data, $lang);
            if ($section !== '') {
                $parts[] = $section;
            }
        }

        if (empty($parts)) {
            return $lang === 'ru' ? 'Данные не найдены.' : 'Деректер табылмады.';
        }

        return implode("\n\n", $parts);
    }

    protected function formatSection(string $key, mixed $data, string $lang): string
    {
        $lines = [];

        switch ($key) {
            case 'overview':
                $label = $lang === 'ru' ? 'ОБЩАЯ СТАТИСТИКА СИСТЕМЫ' : 'ЖҮЙЕНІҢ ЖАЛПЫ СТАТИСТИКАСЫ';
                $lines[] = $label.':';
                $inv = number_format((float) ($data['total_investment'] ?? 0), 0, ',', ' ').' ₸';
                $lines[] = ($lang === 'ru' ? 'Инвестиционных проектов: ' : 'Инвестициялық жобалар: ').($data['total_projects'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'Общий объём инвестиций: ' : 'Жалпы инвестиция көлемі: ').$inv;
                $lines[] = ($lang === 'ru' ? 'СЭЗ: ' : 'АЭА: ').($data['total_sezs'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'Индустриальных зон: ' : 'Индустриалды аймақтар: ').($data['total_industrial_zones'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'Промышленных зон: ' : 'Пром аймақтар: ').($data['total_prom_zones'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'Недропользователей: ' : 'Жер қойнауын пайдаланушылар: ').($data['total_subsoil_users'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'Активных проблем: ' : 'Белсенді мәселелер: ').($data['active_issues'] ?? 0);
                break;

            case 'projects':
                $total = $data['total_count'] ?? 0;
                $investSum = $data['total_investment_sum'] ?? 0;
                $byStatus = $data['by_status'] ?? [];
                $items = $data['items'] ?? [];

                $label = $lang === 'ru' ? 'ИНВЕСТИЦИОННЫЕ ПРОЕКТЫ' : 'ИНВЕСТИЦИЯЛЫҚ ЖОБАЛАР';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего проектов: ' : 'Жобалар саны: ').$total;

                if ($investSum > 0) {
                    $formatted = number_format($investSum, 0, ',', ' ').' ₸';
                    $lines[] = ($lang === 'ru' ? 'Общий объём инвестиций: ' : 'Жалпы инвестиция көлемі: ').$formatted;
                }

                if (! empty($byStatus)) {
                    $statusLabel = $lang === 'ru' ? 'По статусам: ' : 'Статус бойынша: ';
                    $statusParts = [];
                    foreach ($byStatus as $status => $count) {
                        $statusParts[] = "{$status}: {$count}";
                    }
                    $lines[] = $statusLabel.implode(', ', $statusParts);
                }

                if (! empty($items)) {
                    $lines[] = '';
                    $listLabel = $lang === 'ru' ? 'Список проектов:' : 'Жобалар тізімі:';
                    $lines[] = $listLabel;
                    foreach ($items as $i => $item) {
                        $invest = $item['total_investment']
                            ? number_format((float) $item['total_investment'], 0, ',', ' ').' ₸'
                            : '—';
                        $lines[] = ($i + 1).'. '.$item['name']
                            .' | '.($item['region'] ?? '—')
                            .' | '.($item['status'] ?? '—')
                            .' | '.$invest;
                    }
                }
                break;

            case 'regions':
                $label = $lang === 'ru' ? 'РЕГИОНЫ' : 'АЙМАҚТАР';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего регионов: ' : 'Аймақтар саны: ').($data['total_regions'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'Инвестпроектов: ' : 'Инвестициялық жобалар: ').($data['total_projects'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'СЭЗ: ' : 'АЭА: ').($data['total_sezs'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'Индустриальных зон: ' : 'Индустриалды аймақтар: ').($data['total_industrial_zones'] ?? 0);

                if (! empty($data['items'])) {
                    $lines[] = '';
                    foreach ($data['items'] as $item) {
                        $type = $item['type'] === 'oblast'
                            ? ($lang === 'ru' ? 'обл.' : 'обл.')
                            : ($lang === 'ru' ? 'р-н' : 'аудан');
                        $lines[] = '- '.$item['name']." ({$type}): "
                            .($lang === 'ru' ? 'проектов ' : 'жоба ').$item['projects_count'];
                    }
                }
                break;

            case 'issues':
                $count = count((array) $data);
                $label = $lang === 'ru' ? 'ПРОБЛЕМЫ' : 'МӘСЕЛЕЛЕР';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Активных проблем: ' : 'Белсенді мәселелер: ').$count;
                foreach ((array) $data as $i => $issue) {
                    $lines[] = ($i + 1).'. '.($issue['title'] ?? '—').' — '.($issue['status'] ?? '—');
                }
                break;

            case 'sezs':
                $label = $lang === 'ru' ? 'СПЕЦИАЛЬНЫЕ ЭКОНОМИЧЕСКИЕ ЗОНЫ (СЭЗ)' : 'АРНАЙЫ ЭКОНОМИКАЛЫҚ АЙМАҚТАР (АЭА)';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего: ' : 'Барлығы: ').($data['total_count'] ?? 0);
                foreach ($data['items'] ?? [] as $i => $item) {
                    $lines[] = ($i + 1).'. '.$item['name'].' — '.($item['region'] ?? '—');
                }
                break;

            case 'industrial_zones':
                $label = $lang === 'ru' ? 'ИНДУСТРИАЛЬНЫЕ ЗОНЫ' : 'ИНДУСТРИАЛДЫ АЙМАҚТАР';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего: ' : 'Барлығы: ').($data['total_count'] ?? 0);
                foreach ($data['items'] ?? [] as $i => $item) {
                    $lines[] = ($i + 1).'. '.$item['name'].' — '.($item['region'] ?? '—');
                }
                break;

            case 'prom_zones':
                $label = $lang === 'ru' ? 'ПРОМЫШЛЕННЫЕ ЗОНЫ' : 'ПРОМ ЗОНАЛАР';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего: ' : 'Барлығы: ').($data['total_count'] ?? 0);
                foreach ($data['items'] ?? [] as $i => $item) {
                    $lines[] = ($i + 1).'. '.$item['name'].' — '.($item['region'] ?? '—');
                }
                break;

            case 'subsoil_users':
                $label = $lang === 'ru' ? 'НЕДРОПОЛЬЗОВАТЕЛИ' : 'ЖЕР ҚОЙНАУЫН ПАЙДАЛАНУШЫЛАР';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего: ' : 'Барлығы: ').($data['total_count'] ?? 0);
                foreach ($data['items'] ?? [] as $i => $item) {
                    $lines[] = ($i + 1).'. '.$item['name'].' — '.($item['region'] ?? '—').' — '.($item['mineral_type'] ?? '—');
                }
                break;

            case 'users':
                $label = $lang === 'ru' ? 'ПОЛЬЗОВАТЕЛИ' : 'ПАЙДАЛАНУШЫЛАР';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего пользователей: ' : 'Барлық пайдаланушылар: ').($data['total_users'] ?? 0);
                foreach ($data['roles'] ?? [] as $role) {
                    $lines[] = '- '.($role['display_name'] ?? $role['name']).': '.($role['users_count'] ?? 0);
                }
                break;

            case 'tasks':
                $count = count((array) $data);
                $label = $lang === 'ru' ? 'ЗАДАЧИ' : 'ТАПСЫРМАЛАР';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Активных задач: ' : 'Белсенді тапсырмалар: ').$count;
                break;

            case 'gallery':
                $label = $lang === 'ru' ? 'ГАЛЕРЕЯ' : 'ГАЛЕРЕЯ';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего фотографий: ' : 'Барлық суреттер: ').($data['total_photos'] ?? 0);
                break;

            case 'rating':
                $label = $lang === 'ru' ? 'РЕЙТИНГ' : 'РЕЙТИНГ';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Всего исполнителей: ' : 'Барлық орындаушылар: ').($data['total_ispolnitel'] ?? 0);
                break;

            default:
                return '';
        }

        return implode("\n", $lines);
    }

    protected function detectLanguage(string $query): string
    {
        if (preg_match('/[а-яё]/ui', $query) && ! preg_match('/[әғқңөұүіһ]/ui', $query)) {
            return 'ru';
        }

        return 'kz';
    }
}
