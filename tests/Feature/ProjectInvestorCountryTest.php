<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use App\Services\ProjectAttractionHandoverService;
use Illuminate\Support\Facades\Http;

function investorCountryProjectFixture(string $status = 'plan'): array
{
    $administrator = User::factory()->create([
        'role_id' => Role::firstOrCreate(
            ['name' => 'superadmin'],
            ['display_name' => 'Әкімші']
        )->id,
    ]);
    $region = Region::create([
        'name' => 'Инвестор елі ауданы',
        'type' => 'district',
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
    $company = Company::factory()->create(['region_id' => $region->id]);
    $projectType = ProjectType::create(['name' => 'Өндіріс']);
    $project = InvestmentProject::create([
        'name' => 'Инвестор елі сақталатын жоба',
        'status' => $status,
        'investor_country_code' => 'CN',
        'region_id' => $region->id,
        'company_id' => $company->id,
        'project_type_id' => $projectType->id,
        'total_investment' => 1000000,
        'created_by' => $administrator->id,
    ]);
    $project->curators()->attach($administrator);

    return [$administrator, $project, [
        'name' => 'Өзгертілген жоба атауы',
        'status' => $status,
        'region_id' => $region->id,
        'company_id' => $company->id,
        'project_type_ids' => [$projectType->id],
        'total_investment' => 2000000,
    ]];
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
});

test('planned projects allow editing investor country', function () {
    [$administrator, $project, $payload] = investorCountryProjectFixture();

    $this->actingAs($administrator)
        ->put(route('investment-projects.update', $project), [
            ...$payload,
            'investor_country_code' => ' tr ',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($project->fresh()->investor_country_code)->toBe('TR');
});

test('nonplanned project edits retain an unchanged or omitted country', function (string $status) {
    [$administrator, $project, $payload] = investorCountryProjectFixture($status);

    $this->actingAs($administrator)
        ->put(route('investment-projects.update', $project), [
            ...$payload,
            'investor_country_code' => ' cn ',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($project->fresh()->investor_country_code)->toBe('CN');

    $this->put(route('investment-projects.update', $project), [
        ...$payload,
        'name' => 'Елге тимейтін екінші өзгеріс',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($project->fresh()->investor_country_code)->toBe('CN')
        ->and($project->fresh()->name)->toBe('Елге тимейтін екінші өзгеріс');
})->with(['implementation', 'launched', 'suspended']);

test('nonplanned investor country cannot be changed or cleared by an administrator', function (string $status, ?string $country) {
    [$administrator, $project, $payload] = investorCountryProjectFixture($status);

    $this->actingAs($administrator)
        ->put(route('investment-projects.update', $project), [
            ...$payload,
            'investor_country_code' => $country,
        ])
        ->assertSessionHasErrors('investor_country_code');

    expect($project->fresh()->investor_country_code)->toBe('CN')
        ->and($project->fresh()->name)->toBe('Инвестор елі сақталатын жоба');
})->with([
    ['implementation', 'TR'],
    ['implementation', null],
    ['launched', 'TR'],
    ['launched', null],
    ['suspended', 'TR'],
    ['suspended', null],
]);

test('status transitions preserve country and reject changing it in the same request', function (string $status) {
    [$administrator, $project, $payload] = investorCountryProjectFixture();
    $payload['status'] = $status;

    $this->actingAs($administrator)
        ->put(route('investment-projects.update', $project), [
            ...$payload,
            'investor_country_code' => 'TR',
        ])
        ->assertSessionHasErrors('investor_country_code');

    expect($project->fresh()->status)->toBe('plan')
        ->and($project->fresh()->investor_country_code)->toBe('CN');

    $this->put(route('investment-projects.update', $project), [
        ...$payload,
        'investor_country_code' => 'CN',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($project->fresh()->status)->toBe($status)
        ->and($project->fresh()->investor_country_code)->toBe('CN');
})->with(['implementation', 'launched', 'suspended']);

test('changing status back to planning cannot bypass the country lock', function () {
    [$administrator, $project, $payload] = investorCountryProjectFixture('implementation');

    $this->actingAs($administrator)
        ->put(route('investment-projects.update', $project), [
            ...$payload,
            'status' => 'plan',
            'investor_country_code' => 'TR',
        ])
        ->assertSessionHasErrors('investor_country_code');

    expect($project->fresh()->status)->toBe('implementation')
        ->and($project->fresh()->investor_country_code)->toBe('CN');
});

test('accepting an attraction reserve preserves its investor country', function () {
    [$administrator, $project] = investorCountryProjectFixture();
    $investRole = Role::firstOrCreate(
        ['name' => 'invest'],
        ['display_name' => 'Invest']
    );
    $attraction = User::factory()->create([
        'role_id' => $investRole->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
        'region_id' => $project->region_id,
    ]);
    $accompaniment = User::factory()->create([
        'role_id' => $investRole->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT,
        'region_id' => $project->region_id,
    ]);
    $project->curators()->sync([$attraction->id]);
    $project->update([
        'created_by' => $attraction->id,
        'attraction_stage' => 'handover',
        'attraction_handover_requested_at' => now(),
        'attraction_handover_requested_by' => $attraction->id,
    ]);

    app(ProjectAttractionHandoverService::class)
        ->acceptReserve($accompaniment, $project);

    expect($project->fresh()->status)->toBe('implementation')
        ->and($project->fresh()->investor_country_code)->toBe('CN');
});
