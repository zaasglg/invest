<?php

namespace Database\Seeders;

use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\User;
use Illuminate\Database\Seeder;

class InvestmentProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first user for created_by
        $creator = User::first();
        if (!$creator) {
            $this->command->error('No users found. Please run user seeder first.');
            return;
        }

        // Get project types or use null
        $projectTypes = ProjectType::all()->keyBy('id');

        $projects = [
            [
                'name' => 'Завод по производству строительной керамики',
                'company_name' => 'Туркестан Керамикс LLP',
                'region' => 'Туркестанская область',
                'sector' => 'Строительство',
                'total_investment' => 2500000000.00,
                'status' => 'implementation',
                'start_date' => '2023-06-01',
                'end_date' => '2025-12-31',
                'description' => 'Строительство современного завода по производству керамического кирпича и плитки мощностью 60 млн штук в год. Обеспечение строительной отрасли региона качественными материалами.',
                'geometry' => [
                    ['lat' => 43.2650, 'lng' => 68.2650],
                    ['lat' => 43.2650, 'lng' => 68.2850],
                    ['lat' => 43.2800, 'lng' => 68.2850],
                    ['lat' => 43.2800, 'lng' => 68.2650],
                ],
            ],
            [
                'name' => 'Логистический центр "Туркестан"',
                'company_name' => 'TransLogistics Kazakhstan',
                'region' => 'г. Туркестан',
                'sector' => 'Транспорт и логистика',
                'total_investment' => 1800000000.00,
                'status' => 'launched',
                'start_date' => '2022-03-15',
                'end_date' => '2024-06-30',
                'description' => 'Мультимодальный логистический центр с складскими комплексами класса А, железнодорожными путями и автопарком. Площадь 45 га.',
                'geometry' => [
                    ['lat' => 43.2850, 'lng' => 68.2450],
                    ['lat' => 43.2850, 'lng' => 68.2650],
                    ['lat' => 43.3000, 'lng' => 68.2650],
                    ['lat' => 43.3000, 'lng' => 68.2450],
                ],
            ],
            [
                'name' => 'Текстильный комбинат "Кентау Текстиль"',
                'company_name' => 'Cotton Investment Group',
                'region' => 'г. Кентау',
                'sector' => 'Лёгкая промышленность',
                'total_investment' => 3200000000.00,
                'status' => 'implementation',
                'start_date' => '2023-09-01',
                'end_date' => '2026-03-31',
                'description' => 'Полный цикл переработки хлопка: от волокна до готовой текстильной продукции. Мощность 15 тыс. тонн пряжи в год. Создание 1200 рабочих мест.',
                'geometry' => [
                    ['lat' => 43.5200, 'lng' => 68.7500],
                    ['lat' => 43.5200, 'lng' => 68.7700],
                    ['lat' => 43.5350, 'lng' => 68.7700],
                    ['lat' => 43.5350, 'lng' => 68.7500],
                ],
            ],
            [
                'name' => 'Плодоовощной перерабатывающий комплекс',
                'company_name' => 'AgroProcess South',
                'region' => 'Сарыагашский район',
                'sector' => 'Агропромышленность',
                'total_investment' => 850000000.00,
                'status' => 'launched',
                'start_date' => '2022-05-20',
                'end_date' => '2024-10-31',
                'description' => 'Переработка фруктов и овощей: производство соков, пюре, сухофруктов, заморозки. Мощность переработки 50 тыс. тонн сырья в год.',
                'geometry' => [
                    ['lat' => 42.4600, 'lng' => 68.8000],
                    ['lat' => 42.4600, 'lng' => 68.8250],
                    ['lat' => 42.4800, 'lng' => 68.8250],
                    ['lat' => 42.4800, 'lng' => 68.8000],
                ],
            ],
            [
                'name' => 'Маслоэкстракционный завод',
                'company_name' => 'OilSeed Kazakhstan',
                'region' => 'Мактааральский район',
                'sector' => 'Пищевая промышленность',
                'total_investment' => 1500000000.00,
                'status' => 'implementation',
                'start_date' => '2024-01-15',
                'end_date' => '2026-06-30',
                'description' => 'Переработка масличных культур (хлопчатник, подсолнечник, сафлор). Производство растительного масла и шрота. Мощность 500 тонн сырья в сутки.',
                'geometry' => [
                    ['lat' => 40.7400, 'lng' => 67.8000],
                    ['lat' => 40.7400, 'lng' => 67.8250],
                    ['lat' => 40.7600, 'lng' => 67.8250],
                    ['lat' => 40.7600, 'lng' => 67.8000],
                ],
            ],
            [
                'name' => 'Мебельная фабрика "Арыс Мебель"',
                'company_name' => 'Kazakhstan Furniture',
                'region' => 'г. Арыс',
                'sector' => 'Деревообработка',
                'total_investment' => 680000000.00,
                'status' => 'launched',
                'start_date' => '2023-03-01',
                'end_date' => '2024-12-31',
                'description' => 'Производство корпусной и офисной мебели из МДФ и натурального дерева. Экспорт в страны Центральной Азии.',
                'geometry' => [
                    ['lat' => 42.3700, 'lng' => 68.7800],
                    ['lat' => 42.3700, 'lng' => 68.8000],
                    ['lat' => 42.3900, 'lng' => 68.8000],
                    ['lat' => 42.3900, 'lng' => 68.7800],
                ],
            ],
            [
                'name' => 'Завод железобетонных изделий',
                'company_name' => 'StroyIndustria',
                'region' => 'Сайрамский район',
                'sector' => 'Строительство',
                'total_investment' => 420000000.00,
                'status' => 'implementation',
                'start_date' => '2023-11-01',
                'end_date' => '2025-08-31',
                'description' => 'Производство железобетонных конструкций, блоков, плит для строительства жилых и коммерческих объектов.',
                'geometry' => [
                    ['lat' => 42.2900, 'lng' => 69.0000],
                    ['lat' => 42.2900, 'lng' => 69.0200],
                    ['lat' => 42.3100, 'lng' => 69.0200],
                    ['lat' => 42.3100, 'lng' => 69.0000],
                ],
            ],
            [
                'name' => 'Сыроваренный завод "Толеби"',
                'company_name' => 'DairyProduct Kazakhstan',
                'region' => 'Толебийский район',
                'sector' => 'Пищевая промышленность',
                'total_investment' => 350000000.00,
                'status' => 'launched',
                'start_date' => '2022-08-15',
                'end_date' => '2024-05-31',
                'description' => 'Переработка молока, производство сыров (твердые, полутвердые), сливочного масла. Мощность 100 тонн молока в сутки.',
                'geometry' => [
                    ['lat' => 42.0100, 'lng' => 69.3200],
                    ['lat' => 42.0100, 'lng' => 69.3400],
                    ['lat' => 42.0300, 'lng' => 69.3400],
                    ['lat' => 42.0300, 'lng' => 69.3200],
                ],
            ],
            [
                'name' => 'Завод минеральных удобрений',
                'company_name' => 'AgroChem Invest',
                'region' => 'Ордабасинский район',
                'sector' => 'Химическая промышленность',
                'total_investment' => 2800000000.00,
                'status' => 'plan',
                'start_date' => '2025-01-01',
                'end_date' => '2027-12-31',
                'description' => 'Производство азотных и фосфорных удобрений для сельского хозяйства. Мощность 200 тыс. тонн готовой продукции в год.',
                'geometry' => [
                    ['lat' => 42.4450, 'lng' => 68.9000],
                    ['lat' => 42.4450, 'lng' => 68.9200],
                    ['lat' => 42.4600, 'lng' => 68.9200],
                    ['lat' => 42.4600, 'lng' => 68.9000],
                ],
            ],
            [
                'name' => 'Хлопкоочистительный завод',
                'company_name' => 'Cotton Processing Kazakhstan',
                'region' => 'Жетысайский район',
                'sector' => 'Агропромышленность',
                'total_investment' => 920000000.00,
                'status' => 'implementation',
                'start_date' => '2024-02-01',
                'end_date' => '2026-03-31',
                'description' => 'Переработка хлопка-сырца, производство хлопкового волокна, линта и укупочных отходов. Мощность 80 тыс. тонн хлопка в год.',
                'geometry' => [
                    ['lat' => 40.7100, 'lng' => 68.6950],
                    ['lat' => 40.7100, 'lng' => 68.7200],
                    ['lat' => 40.7300, 'lng' => 68.7200],
                    ['lat' => 40.7300, 'lng' => 68.6950],
                ],
            ],
            [
                'name' => 'Завод по производству пластмассовой тары',
                'company_name' => 'PlasticPack LLP',
                'region' => 'Казыгуртский район',
                'sector' => 'Химическая промышленность',
                'total_investment' => 280000000.00,
                'status' => 'launched',
                'start_date' => '2023-04-01',
                'end_date' => '2024-09-30',
                'description' => 'Производство ПЭТ-преформ, бутылок, крышек, полимерной пленки для пищевой и химической промышленности.',
                'geometry' => [
                    ['lat' => 41.3300, 'lng' => 69.2550],
                    ['lat' => 41.3300, 'lng' => 69.2750],
                    ['lat' => 41.3500, 'lng' => 69.2750],
                    ['lat' => 41.3500, 'lng' => 69.2550],
                ],
            ],
            [
                'name' => 'Мини-ГЭС на реке Келес',
                'company_name' => 'HydroEnergy Kazakhstan',
                'region' => 'Келесский район',
                'sector' => 'Энергетика',
                'total_investment' => 1450000000.00,
                'status' => 'plan',
                'start_date' => '2025-06-01',
                'end_date' => '2028-12-31',
                'description' => 'Строительство малой гидроэлектростанции мощностью 25 МВт для обеспечения электроэнергией южных регионов.',
                'geometry' => [
                    ['lat' => 41.8100, 'lng' => 69.4200],
                    ['lat' => 41.8100, 'lng' => 69.4450],
                    ['lat' => 41.8300, 'lng' => 69.4450],
                    ['lat' => 41.8300, 'lng' => 69.4200],
                ],
            ],
            [
                'name' => 'Курортно-оздоровительный комплекс',
                'company_name' => 'Turkestan Resort Group',
                'region' => 'Сарыагашский район',
                'sector' => 'Туризм',
                'total_investment' => 1200000000.00,
                'status' => 'implementation',
                'start_date' => '2024-04-01',
                'end_date' => '2026-12-31',
                'description' => 'Строительство современного санатория с термальными источниками, отелем 4*, аквапарком на 1500 посетителей. Развитие медицинского туризма.',
                'geometry' => [
                    ['lat' => 42.4500, 'lng' => 68.8150],
                    ['lat' => 42.4500, 'lng' => 68.8350],
                    ['lat' => 42.4700, 'lng' => 68.8350],
                    ['lat' => 42.4700, 'lng' => 68.8150],
                ],
            ],
            [
                'name' => 'ИТ-парк "Digital Turkestan"',
                'company_name' => 'Tech Hub Kazakhstan',
                'region' => 'г. Туркестан',
                'sector' => 'IT и инновации',
                'total_investment' => 550000000.00,
                'status' => 'launched',
                'start_date' => '2023-07-01',
                'end_date' => '2024-12-31',
                'description' => 'Бизнес-инкубатор для IT-стартапов, офисные пространства, учебный центр. Подготовка IT-специалистов.',
                'geometry' => [
                    ['lat' => 43.2700, 'lng' => 68.2500],
                    ['lat' => 43.2700, 'lng' => 68.2700],
                    ['lat' => 43.2850, 'lng' => 68.2700],
                    ['lat' => 43.2850, 'lng' => 68.2500],
                ],
            ],
            [
                'name' => 'Завод по производству обувь',
                'company_name' => 'ShoeMaster Kazakhstan',
                'region' => 'Сайрамский район',
                'sector' => 'Лёгкая промышленность',
                'total_investment' => 320000000.00,
                'status' => 'implementation',
                'start_date' => '2024-03-15',
                'end_date' => '2025-10-31',
                'description' => 'Производство повседневной и детской обуви из искусственных и натуральных материалов. Мощность 500 тыс. пар в год.',
                'geometry' => [
                    ['lat' => 42.3000, 'lng' => 68.9900],
                    ['lat' => 42.3000, 'lng' => 69.0150],
                    ['lat' => 42.3200, 'lng' => 69.0150],
                    ['lat' => 42.3200, 'lng' => 68.9900],
                ],
            ],
        ];

        foreach ($projects as $index => $data) {
            $region = Region::where('name', $data['region'])->first();

            if (!$region) {
                $this->command->warn("Region '{$data['region']}' not found. Skipping project '{$data['name']}'.");
                continue;
            }

            // Get random project type or use first
            $projectType = $projectTypes->first() ? $projectTypes->skip($index % $projectTypes->count())->first() : null;

            InvestmentProject::updateOrCreate(
                ['name' => $data['name']],
                [
                    'company_name' => $data['company_name'],
                    'region_id' => $region->id,
                    'project_type_id' => $projectType ? $projectType->id : null,
                    'sector' => $data['sector'],
                    'total_investment' => $data['total_investment'],
                    'status' => $data['status'],
                    'start_date' => $data['start_date'],
                    'end_date' => $data['end_date'],
                    'description' => $data['description'],
                    'geometry' => $data['geometry'],
                    'created_by' => $creator->id,
                    'executor_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $this->command->info("Project '{$data['name']}' created/updated for region '{$data['region']}'.");
        }

        $this->command->info('Investment Project seeding completed successfully!');
    }
}
