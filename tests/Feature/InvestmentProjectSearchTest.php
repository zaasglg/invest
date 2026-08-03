<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createProjectSearchAdmin(): User
{
    $role = Role::firstOrCreate(
        ['name' => 'superadmin'],
        [
            'display_name' => 'Superadmin',
            'description' => 'Project search test role',
        ]
    );

    return User::factory()->create([
        'role' => 'superadmin',
        'role_id' => $role->id,
    ]);
}

/**
 * @return array{matching: InvestmentProject, other: InvestmentProject}
 */
function createProjectsForSearch(User $admin): array
{
    $oblast = Region::create([
        'name' => 'Search test облысы',
        'type' => 'oblast',
        'color' => '#123456',
        'icon' => 'factory',
    ]);
    $region = Region::create([
        'name' => 'Search test ауданы',
        'type' => 'district',
        'parent_id' => $oblast->id,
        'color' => '#654321',
        'icon' => 'factory',
    ]);
    $projectType = ProjectType::factory()->create();

    $company = Company::factory()->create([
        'name' => 'QazTech Industries',
        'bin' => '123456789012',
        'region_id' => $region->id,
        'created_by' => $admin->id,
    ]);
    $otherCompany = Company::factory()->create([
        'name' => 'Other Company',
        'bin' => '999999999999',
        'region_id' => $region->id,
        'created_by' => $admin->id,
    ]);

    $matchingProject = InvestmentProject::factory()->create([
        'name' => 'КҮН ЭНЕРГИЯСЫ ОРТАЛЫҒЫ',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $region->id,
        'project_type_id' => $projectType->id,
        'created_by' => $admin->id,
        'is_archived' => false,
    ]);
    $otherProject = InvestmentProject::factory()->create([
        'name' => 'Басқа инвестициялық жоба',
        'company_id' => $otherCompany->id,
        'company_name' => $otherCompany->display_name,
        'region_id' => $region->id,
        'project_type_id' => $projectType->id,
        'created_by' => $admin->id,
        'is_archived' => false,
    ]);

    return [
        'matching' => $matchingProject,
        'other' => $otherProject,
    ];
}

test('projects can be searched by name company and bin', function (
    string $search
) {
    $admin = createProjectSearchAdmin();
    $projects = createProjectsForSearch($admin);

    $this->actingAs($admin)
        ->get(route('investment-projects.index', ['search' => $search]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/index')
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $projects['matching']->id)
            ->where('filters.search', trim($search))
        );
})->with([
    'project name' => 'ЭНЕРГИЯСЫ',
    'company name is case insensitive' => 'qaztech',
    'company bin supports partial input' => '  456789  ',
]);
