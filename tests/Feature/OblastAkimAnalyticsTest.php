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

    ProjectTask::create([
        'project_id' => $implementationProject->id,
        'title' => 'Орындалған тапсырма',
        'assigned_to' => $managementExecutor->id,
        'created_by' => $admin->id,
        'status' => 'done',
        'due_date' => now()->subDay(),
    ]);
    ProjectTask::create([
        'project_id' => $implementationProject->id,
        'title' => 'Кешіккен тапсырма',
        'assigned_to' => $managementExecutor->id,
        'created_by' => $admin->id,
        'status' => 'in_progress',
        'due_date' => now()->subDay(),
    ]);
    ProjectTask::create([
        'project_id' => $outsideProject->id,
        'title' => 'Басқа облыстың тапсырмасы',
        'assigned_to' => $managementExecutor->id,
        'created_by' => $admin->id,
        'status' => 'in_progress',
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
            ->has('analytics.district_quality', 2)
            ->has('analytics.management_quality', 1)
            ->where(
                'analytics.management_quality.0.name',
                'Инвестициялар басқармасы'
            )
            ->where('analytics.management_quality.0.total_tasks', 2)
            ->has('analytics.niche_analytics', 1)
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
        ->toContain('Агроөнеркәсіп')
        ->not->toContain('Облысқа көрінбейтін жоба');
});
