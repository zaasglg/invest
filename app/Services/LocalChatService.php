<?php

namespace App\Services;

use App\Models\User;

class LocalChatService
{
    /**
     * Сұрау тілін анықтау (kz / ru).
     */
    protected function detectLanguage(string $query): string
    {
        if (preg_match('/[а-яё]/ui', $query) && ! preg_match('/[әғқңөұүіһ]/ui', $query)) {
            return 'ru';
        }

        return 'kz';
    }

    /**
     * Сұрау санақ/статистикалық па?
     */
    protected function isCountQuestion(string $query): bool
    {
        return (bool) preg_match(
            '/(қанша|неше|сколько|всего|жалпы|барлық|итого|саны|санақ|статистик|көрсеткіш|мәлімет)/ui',
            $query,
        );
    }

    /**
     * Сұрау тізім/көрсету түрінде ме?
     */
    protected function isListQuestion(string $query): bool
    {
        return (bool) preg_match(
            '/(тізім|список|көрсет|покажи|list|show|ата|назови|бар ма|есть ли|қандай|какие)/ui',
            $query,
        );
    }

    /**
     * Сұрау көмек/навигация түрінде ме?
     */
    protected function isHelpQuestion(string $query): bool
    {
        return (bool) preg_match(
            '/(қалай|как|помощ|көмек|не білесің|не істей|что умееш|help|навигац|бөлім|раздел|меню|функци|мүмкіндік|возможност)/ui',
            $query,
        );
    }

    /**
     * Негізгі жауап генераторы.
     */
    public function respond(string $message, array $contextData, ?User $user = null): string
    {
        $lang = $this->detectLanguage($message);
        $entities = $this->analyzeQuery($message, $user);

        if (empty($entities)) {
            return $lang === 'ru'
                ? 'Извините, я не понял вопрос. Спросите, например: «Сколько проектов в Туркестанской области?» или «Какие есть разделы?»'
                : 'Кешіріңіз, сұрағыңызды түсінбедім. Мысалы: «Түркістан облысында қанша жоба бар?» немесе «Қандай бөлімдер бар?» деп сұрап көріңіз.';
        }

        $parts = [];

        foreach ($entities as $entity) {
            if ($entity === 'help') {
                $parts[] = $this->buildHelpResponse($user, $lang);
            } else {
                $part = $this->formatEntityResponse(
                    $entity,
                    $contextData,
                    $message,
                    $lang,
                );
                if ($part !== '') {
                    $parts[] = $part;
                }
            }
        }

        if (empty($parts)) {
            return $lang === 'ru'
                ? 'По вашему запросу данных не найдено. Уточните запрос.'
                : 'Сұрауыңыз бойынша деректер табылмады. Сұрауыңызды нақтылаңыз.';
        }

        $greeting = $this->roleGreeting($user, $lang);
        $body = implode("\n\n", $parts);

        return $greeting."\n\n".$body;
    }

    /**
     * Рөлге қарай сәлемдесу.
     */
    protected function roleGreeting(?User $user, string $lang): string
    {
        $name = $user?->full_name ?? '';

        if (! empty($name)) {
            return $lang === 'ru'
                ? "Здравствуйте, {$name}!"
                : "Сәлеметсіз бе, {$name}!";
        }

        return $lang === 'ru' ? 'Здравствуйте!' : 'Сәлеметсіз бе!';
    }

    /**
     * Белгілі бір entity бойынша жауапты форматтау.
     */
    protected function formatEntityResponse(
        string $entity,
        array $contextData,
        string $query,
        string $lang,
    ): string {
        switch ($entity) {
            case 'regions':
                return $this->formatRegionsResponse($contextData, $query, $lang);
            case 'investment_projects':
                return $this->formatProjectsResponse($contextData, $query, $lang);
            case 'project_types':
                return $this->formatProjectTypesResponse($contextData, $query, $lang);
            case 'sezs':
                return $this->formatSezsResponse($contextData, $query, $lang);
            case 'industrial_zones':
                return $this->formatIndustrialZonesResponse($contextData, $query, $lang);
            case 'prom_zones':
                return $this->formatPromZonesResponse($contextData, $query, $lang);
            case 'subsoil_users':
                return $this->formatSubsoilUsersResponse($contextData, $query, $lang);
            case 'issues':
                return $this->formatIssuesResponse($contextData, $query, $lang);
            case 'tasks':
                return $this->formatTasksResponse($contextData, $query, $lang);
            case 'users':
                return $this->formatUsersResponse($contextData, $query, $lang);
            case 'gallery':
                return $this->formatGalleryResponse($contextData, $query, $lang);
            case 'rating':
                return $this->formatRatingResponse($contextData, $query, $lang);
            case 'support_measures':
                return $this->formatSupportMeasuresResponse($contextData, $lang);
            case 'regional_assets':
                return $this->formatRegionalAssetsResponse($contextData, $lang);
            case 'oblast_analytics':
                return $this->formatOblastAnalyticsResponse(
                    $contextData,
                    $lang
                );
            default:
                return '';
        }
    }

