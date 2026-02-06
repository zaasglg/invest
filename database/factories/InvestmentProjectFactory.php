<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InvestmentProject>
 */
class InvestmentProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->catchPhrase(),
            'company_name' => fake()->company(),
            'description' => fake()->realText(500),
            'region_id' => \App\Models\Region::inRandomOrder()->first()->id ?? \App\Models\Region::factory(),
            'project_type_id' => \App\Models\ProjectType::first()->id ?? \App\Models\ProjectType::factory(),
            'sector' => fake()->randomElement(['sez', 'industrial_zone', 'subsoil']),
            'total_investment' => fake()->numberBetween(10000000, 5000000000),
            'status' => fake()->randomElement(['planning', 'active', 'completed', 'suspended']),
            'start_date' => fake()->dateTimeBetween('-1 year', 'now'),
            'end_date' => fake()->dateTimeBetween('now', '+5 years'),
            'created_by' => \App\Models\User::first()->id ?? \App\Models\User::factory(),
        ];
    }
}
