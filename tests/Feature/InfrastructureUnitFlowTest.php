<?php

use App\Models\Company;
use App\Models\IndustrialZone;
use App\Models\InvestmentApplication;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\User;
use App\Services\ZoneCapacityService;
use App\Support\InfrastructureValidationRules;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function unitFlowUser(string $role = 'superadmin', ?string $direction = null): User
{
    return User::factory()->create([
        'role' => 'district_user',
        'role_id' => Role::firstOrCreate(['name' => $role], ['display_name' => $role])->id,
        'invest_sub_role' => $direction,
    ]);
}

function unitFlowRegion(): Region
{
    return Region::create(['name' => 'Бірліктерді тексеру ауданы', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
});

test('project forms preserve selected units without turning demand into actual use', function (string $status) {
    $admin = unitFlowUser();
    $region = unitFlowRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);
    $projectType = ProjectType::create(['name' => 'Өндіріс']);
    $infrastructure = collect(InfrastructureValidationRules::PROJECT_RESOURCES)
        ->mapWithKeys(fn ($resource) => [$resource => ['needed' => false, 'required_capacity' => null, 'used_capacity' => null]])
        ->all();
    $infrastructure['electricity'] = ['needed' => true, 'required_capacity' => '1.5', 'used_capacity' => '', 'unit' => 'mw', 'use_required_capacity' => true];
    $infrastructure['roads'] = ['needed' => true, 'required_capacity' => 2000, 'used_capacity' => 500, 'unit' => 'm'];
    $payload = ['name' => 'Әртүрлі өлшемдегі жоба', 'region_id' => $region->id, 'status' => $status, 'company_id' => $company->id, 'project_type_ids' => [$projectType->id], 'total_investment' => 100, 'infrastructure' => $infrastructure];

    $this->actingAs($admin)->post(route('investment-projects.store'), $payload)
        ->assertRedirect()->assertSessionHasNoErrors();
    $project = InvestmentProject::where('name', $payload['name'])->sole();
    expect(data_get($project->infrastructure, 'electricity.unit'))->toBe('mw')
        ->and((float) data_get($project->infrastructure, 'electricity.used_capacity'))->toBe(0.0)
        ->and(data_get($project->infrastructure, 'electricity.use_required_capacity'))->toBeNull()
        ->and(data_get($project->infrastructure, 'roads.unit'))->toBe('m');

    $payload['infrastructure']['electricity']['used_capacity'] = 0.25;
    $this->put(route('investment-projects.update', $project), $payload)
        ->assertRedirect()->assertSessionHasNoErrors();

    $this->get(route('investment-projects.show', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.infrastructure.electricity.unit', 'mw')
            ->where('project.infrastructure.electricity.required_capacity', '1.5')
            ->where('project.infrastructure.electricity.used_capacity', 0.25)
            ->where('project.infrastructure.roads.used_capacity', 500));
})->with(['plan', 'implementation', 'launched', 'suspended']);

test('zone balances include all actual consumers while their details remain scoped', function (string $model, string $route) {
    $region = unitFlowRegion();
    $viewer = unitFlowUser('invest', User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION);
    $support = unitFlowUser('invest', User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT);
    $zone = $model::create([
        'name' => 'Әртүрлі кезеңдегі зона', 'region_id' => $region->id, 'status' => 'active', 'total_area' => 100,
        'infrastructure' => ['water' => ['available' => true, 'capacity' => 36500, 'unit' => 'm3_year']],
    ]);

    foreach ([['plan', $viewer, 300, 'm3_month'], ['implementation', $support, 3650, 'm3_year']] as [$status, $curator, $usage, $unit]) {
        $project = InvestmentProject::create([
            'name' => $status.' тұтынушысы', 'status' => $status, 'region_id' => $region->id, 'created_by' => $curator->id,
            'infrastructure' => ['water' => ['needed' => true, 'required_capacity' => 999999, 'used_capacity' => $usage, 'unit' => $unit]],
        ]);
        $project->curators()->attach($curator);
        $zone->investmentProjects()->attach($project);
    }

    $this->actingAs($viewer)->get(route($route.'.show', $zone))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('infrastructureUsage.water.total', 100)
            ->where('infrastructureUsage.water.used', 20)
            ->where('infrastructureUsage.water.remaining', 80)
            ->has('infrastructureUsage.water.consumers', 1)
            ->where('infrastructureUsage.water.consumers.0.name', 'plan тұтынушысы'));

    $public = app(ZoneCapacityService::class)->present($zone);
    expect($public['infrastructure']['water']['unit'])->toBe('m3_year')
        ->and($public['infrastructure']['water']['remaining'])->toBe(80.0);
})->with([
    [Sez::class, 'sezs'],
    [IndustrialZone::class, 'industrial-zones'],
    [PromZone::class, 'prom-zones'],
]);

test('application drafts retain selectable periods and reject incompatible units', function () {
    $applicant = unitFlowUser('applicant');
    $zone = Sez::create(['name' => 'Өтінім зонасы', 'region_id' => unitFlowRegion()->id, 'status' => 'active', 'total_area' => 100]);
    $route = route('applicant.applications.store', ['zoneType' => 'sez', 'zone' => $zone]);
    $requirements = ['water' => ['value' => 300, 'unit' => 'm3_month'], 'gas' => ['value' => 8760, 'unit' => 'm3_year'], 'roads' => ['value' => 500, 'unit' => 'm']];

    $this->actingAs($applicant)->post($route, [
        'intent' => 'draft', 'application_kind' => 'new_project', 'infrastructure_requirements' => $requirements,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(InvestmentApplication::sole()->infrastructure_requirements)->toBe($requirements);

    $this->post($route, [
        'intent' => 'draft', 'application_kind' => 'new_project',
        'infrastructure_requirements' => ['water' => ['value' => 5, 'unit' => 'kw']],
    ])->assertSessionHasErrors('infrastructure_requirements.water.unit');

    expect(InvestmentApplication::count())->toBe(1);
});