    // ─── Аймақтар ────────────────────────────────────────────

    protected function formatRegionsResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['regions'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по регионам не найдены.'
                : 'Аймақтар бойынша деректер табылмады.';
        }

        $totalRegions = $data['total_regions'] ?? 0;
        $totalProjects = $data['total_projects'] ?? 0;
        $totalSezs = $data['total_sezs'] ?? 0;
        $totalIZ = $data['total_industrial_zones'] ?? 0;

        $lines = [];

        if ($lang === 'ru') {
            $lines[] = "📊 **Регионы** — всего: {$totalRegions}";
            $lines[] = "• Инвестиционных проектов: {$totalProjects}";
            $lines[] = "• СЭЗ: {$totalSezs}";
            $lines[] = "• Индустриальных зон: {$totalIZ}";

            if (! empty($data['items']) && count($data['items']) <= 15) {
                $lines[] = '';
                $lines[] = '**Список регионов:**';
                $i = 1;
                foreach ($data['items'] as $item) {
                    $type = $item['type'] === 'oblast' ? 'обл.' : 'район';
                    $lines[] = "{$i}. {$item['name']} ({$type}) — проектов: {$item['projects_count']}";
                    $i++;
                }
            }
        } else {
            $lines[] = "📊 **Аймақтар** — барлығы: {$totalRegions}";
            $lines[] = "• Инвестициялық жобалар: {$totalProjects}";
            $lines[] = "• АЭА: {$totalSezs}";
            $lines[] = "• Индустриалды аймақтар: {$totalIZ}";

            if (! empty($data['items']) && count($data['items']) <= 15) {
                $lines[] = '';
                $lines[] = '**Аймақтар тізімі:**';
                $i = 1;
                foreach ($data['items'] as $item) {
                    $type = $item['type'] === 'oblast' ? 'обл.' : 'аудан';
                    $lines[] = "{$i}. {$item['name']} ({$type}) — жобалар: {$item['projects_count']}";
                    $i++;
                }
            }
        }

