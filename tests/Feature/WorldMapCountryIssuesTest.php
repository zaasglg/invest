<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function countryIssueViewer(string $role = 'superadmin', ?string $subRole = null): User
{
    return User::factory()->create([
        'role_id' => Role::firstOrCreate(
            ['name' => $role],
            ['display_name' => $role]
        )->id,
        'invest_sub_role' => $subRole,
    ]);
}

function countryIssueRegion(string $name = 'Ел бойынша мәселелер ауданы'): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
}

function countryIssueProject(User $creator, Region $region, string $country = 'CN', array $attributes = []): InvestmentProject
{
    $project = InvestmentProject::create([
        'name' => $country.' елінің жобасы',
        'status' => 'plan',
        'attraction_stage' => 'potential',
        'investor_country_code' => $country,
        'region_id' => $region->id,
        'created_by' => $creator->id,
        ...$attributes,
    ]);
    $project->curators()->attach($creator);

    return $project;
}

function countryIssueRecord(InvestmentProject $project, string $status = 'open'): void
{
    $project->issues()->create([
        'title' => 'Инвестор елі бойынша мәселе',
        'description' => 'Таңдалған елдің жобасына қатысты мәселе.',
        'severity' => 'medium',
        'status' => $status,
    ]);
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
});

test('world country issues include only active planned projects from the selected normalized country', function (string $role, ?string $subRole) {
    $viewer = countryIssueViewer($role, $subRole);
    $region = countryIssueRegion();
    $china = countryIssueProject($viewer, $region);
    countryIssueRecord($china);
    foreach ([
        countryIssueProject($viewer, $region, 'TR'),
        countryIssueProject($viewer, $region, 'CN', ['status' => 'implementation']),
        countryIssueProject($viewer, $region, 'CN', ['is_archived' => true]),
        countryIssueProject($viewer, $region, 'CN', ['is_deleted' => true]),
    ] as $excluded) {
        countryIssueRecord($excluded);
    }
    $zone = Sez::create([
        'name' => 'Елге жатпайтын АЭА',
        'region_id' => $region->id,
        'total_area' => 10,
        'status' => 'active',
    ]);
    $zone->issues()->create([
        'title' => 'АЭА мәселесі',
        'description' => 'Бұл мәселе жобаға жатпайды.',
        'severity' => 'high',
        'status' => 'open',
    ]);

    $this->actingAs($viewer)
        ->get(route('issues.index', [
            'sector' => 'sez',
            'project_status' => 'plan',
            'investor_country_code' => ' cn ',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/index')
            ->has('issues.data', 1)
            ->where('issues.total', 1)
            ->where('issueStats', ['total' => 1, 'open' => 1, 'in_progress' => 0, 'resolved' => 0])
            ->where('issues.data.0.entity_id', $china->id)
            ->where('filters.investor_country_code', 'CN')
            ->where('filters.project_status', 'plan')
            ->where('filters.sector', 'all_projects')
            ->where('sectorLabels', ['all_projects' => 'Тартылатын жобалар']));
})->with([
    ['superadmin', null],
    ['invest', User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION],
]);

test('world issues without a country include planned projects from all visible countries', function (string $role, ?string $subRole) {
    $viewer = countryIssueViewer($role, $subRole);
    $region = countryIssueRegion();
    $china = countryIssueProject($viewer, $region);
    $turkey = countryIssueProject($viewer, $region, 'TR');
    countryIssueRecord($china);
    countryIssueRecord($turkey, 'resolved');
    countryIssueRecord(countryIssueProject($viewer, $region, 'CN', ['status' => 'launched']));

    $this->actingAs($viewer)
        ->get(route('issues.index', ['sector' => 'all_projects', 'project_status' => 'plan']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 2)
            ->where('issueStats.total', 2)
            ->where('filters.investor_country_code', null)
            ->where('issues.data', fn ($issues) => collect($issues)->pluck('entity_id')->sort()->values()->all()
                === collect([$china->id, $turkey->id])->sort()->values()->all()));
})->with([
    ['superadmin', null],
    ['invest', User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION],
]);

test('selected country region and issue pagination keep matching totals', function () {
    $viewer = countryIssueViewer();
    $region = countryIssueRegion();
    $otherRegion = countryIssueRegion('Өзге аудан');
    $china = countryIssueProject($viewer, $region);
    foreach (range(1, 13) as $number) {
        countryIssueRecord($china, $number <= 8 ? 'open' : 'resolved');
    }
    countryIssueRecord(countryIssueProject($viewer, $otherRegion));
    countryIssueRecord(countryIssueProject($viewer, $region, 'TR'));
    countryIssueRecord(countryIssueProject($viewer, $region, 'CN', ['status' => 'implementation']));

    $query = [
        'project_status' => 'plan',
        'investor_country_code' => 'CN',
        'region_id' => $region->id,
    ];
    $this->actingAs($viewer)
        ->get(route('issues.index', $query))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 12)
            ->where('issues.total', 13)
            ->where('issueStats', ['total' => 13, 'open' => 8, 'in_progress' => 0, 'resolved' => 5])
            ->where('filters.investor_country_code', 'CN')
            ->where('filters.region_id', $region->id)
            ->where('issues.next_page_url', fn ($url) => str_contains($url, 'investor_country_code=CN')
                && str_contains($url, 'project_status=plan')
                && str_contains($url, 'region_id='.$region->id)));

    $this->get(route('issues.index', [...$query, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.total', 13)
            ->where('issues.data.0.entity_id', $china->id)
            ->where('filters.investor_country_code', 'CN'));
});

test('world issue country filters reject unsupported codes and arrays', function (string $role, ?string $subRole, mixed $country) {
    $this->actingAs(countryIssueViewer($role, $subRole))
        ->getJson(route('issues.index', [
            'project_status' => 'plan',
            'investor_country_code' => $country,
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('investor_country_code');
})->with([
    ['superadmin', null, 'ZZ'],
    ['superadmin', null, 'C'],
    ['superadmin', null, ['CN']],
    ['invest', User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION, 'ZZ'],
    ['invest', User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION, 'C'],
    ['invest', User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION, ['CN']],
]);

test('a selected country cannot expose attraction projects outside the existing visibility boundary', function () {
    $region = countryIssueRegion();
    $otherRegion = countryIssueRegion('Қолжетімсіз аудан');
    $viewer = countryIssueViewer('invest', User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION);
    $viewer->update(['region_id' => $region->id]);
    $visible = countryIssueProject($viewer, $region);
    countryIssueRecord($visible);
    countryIssueRecord(countryIssueProject(countryIssueViewer(), $region));
    countryIssueRecord(countryIssueProject($viewer, $otherRegion));

    $this->actingAs($viewer)
        ->get(route('issues.index', ['investor_country_code' => 'CN']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.data.0.entity_id', $visible->id)
            ->where('filters.investor_country_code', 'CN'));
});

test('an injected country cannot widen accompaniment project access', function () {
    $viewer = countryIssueViewer('invest', User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT);
    $region = countryIssueRegion();
    $visible = countryIssueProject($viewer, $region, 'TR', ['status' => 'implementation']);
    countryIssueRecord($visible);
    countryIssueRecord(countryIssueProject($viewer, $region));

    $this->actingAs($viewer)
        ->get(route('issues.index', [
            'sector' => 'all_projects',
            'project_status' => 'plan',
            'investor_country_code' => 'CN',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.data.0.entity_id', $visible->id)
            ->where('filters.project_status', null)
            ->where('filters.investor_country_code', null));
});

test('a country selection keeps administrator issues in planning despite a conflicting status', function () {
    $viewer = countryIssueViewer();
    $region = countryIssueRegion();
    $planned = countryIssueProject($viewer, $region);
    countryIssueRecord($planned);
    countryIssueRecord(countryIssueProject($viewer, $region, 'CN', ['status' => 'implementation']));

    $this->actingAs($viewer)
        ->get(route('issues.index', [
            'project_status' => 'non_plan',
            'investor_country_code' => 'CN',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.data.0.entity_id', $planned->id)
            ->where('filters.project_status', 'plan')
            ->where('filters.investor_country_code', 'CN'));
});
