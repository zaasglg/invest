<?php

use App\Models\Company;
use App\Models\CompanyDocument;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

function createCompanyManagementInvestor(
    Company $company,
    ?string $email = null
): User {
    $role = Role::firstOrCreate(
        ['name' => 'investor'],
        ['display_name' => 'Инвестор']
    );

    return User::factory()->create([
        'full_name' => 'Компания инвесторы',
        'email' => $email ?? "company-investor-{$company->id}@example.test",
        'role' => 'district_user',
        'role_id' => $role->id,
        'company_id' => $company->id,
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
        'licenses_and_regulatory_documents' => 'Лицензия №123, 2025 жылғы 1 қаңтардан бастап жарамды.',
        'status' => 'active',
        'notes' => 'Тест компания',
        'investor_full_name' => 'Тест Инвестор',
        'investor_email' => 'company-investor@example.test',
        'investor_password' => 'password123',
        'investor_password_confirmation' => 'password123',
    ], $overrides);
}

test('superadmin can create and update a complete company card', function () {
    Storage::fake('local');

    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $license = UploadedFile::fake()->create(
        'license.pdf',
        128,
        'application/pdf'
    );

    $this->actingAs($user)
        ->post(
            route('companies.store'),
            validCompanyPayload($region, ['documents' => [$license]])
        )
        ->assertRedirect();

    $company = Company::query()->sole();
    $document = CompanyDocument::query()->sole();

    expect($company->created_by)->toBe($user->id)
        ->and($company->display_name)->toContain('Turkistan Test Company')
        ->and($company->is_profile_complete)->toBeTrue()
        ->and($company->licenses_and_regulatory_documents)
        ->toContain('Лицензия №123')
        ->and($company->investor)->not->toBeNull()
        ->and($company->investor->email)
        ->toBe('company-investor@example.test')
        ->and($document->name)->toBe('license.pdf')
        ->and($document->uploaded_by)->toBe($user->id);

    Storage::disk('local')->assertExists($document->file_path);

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
            ->where(
                'company.licenses_and_regulatory_documents',
                'Лицензия №123, 2025 жылғы 1 қаңтардан бастап жарамды.'
            )
            ->has('company.documents', 1)
            ->where('company.documents.0.name', 'license.pdf')
        );
    $this->actingAs($user)
        ->get(route('companies.edit', $company))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('companies/edit')
            ->where('company.id', $company->id)
            ->where(
                'company.licenses_and_regulatory_documents',
                'Лицензия №123, 2025 жылғы 1 қаңтардан бастап жарамды.'
            )
            ->has('company.documents', 1)
            ->where('company.documents.0.name', 'license.pdf')
        );

    $updatedLicense = UploadedFile::fake()->create(
        'updated-license.docx',
        64,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    $this->actingAs($user)
        ->post(
            route('companies.update', $company),
            validCompanyPayload($region, [
                '_method' => 'put',
                'name' => 'Updated Company',
                'phone' => '+7 701 999 88 77',
                'licenses_and_regulatory_documents' => 'Жаңартылған лицензия №456.',
                'documents' => [$updatedLicense],
                'investor_full_name' => 'Жаңартылған Инвестор',
                'investor_password' => '',
                'investor_password_confirmation' => '',
            ])
        )
        ->assertRedirect(route('companies.show', $company));

    $this->assertDatabaseHas('companies', [
        'id' => $company->id,
        'name' => 'Updated Company',
        'phone' => '+7 701 999 88 77',
        'licenses_and_regulatory_documents' => 'Жаңартылған лицензия №456.',
    ]);
    expect($company->documents()->count())->toBe(2);

    $this->actingAs($user)
        ->get(route('companies.documents.download', [$company, $document]))
        ->assertOk();

    $this->actingAs($user)
        ->delete(route('companies.documents.destroy', [$company, $document]))
        ->assertRedirect();

    $this->assertDatabaseMissing('company_documents', [
        'id' => $document->id,
    ]);
    Storage::disk('local')->assertMissing($document->file_path);
    $this->assertDatabaseHas('users', [
        'company_id' => $company->id,
        'full_name' => 'Жаңартылған Инвестор',
        'email' => 'company-investor@example.test',
    ]);
});

