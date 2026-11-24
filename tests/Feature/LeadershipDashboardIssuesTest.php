<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function leadershipIssueRegion(string $name, ?Region $parent = null): Region
{
    return Region::create([
        'name' => $name,
        'type' => $parent ? 'district' : 'oblast',
        'parent_id' => $parent?->id,
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
}

function leadershipIssueUser(string $role, ?Region $region = null): User
{
    return User::factory()->create([
        'role_id' => Role::firstOrCreate(
            ['name' => $role],
            ['display_name' => $role]
        )->id,
        'region_id' => $region?->id,
    ]);
}

function leadershipIssueProject(User $creator, Region $region, string $status = 'plan', string $country = 'CN', array $attributes = []): InvestmentProject
{
    $project = InvestmentProject::create([
        'name' => $region->name.' '.$status.' '.$country,
        'region_id' => $region->id,
        'status' => $status,
        'attraction_stage' => $status === 'plan' ? 'potential' : null,
        'investor_country_code' => $country,
        'created_by' => $creator->id,
        ...$attributes,
    ]);
    $project->issues()->create([
        'title' => 'Жобаның мәселесі',
        'description' => 'Карта режиміне сәйкес мәселе.',
        'status' => 'open',
        'severity' => 'medium',
    ]);

    return $project;
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
});

test('oblast leadership issue streams separate project stages within their assigned oblast', function (string $role, string $mode) {
    $oblast = leadershipIssueRegion('Өз облысы');
    $district = leadershipIssueRegion('Бірінші аудан', $oblast);
    $secondDistrict = leadershipIssueRegion('Екінші аудан', $oblast);
    $outsideOblast = leadershipIssueRegion('Басқа облыс');
    $outsideDistrict = leadershipIssueRegion('Басқа облыстың ауданы', $outsideOblast);
    $viewer = leadershipIssueUser($role, $oblast);
    $planned = leadershipIssueProject($viewer, $district);
    $implementation = leadershipIssueProject($viewer, $district, 'implementation');
    $launched = leadershipIssueProject($viewer, $secondDistrict, 'launched');
    $suspended = leadershipIssueProject($viewer, $oblast, 'suspended');
    leadershipIssueProject($viewer, $outsideDistrict);
    leadershipIssueProject($viewer, $outsideDistrict, 'implementation');
    leadershipIssueProject($viewer, $district, 'plan', 'CN', ['is_archived' => true]);
    leadershipIssueProject($viewer, $district, 'implementation', 'CN', ['is_deleted' => true]);
    $expected = $mode === 'plan'
        ? [$planned->id]
        : [$implementation->id, $launched->id, $suspended->id];
    sort($expected);

    $this->actingAs($viewer)
        ->get(route('issues.index', ['sector' => 'sez', 'project_status' => $mode]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.sector', 'all_projects')
            ->where('filters.project_status', $mode)
            ->where('issues.total', count($expected))
            ->where('issueStats.total', count($expected))
            ->where('issues.data', fn ($issues) => collect($issues)->pluck('entity_id')->sort()->values()->all() === $expected)
            ->where('regions', fn ($regions) => collect($regions)->pluck('id')->sort()->values()->all()
                === collect([$district->id, $secondDistrict->id])->sort()->values()->all())
            ->has('sectorLabels', 1));
})->with([
    ['akim', 'plan'],
    ['akim', 'non_plan'],
    ['zamakim', 'plan'],
    ['zamakim', 'non_plan'],
]);

test('prosecutor issue streams retain global visibility while separating stages', function (string $mode) {
    $viewer = leadershipIssueUser('prokuror');
    $first = leadershipIssueRegion('Бірінші облыс');
    $second = leadershipIssueRegion('Екінші облыс');
    $planned = leadershipIssueProject($viewer, $first);
    $otherPlanned = leadershipIssueProject($viewer, $second);
    $implementation = leadershipIssueProject($viewer, $second, 'implementation');
    $expected = $mode === 'plan' ? [$planned->id, $otherPlanned->id] : [$implementation->id];

    $this->actingAs($viewer)
        ->get(route('issues.index', ['project_status' => $mode]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.project_status', $mode)
            ->where('issues.total', count($expected))
            ->where('issues.data', fn ($issues) => collect($issues)->pluck('entity_id')->sort()->values()->all() === $expected));
})->with(['plan', 'non_plan']);

test('district leadership country filters cannot expose other districts even through a forged region', function (string $role) {
    $oblast = leadershipIssueRegion('Өз облысы');
    $district = leadershipIssueRegion('Өз ауданы', $oblast);
    $outsideDistrict = leadershipIssueRegion('Басқа аудан', $oblast);
    $viewer = leadershipIssueUser($role, $district);
    $own = leadershipIssueProject($viewer, $district);
    leadershipIssueProject($viewer, $outsideDistrict);
    leadershipIssueProject($viewer, $district, 'plan', 'TR');
    leadershipIssueProject($viewer, $district, 'implementation');

    $this->actingAs($viewer)
        ->get(route('issues.index', [
            'project_status' => 'non_plan',
            'investor_country_code' => ' cn ',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.project_status', 'plan')
            ->where('filters.investor_country_code', 'CN')
            ->has('issues.data', 1)
            ->where('issues.data.0.entity_id', $own->id)
            ->has('regions', 1)
            ->where('regions.0.id', $district->id));

    $this->get(route('issues.index', [
        'project_status' => 'plan',
        'investor_country_code' => 'CN',
        'region_id' => $outsideDistrict->id,
    ]))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 0)
            ->where('issueStats.total', 0));
})->with(['akim', 'zamakim']);

test('leadership world issue country and pagination filters preserve the same project stream', function () {
    $oblast = leadershipIssueRegion('Таңдалған облыс');
    $district = leadershipIssueRegion('Таңдалған аудан', $oblast);
    $outside = leadershipIssueRegion('Басқа облыс');
    $viewer = leadershipIssueUser('zamakim', $oblast);
    $project = leadershipIssueProject($viewer, $district);
    foreach (range(1, 12) as $number) {
        $project->issues()->create([
            'title' => 'Мәселе '.$number,
            'description' => 'Таңдалған ел жобасының мәселесі.',
            'status' => 'resolved',
            'severity' => 'medium',
        ]);
    }
    leadershipIssueProject($viewer, $outside);
    leadershipIssueProject($viewer, $district, 'plan', 'TR');
    leadershipIssueProject($viewer, $district, 'implementation');
    $query = ['project_status' => 'plan', 'investor_country_code' => 'CN'];

    $this->actingAs($viewer)
        ->get(route('issues.index', $query))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 12)
            ->where('issues.total', 13)
            ->where('issueStats', ['total' => 13, 'open' => 1, 'in_progress' => 0, 'resolved' => 12])
            ->where('issues.next_page_url', fn ($url) => str_contains($url, 'project_status=plan')
                && str_contains($url, 'investor_country_code=CN')));

    $this->get(route('issues.index', [...$query, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.data.0.entity_id', $project->id)
            ->where('filters.project_status', 'plan')
            ->where('filters.investor_country_code', 'CN'));
});

test('normal leadership issue streams keep sector issues within the assigned oblast', function (string $role) {
    $oblast = leadershipIssueRegion('Өз облысы');
    $district = leadershipIssueRegion('Өз ауданы', $oblast);
    $outside = leadershipIssueRegion('Басқа облыс');
    $viewer = leadershipIssueUser($role, $oblast);
    foreach ([$district, $outside] as $region) {
        $zone = Sez::create([
            'name' => $region->name.' АЭА',
            'region_id' => $region->id,
            'total_area' => 10,
            'status' => 'active',
        ]);
        $zone->issues()->create([
            'title' => 'АЭА мәселесі',
            'description' => 'Аймаққа тиесілі мәселе.',
            'status' => 'open',
            'severity' => 'medium',
        ]);
    }

    $this->actingAs($viewer)
        ->get(route('issues.index', ['sector' => 'sez']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issueStats.total', 1)
            ->where('issues.data.0.region_name', $district->name)
            ->has('regions', 1)
            ->where('regions.0.id', $district->id));
})->with(['akim', 'zamakim']);

test('leadership issue filters validate the requested country', function (string $role) {
    $oblast = leadershipIssueRegion('Сүзгі тексеретін облыс');
    $viewer = leadershipIssueUser($role, $role === 'prokuror' ? null : $oblast);

    $this->actingAs($viewer)
        ->getJson(route('issues.index', ['investor_country_code' => 'ZZ']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('investor_country_code');
})->with(['akim', 'zamakim', 'prokuror']);
