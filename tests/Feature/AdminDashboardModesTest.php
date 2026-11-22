<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function adminDashboardUser(string $roleName = 'superadmin', array $attributes = []): User
{
    return User::factory()->create([
        'role_id' => Role::firstOrCreate(
            ['name' => $roleName],
            ['display_name' => ucfirst($roleName)]
        )->id,
        ...$attributes,
    ]);
}

function adminDashboardRegion(string $name = 'Басқару тақтасы ауданы'): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
}

function adminDashboardProject(
    User $creator,
    Region $region,
    string $status,
    int $investment,
    array $attributes = []
): InvestmentProject {
    return InvestmentProject::create([
        'name' => 'Басқару тақтасындағы '.$status.' жобасы',
        'region_id' => $region->id,
        'status' => $status,
        'attraction_stage' => $status === 'plan' ? 'potential' : null,
        'investor_country_code' => 'CN',
        'total_investment' => $investment,
        'jobs_count' => 5,
        'start_date' => now()->startOfYear(),
        'created_by' => $creator->id,
        ...$attributes,
    ]);
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
    Cache::flush();
});

test('administrator dashboard defaults to accompaniment data without planned projects', function () {
    $administrator = adminDashboardUser();
    $region = adminDashboardRegion();
    adminDashboardProject($administrator, $region, 'plan', 100);
    adminDashboardProject($administrator, $region, 'implementation', 200);
    adminDashboardProject($administrator, $region, 'launched', 300);
    adminDashboardProject($administrator, $region, 'suspended', 400);
    adminDashboardProject($administrator, $region, 'implementation', 5000, [
        'is_archived' => true,
    ]);

    $this->actingAs($administrator)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboardMode', 'support')
            ->where('canSwitchDashboardMode', true)
            ->where('stats.project_count', 3)
            ->where('stats.total_investment', fn ($value) => (float) $value === 900.0)
            ->where('projectsByStatus.0.value', 0)
            ->where('projectsByStatus.1.value', 1)
            ->where('projectsByStatus.2.value', 1)
            ->where('projectsByStatus.3.value', 1)
            ->where('sectorSummary.total.all_projects.projectCount', 3)
            ->where('regionYearly.total.projects.4', 3)
            ->where('regionYearly.total.investment.4', 900)
            ->has('attractionCountries', 0));
});