test('company documents reject unsupported file formats', function () {
    Storage::fake('local');

    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();

    $this->actingAs($user)
        ->post(
            route('companies.store'),
            validCompanyPayload($region, [
                'documents' => [
                    UploadedFile::fake()->create(
                        'script.html',
                        10,
                        'text/html'
                    ),
                ],
            ])
        )
        ->assertSessionHasErrors('documents.0');

    $this->assertDatabaseCount('companies', 0);
});

test('company bin must contain twelve digits and be unique', function () {
    $user = createCompanyManagementUser('superadmin');
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
    Storage::fake('local');

    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);
    $document = CompanyDocument::create([
        'company_id' => $company->id,
        'name' => 'license.pdf',
        'file_path' => 'company-documents/'.$company->id.'/license.pdf',
        'type' => 'pdf',
        'size' => 7,
    ]);
    Storage::disk('local')->put($document->file_path, 'license');
    $prokuror = createCompanyManagementUser('prokuror');
    $invest = createCompanyManagementUser('invest');
    $ispolnitel = createCompanyManagementUser('ispolnitel');

    $this->actingAs($prokuror)
        ->get(route('companies.show', $company))
        ->assertOk();

    $this->actingAs($prokuror)
        ->get(route('companies.documents.download', [$company, $document]))
        ->assertOk();

    $this->actingAs($prokuror)
        ->delete(route('companies.documents.destroy', [$company, $document]))
        ->assertForbidden();

    $this->actingAs($prokuror)
        ->get(route('companies.create'))
        ->assertForbidden();

    $this->actingAs($invest)
        ->get(route('companies.index'))
        ->assertForbidden();

    $this->actingAs($invest)
        ->get(route('companies.show', $company))
        ->assertForbidden();

    $this->actingAs($invest)
        ->post(route('companies.store'), validCompanyPayload($region))
        ->assertForbidden();

    $this->actingAs($invest)
        ->put(
            route('companies.update', $company),
            validCompanyPayload($region, ['bin' => $company->bin])
        )
        ->assertForbidden();

    $this->actingAs($invest)
        ->delete(route('companies.destroy', $company))
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
    createCompanyManagementInvestor($completeCompany);
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

test('project creation and editing support multiple project types', function () {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $firstType = ProjectType::create(['name' => 'Primary project type']);
    $secondType = ProjectType::create(['name' => 'Secondary project type']);
    $thirdType = ProjectType::create(['name' => 'Replacement project type']);
    $company = Company::factory()->create([
        'region_id' => $region->id,
        'name' => 'Multi type company',
        'bin' => '444444444444',
    ]);
    createCompanyManagementInvestor($company);

    $this->actingAs($user)
        ->post(route('investment-projects.store'), [
            'name' => 'Multiple type project',
            'company_id' => $company->id,
            'region_id' => $region->id,
            'project_type_ids' => [$firstType->id, $secondType->id],
            'total_investment' => 250000000,
            'status' => 'plan',
        ])
        ->assertRedirect(route('investment-projects.index'));

    $project = InvestmentProject::query()
        ->where('name', 'Multiple type project')
        ->sole();

    expect($project->project_type_id)->toBe($firstType->id)
        ->and($project->projectTypes()->orderBy('project_types.id')->pluck('project_types.id')->all())
        ->toBe([$firstType->id, $secondType->id]);

    $this->actingAs($user)
        ->get(route('investment-projects.edit', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/edit')
            ->where('project.project_type_ids', [
                $firstType->id,
                $secondType->id,
            ])
        );

    $this->actingAs($user)
        ->put(route('investment-projects.update', $project), [
            'name' => $project->name,
            'company_id' => $company->id,
            'region_id' => $region->id,
            'project_type_ids' => [$secondType->id, $thirdType->id],
            'total_investment' => 300000000,
            'status' => 'implementation',
        ])
        ->assertRedirect(route('investment-projects.show', $project));

    $project->refresh();

    expect($project->project_type_id)->toBe($secondType->id)
        ->and($project->projectTypes()->orderBy('project_types.id')->pluck('project_types.id')->all())
        ->toBe([$secondType->id, $thirdType->id]);

    $this->actingAs($user)
        ->get(route('investment-projects.index', [
            'project_type_id' => $thirdType->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/index')
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $project->id)
        );
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
