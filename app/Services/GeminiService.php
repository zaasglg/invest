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
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-3-flash-preview',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
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
            $response = Http::timeout(12)
                ->connectTimeout(5)
                ->post($url, [
                    'contents' => [
                        [
                            'parts' => [['text' => $prompt]],
                        ],
                    ],
                    'generationConfig' => [
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
        $isInvestor = $roleName === 'investor';
        $isOblastAkim = $user?->isOblastScopedAkim() ?? false;

        if ($lang === 'ru') {
            $userInfo = $userName ? "Пользователь: {$userName} (роль: {$roleName})\n" : '';
            $investorRules = $isInvestor
                ? <<<'RULES'
- Ты персональный консультант инвестора: сначала ответь на вопрос, затем отдельно предложи до 3 подходящих мер поддержки и до 3 региональных площадок из переданных данных
- Проекты, задачи и галерея уже отфильтрованы сервером по компании инвестора; не предполагай наличие других проектов
- Не обещай получение льготы или свободный участок: назови подбор предварительным и предложи проверить критерии у оператора программы или управляющей компании
RULES
                : '';
            $oblastAkimRules = $isOblastAkim
                ? <<<'RULES'
- Ты управленческий AI-аналитик областного акима: по запросу формируй краткий отчёт, выделяй риски, сравнивай районы и управления, предлагай конкретные следующие действия
- Используй только переданную аналитику области. Не смешивай её с данными других областей и не придумывай отсутствующие показатели
- При рекомендациях отделяй подтверждённые факты от аналитического вывода
RULES
                : '';

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
{$investorRules}
{$oblastAkimRules}

Вопрос: {$message}
PROMPT;
        }

        $userInfo = $userName ? "Пайдаланушы: {$userName} (рөл: {$roleName})\n" : '';
        $investorRules = $isInvestor
            ? <<<'RULES'
- Сен инвестордың жеке кеңесшісісің: алдымен сұраққа жауап бер, содан кейін берілген деректерден 3-ке дейін сәйкес қолдау шарасын және 3-ке дейін өңірлік алаңды бөлек ұсын
- Жобалар, тапсырмалар мен галерея серверде инвестор компаниясы бойынша сүзілген; басқа жобалар бар деп болжама
- Жеңілдік беріледі немесе жер бос деп уәде берме: іріктеу алдын ала екенін айтып, талаптарды бағдарлама операторынан не басқарушы компаниядан тексеруді ұсын
RULES
            : '';
        $oblastAkimRules = $isOblastAkim
            ? <<<'RULES'
- Сен облыстық әкімнің басқарушылық AI-аналитигісің: сұралғанда қысқа есеп жаса, тәуекелдерді белгіле, аудандар мен басқармаларды салыстыр және нақты келесі қадамдарды ұсын
- Тек берілген облыстық аналитиканы пайдалан. Басқа облыстардың деректерімен араластырма және жоқ көрсеткіштерді ойдан шығарма
- Ұсыныс бергенде расталған факт пен аналитикалық қорытындыны ажырат
RULES
            : '';

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
{$investorRules}
{$oblastAkimRules}

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

            case 'investor_profile':
                $label = $lang === 'ru' ? 'ПРОФИЛЬ ИНВЕСТОРА' : 'ИНВЕСТОР ПРОФИЛІ';
                $lines[] = $label.':';
                $lines[] = ($lang === 'ru' ? 'Компания: ' : 'Компания: ').($data['company'] ?? '—');
                $lines[] = ($lang === 'ru' ? 'Вид деятельности: ' : 'Қызмет түрі: ').($data['activity_type'] ?? '—');
                $lines[] = ($lang === 'ru' ? 'Базовый регион: ' : 'Негізгі өңір: ').($data['region'] ?? '—');
                break;

            case 'support_measures':
                $lines[] = $lang === 'ru'
                    ? 'МЕРЫ ГОСУДАРСТВЕННОЙ ПОДДЕРЖКИ (ПРЕДВАРИТЕЛЬНЫЙ ПОДБОР):'
                    : 'МЕМЛЕКЕТТІК ҚОЛДАУ ШАРАЛАРЫ (АЛДЫН АЛА ІРІКТЕУ):';
                foreach ($data['items'] ?? [] as $i => $item) {
                    $title = $item[$lang === 'ru' ? 'title_ru' : 'title_kk'];
                    $summary = $item[$lang === 'ru' ? 'summary_ru' : 'summary_kk'];
                    $eligibility = $item[$lang === 'ru'
                        ? 'eligibility_ru'
                        : 'eligibility_kk'];
                    $lines[] = ($i + 1).'. '.$title.': '.$summary;
                    $lines[] = ($lang === 'ru' ? 'Критерий: ' : 'Шарты: ').$eligibility;
                    $lines[] = 'Оператор: '.$item['operator'].'; '.$item['source_url'];
                }
                break;

            case 'regional_assets':
                $lines[] = $lang === 'ru'
                    ? 'РЕГИОНАЛЬНЫЕ АКТИВЫ ДЛЯ РАССМОТРЕНИЯ:'
                    : 'ҚАРАСТЫРУҒА БОЛАТЫН ӨҢІР АКТИВТЕРІ:';
                if (! empty($data['region'])) {
                    $lines[] = ($lang === 'ru' ? 'Регион: ' : 'Өңір: ').$data['region'];
                }
                foreach ($data['items'] ?? [] as $i => $item) {
                    $area = $item['total_area'] !== null
                        ? number_format((float) $item['total_area'], 2, ',', ' ').' га'
                        : '—';
                    $infrastructure = empty($item['infrastructure'])
                        ? '—'
                        : implode(', ', $item['infrastructure']);
                    $lines[] = ($i + 1).'. '.$item['name']
                        .' | '.($item['region'] ?? '—')
                        .' | '.$item['type']
                        .' | '.($item['status'] ?? '—')
                        .' | '.$area
                        .' | '.($lang === 'ru' ? 'инфраструктура: ' : 'инфрақұрылым: ')
                        .$infrastructure;
                    if (! empty($item['description'])) {
                        $lines[] = ($lang === 'ru' ? 'Профиль площадки: ' : 'Алаң бейіні: ')
                            .$item['description'];
                    }
                }
                $lines[] = $lang === 'ru'
                    ? 'Свободную площадь и технические лимиты нужно подтвердить у управляющей организации.'
                    : 'Бос аумақ пен техникалық лимиттерді басқарушы ұйымнан нақтылау қажет.';
                break;

            case 'oblast_analytics':
                $scope = $data['scope'] ?? [];
                $summary = $data['summary'] ?? [];
                $production = $data['production_summary'] ?? [];
                $investment = number_format(
                    (float) ($summary['total_investment'] ?? 0),
                    0,
                    ',',
                    ' '
                );
                $lines[] = $lang === 'ru'
                    ? 'УПРАВЛЕНЧЕСКАЯ АНАЛИТИКА ОБЛАСТИ: '.($scope['oblast_name'] ?? '—')
                    : 'ОБЛЫСТЫҚ БАСҚАРУШЫЛЫҚ АНАЛИТИКА: '.($scope['oblast_name'] ?? '—');
                $lines[] = ($lang === 'ru' ? 'Проектов: ' : 'Жоба: ')
                    .($summary['total_projects'] ?? 0)
                    .' | '.($lang === 'ru' ? 'инвестиции: ' : 'инвестиция: ')
                    .$investment.' ₸'
                    .' | '.($lang === 'ru' ? 'рабочих мест: ' : 'жұмыс орны: ')
                    .($summary['jobs_count'] ?? 0);
                $lines[] = ($lang === 'ru' ? 'Активных проблем: ' : 'Белсенді мәселе: ')
                    .($summary['active_issues'] ?? 0)
                    .' | '.($lang === 'ru' ? 'просроченных задач: ' : 'кешіккен тапсырма: ')
                    .($summary['overdue_tasks'] ?? 0);

                if (($production['projects_with_plans'] ?? 0) > 0) {
                    $lines[] = $lang === 'ru'
                        ? 'ВЫПОЛНЕНИЕ ПРОИЗВОДСТВЕННОГО ПЛАНА:'
                        : 'ӨНДІРІС ЖОСПАРЫНЫҢ ОРЫНДАЛУЫ:';
                    $lines[] = ($lang === 'ru' ? 'Отчитались: ' : 'Есеп берген жоба: ')
                        .($production['reporting_projects'] ?? 0)
                        .' / '.($production['projects_with_plans'] ?? 0)
                        .' | '.($lang === 'ru' ? 'по сумме: ' : 'сома бойынша: ')
                        .(($production['amount_completion_rate'] ?? null) !== null
                            ? $production['amount_completion_rate'].'%'
                            : '—')
                        .' | '.($lang === 'ru' ? 'по объёму: ' : 'көлем бойынша: ')
                        .(($production['average_volume_completion_rate'] ?? null) !== null
                            ? $production['average_volume_completion_rate'].'%'
                            : '—')
                        .' | '.($lang === 'ru' ? 'без отчёта после запуска: ' : 'іске қосылған, есебі жоқ: ')
                        .($production['launched_without_reports'] ?? 0)
                        .' | '.($lang === 'ru' ? 'требуют дополнения старых данных: ' : 'ескі деректі толықтыру қажет: ')
                        .($production['projects_needing_plan_completion'] ?? 0);
                }

                $lines[] = $lang === 'ru'
                    ? 'КАЧЕСТВО РАЙОННЫХ АКИМАТОВ:'
                    : 'АУДАН ӘКІМДІКТЕРІНІҢ САПАСЫ:';
                foreach ($data['district_quality'] ?? [] as $item) {
                    $lines[] = '- '.$item['name']
                        .': '.($item['score'] ?? '—').' балл'
                        .', '.($item['completed_tasks'] ?? 0)
                        .'/'.($item['total_tasks'] ?? 0)
                        .($lang === 'ru' ? ' задач выполнено' : ' тапсырма орындалды')
                        .', '.($item['overdue_tasks'] ?? 0)
                        .($lang === 'ru' ? ' просрочено' : ' кешіккен');
                }

                $lines[] = $lang === 'ru'
                    ? 'КАЧЕСТВО УПРАВЛЕНИЙ:'
                    : 'БАСҚАРМАЛАР САПАСЫ:';
                foreach ($data['management_quality'] ?? [] as $item) {
                    $lines[] = '- '.$item['name']
                        .': '.($item['score'] ?? '—').' балл'
                        .', '.($item['completed_tasks'] ?? 0)
                        .'/'.($item['total_tasks'] ?? 0)
                        .($lang === 'ru' ? ' задач выполнено' : ' тапсырма орындалды');
                }

                $lines[] = $lang === 'ru'
                    ? 'НИШЕВОЙ ПОТЕНЦИАЛ:'
                    : 'НИШАЛЫҚ ӘЛЕУЕТ:';
                foreach ($data['niche_analytics'] ?? [] as $item) {
                    $lines[] = '- '.$item['name']
                        .': '.$item['potential_score'].' балл'
                        .', '.$item['project_count']
                        .($lang === 'ru' ? ' проектов' : ' жоба')
                        .', '.number_format(
                            (float) $item['investment'],
                            0,
                            ',',
                            ' '
                        ).' ₸';
                }

                foreach ($data['regional_potential']['insights'] ?? [] as $insight) {
                    $lines[] = '- '.$insight;
                }
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
