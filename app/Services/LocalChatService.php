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
                ? '⚙️ **Настройки** — профиль, пароль, аватар, 2FA.'
                : '⚙️ **Баптаулар** — профиль, құпия сөз, аватар, 2FA.',
        ];

        $keys = match ($roleName) {
            'superadmin' => array_keys($all),
            'invest' => ['dashboard', 'projects', 'project_types', 'sez', 'ia', 'prom', 'subsoil', 'issues', 'tasks', 'rating', 'notifications', 'settings'],
            'akim', 'zamakim' => ['dashboard', 'projects', 'project_types', 'sez', 'ia', 'prom', 'subsoil', 'issues', 'notifications', 'settings'],
            'ispolnitel' => ['dashboard', 'projects', 'tasks', 'issues', 'notifications', 'settings'],
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
                'invest' => '🔐 Ваша роль: **Invest Штаб** — управление проектами и прикреплённым сектором.',
                'akim' => '🔐 Ваша роль: **Аким** — просмотр проектов своего района/области.',
                'zamakim' => '🔐 Ваша роль: **Зам Аким** — только просмотр (read-only).',
                'ispolnitel' => '🔐 Ваша роль: **Исполнитель** — выполнение задач, загрузка фото/документов.',
                default => '🔐 У вас ограниченный доступ.',
            };
        }

        return match ($roleName) {
            'superadmin' => '🔐 Сіздің рөліңіз: **Супер Админ** — жүйенің барлық бөліміне толық қолжетімділік.',
            'invest' => '🔐 Сіздің рөліңіз: **Invest Штаб** — жобалар мен бекітілген секторды басқару.',
            'akim' => '🔐 Сіздің рөліңіз: **Аким** — өз ауданыңыз/облысыңыз бойынша жобаларды қарау.',
            'zamakim' => '🔐 Сіздің рөліңіз: **Зам Аким** — тек қарау (read-only).',
            'ispolnitel' => '🔐 Сіздің рөліңіз: **Орындаушы** — тапсырмаларды орындау, сурет/құжат жүктеу.',
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
            'superadmin' => [
                'regions', 'investment_projects', 'project_types',
                'sezs', 'industrial_zones', 'prom_zones', 'subsoil_users',
                'issues', 'tasks', 'users', 'gallery', 'rating', 'help',
            ],
            'invest' => match ($subRole) {
                'aea' => ['sezs', 'issues', 'gallery', 'help'],
                'ia' => ['industrial_zones', 'issues', 'gallery', 'help'],
                'prom_zone' => ['prom_zones', 'issues', 'gallery', 'help'],
                default => [
                    'regions', 'investment_projects', 'project_types',
                    'sezs', 'industrial_zones', 'prom_zones', 'subsoil_users',
                    'issues', 'tasks', 'gallery', 'rating', 'help',
                ],
            },
            'akim', 'zamakim' => [
                'regions', 'investment_projects', 'project_types',
                'sezs', 'industrial_zones', 'prom_zones', 'subsoil_users',
                'issues', 'gallery', 'help',
            ],
            'ispolnitel' => ['investment_projects', 'tasks', 'issues', 'gallery', 'help'],
            default => ['help'],
        };
    }
}