        return implode("\n", $lines);
    }

    // ─── Жобалар ──────────────────────────────────────────────

    protected function formatProjectsResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['projects'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по проектам не найдены.'
                : 'Жобалар бойынша деректер табылмады.';
        }

        $total = $data['total_count'] ?? 0;
        $items = $data['items'] ?? [];

        $lines = [];

        if ($lang === 'ru') {
            $lines[] = "📌 **Инвестиционные проекты** — всего: {$total}";

            if (! empty($items)) {
                $lines[] = '';
                $lines[] = '**Последние проекты:**';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $status = $item['status'] ?? '—';
                    $invest = isset($item['total_investment'])
                        ? number_format((float) $item['total_investment'], 0, ',', ' ').' ₸'
                        : '—';
                    $lines[] = "{$i}. {$item['name']}";
                    $lines[] = "   📍 {$region} | 📊 {$status} | 💰 {$invest}";
                    $i++;
                }
            }
        } else {
            $lines[] = "📌 **Инвестициялық жобалар** — барлығы: {$total}";

            if (! empty($items)) {
                $lines[] = '';
                $lines[] = '**Соңғы жобалар:**';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $status = $item['status'] ?? '—';
                    $invest = isset($item['total_investment'])
                        ? number_format((float) $item['total_investment'], 0, ',', ' ').' ₸'
                        : '—';
                    $lines[] = "{$i}. {$item['name']}";
                    $lines[] = "   📍 {$region} | 📊 {$status} | 💰 {$invest}";
                    $i++;
                }
            }
        }

        return implode("\n", $lines);
    }

    // ─── Жоба түрлері ─────────────────────────────────────────

    protected function formatProjectTypesResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['project_types'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по типам проектов не найдены.'
                : 'Жоба түрлері бойынша деректер табылмады.';
        }

        $total = $data['total_count'] ?? 0;
        $items = $data['items'] ?? [];

        $lines = [];

        if ($lang === 'ru') {
            $lines[] = "📊 **Типы проектов** — всего: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                foreach ($items as $item) {
                    $lines[] = "• {$item['name']} — проектов: {$item['projects_count']}";
                }
            }
        } else {
            $lines[] = "📊 **Жоба түрлері** — барлығы: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                foreach ($items as $item) {
                    $lines[] = "• {$item['name']} — жобалар: {$item['projects_count']}";
                }
            }
        }

        return implode("\n", $lines);
    }

    // ─── АЭА ──────────────────────────────────────────────────

    protected function formatSezsResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['sezs'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по СЭЗ не найдены.'
                : 'АЭА бойынша деректер табылмады.';
        }

        $total = $data['total_count'] ?? 0;
        $items = $data['items'] ?? [];

        $lines = [];

        if ($lang === 'ru') {
            $lines[] = "🏭 **Специальные экономические зоны** — всего: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $lines[] = "{$i}. {$item['name']} — {$region}";
                    $i++;
                }
            }
        } else {
            $lines[] = "🏭 **Арнайы экономикалық аймақтар (АЭА)** — барлығы: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $lines[] = "{$i}. {$item['name']} — {$region}";
                    $i++;
                }
            }
        }

        return implode("\n", $lines);
    }

    // ─── Индустриалды аймақтар ────────────────────────────────

    protected function formatIndustrialZonesResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['industrial_zones'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по индустриальным зонам не найдены.'
                : 'Индустриалды аймақтар бойынша деректер табылмады.';
        }

        $total = $data['total_count'] ?? 0;
        $items = $data['items'] ?? [];

        $lines = [];

        if ($lang === 'ru') {
            $lines[] = "🏗️ **Индустриальные зоны** — всего: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $lines[] = "{$i}. {$item['name']} — {$region}";
                    $i++;
                }
            }
        } else {
            $lines[] = "🏗️ **Индустриалды аймақтар** — барлығы: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $lines[] = "{$i}. {$item['name']} — {$region}";
                    $i++;
                }
            }
        }

        return implode("\n", $lines);
    }

    // ─── Пром зоналар ─────────────────────────────────────────

    protected function formatPromZonesResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['prom_zones'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по промзонам не найдены.'
                : 'Пром зоналар бойынша деректер табылмады.';
        }

        $total = $data['total_count'] ?? 0;
        $items = $data['items'] ?? [];

        $lines = [];

        if ($lang === 'ru') {
            $lines[] = "🏭 **Промышленные зоны** — всего: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $lines[] = "{$i}. {$item['name']} — {$region}";
                    $i++;
                }
            }
        } else {
            $lines[] = "🏭 **Пром зоналар** — барлығы: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $lines[] = "{$i}. {$item['name']} — {$region}";
                    $i++;
                }
            }
        }

        return implode("\n", $lines);
    }

    // ─── Жер қойнауы ──────────────────────────────────────────

    protected function formatSubsoilUsersResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['subsoil_users'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по недропользователям не найдены.'
                : 'Жер қойнауын пайдаланушылар бойынша деректер табылмады.';
        }

        $total = $data['total_count'] ?? 0;
        $items = $data['items'] ?? [];

        $lines = [];

        if ($lang === 'ru') {
            $lines[] = "⛏️ **Недропользователи** — всего: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $bin = $item['bin'] ?? '';
                    $type = $item['mineral_type'] ?? '—';
                    $lines[] = "{$i}. {$item['name']}";
                    if ($bin) {
                        $lines[] = "   БИН: {$bin} | {$region} | {$type}";
                    }
                    $i++;
                }
            }
        } else {
            $lines[] = "⛏️ **Жер қойнауын пайдаланушылар** — барлығы: {$total}";
            if (! empty($items)) {
                $lines[] = '';
                $i = 1;
                foreach ($items as $item) {
                    $region = $item['region'] ?? '—';
                    $bin = $item['bin'] ?? '';
                    $type = $item['mineral_type'] ?? '—';
                    $lines[] = "{$i}. {$item['name']}";
                    if ($bin) {
                        $lines[] = "   БСН: {$bin} | {$region} | {$type}";
                    }
                    $i++;
                }
            }
        }

        return implode("\n", $lines);
    }

    // ─── Мәселелер ────────────────────────────────────────────

    protected function formatIssuesResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['issues'] ?? null;

        if (! $data || empty($data)) {
            return $lang === 'ru'
                ? 'Активных проблем не найдено.'
                : 'Белсенді мәселелер табылмады.';
        }

        $count = count($data);

        if ($lang === 'ru') {
            $lines = ["⚠️ **Активные проблемы** — всего: {$count}", ''];
            $i = 1;
            foreach ($data as $issue) {
                $status = $issue['status'] ?? '—';
                $title = $issue['title'] ?? '—';
                $lines[] = "{$i}. {$title} — {$status}";
                $i++;
            }
        } else {
            $lines = ["⚠️ **Белсенді мәселелер** — барлығы: {$count}", ''];
            $i = 1;
            foreach ($data as $issue) {
                $status = $issue['status'] ?? '—';
                $title = $issue['title'] ?? '—';
                $lines[] = "{$i}. {$title} — {$status}";
                $i++;
            }
        }

        return implode("\n", $lines);
    }

    // ─── Тапсырмалар ──────────────────────────────────────────

    protected function formatTasksResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['tasks'] ?? null;

        if (! $data || empty($data)) {
            return $lang === 'ru'
                ? 'Активных задач не найдено.'
                : 'Белсенді тапсырмалар табылмады.';
        }

        $count = count($data);

        if ($lang === 'ru') {
            $lines = ["📋 **Задачи** — всего: {$count}", ''];
            $i = 1;
            foreach ($data as $task) {
                $status = $task->status ?? '—';
                $project = $task->project_name ?? '—';
                $lines[] = "{$i}. {$task->title} — {$status} (проект: {$project})";
                $i++;
            }
        } else {
            $lines = ["📋 **Тапсырмалар** — барлығы: {$count}", ''];
            $i = 1;
            foreach ($data as $task) {
                $status = $task->status ?? '—';
                $project = $task->project_name ?? '—';
                $lines[] = "{$i}. {$task->title} — {$status} (жоба: {$project})";
                $i++;
            }
        }

        return implode("\n", $lines);
    }

    // ─── Пайдаланушылар ───────────────────────────────────────

    protected function formatUsersResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['users'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по пользователям не найдены.'
                : 'Пайдаланушылар бойынша деректер табылмады.';
        }

        $total = $data['total_users'] ?? 0;
        $roles = $data['roles'] ?? [];

        if ($lang === 'ru') {
            $lines = ["👤 **Пользователи** — всего: {$total}", ''];
            foreach ($roles as $role) {
                $lines[] = "• {$role['display_name']} ({$role['name']}): {$role['users_count']} чел.";
            }
        } else {
            $lines = ["👤 **Пайдаланушылар** — барлығы: {$total}", ''];
            foreach ($roles as $role) {
                $lines[] = "• {$role['display_name']} ({$role['name']}): {$role['users_count']} адам";
            }
        }

        return implode("\n", $lines);
    }

    // ─── Галерея ──────────────────────────────────────────────

    protected function formatGalleryResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['gallery'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по галерее не найдены.'
                : 'Галерея бойынша деректер табылмады.';
        }

        $total = $data['total_photos'] ?? 0;

        if ($lang === 'ru') {
            return "🖼️ **Галерея** — всего фотографий: {$total}";
        }

        return "🖼️ **Галерея** — барлық суреттер: {$total}";
    }

    // ─── Рейтинг ──────────────────────────────────────────────

    protected function formatRatingResponse(array $contextData, string $query, string $lang): string
    {
        $data = $contextData['rating'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Данные по рейтингу не найдены.'
                : 'Рейтинг бойынша деректер табылмады.';
        }

        $total = $data['total_ispolnitel'] ?? 0;

        if ($lang === 'ru') {
            return "⭐ **Рейтинг баскарма** — всего исполнителей: {$total}";
        }

        return "⭐ **Басқарма рейтингі** — барлық орындаушылар: {$total}";
    }

    // ─── Инвесторға ұсыныстар ─────────────────────────────────

    protected function formatSupportMeasuresResponse(array $contextData, string $lang): string
    {
        $items = $contextData['support_measures']['items'] ?? [];

        if (empty($items)) {
            return $lang === 'ru'
                ? 'Подходящие меры государственной поддержки не найдены.'
                : 'Сәйкес мемлекеттік қолдау шаралары табылмады.';
        }

        $lines = [
            $lang === 'ru'
                ? '💼 **Предварительно подходящие меры поддержки:**'
                : '💼 **Алдын ала сәйкес келетін қолдау шаралары:**',
        ];

        foreach ($items as $index => $item) {
            $title = $item[$lang === 'ru' ? 'title_ru' : 'title_kk'];
            $summary = $item[$lang === 'ru' ? 'summary_ru' : 'summary_kk'];
            $eligibility = $item[$lang === 'ru'
                ? 'eligibility_ru'
                : 'eligibility_kk'];
            $lines[] = ($index + 1).". **{$title}** — {$summary}";
            $lines[] = $lang === 'ru'
                ? "   Условие: {$eligibility}"
                : "   Шарты: {$eligibility}";
            $lines[] = "   {$item['operator']}: {$item['source_url']}";
        }

        $lines[] = '';
        $lines[] = $lang === 'ru'
            ? 'Условия программ меняются: перед подачей заявки подтвердите актуальные требования у оператора.'
            : 'Бағдарлама шарттары өзгеруі мүмкін: өтінім берер алдында өзекті талаптарды оператордан растаңыз.';

        return implode("\n", $lines);
    }

    protected function formatRegionalAssetsResponse(array $contextData, string $lang): string
    {
        $data = $contextData['regional_assets'] ?? null;
        $items = $data['items'] ?? [];

        if (! $data || empty($items)) {
            return $lang === 'ru'
                ? 'Подходящие региональные площадки в базе пока не найдены.'
                : 'Дерекқордан сәйкес өңірлік алаңдар әзірге табылмады.';
        }

        $region = $data['region'] ?? null;
        $heading = $lang === 'ru'
            ? '📍 **Региональные активы для рассмотрения**'
            : '📍 **Қарастыруға болатын өңір активтері**';
        $lines = [$region ? "{$heading} — {$region}:" : "{$heading}:"];
        $typeLabels = $lang === 'ru'
            ? [
                'sez' => 'СЭЗ',
                'industrial_zone' => 'индустриальная зона',
                'prom_zone' => 'промышленная зона',
            ]
            : [
                'sez' => 'АЭА',
                'industrial_zone' => 'индустриалды аймақ',
                'prom_zone' => 'пром аймақ',
            ];

        foreach ($items as $index => $item) {
            $type = $typeLabels[$item['type']] ?? $item['type'];
            $area = $item['total_area'] !== null
                ? number_format((float) $item['total_area'], 2, ',', ' ').' га'
                : '—';
            $infrastructure = empty($item['infrastructure'])
                ? '—'
                : implode(', ', $item['infrastructure']);
            $lines[] = ($index + 1).". **{$item['name']}** ({$type})";
            $lines[] = $lang === 'ru'
                ? "   {$item['region']} · статус: {$item['status']} · площадь: {$area} · инфраструктура: {$infrastructure}"
                : "   {$item['region']} · мәртебе: {$item['status']} · аумағы: {$area} · инфрақұрылым: {$infrastructure}";
        }

        $lines[] = '';
        $lines[] = $lang === 'ru'
            ? 'Свободную площадь и технические лимиты нужно подтвердить у управляющей организации выбранной площадки.'
            : 'Бос аумақ пен техникалық лимиттерді таңдалған алаңның басқарушы ұйымынан нақтылау қажет.';

        return implode("\n", $lines);
    }

    protected function formatOblastAnalyticsResponse(
        array $contextData,
        string $lang
    ): string {
        $data = $contextData['oblast_analytics'] ?? null;

        if (! $data) {
            return $lang === 'ru'
                ? 'Аналитические данные области не найдены.'
                : 'Облыстық аналитика деректері табылмады.';
        }

        $scope = $data['scope'] ?? [];
        $summary = $data['summary'] ?? [];
        $districts = array_slice($data['district_quality'] ?? [], 0, 3);
        $managements = array_slice(
            $data['management_quality'] ?? [],
            0,
            3
        );
        $niches = array_slice($data['niche_analytics'] ?? [], 0, 3);
        $potential = $data['regional_potential'] ?? [];
        $investment = number_format(
            (float) ($summary['total_investment'] ?? 0),
            0,
            ',',
            ' '
        );

        $lines = $lang === 'ru'
            ? [
                '📊 УПРАВЛЕНЧЕСКИЙ ОТЧЁТ — '.($scope['oblast_name'] ?? 'область'),
                'Проектов: '.($summary['total_projects'] ?? 0)
                    ." · инвестиции: {$investment} ₸"
                    .' · рабочих мест: '.($summary['jobs_count'] ?? 0),
                'На контроле: '.($summary['active_issues'] ?? 0)
                    .' активных проблем, '.($summary['overdue_tasks'] ?? 0)
                    .' просроченных задач.',
            ]
            : [
                '📊 БАСҚАРУШЫЛЫҚ ЕСЕП — '.($scope['oblast_name'] ?? 'облыс'),
                'Жоба: '.($summary['total_projects'] ?? 0)
                    ." · инвестиция: {$investment} ₸"
                    .' · жұмыс орны: '.($summary['jobs_count'] ?? 0),
                'Бақылауда: '.($summary['active_issues'] ?? 0)
                    .' белсенді мәселе, '.($summary['overdue_tasks'] ?? 0)
                    .' кешіктірілген тапсырма.',
            ];

        if ($districts !== []) {
            $lines[] = '';
            $lines[] = $lang === 'ru'
                ? 'Рейтинг районов/городов:'
                : 'Аудан/қала рейтингі:';
            foreach ($districts as $item) {
                $score = $item['score'] ?? ($lang === 'ru' ? 'нет данных' : 'дерек жоқ');
                $lines[] = "- {$item['name']}: {$score} балл"
                    ." · {$item['overdue_tasks']} "
                    .($lang === 'ru' ? 'просрочено' : 'кешіккен');
            }
        }

        if ($managements !== []) {
            $lines[] = '';
            $lines[] = $lang === 'ru'
                ? 'Качество работы управлений:'
                : 'Басқармалар жұмысының сапасы:';
            foreach ($managements as $item) {
                $score = $item['score'] ?? ($lang === 'ru' ? 'нет данных' : 'дерек жоқ');
                $lines[] = "- {$item['name']}: {$score} балл"
                    ." · {$item['completed_tasks']}/{$item['total_tasks']} "
                    .($lang === 'ru' ? 'задач выполнено' : 'тапсырма орындалды');
            }
        }

        if ($niches !== []) {
            $lines[] = '';
            $lines[] = $lang === 'ru'
                ? 'Ниши с наибольшим потенциалом:'
                : 'Әлеуеті жоғары нишалар:';
            foreach ($niches as $item) {
                $lines[] = "- {$item['name']}: {$item['potential_score']} балл"
                    ." · {$item['project_count']} "
                    .($lang === 'ru' ? 'проектов' : 'жоба');
            }
        }

        if (! empty($potential['insights'])) {
            $lines[] = '';
            $lines[] = $lang === 'ru' ? 'Рекомендации:' : 'Ұсыныстар:';
            foreach ($potential['insights'] as $insight) {
                $lines[] = '- '.$insight;
            }
        }

        return implode("\n", $lines);
    }

    // ─── Көмек / Бөлімдер ─────────────────────────────────────

    protected function buildHelpResponse(?User $user, string $lang): string
    {
        $roleName = $user?->roleModel?->name;

        $sections = $this->getHelpSections($roleName, $lang);
        $roleInfo = $this->rolesGuide($roleName, $lang);

        $lines = [];

        if ($lang === 'ru') {
            $lines[] = '💡 **Справка по системе Turkistan Invest**';
            $lines[] = '';
            $lines[] = $roleInfo;
            $lines[] = '';
            $lines[] = '**Доступные разделы:**';
            $lines[] = '';
            $lines[] = $sections;
            $lines[] = '';
            $lines[] = '**Примеры вопросов:**';
            $lines[] = '• «Сколько всего проектов?»';
            $lines[] = '• «Покажи проекты в Туркестанской области»';
            $lines[] = '• «Какие есть СЭЗ?»';
            $lines[] = '• «Сколько недропользователей?»';
            $lines[] = '• «Активные проблемы»';
            $lines[] = '• «Как добавить проект?»';
        } else {
            $lines[] = '💡 **Turkistan Invest жүйесі бойынша анықтама**';
            $lines[] = '';
            $lines[] = $roleInfo;
            $lines[] = '';
            $lines[] = '**Қолжетімді бөлімдер:**';
            $lines[] = '';
            $lines[] = $sections;
            $lines[] = '';
            $lines[] = '**Сұрау мысалдары:**';
            $lines[] = '• «Барлығы қанша жоба бар?»';
            $lines[] = '• «Түркістан облысындағы жобаларды көрсет»';
            $lines[] = '• «Қандай АЭА бар?»';
            $lines[] = '• «Қанша недропайдаланушы бар?»';
            $lines[] = '• «Белсенді мәселелер»';
            $lines[] = '• «Жобаны қалай қосуға болады?»';
        }

        return implode("\n", $lines);
    }

    /**
     * Рөл бойынша көмек бөлімдерін қайтару.
     */
    protected function getHelpSections(?string $roleName, string $lang): string
    {
        $all = [
            'dashboard' => $lang === 'ru'
                ? '🏠 **Панель управления** — главная страница, статистика проектов и инвестиций.'
                : '🏠 **Басқару тақтасы** — басты бет, жобалар мен инвестиция статистикасы.',
            'projects' => $lang === 'ru'
                ? '📌 **Инвестпроекты** — список, создание, редактирование проектов (3-шаговая форма).'
                : '📌 **Инвестициялық жобалар** — тізім, құру, өзгерту (3 қадамды форма).',
            'project_types' => $lang === 'ru'
                ? '📊 **Типы проектов** — управление категориями проектов.'
                : '📊 **Жоба түрлері** — жоба санаттарын басқару.',
            'sez' => $lang === 'ru'
                ? '🏭 **СЭЗ** — специальные экономические зоны, галерея, проблемы.'
                : '🏭 **АЭА** — арнайы экономикалық аймақтар, галерея, мәселелер.',
            'ia' => $lang === 'ru'
                ? '🏗️ **Индустриальные зоны** — список, галерея, проблемы.'
                : '🏗️ **Индустриалды аймақтар** — тізім, галерея, мәселелер.',
            'prom' => $lang === 'ru'
                ? '🏭 **Промзоны** — список, галерея, проблемы.'
                : '🏭 **Пром зоналар** — тізім, галерея, мәселелер.',
            'subsoil' => $lang === 'ru'
                ? '⛏️ **Недропользователи** — список, документы, галерея, задачи.'
                : '⛏️ **Жер қойнауын пайдаланушылар** — тізім, құжаттар, галерея, тапсырмалар.',
            'issues' => $lang === 'ru'
                ? '⚠️ **Проблемы** — все проблемы в одном месте (открытые, в работе, решённые).'
                : '⚠️ **Мәселелер** — барлық мәселелер бір жерде (ашық, орындалуда, шешілді).',
            'tasks' => $lang === 'ru'
                ? '📋 **Задачи** — назначение, выполнение, отчёты.'
                : '📋 **Тапсырмалар** — тағайындау, орындау, есеп беру.',
            'users' => $lang === 'ru'
                ? '👤 **Пользователи** — управление пользователями и ролями (superadmin).'
                : '👤 **Пайдаланушылар** — пайдаланушылар мен рөлдерді басқару (superadmin).',
            'rating' => $lang === 'ru'
                ? '⭐ **Рейтинг** — KPI исполнителей.'
                : '⭐ **Рейтинг** — орындаушылар KPI.',
            'notifications' => $lang === 'ru'
                ? '🔔 **Уведомления** — уведомления по задачам (также в Telegram).'
                : '🔔 **Хабарламалар** — тапсырма хабарламалары (Telegram арқылы да).',
            'settings' => $lang === 'ru'
                ? '⚙️ **Настройки** — профиль, пароль, аватар и Telegram.'
                : '⚙️ **Баптаулар** — профиль, құпия сөз, аватар және Telegram.',
            'investor_assistant' => $lang === 'ru'
                ? '🤖 **AI-консультант** — работает с доступными вашей роли данными, подбирает меры господдержки и площадки региона.'
                : '🤖 **AI көмекші** — рөліңізге қолжетімді деректермен жұмыс істеп, мемлекеттік қолдау шаралары мен өңір алаңдарын ұсынады.',
        ];

        $keys = match ($roleName) {
            'superadmin', 'prokuror' => array_keys($all),
            'invest' => ['dashboard', 'projects', 'project_types', 'sez', 'ia', 'prom', 'subsoil', 'issues', 'tasks', 'rating', 'notifications', 'settings'],
            'akim', 'zamakim' => ['dashboard', 'projects', 'project_types', 'sez', 'ia', 'prom', 'subsoil', 'issues', 'notifications', 'settings'],
            'ispolnitel' => ['dashboard', 'projects', 'tasks', 'issues', 'notifications', 'settings'],
            'investor' => ['dashboard', 'projects', 'tasks', 'investor_assistant', 'notifications', 'settings'],
            'moderator' => ['dashboard', 'projects', 'tasks', 'rating', 'investor_assistant', 'notifications', 'settings'],
            default => ['dashboard', 'notifications', 'settings'],
        };

        $lines = [];
        foreach ($keys as $key) {
            if (isset($all[$key])) {
                $lines[] = $all[$key];
            }
        }

        return implode("\n", $lines);
    }

    /**
     * Рөл туралы қысқаша ақпарат.
     */
    protected function rolesGuide(?string $roleName, string $lang): string
    {
        if ($lang === 'ru') {
            return match ($roleName) {
                'superadmin' => '🔐 Ваша роль: **Супер Админ** — полный доступ ко всем разделам системы.',
                'prokuror' => '🔐 Ваша роль: **Прокурор** — просмотр всех разделов и создание задач в дорожной карте проектов.',
                'invest' => '🔐 Ваша роль: **Invest Штаб** — управление проектами и прикреплённым сектором.',
                'akim' => '🔐 Ваша роль: **Аким** — просмотр проектов своего района/области.',
                'zamakim' => '🔐 Ваша роль: **Зам Аким** — только просмотр (read-only).',
                'ispolnitel' => '🔐 Ваша роль: **Исполнитель** — выполнение задач, загрузка фото/документов.',
                'investor' => '🔐 Ваша роль: **Инвестор** — просмотр назначенных проектов и выполнение назначенных задач.',
                'moderator' => '🔐 Ваша роль: **Модератор** — работа с проектами Turkistan Invest и проверка их задач.',
                default => '🔐 У вас ограниченный доступ.',
            };
        }

        return match ($roleName) {
            'superadmin' => '🔐 Сіздің рөліңіз: **Супер Админ** — жүйенің барлық бөліміне толық қолжетімділік.',
            'prokuror' => '🔐 Сіздің рөліңіз: **Прокурор** — барлық бөлімді қарайды және жобалардың жол картасына тапсырма қоса алады.',
            'invest' => '🔐 Сіздің рөліңіз: **Invest Штаб** — жобалар мен бекітілген секторды басқару.',
            'akim' => '🔐 Сіздің рөліңіз: **Аким** — өз ауданыңыз/облысыңыз бойынша жобаларды қарау.',
            'zamakim' => '🔐 Сіздің рөліңіз: **Зам Аким** — тек қарау (read-only).',
            'ispolnitel' => '🔐 Сіздің рөліңіз: **Орындаушы** — тапсырмаларды орындау, сурет/құжат жүктеу.',
            'investor' => '🔐 Сіздің рөліңіз: **Инвестор** — бекітілген жобаларды көру және берілген тапсырмаларды орындау.',
            'moderator' => '🔐 Сіздің рөліңіз: **Модератор** — Turkistan Invest жобаларымен жұмыс істеу және олардың тапсырмаларын тексеру.',
            default => '🔐 Сізде шектеулі қолжетімділік бар.',
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  Сұрауды талдау (entity extraction)
    // ═══════════════════════════════════════════════════════════

    public function analyzeQuery(string $query, ?User $user = null): array
    {
        $query = mb_strtolower($query);
        $entities = [];

        if (preg_match('/(регион|область|район|аймақ|облыс|аудан)/ui', $query)) {
            $entities[] = 'regions';
        }
        if (preg_match('/(проект|инвестиц|жоба|project|жобалар)/ui', $query)) {
            $entities[] = 'investment_projects';
        }
        if (preg_match('/(жоба түр|тип проект|project.?type|түрлері|категория|сала|отрасл)/ui', $query)) {
            $entities[] = 'project_types';
        }
        if (preg_match('/(сэз|сез|экономическ|зона|свободн|аэа)/ui', $query)) {
            $entities[] = 'sezs';
        }
        if (preg_match('/(индустриальн|промышленн|өндірістік|иа\b)/ui', $query)) {
            $entities[] = 'industrial_zones';
        }
        if (preg_match('/(пром.?зона|промзона|пром аймақ)/ui', $query)) {
            $entities[] = 'prom_zones';
        }
        if (preg_match('/(недропользовател|недро|участок|кен|қазба|жер қойнау|лицензия)/ui', $query)) {
            $entities[] = 'subsoil_users';
        }
        if (preg_match('/(проблем|вопрос|issue|мәселе|шешілмеген)/ui', $query)) {
            $entities[] = 'issues';
        }
        if (preg_match('/(задач|task|тапсырма|орында|поручен)/ui', $query)) {
            $entities[] = 'tasks';
        }
        if (preg_match('/(пайдаланушы|қолданушы|пользовател|user|рөл|роль|role|исполнител|аким|админ|invest)/ui', $query)) {
            $entities[] = 'users';
        }
        if (preg_match('/(фото|сурет|галерея|gallery|photo|image)/ui', $query)) {
            $entities[] = 'gallery';
        }
        if (preg_match('/(рейтинг|басқарма|kpi|бағалау|оценк)/ui', $query)) {
            $entities[] = 'rating';
        }
        if (preg_match('/(қолдау|жеңілдік|субсид|льгот|преференц|грант|кепіл|гарант|жеңілдетілген|господдерж|мемлекет.*көмек)/ui', $query)) {
            $entities[] = 'support_measures';
        }
        if (preg_match('/(өңір.*актив|регион.*актив|алаң|площадк|орналас|локац|жер телім|земельн.*участ|инфрақұрыл|инфраструктур|сэз|аэа|индустриал|пром.?зон)/ui', $query)) {
            $entities[] = 'regional_assets';
        }
        if (preg_match('/(статистик|санақ|қанша|сколько|неше|всего|жалпы|барлық|итого|тартылған|привлечен)/ui', $query)) {
            $entities[] = 'regions';
            $entities[] = 'investment_projects';
        }
        // Инвестиция көлемі / объём инвестиций
        if (preg_match('/(инвестиция|инвестиц|тартылған|привлечен|вложен|көлем|сумма)/ui', $query)) {
            $entities[] = 'investment_projects';
        }
        if (preg_match('/(қалай|как|помощ|көмек|не білесің|қандай|что ум|help|навигац|бөлім|раздел|менюдегі|функци)/ui', $query)) {
            $entities[] = 'help';
        }

        $roleName = $user?->roleModel?->name;
        if ($user?->isOblastScopedAkim()
            && preg_match('/(есеп|отч[её]т|аналитик|талдау|кеңес|совет|ұсыныс|рекомендац|әлеует|потенциал|ниша|сапа|качество|басқарма|управлен|әкімдік|акимат)/ui', $query)) {
            $entities[] = 'oblast_analytics';
        }

        $isInvestmentDiscovery = preg_match(
            '/(инвест|жоба|проект|бизнес|өндір|производ|зауыт|завод|орналастыр|размест|ашу|открыть)/ui',
            $query
        );

        if ($isInvestmentDiscovery) {
            $entities[] = 'support_measures';
            $entities[] = 'regional_assets';
        }

        if ($roleName === 'investor' && empty($entities)) {
            $entities[] = 'support_measures';
            $entities[] = 'regional_assets';
        }

        $entities = array_unique($entities);

        if ($user) {
            $allowed = $this->allowedEntitiesForUser($user);
            $entities = array_values(array_intersect($entities, $allowed));
        }

        return $entities;
    }

    public function allowedEntitiesForUser(?User $user): array
    {
        $roleName = $user?->roleModel?->name;
        $subRole = $user?->invest_sub_role;

        return match ($roleName) {
            'superadmin', 'prokuror' => [
                'regions', 'investment_projects', 'project_types',
                'sezs', 'industrial_zones', 'prom_zones', 'subsoil_users',
                'issues', 'tasks', 'users', 'gallery', 'rating', 'help',
                'support_measures', 'regional_assets',
            ],
            'invest' => match ($subRole) {
                'aea' => ['sezs', 'issues', 'gallery', 'help', 'support_measures', 'regional_assets'],
                'ia' => ['industrial_zones', 'issues', 'gallery', 'help', 'support_measures', 'regional_assets'],
                'prom_zone' => ['prom_zones', 'issues', 'gallery', 'help', 'support_measures', 'regional_assets'],
                default => [
                    'regions', 'investment_projects', 'project_types',
                    'sezs', 'industrial_zones', 'prom_zones', 'subsoil_users',
                    'issues', 'tasks', 'gallery', 'rating', 'help',
                    'support_measures', 'regional_assets',
                ],
            },
            'akim' => array_merge([
                'regions', 'investment_projects', 'project_types',
                'sezs', 'industrial_zones', 'prom_zones', 'subsoil_users',
                'issues', 'gallery', 'help', 'support_measures',
                'regional_assets',
            ], $user?->isOblastScopedAkim()
                ? ['tasks', 'rating', 'oblast_analytics']
                : []),
            'zamakim' => [
                'regions', 'investment_projects', 'project_types',
                'sezs', 'industrial_zones', 'prom_zones', 'subsoil_users',
                'issues', 'gallery', 'help', 'support_measures',
                'regional_assets',
            ],
            'ispolnitel' => ['investment_projects', 'tasks', 'issues', 'gallery', 'help', 'support_measures', 'regional_assets'],
            'investor' => ['investment_projects', 'tasks', 'gallery', 'help', 'support_measures', 'regional_assets'],
            'moderator' => ['investment_projects', 'tasks', 'issues', 'gallery', 'rating', 'help', 'support_measures', 'regional_assets'],
            default => ['help'],
        };
    }
}
