<?php

namespace Database\Seeders;

use App\Models\Region;
use App\Models\SubsoilUser;
use Illuminate\Database\Seeder;

class SubsoilUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $subsoilUsers = [
            [
                'name' => 'ТОО "Туркестан Ойл"',
                'bin' => '120240001111',
                'region' => 'г. Туркестан',
                'mineral_type' => 'Нефть',
                'license_status' => 'active',
                'license_start' => '2023-01-15',
                'license_end' => '2033-01-15',
                'location' => [
                    ['lat' => 43.2705, 'lng' => 68.2551],
                    ['lat' => 43.2705, 'lng' => 68.2805],
                    ['lat' => 43.2905, 'lng' => 68.2805],
                    ['lat' => 43.2905, 'lng' => 68.2551],
                ],
            ],
            [
                'name' => 'ТОО "Сарыагаш Газ"',
                'bin' => '120240001112',
                'region' => 'Сарыагашский район',
                'mineral_type' => 'Газ',
                'license_status' => 'active',
                'license_start' => '2022-06-01',
                'license_end' => '2032-06-01',
                'location' => [
                    ['lat' => 42.4600, 'lng' => 68.8000],
                    ['lat' => 42.4600, 'lng' => 68.8300],
                    ['lat' => 42.4800, 'lng' => 68.8300],
                    ['lat' => 42.4800, 'lng' => 68.8000],
                ],
            ],
            [
                'name' => 'ТОО "Кентау Ресурс"',
                'bin' => '120240001113',
                'region' => 'г. Кентау',
                'mineral_type' => 'Медь',
                'license_status' => 'active',
                'license_start' => '2021-03-10',
                'license_end' => '2031-03-10',
                'location' => [
                    ['lat' => 43.5200, 'lng' => 68.7500],
                    ['lat' => 43.5200, 'lng' => 68.7750],
                    ['lat' => 43.5400, 'lng' => 68.7750],
                    ['lat' => 43.5400, 'lng' => 68.7500],
                ],
            ],
            [
                'name' => 'ТОО "Арыс Минералс"',
                'bin' => '120240001114',
                'region' => 'г. Арыс',
                'mineral_type' => 'Уголь',
                'license_status' => 'expired',
                'license_start' => '2014-05-01',
                'license_end' => '2024-05-01',
                'location' => [
                    ['lat' => 42.3850, 'lng' => 68.7900],
                    ['lat' => 42.3850, 'lng' => 68.8200],
                    ['lat' => 42.4050, 'lng' => 68.8200],
                    ['lat' => 42.4050, 'lng' => 68.7900],
                ],
            ],
            [
                'name' => 'ТОО "Мактаарал Жер"',
                'bin' => '120240001115',
                'region' => 'Мактааральский район',
                'mineral_type' => 'Уран',
                'license_status' => 'active',
                'license_start' => '2020-09-01',
                'license_end' => '2030-09-01',
                'location' => [
                    ['lat' => 40.7500, 'lng' => 67.8100],
                    ['lat' => 40.7500, 'lng' => 67.8400],
                    ['lat' => 40.7700, 'lng' => 67.8400],
                    ['lat' => 40.7700, 'lng' => 67.8100],
                ],
            ],
            [
                'name' => 'ТОО "Сайрам Гео"',
                'bin' => '120240001116',
                'region' => 'Сайрамский район',
                'mineral_type' => 'Фосфориты',
                'license_status' => 'suspended',
                'license_start' => '2019-11-20',
                'license_end' => '2029-11-20',
                'location' => [
                    ['lat' => 42.3000, 'lng' => 69.0100],
                    ['lat' => 42.3000, 'lng' => 69.0400],
                    ['lat' => 42.3200, 'lng' => 69.0400],
                    ['lat' => 42.3200, 'lng' => 69.0100],
                ],
            ],
        ];

        foreach ($subsoilUsers as $data) {
            $region = Region::where('name', $data['region'])->first();

            if (!$region) {
                continue;
            }

            SubsoilUser::updateOrCreate(
                ['bin' => $data['bin']],
                [
                    'name' => $data['name'],
                    'region_id' => $region->id,
                    'mineral_type' => $data['mineral_type'],
                    'license_status' => $data['license_status'],
                    'license_start' => $data['license_start'],
                    'license_end' => $data['license_end'],
                    'location' => $data['location'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
