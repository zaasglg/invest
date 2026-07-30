<?php

namespace Database\Factories;

use App\Models\Region;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Company>
 */
class CompanyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'legal_form' => 'too',
            'name' => fake()->unique()->company(),
            'bin' => fake()->unique()->numerify('############'),
            'registration_date' => fake()->dateTimeBetween(
                '-20 years',
                '-1 month'
            ),
            'region_id' => Region::query()->value('id'),
            'activity_type' => fake()->randomElement([
                'Өңдеу өнеркәсібі',
                'Ауыл шаруашылығы',
                'Логистика',
                'Энергетика',
            ]),
            'director_full_name' => fake()->name(),
            'contact_person' => fake()->name(),
            'phone' => '+7 700 '.fake()->numerify('### ## ##'),
            'email' => fake()->unique()->companyEmail(),
            'website' => fake()->url(),
            'legal_address' => fake()->address(),
            'actual_address' => fake()->address(),
            'status' => 'active',
            'notes' => null,
        ];
    }
}
