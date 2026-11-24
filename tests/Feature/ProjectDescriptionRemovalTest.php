<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

test('project forms ignore removed descriptions and retain current status in every project status', function (string $status) {
    Http::preventStrayRequests();
    Http::fake();

    $administrator = User::factory()->create([
        'role' => 'admin',
        'role_id' => Role::firstOrCreate(
            ['name' => 'superadmin'],
            ['display_name' => 'Әкімші']
        )->id,
    ]);
    $region = Region::create([
        'name' => 'Жоба мәліметтері ауданы',
        'type' => 'district',
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
    $company = Company::factory()->create(['region_id' => $region->id]);
    $projectType = ProjectType::create(['name' => 'Өндіріс']);
    $payload = [
        'name' => 'Сипаттамасыз жоба',
        'description' => 'Енді қабылданбайтын сипаттама',
        'current_status' => 'Бастапқы ағымдағы жағдай',
        'status' => $status,
        'region_id' => $region->id,
        'company_id' => $company->id,
        'project_type_ids' => [$projectType->id],
        'total_investment' => 2000000,
        'planned_production' => [[
            'product_name' => 'Кірпіш',
            'planned_quantity' => 1000,
            'unit' => 'piece',
            'period' => 'year',
        ]],
    ];

    $this->actingAs($administrator)
        ->post(route('investment-projects.store'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $project = InvestmentProject::where('name', $payload['name'])->sole();
    $plan = $project->productionPlans()->sole();

    expect($project->description)->toBeNull()
        ->and($project->current_status)->toBe('Бастапқы ағымдағы жағдай')
        ->and($plan->planned_amount)->toBeNull()
        ->and($plan->is_complete)->toBeTrue();

    // A normal edit must preserve historical data without exposing or accepting it.
    $project->forceFill(['description' => 'Бұрын сақталған сипаттама'])->save();

    $this->put(route('investment-projects.update', $project), [
        ...$payload,
        'current_status' => 'Жаңартылған ағымдағы жағдай',
        'planned_production' => [[
            ...$payload['planned_production'][0],
            'id' => $plan->id,
            'planned_quantity' => 1500,
        ]],
    ])->assertRedirect()->assertSessionHasNoErrors();

    $project->refresh();

    expect($project->description)->toBe('Бұрын сақталған сипаттама')
        ->and($project->current_status)->toBe('Жаңартылған ағымдағы жағдай')
        ->and($plan->fresh()->planned_quantity)->toBe('1500.000')
        ->and($project->toArray())->not->toHaveKey('description');

    foreach (['investment-projects.show', 'investment-projects.edit'] as $route) {
        $this->get(route($route, $project))->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->missing('project.description')
                ->where('project.current_status', 'Жаңартылған ағымдағы жағдай')
            );
    }
})->with(['plan', 'implementation', 'launched', 'suspended']);
