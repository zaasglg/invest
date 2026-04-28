<?php

namespace App\Services;

use App\Models\User;
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

    public function chat(string $message, array $context = [], ?User $user = null): string
    {
        $systemPrompt = $this->buildSystemPrompt($context, $user);

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

    protected function buildSystemPrompt(array $context, ?User $user = null): string
    {
        $roleName = $user?->roleModel?->name;
        $subRole = $user?->invest_sub_role;

        $prompt = $this->basePrompt();
        $prompt .= "\n\n".$this->sectionsForRole($roleName, $subRole, $user);
        $prompt .= "\n\n".$this->rolesGuide($roleName);
        $prompt .= "\n\n".$this->answerRules();

        if (! empty($context['query_results'])) {
            $data = json_encode($context['query_results'], JSON_UNESCAPED_UNICODE);
            if (strlen($data) > 4000) {
                $data = substr($data, 0, 4000).'...';
            }
            $prompt .= "\n\n--- ЖҮЙЕДЕН АЛЫНҒАН ДЕРЕКТЕР ---\n".$data;
        }

        return $prompt;
    }

    protected function basePrompt(): string
    {
        return <<<'TXT'
Сен - Turkistan Invest жүйесінің көмекші AI ассистентісің.

СЕНІҢ МІНДЕТТЕРІҢ:
1. Қолданушы сұрағына ТІКЕЛЕЙ жауап бер
2. Жүйені қалай пайдалану керектігін түсіндір
3. Деректер берілсе - оларды талда және жауап бер
4. Тек қолданушының рөліне қатысты бөлімдер бойынша ғана кеңес бер
TXT;
    }

    protected function answerRules(): string
    {
        return <<<'TXT'
═══════════════════════════════════
            ЖАУАП ЕРЕЖЕЛЕРІ
═══════════════════════════════════

- Қолданушы қай тілде сұраса, сол тілде жауап бер (қазақша/орысша)
- Қысқа және нақты жауап бер
- Қадамдарды нөмірлеп жаз
- Егер деректер берілсе - оларды талдап, сандарды айт, қорытынды жаса
- Егер сұрақ түсініксіз болса - нақтылау сұра
- Пайдаланушының рөлінде жоқ бөлім туралы сұраса: "Бұл бөлімге сіздің рөліңізде қолжетімділік жоқ" деп жауап бер
- Бұл жүйеде жоқ нәрсе туралы сұраса, "Бұл функция жүйеде жоқ" деп айт
TXT;
    }

    protected function rolesGuide(?string $roleName): string
    {
        return match ($roleName) {
            'superadmin' => <<<'TXT'
СЕНІҢ РӨЛІҢ: Супер Админ — жүйеге толық қолжетімділік.
TXT,
            'invest' => <<<'TXT'
СЕНІҢ РӨЛІҢ: Invest Штаб — инвестициялық жобалар мен өзіңе бекітілген секторды басқару.
TXT,
            'akim' => <<<'TXT'
СЕНІҢ РӨЛІҢ: Аким — өз ауданы/облысы бойынша жобалар мен ақпаратты қарау.
TXT,
            'zamakim' => <<<'TXT'
СЕНІҢ РӨЛІҢ: Зам Аким — тек қарау (read-only) рөлі. Сіз жүйеде ештеңе қосып, өзгерте немесе жоя алмайсыз. Тек жобаларды, секторларды, мәселелерді көре аласыз.
TXT,
            'ispolnitel' => <<<'TXT'
СЕНІҢ РӨЛІҢ: Исполнитель.
Қалай жұмыс істейді:
1. Invest штаб немесе superadmin сізге тапсырма береді — ол хабарлама ретінде келеді.
2. Тапсырма келген соң сіз АВТОМАТТЫ түрде сол жобаның ОРЫНДАУШЫСЫ боласыз.
3. Орындаушы болған соң сіз сол жобаға:
   • Сурет (галереяға) жүктей аласыз
   • Құжат жүктей аласыз
   • Мәселе (проблема) қоса аласыз
   • Тапсырма бойынша есеп жібере аласыз
4. БІРАҚ: өзіңіз жүктеген сурет/құжат/мәселені ӨШІРЕ АЛМАЙСЫЗ. Өшіруді тек Invest немесе superadmin жасайды.
5. Сіз тек өзіңіз орындаушы болған жобаларды ғана көресіз.
TXT,
            default => '',
        };
    }

    /**
     * Рөл/суб-рөл бойынша ТЕК қажетті бөлімдерді қайтарады.
     * Бұл prompt көлемін кішірейтіп, лимитті үнемдейді.
     */
    protected function sectionsForRole(?string $roleName, ?string $subRole, ?User $user): string
    {
        // Барлық бөлімдер реестрі
        $sections = [
            'dashboard' => $this->sectionDashboard(),
            'projects' => $this->sectionProjects(),
            'project_types' => $this->sectionProjectTypes(),
            'sez' => $this->sectionSez(),
            'ia' => $this->sectionIa(),
            'prom' => $this->sectionProm(),
            'subsoil' => $this->sectionSubsoil(),
            'regions' => $this->sectionRegions(),
            'issues' => $this->sectionIssues(),
            'tasks' => $this->sectionTasks(),
            'rating' => $this->sectionRating(),
            'users' => $this->sectionUsers(),
            'roles' => $this->sectionRoles(),
            'notifications' => $this->sectionNotifications(),
            'settings' => $this->sectionSettings(),
        ];

        // Рөлге қарай қай бөлімдерді қосу керектігін анықтау
        $keys = match ($roleName) {
            'superadmin' => array_keys($sections),

            'invest' => match ($subRole) {
                'aea' => ['dashboard', 'sez', 'issues', 'notifications', 'settings'],
                'ia' => ['dashboard', 'ia', 'issues', 'notifications', 'settings'],
                'prom_zone' => ['dashboard', 'prom', 'issues', 'notifications', 'settings'],
                // turkistan_invest немесе null — толық Invest доступы
                default => [
                    'dashboard', 'projects', 'project_types',
                    'sez', 'ia', 'prom', 'subsoil',
                    'issues', 'tasks', 'rating', 'notifications', 'settings',
                ],
            },

            'akim', 'zamakim' => [
                'dashboard', 'projects', 'project_types',
                'sez', 'ia', 'prom', 'subsoil', 'regions',
                'issues', 'notifications', 'settings',
            ],

            'ispolnitel' => [
                'dashboard', 'projects', 'tasks', 'issues', 'notifications', 'settings',
            ],

            default => ['dashboard', 'notifications', 'settings'],
        };

        $parts = [];
        foreach ($keys as $key) {
            if (isset($sections[$key])) {
                $parts[] = $sections[$key];
            }
        }

        $header = "═══════════════════════════════════\n        СІЗГЕ ҚОЛЖЕТІМДІ БӨЛІМДЕР\n═══════════════════════════════════\n";

        // Аким/исполнитель үшін қосымша scope ескертпесі
        $scopeNote = '';
        if ($user) {
            if ($roleName === 'akim' || $roleName === 'zamakim') {
                $user->loadMissing('region');
                $regionName = $user->region?->name;
                if ($regionName) {
                    $type = $user->region?->type === 'oblast' ? 'облыс' : 'аудан/қала';
                    $viewOnly = $roleName === 'zamakim' ? ' (тек қарау режимі — өзгерту/қосу/өшіру мүмкін емес)' : '';
                    $scopeNote = "\n⚠️ Сіз тек {$regionName} ({$type}) бойынша ғана ақпарат көре аласыз{$viewOnly}.\n";
                }
            } elseif ($roleName === 'ispolnitel') {
                $scopeNote = "\n⚠️ Сіз тек өзіңіз орындаушы/куратор болған жобалар мен тапсырмаларды көре аласыз.\n";
            } elseif ($roleName === 'invest' && in_array($subRole, ['aea', 'ia', 'prom_zone'], true)) {
                $map = ['aea' => 'АЭА', 'ia' => 'Индустриалды аймақтар', 'prom_zone' => 'Пром зоналар'];
                $scopeNote = "\n⚠️ Сіз тек {$map[$subRole]} секторы бойынша ғана жауап бересіз.\n";
            }
        }

        return $header.$scopeNote."\n".implode("\n\n", $parts);
    }

    // ===== Жеке бөлімдер (кішкентай, тек қажетіне ғана қосылады) =====

    protected function sectionDashboard(): string
    {
        return <<<'TXT'
🏠 БАСҚАРУ ТАҚТАСЫ (Dashboard)
   • Негізгі бет, статистика: жобалар саны, инвестиция көлемі, мәртебе бойынша санақ
   • Сол жақ мәзірден "Басқару тақтасы" батырмасы
TXT;
    }

    protected function sectionProjects(): string
    {
        return <<<'TXT'
📌 ИНВЕСТ ЖОБАЛАР (/investment-projects)
   • Барлық инвестициялық жобаларды көру, іздеу, сүзу
   • Жаңа жоба қосу: "Жоба құру" → 3 қадамды форма:
     1-қадам: Атауы, компания, аудан, жоба түрі, сектор, инвестиция, мәртебе
     2-қадам: Сипаттама, инфрақұрылым (газ/су/электр/жер), карта
     3-қадам: Орындаушылар, мерзімдер, қарап шығу
   • Жоба мәртебелері: "Жоспар", "Іске асыру", "Іске қосылды", "Тоқтатылды"
   • Жоба ішіндегі табтар: Галерея, Құжаттар, Мәселелер, Тапсырмалар, Презентация
   • Архивтеу/қайтару (superadmin/invest)
   • Паспорт жүктеу (ZIP — құжаттар + фото)
TXT;
    }

    protected function sectionProjectTypes(): string
    {
        return <<<'TXT'
📊 ЖОБА ТҮРЛЕРІ (/project-types)
   • Жобалардың түрлерін басқару (Өндіріс, Ауыл шаруашылығы, т.б.)
   • Жаңа түр қосу: "Жоба түрін құру"
   • Тек superadmin/invest үшін
TXT;
    }

    protected function sectionSez(): string
    {
        return <<<'TXT'
🏭 АЭА - Арнайы Экономикалық Аймақтар (/sezs)
   • АЭА тізімін көру
   • Жаңа АЭА қосу: "АЭА құру" → атау, аудан, аумақ, орналасу
   • Әр АЭА ішінде: Галерея, Мәселелер
TXT;
    }

    protected function sectionIa(): string
    {
        return <<<'TXT'
🏗️ ИА - Индустриалды Аймақтар (/industrial-zones)
   • ИА тізімін көру
   • Жаңа ИА қосу: "ИА құру"
   • Әр ИА ішінде: Галерея, Мәселелер
TXT;
    }

    protected function sectionProm(): string
    {
        return <<<'TXT'
🏭 ПРОМ ЗОНАЛАР (/prom-zones)
   • Пром аймақтар тізімін көру
   • Жаңа пром зона қосу: "Пром зона құру"
   • Әр зонаның ішінде: Галерея, Мәселелер
TXT;
    }

    protected function sectionSubsoil(): string
    {
        return <<<'TXT'
⛏️ ЖЕР ҚОЙНАУЫН ПАЙДАЛАНУ (/subsoil-users)
   • Кен орындары: БСН, атау, қазба түрі, лицензия
   • Жаңа қосу: "Қосу" батырмасы
   • Әр недропайдаланушыда: Құжаттар, Галерея, Мәселелер, Тапсырмалар
   • Паспорт жүктеу (ZIP)
TXT;
    }

    protected function sectionRegions(): string
    {
        return <<<'TXT'
🗺️ АЙМАҚТАР (/regions) — тек superadmin
   • Облыс, аудан, қалалар тізімі
   • Қосу, өзгерту, geometry орнату
TXT;
    }

    protected function sectionIssues(): string
    {
        return <<<'TXT'
⚠️ МӘСЕЛЕЛЕР (/issues)
   • Барлық мәселелерді бір жерден көру
   • Мәртебелер: ашық, орындалуда, шешілді
TXT;
    }

    protected function sectionTasks(): string
    {
        return <<<'TXT'
📋 ТАПСЫРМАЛАР
   • Жоба/Недро ішінде "Тапсырмалар" табы
   • Тапсырма беру: атау, сипаттама, орындаушы, мерзім
   • Мәртебелер: жаңа, орындалуда, аяқталды
   • Есеп жіберу (файл + түсіндірме)
   • Мерзімі өткенде — автоматты Telegram хабарлама
   • ИСПОЛНИТЕЛЬ: тапсырма түскен жобаның орындаушысы автоматты болады;
     жобаға сурет/құжат/мәселе қоса алады, бірақ оларды ӨШІРЕ АЛМАЙДЫ.
TXT;
    }

    protected function sectionRating(): string
    {
        return <<<'TXT'
⭐ БАСҚАРМА РЕЙТИНГІ (/baskarma-rating)
   • Исполнитель пайдаланушылардың KPI рейтингі
TXT;
    }

    protected function sectionUsers(): string
    {
        return <<<'TXT'
👤 ПАЙДАЛАНУШЫЛАР (/users) — тек superadmin
   • Қосу, өзгерту, жою
   • Рөлдер: Супер Админ, Invest Штаб, Аким, Зам Аким, Исполнитель
   • Әр пайдаланушыға аудан тағайындау
TXT;
    }

    protected function sectionRoles(): string
    {
        return <<<'TXT'
🔐 РӨЛДЕР (/roles) — тек superadmin
   • Рөлдерді құру, өзгерту
TXT;
    }

    protected function sectionNotifications(): string
    {
        return <<<'TXT'
🔔 ХАБАРЛАМАЛАР (/notifications)
   • Тапсырма хабарламалары (жаңа, мерзімі өтті, орындалды)
   • Telegram арқылы да жіберіледі
TXT;
    }

    protected function sectionSettings(): string
    {
        return <<<'TXT'
⚙️ БАПТАУЛАР / ПРОФИЛЬ (/settings/profile)
Әр пайдаланушы өз аккаунтын өзі басқарады:
   • Аты-жөнін өзгерту: /settings/profile → "Толық аты" өрісі → Сақтау
   • Email өзгерту: /settings/profile → "Email" өрісі → Сақтау
     (email өзгергеннен кейін қайта растау қажет болуы мүмкін)
   • Аватар (сурет) жүктеу/ауыстыру: /settings/profile → аватар суретіне басу → жаңа файл таңдау
   • Аватарды өшіру: аватардың қасындағы "Жою" батырмасы
   • Құпия сөзді өзгерту: /settings/password → ескі құпия сөз + жаңа құпия сөз (2 рет) → Сақтау
   • Екі факторлы аутентификацияны қосу/өшіру: /settings/profile → "2FA" бөлімі
   • Telegram-ды байланыстыру (хабарламалар үшін): профильде Telegram chat_id өрісі
   • Өз аккаунтын өшіру: /settings/profile → төменгі жақта "Аккаунтты өшіру" (DELETE)
     ескерту: бұл әрекет қайтарылмайды, құпия сөзбен растау қажет
   • БАСҚА адамның аккаунтын өшіру/өзгерту тек superadmin-ге рұқсат (/users бөлімінде)
TXT;
    }

    /**
     * Рөлге қарай рұқсат етілген entity-лерді қайтарады.
     * Рөлінде жоқ бөлімдер бойынша сұраныс жіберілмейді — бұл лимитті үнемдейді.
     */
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

    public function analyzeQuery(string $query, ?User $user = null): array
    {
        $query = mb_strtolower($query);
        $entities = [];

        // Аймақтар
        if (preg_match('/(регион|область|район|аймақ|облыс|аудан)/ui', $query)) {
            $entities[] = 'regions';
        }
        // Жобалар
        if (preg_match('/(проект|инвестиц|жоба|project|жобалар)/ui', $query)) {
            $entities[] = 'investment_projects';
        }
        // Жоба түрлері
        if (preg_match('/(жоба түр|тип проект|project.?type|түрлері|категория|сала|отрасл)/ui', $query)) {
            $entities[] = 'project_types';
        }
        // СЭЗ
        if (preg_match('/(сэз|сез|экономическ|зона|свободн|аэа)/ui', $query)) {
            $entities[] = 'sezs';
        }
        // Индустриалды аймақтар
        if (preg_match('/(индустриальн|промышленн|өндірістік|иа\b)/ui', $query)) {
            $entities[] = 'industrial_zones';
        }
        // Пром зоналар
        if (preg_match('/(пром.?зона|промзона|пром аймақ)/ui', $query)) {
            $entities[] = 'prom_zones';
        }
        // Недропайдаланушылар
        if (preg_match('/(недропользовател|недро|участок|кен|қазба|жер қойнау|лицензия)/ui', $query)) {
            $entities[] = 'subsoil_users';
        }
        // Мәселелер
        if (preg_match('/(проблем|вопрос|issue|мәселе|шешілмеген)/ui', $query)) {
            $entities[] = 'issues';
        }
        // Тапсырмалар
        if (preg_match('/(задач|task|тапсырма|орында|поручен)/ui', $query)) {
            $entities[] = 'tasks';
        }
        // Пайдаланушылар / Рөлдер
        if (preg_match('/(пайдаланушы|қолданушы|пользовател|user|рөл|роль|role|исполнител|аким|админ|invest)/ui', $query)) {
            $entities[] = 'users';
        }
        // Галерея / фото
        if (preg_match('/(фото|сурет|галерея|gallery|photo|image)/ui', $query)) {
            $entities[] = 'gallery';
        }
        // Рейтинг / Басқарма
        if (preg_match('/(рейтинг|басқарма|kpi|бағалау|оценк)/ui', $query)) {
            $entities[] = 'rating';
        }
        // Статистика
        if (preg_match('/(статистик|санақ|қанша|сколько|неше|всего|жалпы|барлық|итого)/ui', $query)) {
            $entities[] = 'regions';
            $entities[] = 'investment_projects';
        }
        // Навигация / Көмек
        if (preg_match('/(қалай|как|помощ|көмек|не білесің|қандай|что ум|help|навигац|бөлім|раздел|менюдегі|функци)/ui', $query)) {
            $entities[] = 'help';
        }

        $entities = array_unique($entities);

        // Рөл бойынша сүзу — қолданушыға тиесілі емес деректер сұралмайды
        if ($user) {
            $allowed = $this->allowedEntitiesForUser($user);
            $entities = array_values(array_intersect($entities, $allowed));
        }

        return $entities;
    }
}
