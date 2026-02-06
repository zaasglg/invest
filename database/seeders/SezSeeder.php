<?php

namespace Database\Seeders;

use App\Models\Region;
use App\Models\Sez;
use Illuminate\Database\Seeder;

class SezSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sezs = [
            [
                'name' => 'СЭЗ "Туркестан"',
                'region' => 'г. Туркестан',
                'total_area' => 500.00,
                'investment_total' => 850000000.00,
                'status' => 'active',
                'description' => 'Специальная экономическая зона для развития туристической инфраструктуры, торговли и сервиса в историческом центре. Фокус на проекты гостеприимства, культурного наследия и современной коммерческой недвижимости.',
                'location' => [
                    'center' => [43.2768, 68.2713],
                    'bounds' => [
                        [43.2600, 68.2500],
                        [43.2600, 68.2900],
                        [43.2900, 68.2900],
                        [43.2900, 68.2500],
                    ],
                ],
                'geometry' => [
                    ['lat' => 43.2600, 'lng' => 68.2500],
                    ['lat' => 43.2600, 'lng' => 68.2900],
                    ['lat' => 43.2900, 'lng' => 68.2900],
                    ['lat' => 43.2900, 'lng' => 68.2500],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '50 МВт', 'available' => true],
                    'water' => ['capacity' => '5000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '2000 м³/час', 'available' => true],
                    'roads' => ['type' => 'федеральные', 'available' => true],
                    'railway' => ['distance' => '5 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'СЭЗ "Оңтүстік Агро"',
                'region' => 'Сарыагашский район',
                'total_area' => 350.00,
                'investment_total' => 420000000.00,
                'status' => 'active',
                'description' => 'Специализированная зона для агропромышленного комплекса: переработка фруктов, овощей, производство соков, консервов, сухофруктов. Близость к узбекской границе обеспечивает экспортный потенциал.',
                'location' => [
                    'center' => [42.4676, 68.8143],
                    'bounds' => [
                        [42.4500, 68.7900],
                        [42.4500, 68.8300],
                        [42.4800, 68.8300],
                        [42.4800, 68.7900],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.4500, 'lng' => 68.7900],
                    ['lat' => 42.4500, 'lng' => 68.8300],
                    ['lat' => 42.4800, 'lng' => 68.8300],
                    ['lat' => 42.4800, 'lng' => 68.7900],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '25 МВт', 'available' => true],
                    'water' => ['capacity' => '3000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1500 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '12 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'СЭЗ "Кентау Индустриал"',
                'region' => 'г. Кентау',
                'total_area' => 280.00,
                'investment_total' => 650000000.00,
                'status' => 'active',
                'description' => 'Промышленная зона для развития горнодобывающей и металлургической промышленности. Переработка руд цветных металлов, производство строительных материалов, машиностроение.',
                'location' => [
                    'center' => [43.5224, 68.7658],
                    'bounds' => [
                        [43.5100, 68.7500],
                        [43.5100, 68.7800],
                        [43.5350, 68.7800],
                        [43.5350, 68.7500],
                    ],
                ],
                'geometry' => [
                    ['lat' => 43.5100, 'lng' => 68.7500],
                    ['lat' => 43.5100, 'lng' => 68.7800],
                    ['lat' => 43.5350, 'lng' => 68.7800],
                    ['lat' => 43.5350, 'lng' => 68.7500],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '80 МВт', 'available' => true],
                    'water' => ['capacity' => '4000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '3000 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '3 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'СЭЗ "Арыс Текстиль"',
                'region' => 'г. Арыс',
                'total_area' => 420.00,
                'investment_total' => 780000000.00,
                'status' => 'active',
                'description' => 'Специализация на текстильной промышленности: производство хлопчатобумажных тканей, готовой одежды, трикотажных изделий. Интеграция с cotton-value-chain Туркестанского региона.',
                'location' => [
                    'center' => [42.3856, 68.8014],
                    'bounds' => [
                        [42.3700, 68.7800],
                        [42.3700, 68.8200],
                        [42.4000, 68.8200],
                        [42.4000, 68.7800],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.3700, 'lng' => 68.7800],
                    ['lat' => 42.3700, 'lng' => 68.8200],
                    ['lat' => 42.4000, 'lng' => 68.8200],
                    ['lat' => 42.4000, 'lng' => 68.7800],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '35 МВт', 'available' => true],
                    'water' => ['capacity' => '6000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1800 м³/час', 'available' => true],
                    'roads' => ['type' => 'федеральные', 'available' => true],
                    'railway' => ['distance' => '2 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'СЭЗ "Мактаарал Агро Хаб"',
                'region' => 'Мактааральский район',
                'total_area' => 600.00,
                'investment_total' => 520000000.00,
                'status' => 'active',
                'description' => 'Крупнейшая агропромышленная зона региона: холодильные комплексы, логистические центры, переработка овощебахчевых культур, производство продуктов питания. Экспорт в страны Центральной Азии.',
                'location' => [
                    'center' => [40.7584, 67.8256],
                    'bounds' => [
                        [40.7400, 67.8000],
                        [40.7400, 67.8500],
                        [40.7750, 67.8500],
                        [40.7750, 67.8000],
                    ],
                ],
                'geometry' => [
                    ['lat' => 40.7400, 'lng' => 67.8000],
                    ['lat' => 40.7400, 'lng' => 67.8500],
                    ['lat' => 40.7750, 'lng' => 67.8500],
                    ['lat' => 40.7750, 'lng' => 67.8000],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '40 МВт', 'available' => true],
                    'water' => ['capacity' => '8000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '2200 м³/час', 'available' => true],
                    'roads' => ['type' => 'международные', 'available' => true],
                    'railway' => ['distance' => '15 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'СЭЗ "Бадам Фуд Тек"',
                'region' => 'Сайрамский район',
                'total_area' => 250.00,
                'investment_total' => 340000000.00,
                'status' => 'active',
                'description' => 'Зона пищевой промышленности: переработка молока, мяса, производство мучных изделий, кондитерских продуктов. Близость к Шымкенту обеспечивает доступ к рынку сбыта.',
                'location' => [
                    'center' => [42.3056, 69.0256],
                    'bounds' => [
                        [42.2900, 69.0000],
                        [42.2900, 69.0500],
                        [42.3200, 69.0500],
                        [42.3200, 69.0000],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.2900, 'lng' => 69.0000],
                    ['lat' => 42.2900, 'lng' => 69.0500],
                    ['lat' => 42.3200, 'lng' => 69.0500],
                    ['lat' => 42.3200, 'lng' => 69.0000],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '30 МВт', 'available' => true],
                    'water' => ['capacity' => '2500 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1200 м³/час', 'available' => true],
                    'roads' => ['type' => 'городские', 'available' => true],
                    'railway' => ['distance' => '8 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'СЭЗ "Толеби Логистик"',
                'region' => 'Толебийский район',
                'total_area' => 380.00,
                'investment_total' => 450000000.00,
                'status' => 'developing',
                'description' => 'Транспортно-логистический хаб на пересечении автомобильных магистралей. Складские комплексы, дистрибуционные центры, таможенный терминал. Стратегическая позиция на пути Туркестан-Шымкент.',
                'location' => [
                    'center' => [42.0234, 69.3456],
                    'bounds' => [
                        [42.0100, 69.3200],
                        [42.0100, 69.3700],
                        [42.0400, 69.3700],
                        [42.0400, 69.3200],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.0100, 'lng' => 69.3200],
                    ['lat' => 42.0100, 'lng' => 69.3700],
                    ['lat' => 42.0400, 'lng' => 69.3700],
                    ['lat' => 42.0400, 'lng' => 69.3200],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '45 МВт', 'available' => true],
                    'water' => ['capacity' => '2000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1000 м³/час', 'available' => true],
                    'roads' => ['type' => 'федеральные', 'available' => true],
                    'railway' => ['distance' => '5 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'СЭЗ "Ордабасы Кемикал"',
                'region' => 'Ордабасинский район',
                'total_area' => 180.00,
                'investment_total' => 280000000.00,
                'status' => 'developing',
                'description' => 'Химическая промышленность: производство удобрений, пестицидов, пластмасс. Использование сырья соседних химических предприятий. Экологически чистые технологии.',
                'location' => [
                    'center' => [42.4567, 68.9234],
                    'bounds' => [
                        [42.4450, 68.9000],
                        [42.4450, 68.9450],
                        [42.4700, 68.9450],
                        [42.4700, 68.9000],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.4450, 'lng' => 68.9000],
                    ['lat' => 42.4450, 'lng' => 68.9450],
                    ['lat' => 42.4700, 'lng' => 68.9450],
                    ['lat' => 42.4700, 'lng' => 68.9000],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '60 МВт', 'available' => true],
                    'water' => ['capacity' => '3500 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '4000 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '10 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
        ];

        foreach ($sezs as $data) {
            $region = Region::where('name', $data['region'])->first();

            if (!$region) {
                $this->command->warn("Region '{$data['region']}' not found. Skipping SEZ '{$data['name']}'.");
                continue;
            }

            Sez::updateOrCreate(
                ['name' => $data['name']],
                [
                    'region_id' => $region->id,
                    'total_area' => $data['total_area'],
                    'investment_total' => $data['investment_total'],
                    'status' => $data['status'],
                    'description' => $data['description'],
                    'location' => $data['location'],
                    'geometry' => $data['geometry'],
                    'infrastructure' => $data['infrastructure'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $this->command->info("SEZ '{$data['name']}' created/updated for region '{$data['region']}'.");
        }

        $this->command->info('SEZ seeding completed successfully!');
    }
}
