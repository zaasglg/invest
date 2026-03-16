<?php

namespace Database\Seeders;

use App\Models\Region;
use Illuminate\Database\Seeder;

class RegionSeeder extends Seeder
{
    public function run(): void
    {
        // Create parent oblast
        $oblast = Region::firstOrCreate(
            ['name' => 'Туркестанская область'],
            [
                'type' => 'oblast',
                'color' => '#3B82F6',
                'icon' => 'factory',
            ]
        );

        // Cities (subtype = city)
        $cities = [
            'г. Туркестан',
            'г. Кентау',
            'г. Арыс',
        ];

        foreach ($cities as $city) {
            Region::firstOrCreate(
                ['name' => $city],
                [
                    'parent_id' => $oblast->id,
                    'type' => 'district',
                    'subtype' => 'city',
                    'color' => '#3B82F6',
                    'icon' => 'factory',
                ]
            );
        }

        // Districts
        $districts = [
            'Сарыагашский район',
            'Мактааральский район',
            'Сайрамский район',
            'Толебийский район',
            'Ордабасинский район',
            'Казыгуртский район',
            'Келесский район',
            'Жетысайский район',
            'Байдибекский район',
        ];

        foreach ($districts as $district) {
            Region::firstOrCreate(
                ['name' => $district],
                [
                    'parent_id' => $oblast->id,
                    'type' => 'district',
                    'color' => '#3B82F6',
                    'icon' => 'factory',
                ]
            );
        }

        $this->command->info('Regions seeded: 1 oblast + '.count($cities).' cities + '.count($districts).' districts.');
    }
}