test('administrator attraction mode includes all active planned projects regardless of curator', function () {
    $administrator = adminDashboardUser();
    $region = adminDashboardRegion();
    $uncurated = adminDashboardProject($administrator, $region, 'plan', 100);
    adminDashboardProject($administrator, $region, 'plan', 200, [
        'investor_country_code' => 'TR',
    ]);
    adminDashboardProject($administrator, $region, 'plan', 50, [
        'attraction_stage' => 'handover',
        'attraction_handover_requested_at' => now(),
        'attraction_handover_requested_by' => $administrator->id,
    ]);
    adminDashboardProject($administrator, $region, 'implementation', 999);
    adminDashboardProject($administrator, $region, 'plan', 5000, [
        'is_archived' => true,
    ]);
    adminDashboardProject($administrator, $region, 'plan', 6000, [
        'is_deleted' => true,
    ]);

    expect($uncurated->curators()->exists())->toBeFalse();

    $this->actingAs($administrator)
        ->get(route('dashboard', ['dashboard_mode' => 'attraction']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('dashboardMode', 'attraction')
            ->where('canSwitchDashboardMode', true)
            ->where('stats.project_count', 3)
            ->where('stats.total_investment', fn ($value) => (float) $value === 350.0)
            ->where('projectsByStatus.0.value', 3)
            ->where('projectsByStatus.1.value', 0)
            ->where('sectorSummary.total.all_projects.projectCount', 3)
            ->where('regionYearly.total.projects.4', 3)
            ->where('attractionCountries', function ($countries) use ($uncurated) {
                $byCode = collect($countries)->keyBy('country_code');

                return $byCode->keys()->sort()->values()->all() === ['CN', 'TR']
                    && $byCode['CN']['project_count'] === 2
                    && (float) $byCode['CN']['total_investment'] === 150.0
                    && collect($byCode['CN']['projects'])->pluck('id')->contains($uncurated->id)
                    && $byCode['TR']['project_count'] === 1;
            }));
});

test('administrator modes bypass the shared global cache without overwriting it', function () {
    $administrator = adminDashboardUser();
    $region = adminDashboardRegion();
    adminDashboardProject($administrator, $region, 'plan', 100);
    adminDashboardProject($administrator, $region, 'implementation', 300);
    $cacheKeys = [
        'dashboard.stats',
        'dashboard.investments_by_sector',
        'dashboard.projects_by_status',
        'dashboard.investment_trend',
        'dashboard.region_stats',
        'dashboard.region_yearly.start_date',
        'dashboard.sector_summary',
    ];
    foreach ($cacheKeys as $cacheKey) {
        Cache::put($cacheKey, ['sentinel' => 123456], 300);
    }

    foreach ([['support', 300.0], ['attraction', 100.0], ['support', 300.0]] as [$mode, $investment]) {
        $this->actingAs($administrator)
            ->get(route('dashboard', ['dashboard_mode' => $mode]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboardMode', $mode)
                ->where('stats.project_count', 1)
                ->where('stats.total_investment', fn ($value) => (float) $value === $investment)
                ->where('sectorSummary.total.all_projects.projectCount', 1)
                ->where('regionYearly.total.projects.4', 1));
    }

    foreach ($cacheKeys as $cacheKey) {
        expect(Cache::get($cacheKey))->toBe(['sentinel' => 123456]);
    }
});

test('administrator attraction yearly statistics use registration dates rather than start dates', function () {
    $administrator = adminDashboardUser();
    $region = adminDashboardRegion();
    adminDashboardProject($administrator, $region, 'plan', 50, [
        'start_date' => now()->subYears(3)->startOfYear(),
        'planning_started_at' => now()->subYear()->startOfYear(),
    ]);
    $fallback = adminDashboardProject($administrator, $region, 'plan', 100, [
        'start_date' => now()->subYears(3)->startOfYear(),
    ]);
    $fallback->forceFill([
        'planning_started_at' => null,
        'created_at' => now()->subYears(2)->startOfYear(),
    ])->saveQuietly();

    $this->actingAs($administrator)
        ->get(route('dashboard', ['dashboard_mode' => 'attraction']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('regionYearly.total.projects', [0, 0, 1, 1, 0])
            ->where('regionYearly.total.investment', [0, 0, 100, 50, 0])
            ->where('attractionCountries.0.yearly.1.projects', 0)
            ->where('attractionCountries.0.yearly.2.projects', 1)
            ->where('attractionCountries.0.yearly.3.projects', 1));
});

test('investment directions cannot change their dashboard scope through the administrator mode query', function (string $subRole, string $expectedMode, string $requestedMode) {
    $region = adminDashboardRegion();
    $direction = adminDashboardUser('invest', [
        'invest_sub_role' => $subRole,
        'region_id' => $region->id,
    ]);
    $plan = adminDashboardProject($direction, $region, 'plan', 100);
    $plan->curators()->attach($direction);
    $implementation = adminDashboardProject($direction, $region, 'implementation', 300);
    $implementation->curators()->attach($direction);

    $this->actingAs($direction)
        ->get(route('dashboard', ['dashboard_mode' => $requestedMode]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('dashboardMode', $expectedMode)
            ->where('canSwitchDashboardMode', false)
            ->where('stats.project_count', 1)
            ->where('stats.total_investment', fn ($value) => (float) $value === ($expectedMode === 'attraction' ? 100.0 : 300.0))
            ->has('attractionCountries', $expectedMode === 'attraction' ? 1 : 0));
})->with([
    [User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION, 'attraction', 'support'],
    [User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT, 'support', 'attraction'],
]);

test('administrator dashboard rejects unsupported modes', function () {
    $this->actingAs(adminDashboardUser())
        ->getJson(route('dashboard', ['dashboard_mode' => 'unknown']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dashboard_mode');
});
