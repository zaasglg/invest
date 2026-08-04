<?php

namespace App\Services;

use App\Models\IndustrialZone;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Sez;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class InvestmentRecommendationService
{
    /**
     * Return a preliminary, query-aware selection of official support tools.
     * Final eligibility must always be checked with the programme operator.
     */
    public function supportMeasures(string $query, ?User $user = null): array
    {
        $user?->loadMissing('company');

        $searchText = mb_strtolower(implode(' ', array_filter([
            $query,
            $user?->company?->activity_type,
        ])));

        $measures = collect($this->supportMeasureCatalog())
            ->map(function (array $measure) use ($searchText): array {
                $measure['relevance'] = collect($measure['keywords'])
                    ->filter(fn (string $keyword): bool => mb_stripos($searchText, $keyword) !== false)
                    ->count();

                return $measure;
            })
            ->sortByDesc('relevance')
            ->take(4)
            ->map(function (array $measure): array {
                unset($measure['keywords'], $measure['relevance']);

                return $measure;
            })
            ->values()
            ->all();

        return [
            'is_preliminary' => true,
            'items' => $measures,
        ];
    }

    /**
     * Suggest real regional sites from the platform database.
     */
    public function regionalAssets(string $query, ?User $user = null): array
    {
        $user?->loadMissing('company');
        $regionId = $this->resolveRegionId($query, $user);
        $searchText = mb_strtolower(implode(' ', array_filter([
            $query,
            $user?->company?->activity_type,
        ])));

        $assets = collect()
            ->concat($this->zoneAssets(Sez::query(), 'sez', $regionId))
            ->concat($this->zoneAssets(
                IndustrialZone::query(),
                'industrial_zone',
                $regionId
            ))
            ->concat($this->zoneAssets(
                PromZone::query(),
                'prom_zone',
                $regionId
            ))
            ->map(function (array $asset) use ($searchText): array {
                $asset['relevance'] = $this->assetRelevance(
                    $asset,
                    $searchText
                );

                return $asset;
            });

        $statusOrder = ['active' => 0, 'developing' => 1, 'planned' => 2];
        $items = $assets
            ->sortBy(fn (array $asset): string => sprintf(
                '%06d-%d-%06d',
                999999 - $asset['relevance'],
                $statusOrder[$asset['status']] ?? 9,
                $asset['projects_count']
            ))
            ->take(10)
            ->map(function (array $asset): array {
                unset($asset['relevance']);

                return $asset;
            })
            ->values()
            ->all();

        return [
            'region' => $regionId ? Region::find($regionId)?->name : null,
            'total_count' => $assets->count(),
            'items' => $items,
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    private function zoneAssets(
        Builder $query,
        string $type,
        ?int $regionId
    ): Collection {
        return $query
            ->with('region:id,name')
            ->withCount('investmentProjects')
            ->when(
                $regionId,
                fn (Builder $assetQuery, int $id): Builder => $assetQuery
                    ->whereHas(
                        'region',
                        fn (Builder $region): Builder => $region
                            ->whereKey($id)
                            ->orWhere('parent_id', $id)
                    )
            )
            ->get()
            ->map(fn ($zone): array => [
                'type' => $type,
                'id' => $zone->id,
                'name' => $zone->name,
                'region' => $zone->region?->name,
                'status' => $zone->status,
                'total_area' => $zone->total_area !== null
                    ? (float) $zone->total_area
                    : null,
                'projects_count' => $zone->investment_projects_count,
                'infrastructure' => $this->availableInfrastructure(
                    $zone->infrastructure
                ),
                'description' => $zone->description,
            ]);
    }

    private function assetRelevance(array $asset, string $searchText): int
    {
        $haystack = mb_strtolower(implode(' ', array_filter([
            $asset['name'],
            $asset['region'],
            $asset['description'],
            implode(' ', $asset['infrastructure']),
        ])));
        $tokens = array_unique(preg_split(
            '/[^\p{L}\p{N}]+/u',
            $searchText,
            -1,
            PREG_SPLIT_NO_EMPTY
        ) ?: []);

        return collect($tokens)
            ->filter(fn (string $token): bool => mb_strlen($token) >= 4)
            ->filter(fn (string $token): bool => mb_stripos($haystack, $token) !== false)
            ->count();
    }

    /** @return array<int, string> */
    private function availableInfrastructure(?array $infrastructure): array
    {
        if (! $infrastructure) {
            return [];
        }

        $labels = [
            'electricity' => 'электр желісі',
            'water' => 'су',
            'gas' => 'газ',
            'roads' => 'автожол',
            'railway' => 'теміржол',
            'internet' => 'интернет',
            'sewerage' => 'кәріз',
            'heating' => 'жылу',
        ];

        return collect($infrastructure)
            ->filter(fn (mixed $details): bool => is_array($details)
                ? ($details['available'] ?? true) === true
                : $details !== false)
            ->keys()
            ->map(fn (string $key): string => $labels[$key] ?? $key)
            ->values()
            ->all();
    }

    private function resolveRegionId(string $query, ?User $user): ?int
    {
        $regions = Region::query()->get(['id', 'name']);

        foreach ($regions as $region) {
            if (mb_stripos($query, $region->name) !== false) {
                return $region->id;
            }
        }

        $lowerQuery = mb_strtolower($query);
        foreach ($regions as $region) {
            foreach (preg_split('/\s+/u', mb_strtolower($region->name)) ?: [] as $word) {
                $root = mb_substr($word, 0, max(0, mb_strlen($word) - 1));
                if (mb_strlen($root) >= 4
                    && mb_stripos($lowerQuery, $root) !== false) {
                    return $region->id;
                }
            }
        }

        if ($user?->roleModel?->name === 'investor') {
            $user->loadMissing('company');

            return $user->company?->region_id;
        }

        if ($user?->isDistrictScoped()
            || $user?->isOblastScopedAkim()) {
            return $user->region_id;
        }

        return null;
    }

    /** @return array<int, array<string, mixed>> */
    private function supportMeasureCatalog(): array
    {
        return [
            [
                'code' => 'investment_preferences',
                'title_kk' => 'Инвестициялық преференциялар',
                'title_ru' => 'Инвестиционные преференции',
                'summary_kk' => 'Кедендік баж бен импорт ҚҚС-ынан босату, мемлекеттік заттай грант; басым жоба үшін салықтық преференциялар мен инвестициялық субсидия қарастырылуы мүмкін.',
                'summary_ru' => 'Возможны освобождение от таможенных пошлин и НДС на импорт, государственный натурный грант; для приоритетного проекта — налоговые преференции и инвестиционная субсидия.',
                'eligibility_kk' => 'ҚР заңды тұлғасы, қызмет түрі мен жоба параметрлері қолданыстағы талаптарға сай болуы керек.',
                'eligibility_ru' => 'Юридическое лицо РК; вид деятельности и параметры проекта должны соответствовать действующим требованиям.',
                'operator' => 'KAZAKH INVEST / ҚР СІМ Инвестициялар комитеті',
                'source_url' => 'https://invest.gov.kz/ru/invest-guide/support/investment-activity1/investment-preferences1/',
                'keywords' => ['инвест', 'жоба', 'проект', 'зауыт', 'завод', 'жабдық', 'оборудован', 'өндір', 'производ'],
            ],
            [
                'code' => 'sez_preferences',
                'title_kk' => 'АЭА қатысушысының жеңілдіктері',
                'title_ru' => 'Льготы участника СЭЗ',
                'summary_kk' => 'Басым қызметті АЭА аумағында жүргізгенде салықтық және кедендік жеңілдіктер, дайын инфрақұрылым мен жер учаскесі қарастырылуы мүмкін.',
                'summary_ru' => 'При ведении приоритетной деятельности на территории СЭЗ могут применяться налоговые и таможенные льготы, предоставляться инфраструктура и земельный участок.',
                'eligibility_kk' => 'АЭА қатысушысы ретінде тіркелу және нақты АЭА-ның басым қызметі мен инвестиция санатына сай болу қажет.',
                'eligibility_ru' => 'Нужны регистрация участником СЭЗ и соответствие приоритетной деятельности и категории инвестиций конкретной СЭЗ.',
                'operator' => 'АЭА басқарушы компаниясы / мемлекеттік кірістер органдары',
                'source_url' => 'https://www.gov.kz/memleket/entities/astana-uir/activities/12878',
                'keywords' => ['аэа', 'сэз', 'sez', 'аймақ', 'зона', 'жер', 'земл', 'алаң', 'площад'],
            ],
            [
                'code' => 'damu_programmes',
                'title_kk' => '«Даму» қорының қаржылық қолдауы',
                'title_ru' => 'Финансовая поддержка фонда «Даму»',
                'summary_kk' => 'Бағдарламаға қарай несие мөлшерлемесін субсидиялау, кепіл жетіспегенде кепілдік беру және жеңілдетілген қаржыландыру құралдары бар.',
                'summary_ru' => 'В зависимости от программы доступны субсидирование ставки, гарантии при нехватке залога и инструменты льготного финансирования.',
                'eligibility_kk' => 'Шарттар бизнес көлеміне, ЭҚЖЖ-ға, өңірге, қаржыландыру мақсаты мен сомасына байланысты.',
                'eligibility_ru' => 'Условия зависят от размера бизнеса, ОКЭД, региона, цели и суммы финансирования.',
                'operator' => '«Даму» кәсіпкерлікті дамыту қоры',
                'source_url' => 'https://damu.kz/ru/programmi',
                'keywords' => ['несие', 'кредит', 'қаржы', 'финанс', 'кепіл', 'залог', 'субсид', 'мсб', 'шағын', 'малый'],
            ],
            [
                'code' => 'qazindustry_reimbursement',
                'title_kk' => 'QazIndustry шығындарының бір бөлігін өтеу',
                'title_ru' => 'Возмещение части затрат от QazIndustry',
                'summary_kk' => 'Өнеркәсіптік кәсіпорындарға қызметкерлер құзыретін арттыру және технологиялық процестерді жетілдіру шығындарының бір бөлігін өтеу шаралары бар.',
                'summary_ru' => 'Для промышленных предприятий предусмотрены меры по возмещению части затрат на повышение компетенций работников и совершенствование технологических процессов.',
                'eligibility_kk' => 'Өңдеу өнеркәсібіндегі кәсіпорын және растайтын құжаттар қолданыстағы қағидаларға сай болуы керек.',
                'eligibility_ru' => 'Предприятие обрабатывающей промышленности и подтверждающие документы должны соответствовать действующим правилам.',
                'operator' => 'QazIndustry',
                'source_url' => 'https://qazindustry.gov.kz/ru/business_reimbursement',
                'keywords' => ['өнеркәсіп', 'промышлен', 'өңдеу', 'обрабатыва', 'технолог', 'қызметкер', 'персонал', 'өндір'],
            ],
        ];
    }
}
