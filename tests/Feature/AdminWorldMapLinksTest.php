<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function adminWorldMapLinkUser(string $roleName, ?string $subRole = null): User
{
    return User::factory()->create([
        'role_id' => Role::firstOrCreate(
            ['name' => $roleName],
            ['display_name' => $roleName]
        )->id,
        'invest_sub_role' => $subRole,
    ]);
}

function adminWorldMapLinkProject(User $creator, Region $region, array $attributes = []): InvestmentProject
{
    return InvestmentProject::create([
        'name' => 'Әлем картасының жобасы',
        'status' => 'plan',
        'investor_country_code' => 'CN',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'created_by' => $creator->id,
        ...$attributes,
    ]);
}

function adminWorldMapLinkRegion(): Region
{
    return Region::create([
        'name' => 'Әлем картасының ауданы',
        'type' => 'district',
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
});

test('administrator world country link opens only active planned projects from that country', function () {
    $administrator = adminWorldMapLinkUser('superadmin');
    $region = adminWorldMapLinkRegion();
    $china = adminWorldMapLinkProject($administrator, $region);
    adminWorldMapLinkProject($administrator, $region, ['investor_country_code' => 'TR']);
    adminWorldMapLinkProject($administrator, $region, ['status' => 'implementation']);
    adminWorldMapLinkProject($administrator, $region, ['is_archived' => true]);

    $this->actingAs($administrator)
        ->get(route('investment-projects.index', [
            'status' => 'plan',
            'investor_country_code' => ' cn ',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/index')
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $china->id)
            ->where('filters.status', 'plan')
            ->where('filters.investor_country_code', 'CN')
            ->where('stats.total_projects', 1)
            ->where('stats.total_investment', fn ($investment) => (float) $investment === 1000000.0)
            ->where('investorCountries', fn ($countries) => collect($countries)
                ->pluck('code')->sort()->values()->all() === ['CN', 'TR']));
});

test('administrator country and project issue status filters reject invalid values', function (string $routeName, array $query, string $errorKey) {
    $administrator = adminWorldMapLinkUser('superadmin');

    $this->actingAs($administrator)
        ->get(route($routeName, $query))
        ->assertSessionHasErrors($errorKey);
})->with([
    ['investment-projects.index', ['investor_country_code' => 'ZZ'], 'investor_country_code'],
    ['issues.index', ['project_status' => 'invalid'], 'project_status'],
]);

test('attraction country links preserve the existing project visibility boundary', function () {
    $administrator = adminWorldMapLinkUser('superadmin');
    $attraction = adminWorldMapLinkUser('invest', User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION);
    $region = adminWorldMapLinkRegion();
    $china = adminWorldMapLinkProject($attraction, $region);
    $china->curators()->attach($attraction);
    $turkey = adminWorldMapLinkProject($attraction, $region, ['investor_country_code' => 'TR']);
    $turkey->curators()->attach($attraction);
    adminWorldMapLinkProject($administrator, $region);

    $this->actingAs($attraction)
        ->get(route('investment-projects.index', [
            'status' => 'plan',
            'investor_country_code' => 'CN',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $china->id));
});

test('administrator world issues link stays in the active planned project stream with pagination', function () {
    $administrator = adminWorldMapLinkUser('superadmin');
    $region = adminWorldMapLinkRegion();
    $planned = adminWorldMapLinkProject($administrator, $region);
    $operational = adminWorldMapLinkProject($administrator, $region, ['status' => 'implementation']);
    $archived = adminWorldMapLinkProject($administrator, $region, ['is_archived' => true]);

    foreach (range(1, 13) as $number) {
        $planned->issues()->create([
            'title' => 'Жоспарланған жоба мәселесі '.$number,
            'description' => 'Жоспарланған жобаға қатысты мәселе.',
            'severity' => 'medium',
            'status' => 'open',
        ]);
    }
    foreach ([$operational, $archived] as $excluded) {
        $excluded->issues()->create([
            'title' => 'Басқа ағындағы мәселе',
            'description' => 'Бұл мәселе әлем картасының тізіміне кірмеуі керек.',
            'severity' => 'medium',
            'status' => 'open',
        ]);
    }

    $this->actingAs($administrator)
        ->get(route('issues.index', [
            'sector' => 'all_projects',
            'project_status' => 'plan',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 12)
            ->where('issues.total', 13)
            ->where('issueStats.total', 13)
            ->where('filters.project_status', 'plan')
            ->where('filters.sector', 'all_projects')
            ->where('sectorLabels.all_projects', 'Тартылатын жобалар')
            ->where('issues.next_page_url', fn ($url) => str_contains($url, 'project_status=plan'))
            ->where('issues.data', fn ($issues) => collect($issues)
                ->every(fn ($issue) => $issue['entity_id'] === $planned->id)));

    $this->get(route('issues.index', [
        'sector' => 'sez',
        'project_status' => 'plan',
        'region_id' => $region->id,
        'page' => 2,
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.total', 13)
            ->where('filters.sector', 'all_projects')
            ->where('filters.project_status', 'plan'));
});

test('an injected project issue status cannot widen accompaniment access', function () {
    $accompaniment = adminWorldMapLinkUser('invest', User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT);
    $region = adminWorldMapLinkRegion();
    $operational = adminWorldMapLinkProject($accompaniment, $region, ['status' => 'implementation']);
    $planned = adminWorldMapLinkProject($accompaniment, $region);
    foreach ([$operational, $planned] as $project) {
        $project->curators()->attach($accompaniment);
        $project->issues()->create([
            'title' => 'Мәселе',
            'description' => 'Жоба мәселесі.',
            'severity' => 'medium',
            'status' => 'open',
        ]);
    }

    $this->actingAs($accompaniment)
        ->get(route('issues.index', [
            'sector' => 'all_projects',
            'project_status' => 'plan',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.data.0.entity_id', $operational->id)
            ->where('filters.project_status', null));
});
