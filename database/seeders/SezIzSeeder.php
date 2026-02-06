<?php

namespace Database\Seeders;

use App\Models\IndustrialZone;
use App\Models\Region;
use App\Models\Sez;
use Illuminate\Database\Seeder;

class SezIzSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Sez Data
        $sezs = [
            [
                'name' => 'СЭЗ "Астана - Новый город"',
                'region' => 'Туркестанская область',
                'total_area' => 7634.71,
                'investment_total' => 5800000000.00,
                'status' => 'active',
                'description' => 'Создание административного делового центра столицы и промышленных зон.',
            ],
            [
                'name' => 'СЭЗ "ПИТ" (Парк инновационных технологий)',
                'region' => 'Туркестанская область',
                'total_area' => 163.00,
                'investment_total' => 1200000000.00,
                'status' => 'active',
                'description' => 'Развитие информационных технологий и инноваций.',
            ],
            [
                'name' => 'СЭЗ "Морпорт Актау"',
                'region' => 'Туркестанская область',
                'total_area' => 2000.00,
                'investment_total' => 3500000000.00,
                'status' => 'active',
                'description' => 'Развитие транспортно-логистического потенциала и химической отрасли.',
            ],
            [
                'name' => 'СЭЗ "Онтюстик"',
                'region' => 'Туркестанская область',
                'total_area' => 200.00,
                'investment_total' => 500000000.00,
                'status' => 'active',
                'description' => 'Развитие текстильной промышленности.',
            ],
            [
                'name' => 'СЭЗ "Национальный индустриальный нефтехимический технопарк"',
                'region' => 'Туркестанская область',
                'total_area' => 3475.00,
                'investment_total' => 8000000000.00,
                'status' => 'developing',
                'description' => 'Развитие нефтехимических производств.',
            ],
            [
                'name' => 'СЭЗ "Сарыарка"',
                'region' => 'Туркестанская область',
                'total_area' => 595.00,
                'investment_total' => 1500000000.00,
                'status' => 'active',
                'description' => 'Металлургия и машинострение.',
            ],
        ];

        foreach ($sezs as $data) {
            $region = Region::where('name', $data['region'])->first();
            if ($region) {
                Sez::updateOrInsert(
                    ['name' => $data['name']],
                    [
                        'region_id' => $region->id,
                        'total_area' => $data['total_area'],
                        'investment_total' => $data['investment_total'],
                        'status' => $data['status'],
                        'description' => $data['description'],
                        'infrastructure' => json_encode(['roads' => true, 'water' => true, 'electricity' => true]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }

        // Industrial Zone Data
        $industrialZones = [
            [
                'name' => 'Индустриальная зона "Алматы"',
                'region' => 'г. Алматы',
                'status' => 'active',
                'total_area' => 490.00,
                'investment_total' => 700000000.00,
                'description' => 'Крупнейшая индустриальная зона мегаполиса.',
            ],
            [
                'name' => 'Индустриальная зона "Оңтүстік"',
                'region' => 'Туркестанская область',
                'status' => 'active',
                'total_area' => 300.00,
                'investment_total' => 250000000.00,
                'description' => 'Центр промышленного развития южного региона.',
            ],
            [
                'name' => 'Индустриальная зона "Тассай"',
                'region' => 'г. Шымкент',
                'status' => 'developing',
                'total_area' => 89.00,
                'investment_total' => 100000000.00,
                'description' => 'Зона для размещения производственных предприятий МСБ.',
            ],
            [
                'name' => 'Индустриальная зона "Актобе"',
                'region' => 'Актюбинская область',
                'status' => 'active',
                'total_area' => 200.00,
                'investment_total' => 400000000.00,
                'description' => 'Привлечение инвестиций в западный регион.',
            ],
        ];

        foreach ($industrialZones as $data) {
            $region = Region::where('name', $data['region'])->first();
            if ($region) {
                IndustrialZone::updateOrInsert(
                    ['name' => $data['name']],
                    [
                        'region_id' => $region->id,
                        'status' => $data['status'],
                        'total_area' => $data['total_area'],
                        'investment_total' => $data['investment_total'],
                        'description' => $data['description'],
                        'infrastructure' => json_encode(['roads' => true, 'gas' => true, 'electricity' => true]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }
}
