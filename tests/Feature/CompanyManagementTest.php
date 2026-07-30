<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createCompanyManagementUser(string $roleName): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => match ($roleName) {
            'superadmin' => 'admin',
            'invest' => 'invest',
            'akim' => 'akim',
            'zamakim' => 'deputy_akim',
            default => 'district_user',
        },
    ]);
}

function createCompanyManagementRegion(): Region
{
    return Region::create([
        'name' => 'Company management test region',
        'type' => 'oblast',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

/**
 * @return array<string, mixed>
 */
function validCompanyPayload(Region $region, array $overrides = []): array
{
    return array_merge([
        'legal_form' => 'too',
        'name' => 'Turkistan Test Company',
        'bin' => '123456789012',
        'registration_date' => '2020-01-15',
        'region_id' => $region->id,
        'activity_type' => 'Өңдеу өнеркәсібі',
        'director_full_name' => 'Тест Басшы',
        'contact_person' => 'Тест Байланыс',
        'phone' => '+7 700 111 22 33',
        'email' => 'company@example.test',
        'website' => 'https://example.test',
        'legal_address' => 'Түркістан қаласы, Тест көшесі 1',
        'actual_address' => 'Түркістан қаласы, Тест көшесі 2',
        'status' => 'active',
        'notes' => 'Тест компания',
    ], $overrides);
}

test('superadmin can create and update a complete company card', function () {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();

    $this->actingAs($user)
        ->post(route('companies.store'), validCompanyPayload($region))
        ->assertRedirect();

    $company = Company::query()->sole();

    expect($company->created_by)->toBe($user->id)
        ->and($company->display_name)->toContain('Turkistan Test Company')
        ->and($company->is_profile_complete)->toBeTrue();

    $this->actingAs($user)
        ->get(route('companies.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('companies/index')
            ->has('companies.data', 1)
        );
    $this->actingAs($user)
        ->get(route('companies.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('companies/create')
        );
    $this->actingAs($user)
        ->get(route('companies.show', $company))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('companies/show')
            ->where('company.id', $company->id)
        );
    $this->actingAs($user)
        ->get(route('companies.edit', $company))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('companies/edit')
            ->where('company.id', $company->id)
        );

    $this->actingAs($user)
        ->put(
            route('companies.update', $company),
            validCompanyPayload($region, [
                'name' => 'Updated Company',
                'phone' => '+7 701 999 88 77',
            ])
        )
        ->assertRedirect(route('companies.show', $company));

    $this->assertDatabaseHas('companies', [
        'id' => $company->id,
        'name' => 'Updated Company',
        'phone' => '+7 701 999 88 77',
    ]);
});

test('company bin must contain twelve digits and be unique', function () {
    $user = createCompanyManagementUser('invest');
    $region = createCompanyManagementRegion();
    Company::factory()->create([
        'region_id' => $region->id,
        'bin' => '123456789012',
    ]);

    $this->actingAs($user)
        ->post(
            route('companies.store'),
            validCompanyPayload($region, ['bin' => '123'])
        )
        ->assertSessionHasErrors('bin');

    $this->actingAs($user)
        ->post(route('companies.store'), validCompanyPayload($region))
        ->assertSessionHasErrors('bin');
});

test('company access follows read and write role boundaries', function () {
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);
    $prokuror = createCompanyManagementUser('prokuror');
    $ispolnitel = createCompanyManagementUser('ispolnitel');

    $this->actingAs($prokuror)
        ->get(route('companies.show', $company))
        ->assertOk();

    $this->actingAs($prokuror)
        ->get(route('companies.create'))
        ->assertForbidden();

    $this->actingAs($ispolnitel)
        ->get(route('companies.index'))
        ->assertForbidden();
});

test('project creation uses an active complete company and syncs its name', function () {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $projectType = ProjectType::create(['name' => 'Test project type']);
    $completeCompany = Company::factory()->create([
        'region_id' => $region->id,
        'name' => 'Selectable Company',
        'bin' => '111111111111',
    ]);
    $incompleteCompany = Company::create([
        'legal_form' => 'other',
        'name' => 'Legacy Company',
        'status' => 'active',
    ]);
    Company::factory()->create([
        'region_id' => $region->id,
        'name' => 'Inactive Company',
        'bin' => '222222222222',
        'status' => 'inactive',
    ]);

    $this->actingAs($user)
        ->get(route('investment-projects.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/create')
            ->has('companies', 1)
            ->where('companies.0.id', $completeCompany->id)
        );

    $this->actingAs($user)
        ->post(route('investment-projects.store'), [
            'name' => 'Company linked project',
            'company_id' => $completeCompany->id,
            'region_id' => $region->id,
            'project_type_id' => $projectType->id,
            'total_investment' => 150000000,
            'status' => 'plan',
        ])
        ->assertRedirect(route('investment-projects.index'));

    $project = InvestmentProject::query()
        ->where('name', 'Company linked project')
        ->sole();

    expect($project->company_id)->toBe($completeCompany->id)
        ->and($project->company_name)->toBe(
            $completeCompany->display_name
        );

    $this->actingAs($user)
        ->get(route('investment-projects.edit', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/edit')
            ->where('project.company_id', $completeCompany->id)
            ->has('companies', 1)
            ->where('companies.0.id', $completeCompany->id)
        );

    $this->actingAs($user)
        ->post(route('investment-projects.store'), [
            'name' => 'Invalid legacy company project',
            'company_id' => $incompleteCompany->id,
            'region_id' => $region->id,
            'project_type_id' => $projectType->id,
            'total_investment' => 100,
            'status' => 'plan',
        ])
        ->assertSessionHasErrors('company_id');
});

test('renaming a company updates project snapshots and linked company cannot be deleted', function () {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create([
        'region_id' => $region->id,
        'name' => 'Old Company Name',
        'bin' => '333333333333',
    ]);
    $project = InvestmentProject::create([
        'name' => 'Snapshot test project',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'created_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->put(
            route('companies.update', $company),
            validCompanyPayload($region, [
                'name' => 'New Company Name',
                'bin' => $company->bin,
            ])
        )
        ->assertRedirect(route('companies.show', $company));

    expect($project->refresh()->company_name)->toContain('New Company Name');

    $this->actingAs($user)
        ->delete(route('companies.destroy', $company))
        ->assertStatus(409);

    $this->assertDatabaseHas('companies', ['id' => $company->id]);
});
