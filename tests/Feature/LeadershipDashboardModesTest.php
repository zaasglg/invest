<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function leadershipModeUser(string $role, ?Region $region = null): User
{
    return User::factory()->create([
        'role' => 'district_user',
        'role_id' => Role::firstOrCreate(['name' => $role], ['display_name' => $role])->id,
        'region_id' => $region?->id,
    ]);
}

function leadershipModeRegion(string $name, ?Region $parent = null): Region
{
    return Region::create([
        'name' => $name,
        'type' => $parent ? 'district' : 'oblast',
        'parent_id' => $parent?->id,
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
    Cache::flush();
});

test('leadership can switch dashboard maps while preserving their project scope', function (string $role, string $scope) {
    $oblast = leadershipModeRegion('Карталардың облысы');
    $district = leadershipModeRegion('Өз ауданы', $oblast);
    $sibling = leadershipModeRegion('Көрші аудан', $oblast);
    $outsideOblast = leadershipModeRegion('Басқа облыс');
    $outsideDistrict = leadershipModeRegion('Басқа облыстың ауданы', $outsideOblast);
    $viewer = leadershipModeUser($role, match ($scope) {
        'oblast' => $oblast,
        'district' => $district,
        default => null,
    });
    $creator = leadershipModeUser('superadmin');
    $regions = collect([$oblast, $district, $sibling, $outsideOblast, $outsideDistrict]);
    $visibleRegionIds = match ($scope) {
        'oblast' => [$oblast->id, $district->id, $sibling->id],
        'district' => [$district->id],
        default => $regions->pluck('id')->all(),
    };
    $plans = collect();

    foreach ($regions as $index => $region) {
        foreach (['plan', 'implementation', 'launched', 'suspended'] as $status) {
            $project = InvestmentProject::create([
                'name' => $region->name.' '.$status,
                'region_id' => $region->id,
                'status' => $status,
                'attraction_stage' => $status === 'plan' ? 'potential' : null,
                'investor_country_code' => $index < 3 ? 'CN' : 'TR',
                'total_investment' => 100,
                'created_by' => $creator->id,
                'start_date' => now()->startOfYear(),
                'planning_started_at' => now()->subYear()->startOfYear(),
            ]);
            $project->issues()->create([
                'title' => 'Картадағы мәселе',
                'description' => 'Жоба мәселесі',
                'severity' => 'medium',
                'status' => 'open',
            ]);
            if ($status === 'plan' && in_array($region->id, $visibleRegionIds, true)) {
                $plans->push($project);
            }
        }
    }

    foreach (['is_archived', 'is_deleted'] as $flag) {
        InvestmentProject::create([
            'name' => 'Көрінбейтін жоба '.$flag,
            'region_id' => $district->id,
            'status' => 'plan',
            'investor_country_code' => 'US',
            'created_by' => $creator->id,
            $flag => true,
        ]);
    }

    $count = count($visibleRegionIds);
    Cache::put('dashboard.stats', ['sentinel' => true], 300);

    $this->actingAs($viewer)->get(route('dashboard'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canSwitchDashboardMode', true)
            ->where('dashboardMode', 'support')
            ->where('stats.project_count', $count * 3)
            ->where('projectsByStatus.0.value', 0)
            ->where('sectorSummary.total.all_projects.problemCount', $count * 3)
            ->where('regionYearly.total.projects.4', $count * 3)
            ->has('attractionCountries', 0));

    $this->get(route('dashboard', ['dashboard_mode' => 'attraction']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canSwitchDashboardMode', true)
            ->where('dashboardMode', 'attraction')
            ->where('stats.project_count', $count)
            ->where('stats.total_investment', fn ($value) => (float) $value === $count * 100.0)
            ->where('projectsByStatus.0.value', $count)
            ->where('projectsByStatus.1.value', 0)
            ->where('sectorSummary.total.all_projects.problemCount', $count)
            ->where('regionYearly.total.projects.3', $count)
            ->where('regionYearly.total.projects.4', 0)
            ->where('attractionCountries', fn ($countries) => collect($countries)
                ->flatMap(fn ($country) => collect($country['projects'])->pluck('id'))
                ->sort()->values()->all() === $plans->pluck('id')->sort()->values()->all()));

    $this->get(route('dashboard', ['dashboard_mode' => 'support']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('dashboardMode', 'support')
            ->where('stats.project_count', $count * 3));

    expect(Cache::get('dashboard.stats'))->toBe(['sentinel' => true]);
})->with([
    ['akim', 'oblast'],
    ['zamakim', 'oblast'],
    ['akim', 'district'],
    ['zamakim', 'district'],
    ['prokuror', 'global'],
]);

test('leadership dashboard rejects unsupported modes', function (string $role) {
    $viewer = leadershipModeUser($role, leadershipModeRegion('Облыс'));

    $this->actingAs($viewer)->getJson(route('dashboard', ['dashboard_mode' => 'unknown']))
        ->assertUnprocessable()->assertJsonValidationErrors('dashboard_mode');
})->with(['akim', 'zamakim', 'prokuror']);

test('dashboard switching is limited to overview roles with a valid scope', function () {
    foreach (['invest', 'investor', 'ispolnitel', 'moderator', 'applicant', 'akim', 'zamakim'] as $role) {
        expect(leadershipModeUser($role)->canSwitchDashboardMode())->toBeFalse();
    }
});
