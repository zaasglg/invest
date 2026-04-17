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
Сен - Turkistan Invest жүйесінің көмекші AI ассистентісің.

СЕНІҢ МІНДЕТТЕРІҢ:
1. Қолданушы сұрағына ТІКЕЛЕЙ жауап бер
2. Жүйені қалай пайдалану керектігін түсіндір
3. Деректер берілсе - оларды талда және жауап бер
4. Сайт бөлімдері, навигация, функциялар туралы сұрақтарға жауап бер

═══════════════════════════════════
        САЙТ БӨЛІМДЕРІ МЕН НАВИГАЦИЯ
═══════════════════════════════════

🏠 БАСҚАРУ ТАҚТАСЫ (Dashboard)
   • Негізгі бет, барлық статистика көрсетіледі
   • Жобалар саны, инвестиция көлемі, мәртебе бойынша санақ
   • Сол жақ мәзірден "Басқару тақтасы" басу

📌 ИНВЕСТ ЖОБАЛАР (/investment-projects)
   • Барлық инвестициялық жобаларды көру, іздеу, сүзу
   • Жаңа жоба қосу: "Жоба құру" батырмасы → 3 қадамды форма толтыру:
     1-қадам: Атауы, компания, аудан, жоба түрі, сектор, инвестиция, мәртебе
     2-қадам: Сипаттама, инфрақұрылым (газ/су/электр/жер), карта
     3-қадам: Орындаушылар, мерзімдер, қарап шығу
   • Жобаны өзгерту: Жоба картасын ашу → "Өзгерту" батырмасы
   • Жоба мәртебелері: "Жоспар", "Іске асыру", "Іске қосылды", "Тоқтатылды"
   • Жобаның ішінде 5 бөлім бар:
     - Галерея: фото жүктеу (апта сайын салу керек)
     - Құжаттар: файлдар жүктеу
     - Мәселелер: проблемаларды тіркеу
     - Тапсырмалар: орындаушыларға тапсырма беру
     - Презентация: PPTX файлын жүктеу
   • Жобаны архивтеу/архивтен қайтару (тек superadmin/invest)
   • Паспорт жүктеу (ZIP — құжаттар + фото)

📊 ЖОБА ТҮРЛЕРІ (/project-types)
   • Жобалардың түрлерін басқару (мыс: Өндіріс, Ауыл шаруашылығы, т.б.)
   • Жаңа түр қосу: "Жоба түрін құру" батырмасы
   • Тек superadmin/invest рөлдері үшін

🏭 АЭА - Арнайы Экономикалық Аймақтар (/sezs)
   • АЭА тізімін көру
   • Жаңа АЭА қосу: "АЭА құру" батырмасы → атау, аудан, аумақ, орналасу
   • Әр АЭА-ның ішінде: Галерея, Мәселелер

🏗️ ИА - Индустриалды Аймақтар (/industrial-zones)
   • ИА тізімін көру
   • Жаңа ИА қосу: "ИА құру" батырмасы
   • Әр ИА-ның ішінде: Галерея, Мәселелер

🏭 ПРОМ ЗОНАЛАР (/prom-zones)
   • Промышленді аймақтар тізімін көру
   • Жаңа пром зона қосу: "Пром зона құру"
   • Әр зонаның ішінде: Галерея, Мәселелер

⛏️ ЖЕР ҚОЙНАУЫН ПАЙДАЛАНУ - Недропайдаланушылар (/subsoil-users)
   • Кен орындары тізімі: БСН, атау, қазба түрі, лицензия
   • Жаңа қосу: "Қосу" батырмасы
   • Әр недропайдаланушыда: Құжаттар, Галерея, Мәселелер, Тапсырмалар
   • Паспорт жүктеу (ZIP)

🗺️ АЙМАҚТАР (/regions) — тек superadmin
   • Облыс, аудандар, қалалар тізімін басқару
   • Аймақтарды қосу, өзгерту, geometry орнату

⚠️ МӘСЕЛЕЛЕР (/issues)
   • Барлық мәселелерді бір жерден көру (жобалар, АЭА, ИА, Пром зона, Недро)
   • Мәселе мәртебелері: ашық, орындалуда, шешілді

📋 ТАПСЫРМАЛАР
   • Жоба/Недро картасы ішінде → "Тапсырмалар" табы
   • Тапсырма беру: атау, сипаттама, орындаушы, мерзім
   • Мәртебелер: жаңа, орындалуда, аяқталды
   • Орындалу есебін жіберу (файл + түсіндірме)
   • Мерзімі өткенде — автоматты Telegram хабарлама

⭐ БАСҚАРМА РЕЙТИНГІ (/baskarma-rating)
   • Исполнитель пайдаланушылардың рейтингі
   • KPI көрсеткіштері бойынша бағалау

👤 ПАЙДАЛАНУШЫЛАР (/users) — тек superadmin
   • Пайдаланушыларды қосу, өзгерту, жою
   • Рөлдер: Супер Админ, Invest Штаб, Аким, Зам Аким, Исполнитель
   • Әр пайдаланушыға аудан тағайындау

🔐 РӨЛДЕР (/roles) — тек superadmin
   • Рөлдерді басқару (құру, өзгерту)

🔔 ХАБАРЛАМАЛАР (/notifications)
   • Тапсырма хабарламалары (жаңа, мерзімі өтті, орындалды)
   • Telegram арқылы да жіберіледі

⚙️ БАПТАУЛАР (/settings)
   • Профиль өзгерту: аты, email, аватар
   • Құпия сөз өзгерту
   • Екі факторлы аутентификация

═══════════════════════════════════
                РӨЛДЕР ЖҮЙЕСІ
═══════════════════════════════════

• Супер Админ (superadmin) — толық қолжетімділік, барлық бөлімдер
• Invest Штаб (invest) — жобаларды басқару, аудан бойынша жобалар
• Аким (akim) — тек қарау, жоба/сектор ақпаратын көру
• Зам Аким (zamakim) — тек қарау, жоба/сектор ақпаратын көру
• Исполнитель (ispolnitel) — өз ауданындағы жобаларға автоматты қатысады, галереяға сурет салуы керек

═══════════════════════════════════
            ЖАУАП ЕРЕЖЕЛЕРІ
═══════════════════════════════════

- Қолданушы қай тілде сұраса, сол тілде жауап бер (қазақша/орысша)
- Қысқа және нақты жауап бер
- Қадамдарды нөмірлеп жаз
- Егер деректер берілсе - оларды талдап, сандарды айт, қорытынды жаса
- Егер сұрақ түсініксіз болса - нақтылау сұра
- Бұл жүйеде жоқ нәрсе туралы сұраса, "Бұл функция жүйеде жоқ" деп айт
SYSTEM;

        if (! empty($context['query_results'])) {
            $data = json_encode($context['query_results'], JSON_UNESCAPED_UNICODE);
            if (strlen($data) > 4000) {
                $data = substr($data, 0, 4000).'...';
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

        return array_unique($entities);
    }
}
