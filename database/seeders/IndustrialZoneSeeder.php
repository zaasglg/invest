<?php

namespace Database\Seeders;

use App\Models\IndustrialZone;
use App\Models\Region;
use Illuminate\Database\Seeder;

class IndustrialZoneSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $industrialZones = [
            [
                'name' => 'ИЗ "Туркестан Сити"',
                'region' => 'г. Туркестан',
                'total_area' => 350.00,
                'investment_total' => 520000000.00,
                'status' => 'active',
                'description' => 'Индустриальная зона для строительной отрасли, производства стройматериалов, мебели и металлообработки. Близость к разворачивающейся инфраструктуре города.',
                'location' => [
                    'center' => [43.2856, 68.2543],
                    'bounds' => [
                        [43.2700, 68.2350],
                        [43.2700, 68.2700],
                        [43.2950, 68.2700],
                        [43.2950, 68.2350],
                    ],
                ],
                'geometry' => [
                    ['lat' => 43.2700, 'lng' => 68.2350],
                    ['lat' => 43.2700, 'lng' => 68.2700],
                    ['lat' => 43.2950, 'lng' => 68.2700],
                    ['lat' => 43.2950, 'lng' => 68.2350],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '35 МВт', 'available' => true],
                    'water' => ['capacity' => '3000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1500 м³/час', 'available' => true],
                    'roads' => ['type' => 'городские', 'available' => true],
                    'railway' => ['distance' => '8 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Кентау Металл"',
                'region' => 'г. Кентау',
                'total_area' => 220.00,
                'investment_total' => 380000000.00,
                'status' => 'active',
                'description' => 'Специализация на переработке цветных металлов, производстве металлоконструкций, оборудования для горнодобывающей отрасли.',
                'location' => [
                    'center' => [43.5345, 68.7534],
                    'bounds' => [
                        [43.5200, 68.7350],
                        [43.5200, 68.7700],
                        [43.5450, 68.7700],
                        [43.5450, 68.7350],
                    ],
                ],
                'geometry' => [
                    ['lat' => 43.5200, 'lng' => 68.7350],
                    ['lat' => 43.5200, 'lng' => 68.7700],
                    ['lat' => 43.5450, 'lng' => 68.7700],
                    ['lat' => 43.5450, 'lng' => 68.7350],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '65 МВт', 'available' => true],
                    'water' => ['capacity' => '2500 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '2500 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '2 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Арыс Пром"',
                'region' => 'г. Арыс',
                'total_area' => 180.00,
                'investment_total' => 290000000.00,
                'status' => 'active',
                'description' => 'Машиностроение, производство сельхозтехники, оборудования для переработки сельхозпродукции. Ремонтно-механические мастерские.',
                'location' => [
                    'center' => [42.3987, 68.8156],
                    'bounds' => [
                        [42.3850, 68.7950],
                        [42.3850, 68.8350],
                        [42.4100, 68.8350],
                        [42.4100, 68.7950],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.3850, 'lng' => 68.7950],
                    ['lat' => 42.3850, 'lng' => 68.8350],
                    ['lat' => 42.4100, 'lng' => 68.8350],
                    ['lat' => 42.4100, 'lng' => 68.7950],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '28 МВт', 'available' => true],
                    'water' => ['capacity' => '2000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1200 м³/час', 'available' => true],
                    'roads' => ['type' => 'федеральные', 'available' => true],
                    'railway' => ['distance' => '4 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Сарыагаш Агро"',
                'region' => 'Сарыагашский район',
                'total_area' => 150.00,
                'investment_total' => 185000000.00,
                'status' => 'active',
                'description' => 'Переработка плодов и овощей, производство соков, консервов, сухофруктов. Холодильные склады.',
                'location' => [
                    'center' => [42.4789, 68.8345],
                    'bounds' => [
                        [42.4650, 68.8100],
                        [42.4650, 68.8550],
                        [42.4900, 68.8550],
                        [42.4900, 68.8100],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.4650, 'lng' => 68.8100],
                    ['lat' => 42.4650, 'lng' => 68.8550],
                    ['lat' => 42.4900, 'lng' => 68.8550],
                    ['lat' => 42.4900, 'lng' => 68.8100],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '20 МВт', 'available' => true],
                    'water' => ['capacity' => '4000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1000 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '15 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Мактаарал Строй"',
                'region' => 'Мактааральский район',
                'total_area' => 280.00,
                'investment_total' => 340000000.00,
                'status' => 'active',
                'description' => 'Производство кирпича, бетонных блоков, железобетонных изделий, асфальта. Снабжение стройматериалами региона.',
                'location' => [
                    'center' => [40.7456, 67.8123],
                    'bounds' => [
                        [40.7300, 67.7850],
                        [40.7300, 67.8350],
                        [40.7600, 67.8350],
                        [40.7600, 67.7850],
                    ],
                ],
                'geometry' => [
                    ['lat' => 40.7300, 'lng' => 67.7850],
                    ['lat' => 40.7300, 'lng' => 67.8350],
                    ['lat' => 40.7600, 'lng' => 67.8350],
                    ['lat' => 40.7600, 'lng' => 67.7850],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '32 МВт', 'available' => true],
                    'water' => ['capacity' => '1500 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1800 м³/час', 'available' => true],
                    'roads' => ['type' => 'международные', 'available' => true],
                    'railway' => ['distance' => '20 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Сайрам Тек"',
                'region' => 'Сайрамский район',
                'total_area' => 120.00,
                'investment_total' => 175000000.00,
                'status' => 'active',
                'description' => 'Лёгкая промышленность: швейное производство, обувь, трикотаж. Близость к Шымкенту.',
                'location' => [
                    'center' => [42.3156, 69.0145],
                    'bounds' => [
                        [42.3000, 68.9900],
                        [42.3000, 69.0350],
                        [42.3250, 69.0350],
                        [42.3250, 68.9900],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.3000, 'lng' => 68.9900],
                    ['lat' => 42.3000, 'lng' => 69.0350],
                    ['lat' => 42.3250, 'lng' => 69.0350],
                    ['lat' => 42.3250, 'lng' => 68.9900],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '22 МВт', 'available' => true],
                    'water' => ['capacity' => '1800 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '900 м³/час', 'available' => true],
                    'roads' => ['type' => 'городские', 'available' => true],
                    'railway' => ['distance' => '10 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Казыгурт"',
                'region' => 'Казыгуртский район',
                'total_area' => 95.00,
                'investment_total' => 125000000.00,
                'status' => 'developing',
                'description' => 'Агропереработка: молочная продукция, сыроварение, мясопереработка. Развитие местного животноводства.',
                'location' => [
                    'center' => [41.3456, 69.2789],
                    'bounds' => [
                        [41.3300, 69.2550],
                        [41.3300, 69.2950],
                        [41.3550, 69.2950],
                        [41.3550, 69.2550],
                    ],
                ],
                'geometry' => [
                    ['lat' => 41.3300, 'lng' => 69.2550],
                    ['lat' => 41.3300, 'lng' => 69.2950],
                    ['lat' => 41.3550, 'lng' => 69.2950],
                    ['lat' => 41.3550, 'lng' => 69.2550],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '15 МВт', 'available' => true],
                    'water' => ['capacity' => '1200 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '700 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '25 км', 'available' => false],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Толеби"',
                'region' => 'Толебийский район',
                'total_area' => 110.00,
                'investment_total' => 155000000.00,
                'status' => 'developing',
                'description' => 'Производство упаковки, тары, пластиковой продукции. Логистический центр.',
                'location' => [
                    'center' => [42.0345, 69.3321],
                    'bounds' => [
                        [42.0200, 69.3050],
                        [42.0200, 69.3550],
                        [42.0450, 69.3550],
                        [42.0450, 69.3050],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.0200, 'lng' => 69.3050],
                    ['lat' => 42.0200, 'lng' => 69.3550],
                    ['lat' => 42.0450, 'lng' => 69.3550],
                    ['lat' => 42.0450, 'lng' => 69.3050],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '18 МВт', 'available' => true],
                    'water' => ['capacity' => '1000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '850 м³/час', 'available' => true],
                    'roads' => ['type' => 'федеральные', 'available' => true],
                    'railway' => ['distance' => '8 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Ордабасы"',
                'region' => 'Ордабасинский район',
                'total_area' => 130.00,
                'investment_total' => 195000000.00,
                'status' => 'active',
                'description' => 'Производство минеральных удобрений, агрохимии. Переработка сельскохозяйственного сырья.',
                'location' => [
                    'center' => [42.4678, 68.9123],
                    'bounds' => [
                        [42.4550, 68.8850],
                        [42.4550, 68.9350],
                        [42.4800, 68.9350],
                        [42.4800, 68.8850],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.4550, 'lng' => 68.8850],
                    ['lat' => 42.4550, 'lng' => 68.9350],
                    ['lat' => 42.4800, 'lng' => 68.9350],
                    ['lat' => 42.4800, 'lng' => 68.8850],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '25 МВт', 'available' => true],
                    'water' => ['capacity' => '2200 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1500 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '12 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Келес"',
                'region' => 'Келесский район',
                'total_area' => 85.00,
                'investment_total' => 115000000.00,
                'status' => 'developing',
                'description' => 'Пищевая промышленность: мукомольное производство, хлебопекарни, кондитерские изделия.',
                'location' => [
                    'center' => [41.8234, 69.4456],
                    'bounds' => [
                        [41.8100, 69.4200],
                        [41.8100, 69.4650],
                        [41.8350, 69.4650],
                        [41.8350, 69.4200],
                    ],
                ],
                'geometry' => [
                    ['lat' => 41.8100, 'lng' => 69.4200],
                    ['lat' => 41.8100, 'lng' => 69.4650],
                    ['lat' => 41.8350, 'lng' => 69.4650],
                    ['lat' => 41.8350, 'lng' => 69.4200],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '12 МВт', 'available' => true],
                    'water' => ['capacity' => '900 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '600 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '18 км', 'available' => false],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Жетысай"',
                'region' => 'Жетысайский район',
                'total_area' => 145.00,
                'investment_total' => 210000000.00,
                'status' => 'active',
                'description' => 'Переработка хлопка, производство хлопко-волокна, пряжи. Хлопкоочистительный завод.',
                'location' => [
                    'center' => [40.7234, 68.7234],
                    'bounds' => [
                        [40.7100, 68.6950],
                        [40.7100, 68.7450],
                        [40.7400, 68.7450],
                        [40.7400, 68.6950],
                    ],
                ],
                'geometry' => [
                    ['lat' => 40.7100, 'lng' => 68.6950],
                    ['lat' => 40.7100, 'lng' => 68.7450],
                    ['lat' => 40.7400, 'lng' => 68.7450],
                    ['lat' => 40.7400, 'lng' => 68.6950],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '28 МВт', 'available' => true],
                    'water' => ['capacity' => '5000 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '1100 м³/час', 'available' => true],
                    'roads' => ['type' => 'федеральные', 'available' => true],
                    'railway' => ['distance' => '5 км', 'available' => true],
                    'internet' => ['type' => 'оптоволокно', 'available' => true],
                ],
            ],
            [
                'name' => 'ИЗ "Бадам"',
                'region' => 'Байдибекский район',
                'total_area' => 75.00,
                'investment_total' => 95000000.00,
                'status' => 'developing',
                'description' => 'Добыча и переработка строительного камня, щебня, песка. Производство нерудных материалов.',
                'location' => [
                    'center' => [42.1456, 69.6789],
                    'bounds' => [
                        [42.1300, 69.6500],
                        [42.1300, 69.7000],
                        [42.1550, 69.7000],
                        [42.1550, 69.6500],
                    ],
                ],
                'geometry' => [
                    ['lat' => 42.1300, 'lng' => 69.6500],
                    ['lat' => 42.1300, 'lng' => 69.7000],
                    ['lat' => 42.1550, 'lng' => 69.7000],
                    ['lat' => 42.1550, 'lng' => 69.6500],
                ],
                'infrastructure' => [
                    'electricity' => ['capacity' => '20 МВт', 'available' => true],
                    'water' => ['capacity' => '500 м³/сут', 'available' => true],
                    'gas' => ['capacity' => '500 м³/час', 'available' => true],
                    'roads' => ['type' => 'региональные', 'available' => true],
                    'railway' => ['distance' => '35 км', 'available' => false],
                    'internet' => ['type' => '4G', 'available' => true],
                ],
            ],
        ];

        foreach ($industrialZones as $data) {
            $region = Region::where('name', $data['region'])->first();

            if (!$region) {
                $this->command->warn("Region '{$data['region']}' not found. Skipping IZ '{$data['name']}'.");
                continue;
            }

            IndustrialZone::updateOrCreate(
                ['name' => $data['name']],
                [
                    'region_id' => $region->id,
                    'status' => $data['status'],
                    'total_area' => $data['total_area'],
                    'investment_total' => $data['investment_total'],
                    'description' => $data['description'],
                    'location' => $data['location'],
                    'geometry' => $data['geometry'],
                    'infrastructure' => $data['infrastructure'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $this->command->info("IZ '{$data['name']}' created/updated for region '{$data['region']}'.");
        }

        $this->command->info('Industrial Zone seeding completed successfully!');
    }
}
