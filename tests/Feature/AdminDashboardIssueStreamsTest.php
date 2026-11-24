<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function dashboardIssueStreamUser(string $role = 'superadmin', ?string $subRole = null): User
{
    return User::factory()->create([
        'role_id' => Role::firstOrCreate(
            ['name' => $role],
            ['display_name' => $role]
        )->id,
        'invest_sub_role' => $subRole,
    ]);
}

function dashboardIssueStreamRegion(string $name = 'Сүйемелдеу мәселелерінің ауданы'): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
}

function dashboardIssueStreamProject(User $creator, Region $region, string $status, array $attributes = []): InvestmentProject
{
    $project = InvestmentProject::create([
        'name' => $status.' жобасы',
        'status' => $status,
        'attraction_stage' => $status === 'plan' ? 'potential' : null,
        'region_id' => $region->id,
        'created_by' => $creator->id,
        ...$attributes,
    ]);
    $project->curators()->attach($creator);

    return $project;
}

function dashboardIssueStreamIssue(InvestmentProject $project, string $status = 'open'): void
{
    $project->issues()->create([
        'title' => 'Жобаның мәселесі',
        'description' => 'Жобаға қатысты мәселе.',
        'status' => $status,
        'severity' => 'medium',
    ]);
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
});

test('administrator accompaniment issues contain only active nonplanned project issues', function () {
    $administrator = dashboardIssueStreamUser();
    $region = dashboardIssueStreamRegion();
    $visibleProjects = collect([
        ['implementation', 'open'],
        ['launched', 'in_progress'],
        ['suspended', 'resolved'],
    ])->map(function (array $row) use ($administrator, $region) {
        $project = dashboardIssueStreamProject($administrator, $region, $row[0]);
        dashboardIssueStreamIssue($project, $row[1]);

        return $project;
    });
    $planned = dashboardIssueStreamProject($administrator, $region, 'plan');
    dashboardIssueStreamIssue($planned);
    dashboardIssueStreamIssue(dashboardIssueStreamProject($administrator, $region, 'implementation', ['is_archived' => true]));
    dashboardIssueStreamIssue(dashboardIssueStreamProject($administrator, $region, 'launched', ['is_deleted' => true]));
    $zone = Sez::create([
        'name' => 'Тізімге кірмейтін АЭА',
        'region_id' => $region->id,
        'total_area' => 10,
        'status' => 'active',
    ]);
    $zone->issues()->create([
        'title' => 'АЭА мәселесі',
        'description' => 'Жобаға жатпайтын мәселе.',
        'status' => 'open',
        'severity' => 'high',
    ]);

    foreach ([null, 'sez', 'invest'] as $requestedSector) {
        $this->actingAs($administrator)
            ->get(route('issues.index', [
                'project_status' => 'non_plan',
                'sector' => $requestedSector,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('issues.data', 3)
                ->where('issueStats', ['total' => 3, 'open' => 1, 'in_progress' => 1, 'resolved' => 1])
                ->where('filters.project_status', 'non_plan')
                ->where('filters.sector', 'all_projects')
                ->where('sectorLabels', ['all_projects' => 'Сүйемелдеудегі жобалар'])
                ->where('issues.data', fn ($issues) => collect($issues)->pluck('entity_id')->sort()->values()->all()
                    === $visibleProjects->pluck('id')->sort()->values()->all()));
    }

    foreach (['plan' => $planned, ...$visibleProjects->keyBy('status')->all()] as $status => $project) {
        $this->get(route('issues.index', ['project_status' => $status, 'sector' => 'sez']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('issues.data', 1)
                ->has('sectorLabels', 1)
                ->where('filters.sector', 'all_projects')
                ->where('issues.data.0.entity_id', $project->id));
    }
});

test('administrator accompaniment issue region and pagination filters preserve the stream', function () {
    $administrator = dashboardIssueStreamUser();
    $region = dashboardIssueStreamRegion();
    $otherRegion = dashboardIssueStreamRegion('Басқа аудан');
    $project = dashboardIssueStreamProject($administrator, $region, 'implementation');
    foreach (range(1, 13) as $number) {
        dashboardIssueStreamIssue($project, $number <= 8 ? 'open' : 'resolved');
    }
    dashboardIssueStreamIssue(dashboardIssueStreamProject($administrator, $otherRegion, 'implementation'));
    dashboardIssueStreamIssue(dashboardIssueStreamProject($administrator, $region, 'plan'));

    $query = ['project_status' => 'non_plan', 'region_id' => $region->id];
    $this->actingAs($administrator)
        ->get(route('issues.index', $query))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 12)
            ->where('issues.total', 13)
            ->where('issueStats', ['total' => 13, 'open' => 8, 'in_progress' => 0, 'resolved' => 5])
            ->where('filters.region_id', $region->id)
            ->where('filters.project_status', 'non_plan')
            ->where('issues.next_page_url', fn ($url) => str_contains($url, 'project_status=non_plan')
                && str_contains($url, 'region_id='.$region->id)));

    $this->get(route('issues.index', [...$query, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.total', 13)
            ->where('issues.data.0.entity_id', $project->id)
            ->where('filters.project_status', 'non_plan'));
});

test('administrator issue status filters cannot override investment direction access', function (string $subRole, string $requestedStatus, string $visibleStatus) {
    $viewer = dashboardIssueStreamUser('invest', $subRole);
    $region = dashboardIssueStreamRegion();
    $projects = collect(['plan', 'implementation'])->mapWithKeys(function (string $status) use ($viewer, $region) {
        $project = dashboardIssueStreamProject($viewer, $region, $status);
        dashboardIssueStreamIssue($project);

        return [$status => $project];
    });

    $this->actingAs($viewer)
        ->get(route('issues.index', ['sector' => 'all_projects', 'project_status' => $requestedStatus]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('filters.project_status', null)
            ->where('issues.data.0.entity_id', $projects[$visibleStatus]->id));
})->with([
    [User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION, 'non_plan', 'plan'],
    [User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT, 'plan', 'implementation'],
]);
