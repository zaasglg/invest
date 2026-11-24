<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectProductionFact;
use App\Models\ProjectProductionPlan;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use App\Services\ProjectProductionService;
use App\Support\ProductionPlanValidationRules;
use Illuminate\Support\Facades\Validator;
use Inertia\Testing\AssertableInertia as Assert;

uses(Illuminate\Foundation\Testing\RefreshDatabase::class);

function productionTestUser(string $roleName): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
    ]);
}

/**
 * @return array{project: InvestmentProject, plan: ProjectProductionPlan,
 *     investor: User}
 */
function productionTestProject(string $status = 'launched'): array
{
    $admin = productionTestUser('superadmin');
    $region = Region::create([
        'name' => 'Өндіріс тест ауданы',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
    $company = Company::factory()->create([
        'region_id' => $region->id,
        'created_by' => $admin->id,
    ]);
    $investor = productionTestUser('investor');
    $investor->update(['company_id' => $company->id]);
    $project = InvestmentProject::create([
        'name' => 'Керамикалық кірпіш өндірісі',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $region->id,
        'total_investment' => 1500000000,
        'status' => $status,
        'created_by' => $admin->id,
    ]);
    $plan = $project->productionPlans()->create([
        'product_name' => 'Керамикалық кірпіш',
        'planned_quantity' => 60000000,
        'unit' => 'piece',
        'period' => 'year',
    ]);

    return compact('project', 'plan', 'investor');
}

test('a project supports several structured production plans', function () {
    $data = productionTestProject('plan');
    $service = app(ProjectProductionService::class);
    $rows = [
        [
            'id' => $data['plan']->id,
            'product_name' => 'Керамикалық кірпіш',
            'planned_quantity' => 65000000,
            'unit' => 'piece',
            'custom_unit' => null,
            'period' => 'year',
        ],
        [
            'product_name' => 'Құрғақ қоспа',
            'planned_quantity' => 20000,
            'unit' => 'ton',
            'custom_unit' => null,
            'period' => 'year',
        ],
    ];

    $service->assertPlansCanBeSynced($data['project'], $rows);
    $service->syncPlans($data['project'], $rows);

    expect($data['project']->productionPlans()->count())->toBe(2)
        ->and($data['project']->productionPlans()->first()->planned_quantity)
        ->toBe('65000000.000')
        ->and($data['project']->productionPlans()
            ->where('product_name', 'Құрғақ қоспа')
            ->first()
            ->unit_label)->toBe('тонна')
        ->and($data['plan']->fresh()->is_complete)->toBeTrue();
});

test('obsolete planned production amounts are excluded from validated input', function () {
    $row = [
        'product_name' => 'Тас',
        'planned_quantity' => 200,
        'unit' => 'ton',
        'period' => 'year',
        'planned_amount' => 'obsolete amount is ignored',
    ];

    $validated = Validator::make(
        ['planned_production' => [$row]],
        ProductionPlanValidationRules::rules()
    )->validate();

    expect($validated['planned_production'][0])
        ->not->toHaveKey('planned_amount');

    app(ProjectProductionService::class)->assertNewPlansAreComplete(
        $validated['planned_production']
    );
});

test('sync and append ignore obsolete amounts and preserve legacy database values', function () {
    $data = productionTestProject();
    $data['plan']->forceFill(['planned_amount' => 4500000000])->save();
    $service = app(ProjectProductionService::class);
    $row = [
        'product_name' => 'Керамикалық кірпіш',
        'planned_quantity' => 65000000,
        'unit' => 'piece',
        'planned_amount' => 999,
        'period' => 'year',
    ];

    $service->syncPlans($data['project'], [[
        'id' => $data['plan']->id,
        ...$row,
    ]]);
    $service->appendPlans($data['project'], [$row]);

    $plans = $data['project']->productionPlans()->orderBy('id')->get();
    expect($plans)->toHaveCount(2)
        ->and($plans[0]->planned_amount)->toBe('4500000000.00')
        ->and($plans[1]->planned_amount)->toBeNull()
        ->and($plans[0]->toArray())->not->toHaveKey('planned_amount')
        ->and($service->activitySnapshot($data['project'])[0])
        ->not->toHaveKey('planned_amount');
});

test('investor saves and updates an annual actual production report', function () {
    $data = productionTestProject();
    $route = route('investment-projects.production-facts.store', [
        'investmentProject' => $data['project'],
    ]);

    $this->actingAs($data['investor'])
        ->post($route, [
            'production_plan_id' => $data['plan']->id,
            'reporting_year' => 2026,
            'actual_quantity' => 48000000,
            'actual_amount' => 3800000000,
            'notes' => 'Жылдық есеп',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($data['investor'])
        ->post($route, [
            'production_plan_id' => $data['plan']->id,
            'reporting_year' => 2026,
            'actual_quantity' => 50000000,
            'actual_amount' => 4000000000,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(ProjectProductionFact::query()->count())->toBe(1);
    $this->assertDatabaseHas('project_production_facts', [
        'production_plan_id' => $data['plan']->id,
        'period_key' => '2026',
        'actual_quantity' => 50000000,
        'actual_amount' => 4000000000,
        'reported_by' => $data['investor']->id,
    ]);

    $this->get(route('investment-projects.show', $data['project']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canReportProduction', true)
            ->has('project.production_plans', 1)
            ->missing('project.production_plans.0.planned_amount')
            ->where(
                'project.production_plans.0.product_name',
                'Керамикалық кірпіш'
            )
            ->where(
                'project.production_plans.0.facts.0.period_label',
                '2026 жыл'
            )
            ->where(
                'project.production_plans.0.facts.0.actual_quantity',
                '50000000.000'
            ));
});

test('actual production cannot be reported before project launch', function () {
    $data = productionTestProject('implementation');

    $this->actingAs($data['investor'])
        ->post(route('investment-projects.production-facts.store', [
            'investmentProject' => $data['project'],
        ]), [
            'production_plan_id' => $data['plan']->id,
            'reporting_year' => 2026,
            'actual_quantity' => 100,
            'actual_amount' => 100000,
        ])
        ->assertSessionHasErrors('production_plan_id');

    expect(ProjectProductionFact::query()->count())->toBe(0);
});

test('investor cannot report production for another company project', function () {
    $data = productionTestProject();
    $otherInvestor = productionTestUser('investor');

    $this->actingAs($otherInvestor)
        ->post(route('investment-projects.production-facts.store', [
            'investmentProject' => $data['project'],
        ]), [
            'production_plan_id' => $data['plan']->id,
            'reporting_year' => 2026,
            'actual_quantity' => 100,
            'actual_amount' => 100000,
        ])
        ->assertForbidden();
});
