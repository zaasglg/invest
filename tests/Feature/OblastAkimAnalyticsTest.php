<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use App\Models\ProjectTask;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createOblastAnalyticsRole(string $name): Role
{
    return Role::firstOrCreate(
        ['name' => $name],
        [
            'display_name' => ucfirst($name),
            'description' => "{$name} analytics test role",
        ]
    );
}

function createOblastAnalyticsUser(
    string $roleName,
    ?Region $region = null,
    array $attributes = []
): User {
    $legacyRole = match ($roleName) {
        'superadmin' => 'admin',
        'akim' => 'akim',
        default => 'district_user',
    };

    return User::factory()->create([
        'role' => $legacyRole,
        'role_id' => createOblastAnalyticsRole($roleName)->id,
        'region_id' => $region?->id,
        ...$attributes,
    ]);
}

function createOblastAnalyticsRegion(
    string $name,
    ?Region $parent = null
): Region {
    return Region::create([
        'name' => $name,
        'type' => $parent ? 'district' : 'oblast',
        'parent_id' => $parent?->id,
        'color' => '#2563eb',
        'icon' => 'factory',
    ]);
}

function createOblastAnalyticsProject(
    User $creator,
    Region $region,
    ProjectType $type,
    string $name,
    string $status,
    float $investment,
    int $jobs,
    ?Company $company = null
): InvestmentProject {
    $project = InvestmentProject::create([
        'name' => $name,
        'company_name' => $company?->display_name,
        'company_id' => $company?->id,
        'region_id' => $region->id,
        'project_type_id' => $type->id,
        'total_investment' => $investment,
        'jobs_count' => $jobs,
        'status' => $status,
        'created_by' => $creator->id,
        'is_archived' => false,
    ]);
    $project->projectTypes()->attach($type);

    return $project;
}

/**
 * @return array<string, mixed>
 */
function seedOblastAnalyticsScenario(): array
{
    $oblast = createOblastAnalyticsRegion('Тест Түркістан облысы');
    $district = createOblastAnalyticsRegion('Сайрам ауданы', $oblast);
    $secondDistrict = createOblastAnalyticsRegion('Төлеби ауданы', $oblast);
    $outsideOblast = createOblastAnalyticsRegion('Басқа облыс');
    $outsideDistrict = createOblastAnalyticsRegion(
        'Басқа аудан',
        $outsideOblast
    );

    $admin = createOblastAnalyticsUser('superadmin');
    $oblastAkim = createOblastAnalyticsUser('akim', $oblast);
    $districtAkim = createOblastAnalyticsUser('akim', $district);
    $managementExecutor = createOblastAnalyticsUser(
        'ispolnitel',
        null,
        [
            'baskarma_type' => 'oblast',
            'position' => 'Инвестициялар басқармасы',
        ]
    );
    $type = ProjectType::create(['name' => 'Агроөнеркәсіп']);
    $company = Company::factory()->create([
        'name' => 'Ontustik Agro',
        'bin' => '123456789012',
        'region_id' => $district->id,
        'created_by' => $admin->id,
    ]);

    $implementationProject = createOblastAnalyticsProject(
        $admin,
        $district,
        $type,
        'Сайрам агро жобасы',
        'implementation',
        200000000,
        80,
        $company
    );
    $launchedProject = createOblastAnalyticsProject(
        $admin,
        $secondDistrict,
        $type,
        'Төлеби өндіріс жобасы',
        'launched',
        100000000,
        40
    );
    $outsideProject = createOblastAnalyticsProject(
        $admin,
        $outsideDistrict,
        $type,
        'Облысқа көрінбейтін жоба',
        'implementation',
        900000000,
        500
    );

    $implementationProject->productionPlans()->create([
        'product_name' => 'Сүт өнімі',
        'planned_quantity' => 500,
        'unit' => 'ton',
        'planned_amount' => 500000000,
        'period' => 'year',
    ]);
    $implementationProject->productionPlans()->create([
        'product_name' => 'Сайрам агро жобасы',
        'unit' => 'other',
        'period' => 'year',
        'legacy_value' => 'Жылына 200 тонна',
    ]);
    $launchedPlan = $launchedProject->productionPlans()->create([
        'product_name' => 'Дайын өнім',
        'planned_quantity' => 1000,
        'unit' => 'piece',
        'planned_amount' => 1000000000,
        'period' => 'year',
    ]);
    $launchedPlan->facts()->create([
        'period_key' => '2026',
        'reporting_year' => 2026,
        'actual_quantity' => 800,
        'actual_amount' => 800000000,
        'reported_by' => $admin->id,
    ]);
    $outsidePlan = $outsideProject->productionPlans()->create([
        'product_name' => 'Сыртқы өнім',
        'planned_quantity' => 100000,
        'unit' => 'ton',
        'planned_amount' => 9000000000,
        'period' => 'year',
    ]);
    $outsidePlan->facts()->create([
        'period_key' => '2026',
        'reporting_year' => 2026,
        'actual_quantity' => 100000,
        'actual_amount' => 9000000000,
        'reported_by' => $admin->id,
    ]);

    ProjectTask::create([
        'project_id' => $implementationProject->id,
        'title' => 'Орындалған тапсырма',
        'assigned_to' => $managementExecutor->id,
        'created_by' => $admin->id,
        'status' => 'done',
        'approval_status' => 'approved',
        'due_date' => now()->subDay(),
    ]);
    ProjectTask::create([
        'project_id' => $implementationProject->id,
        'title' => 'Кешіккен тапсырма',
        'assigned_to' => $managementExecutor->id,
        'created_by' => $admin->id,
        'status' => 'in_progress',
        'approval_status' => 'approved',
        'due_date' => now()->subDay(),
    ]);
    ProjectTask::create([
        'project_id' => $outsideProject->id,
        'title' => 'Басқа облыстың тапсырмасы',
        'assigned_to' => $managementExecutor->id,
        'created_by' => $admin->id,
        'status' => 'in_progress',
        'approval_status' => 'approved',
        'due_date' => now()->subDay(),
    ]);

    ProjectIssue::create([
        'project_id' => $implementationProject->id,
        'title' => 'Белсенді мәселе',
        'description' => 'Инфрақұрылым қажет',
        'severity' => 'critical',
        'status' => 'open',
    ]);
    ProjectIssue::create([
        'project_id' => $implementationProject->id,
        'title' => 'Шешілген мәселе',
        'description' => 'Мәселе шешілді',
        'severity' => 'medium',
        'status' => 'resolved',
    ]);

    return compact(
        'oblast',
        'district',
        'admin',
        'oblastAkim',
        'districtAkim',
        'implementationProject',
        'launchedProject',
        'outsideProject',
        'company'
    );
}

