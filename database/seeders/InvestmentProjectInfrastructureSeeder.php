<?php

namespace Database\Seeders;

use App\Models\InvestmentProject;
use Illuminate\Database\Seeder;

class InvestmentProjectInfrastructureSeeder extends Seeder
{
    public function run(): void
    {
        $profiles = [
            'Логистический центр "Туркестан"' => [850, 0, 220],
            'Текстильный комбинат "Кентау Текстиль"' => [2400, 720, 1350],
            'Плодоовощной перерабатывающий комплекс' => [1250, 480, 1800],
            'Маслоэкстракционный завод' => [1850, 640, 1250],
            'Мебельная фабрика "Арыс Мебель"' => [620, 180, 140],
            'Завод железобетонных изделий' => [1100, 520, 480],
            'Сыроваренный завод "Толеби"' => [780, 420, 950],
            'Завод минеральных удобрений' => [4200, 1600, 2100],
            'Хлопкоочистительный завод' => [1650, 380, 720],
            'Завод по производству пластмассовой тары' => [920, 260, 180],
            'Мини-ГЭС на реке Келес' => [320, 0, 90],
            'Курортно-оздоровительный комплекс' => [1450, 520, 1600],
            'ИТ-парк "Digital Turkestan"' => [680, 0, 110],
            'Завод по производству обувь' => [540, 140, 160],
        ];

        foreach ($profiles as $name => [$electricity, $gas, $water]) {
            $project = InvestmentProject::query()
                ->where('name', $name)
                ->whereNull('infrastructure')
                ->first();

            if (! $project) {
                continue;
            }

            $project->update([
                'infrastructure' => [
                    'electricity' => [
                        'needed' => $electricity > 0,
                        'required_capacity' => $electricity > 0 ? (string) $electricity : '',
                        'used_capacity' => $electricity > 0 ? (string) $electricity : '',
                    ],
                    'gas' => [
                        'needed' => $gas > 0,
                        'required_capacity' => $gas > 0 ? (string) $gas : '',
                        'used_capacity' => $gas > 0 ? (string) $gas : '',
                    ],
                    'water' => [
                        'needed' => $water > 0,
                        'required_capacity' => $water > 0 ? (string) $water : '',
                        'used_capacity' => $water > 0 ? (string) $water : '',
                    ],
                    'roads' => [
                        'needed' => false,
                        'required_capacity' => '',
                        'used_capacity' => '',
                    ],
                    'railway' => [
                        'needed' => false,
                        'required_capacity' => '',
                        'used_capacity' => '',
                    ],
                    'internet' => [
                        'needed' => false,
                        'required_capacity' => '',
                        'used_capacity' => '',
                    ],
                    'land' => [
                        'needed' => false,
                        'required_capacity' => '',
                        'used_capacity' => '',
                    ],
                ],
            ]);
        }
    }
}
