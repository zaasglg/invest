<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function leadershipWorldLinkRegion(string $name, ?Region $parent = null): Region
{
    return Region::create([
        'name' => $name,
        'type' => $parent ? 'district' : 'oblast',
        'parent_id' => $parent?->id,
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
}

function leadershipWorldLinkUser(string $role, ?Region $region = null): User
{
    return User::factory()->create([
        'role' => 'district_user',
        'role_id' => Role::firstOrCreate(
            ['name' => $role],
            ['display_name' => $role]
        )->id,
        'region_id' => $region?->id,
    ]);
}

function leadershipWorldLinkProject(User $creator, Region $region, array $attributes = []): InvestmentProject
{
    return InvestmentProject::create([
        'name' => 'Ел бойынша қаралатын жоба',
        'status' => 'plan',
        'investor_country_code' => 'CN',
        'region_id' => $region->id,
        'total_investment' => 1000,
        'created_by' => $creator->id,
        ...$attributes,
    ]);
}

test('leadership world country links retain project status region and read only access', function (string $role, string $scope) {
    Http::preventStrayRequests();
    Http::fake();

    $oblast = leadershipWorldLinkRegion('Өз облысы');
    $district = leadershipWorldLinkRegion('Өз ауданы', $oblast);
    $secondDistrict = leadershipWorldLinkRegion('Көршілес аудан', $oblast);
    $outsideOblast = leadershipWorldLinkRegion('Басқа облыс');
    $outsideDistrict = leadershipWorldLinkRegion('Басқа облыстың ауданы', $outsideOblast);
    $viewer = leadershipWorldLinkUser($role, match ($scope) {
        'oblast' => $oblast,
        'district' => $district,
        default => null,
    });
    $creator = leadershipWorldLinkUser('superadmin');
    $own = leadershipWorldLinkProject($creator, $district);
    $sibling = leadershipWorldLinkProject($creator, $secondDistrict);
    $outside = leadershipWorldLinkProject($creator, $outsideDistrict);
    leadershipWorldLinkProject($creator, $district, ['investor_country_code' => 'TR']);
    leadershipWorldLinkProject($creator, $outsideDistrict, ['investor_country_code' => 'US']);
    leadershipWorldLinkProject($creator, $district, ['status' => 'implementation']);
    leadershipWorldLinkProject($creator, $district, ['is_archived' => true]);
    leadershipWorldLinkProject($creator, $district, ['is_deleted' => true]);
    $expectedIds = match ($scope) {
        'oblast' => [$own->id, $sibling->id],
        'district' => [$own->id],
        default => [$own->id, $sibling->id, $outside->id],
    };
    sort($expectedIds);
    $expectedCountries = $scope === 'global' ? ['CN', 'TR', 'US'] : ['CN', 'TR'];

    $this->actingAs($viewer)
        ->get(route('investment-projects.index', [
            'status' => 'plan',
            'investor_country_code' => ' cn ',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/index')
            ->where('canFilterByInvestorCountry', true)
            ->where('canModify', false)
            ->where('filters.status', 'plan')
            ->where('filters.investor_country_code', 'CN')
            ->where('stats.total_projects', count($expectedIds))
            ->where('projects.data', fn ($projects) => collect($projects)
                ->pluck('id')->sort()->values()->all() === $expectedIds
                && collect($projects)->every(fn ($project) => $project['can_manage'] === false && $project['can_delete'] === false))
            ->where('investorCountries', fn ($countries) => collect($countries)
                ->pluck('code')->sort()->values()->all() === $expectedCountries));

    if ($scope !== 'global') {
        $this->get(route('investment-projects.index', [
            'status' => 'plan',
            'investor_country_code' => 'CN',
            'region_id' => $outsideDistrict->id,
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('projects.data', 0)
                ->where('stats.total_projects', 0));
    }
})->with([
    ['akim', 'oblast'],
    ['akim', 'district'],
    ['zamakim', 'oblast'],
    ['zamakim', 'district'],
    ['prokuror', 'global'],
]);