test('oblast akim receives scoped management and niche analytics', function () {
    $data = seedOblastAnalyticsScenario();

    $this->actingAs($data['oblastAkim'])
        ->get(route('akim.analytics'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('akim-analytics/index')
            ->where('analytics.scope.oblast_name', 'Тест Түркістан облысы')
            ->where('analytics.scope.districts_count', 2)
            ->where('analytics.summary.total_projects', 2)
            ->where('analytics.summary.total_investment', 300000000)
            ->where('analytics.summary.jobs_count', 120)
            ->where('analytics.summary.active_issues', 1)
            ->where('analytics.summary.overdue_tasks', 1)
            ->where('analytics.summary.problem_projects', 1)
            ->where('analytics.summary.total_tasks', 2)
            ->has('analytics.priority_projects', 1)
            ->where(
                'analytics.priority_projects.0.id',
                $data['implementationProject']->id
            )
            ->has('analytics.data_quality.components')
            ->where('analytics.data_quality.components.task_project_coverage', 50)
            ->where('analytics.production_summary.projects_with_plans', 2)
            ->where('analytics.production_summary.projects_with_any_plan', 2)
            ->where('analytics.production_summary.complete_plans', 2)
            ->where(
                'analytics.production_summary.projects_needing_plan_completion',
                1
            )
            ->where('analytics.production_summary.incomplete_plans', 1)
            ->where('analytics.production_summary.reporting_projects', 1)
            ->where('analytics.production_summary.reported_periods', 1)
            ->where(
                'analytics.production_summary.planned_amount_for_reported_periods',
                1000000000
            )
            ->where('analytics.production_summary.actual_amount', 800000000)
            ->where('analytics.production_summary.amount_completion_rate', 80)
            ->where(
                'analytics.production_summary.average_volume_completion_rate',
                80
            )
            ->has('analytics.production_performance', 2)
            ->where(
                'analytics.production_performance.0.id',
                $data['launchedProject']->id
            )
            ->has('analytics.district_quality', 2)
            ->has('analytics.management_quality', 1)
            ->where(
                'analytics.management_quality.0.name',
                'Инвестициялар басқармасы'
            )
            ->where('analytics.management_quality.0.total_tasks', 2)
            ->has('analytics.niche_analytics', 1)
            ->has('analytics.activity_trend', 6)
            ->where('analytics.application_funnel.total', 0)
            ->where(
                'analytics.niche_analytics.0.name',
                'Агроөнеркәсіп'
            )
        );
});

test('oblast analytics is forbidden to district akim and other roles', function () {
    $data = seedOblastAnalyticsScenario();

    $this->actingAs($data['districtAkim'])
        ->get(route('akim.analytics'))
        ->assertForbidden();

    $this->actingAs($data['admin'])
        ->get(route('akim.analytics'))
        ->assertForbidden();
});

test('oblast akim can search own oblast projects by company bin', function () {
    $data = seedOblastAnalyticsScenario();

    $this->actingAs($data['oblastAkim'])
        ->get(route('investment-projects.index', [
            'search' => '456789',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/index')
            ->has('projects.data', 1)
            ->where(
                'projects.data.0.id',
                $data['implementationProject']->id
            )
        );
});

test('oblast akim AI generates a scoped management report', function () {
    config(['services.gemini.api_key' => '']);
    $data = seedOblastAnalyticsScenario();

    $message = $this->actingAs($data['oblastAkim'])
        ->postJson(route('chat.send'), [
            'message' => 'Облыс бойынша басқарушылық есеп жаса',
        ])
        ->assertOk()
        ->json('message');

    expect($message)
        ->toContain('БАСҚАРУШЫЛЫҚ ЕСЕП')
        ->toContain('Тест Түркістан облысы')
        ->toContain('Өндіріс жоспарының орындалуы')
        ->toContain('Агроөнеркәсіп')
        ->not->toContain('Облысқа көрінбейтін жоба');

    $productionMessage = $this->actingAs($data['oblastAkim'])
        ->postJson(route('chat.send'), [
            'message' => 'Өндіріс жоспары мен нақты көрсеткіштердің орындалуын талда',
        ])
        ->assertOk()
        ->json('message');

    expect($productionMessage)
        ->toContain('Өндіріс жоспарының орындалуы')
        ->toContain('сома бойынша: 80%')
        ->toContain('көлем бойынша: 80%');

    $briefing = $this->actingAs($data['oblastAkim'])
        ->postJson(route('chat.send'), [
            'message' => 'Облыс бойынша 1 минуттық әкім брифингін жаса: ең үлкен тәуекел, жауапты және келесі әрекетті көрсет',
            'context_scope' => 'oblast_analytics',
        ])
        ->assertOk()
        ->assertJsonPath('provider', 'local')
        ->json('message');

    expect($briefing)
        ->toContain('БАСҚАРУШЫЛЫҚ ЕСЕП')
        ->toContain('Тест Түркістан облысы')
        ->toContain('Басым тәуекелдер')
        ->not->toContain('Облысқа көрінбейтін жоба');

    expect(app(\App\Services\LocalChatService::class)->analyzeQuery(
        'Облыс бойынша 1 минуттық әкім брифингін жаса: ең үлкен тәуекелді көрсет',
        $data['oblastAkim']
    ))->not->toContain('subsoil_users');

    $exactProductionPrompt = $this->actingAs($data['oblastAkim'])
        ->postJson(route('chat.send'), [
            'message' => 'Өндіріс plan/fact аномалияларын және тексерілетін жобаларды түсіндір',
            'context_scope' => 'oblast_analytics',
        ])
        ->assertOk()
        ->json('message');

    expect($exactProductionPrompt)
        ->toContain('Өндіріс жоспарының орындалуы')
        ->toContain('сома бойынша: 80%');
});

test('district akim cannot force oblast analytics AI context', function () {
    config(['services.gemini.api_key' => '']);
    $data = seedOblastAnalyticsScenario();

    $this->actingAs($data['districtAkim'])
        ->postJson(route('chat.send'), [
            'message' => 'Облыстық есеп жаса',
            'context_scope' => 'oblast_analytics',
        ])
        ->assertForbidden();
});
