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
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createCompanyManagementUser(
    string $roleName,
    ?string $investSubRole = null
): User {
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'invest_sub_role' => $investSubRole,
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
        'type' => 'district',
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

/**
 * @return array<string, mixed>
 */
function companyPayloadWithoutInvestor(Region $region, array $overrides = []): array
{
    $payload = validCompanyPayload($region);

    unset(
        $payload['investor_full_name'],
        $payload['investor_email'],
        $payload['investor_password'],
        $payload['investor_password_confirmation']
    );

    return array_merge($payload, $overrides);
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
    $investor = $company->investor()->sole();
    $originalPassword = $investor->password;

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
        'id' => $investor->id,
        'company_id' => $company->id,
        'full_name' => 'Жаңартылған Инвестор',
        'email' => 'company-investor@example.test',
    ]);
    expect($company->investor()->count())->toBe(1)
        ->and($investor->fresh()->password)->toBe($originalPassword);
});

test('company creation can omit the investor account', function (array $investorFields) {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();

    $this->actingAs($user)
        ->post(
            route('companies.store'),
            companyPayloadWithoutInvestor($region, $investorFields)
        )
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $company = Company::query()->sole();

    expect($company->is_profile_complete)->toBeTrue()
        ->and($company->investor()->exists())->toBeFalse();
    $this->assertDatabaseCount('users', 1);

    $this->get(route('companies.edit', $company))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('company.investor', null)
        );
})->with([
    'fields omitted' => [[]],
    'unchecked form with blank fields' => [[
        'create_investor' => false,
        'investor_full_name' => '',
        'investor_email' => '',
        'investor_password' => '',
        'investor_password_confirmation' => '',
    ]],
]);

test('a company can be edited without an investor and receive one later', function () {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);

    $this->actingAs($user)
        ->put(
            route('companies.update', $company),
            companyPayloadWithoutInvestor($region, [
                'name' => 'Accountless updated company',
                'bin' => $company->bin,
                'create_investor' => false,
            ])
        )
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('companies.show', $company));

    expect($company->fresh()->name)->toBe('Accountless updated company')
        ->and($company->investor()->exists())->toBeFalse();

    $project = InvestmentProject::create([
        'name' => 'Project registered before investor account',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'created_by' => $user->id,
    ]);

    $this->put(
        route('companies.update', $company),
        validCompanyPayload($region, [
            'bin' => $company->bin,
            'create_investor' => true,
            'investor_email' => '  Later-Investor@Example.Test  ',
        ])
    )
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('companies.show', $company));

    $investor = $company->investor()->sole();

    expect($investor->company_id)->toBe($company->id)
        ->and($investor->roleModel->name)->toBe('investor')
        ->and($investor->email)->toBe('later-investor@example.test')
        ->and(Hash::check('password123', $investor->password))->toBeTrue();

    $this->actingAs($investor)
        ->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $project->id)
        );
    $this->get(route('investment-projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.id', $project->id)
            ->where('project.investors.0.id', $investor->id)
        );
});

test('requested or partial investor details must form a valid account', function (
    array $investorFields,
    array $expectedErrors
) {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $payload = companyPayloadWithoutInvestor($region, $investorFields);

    $this->actingAs($user)
        ->post(route('companies.store'), $payload)
        ->assertSessionHasErrors($expectedErrors);

    $this->assertDatabaseCount('companies', 0);
    $this->assertDatabaseCount('users', 1);

    $company = Company::factory()->create(['region_id' => $region->id]);
    $this->put(route('companies.update', $company), [
        ...$payload,
        'bin' => $company->bin,
        'name' => 'Must not be saved',
    ])->assertSessionHasErrors($expectedErrors);

    expect($company->fresh()->name)->toBe($company->name)
        ->and($company->investor()->exists())->toBeFalse();
})->with([
    'explicit account request' => [
        ['create_investor' => true],
        ['investor_full_name', 'investor_email', 'investor_password'],
    ],
    'partially entered name' => [
        ['create_investor' => false, 'investor_full_name' => 'Partial investor'],
        ['investor_email', 'investor_password'],
    ],
    'confirmation alone cannot silently skip account validation' => [
        ['investor_password_confirmation' => 'password123'],
        ['investor_full_name', 'investor_email', 'investor_password'],
    ],
    'invalid email and mismatched password' => [
        [
            'investor_full_name' => 'Invalid investor',
            'investor_email' => 'not-an-email',
            'investor_password' => 'password123',
            'investor_password_confirmation' => 'different-password',
        ],
        ['investor_email', 'investor_password'],
    ],
]);

test('an existing investor cannot be removed by unchecking account creation', function () {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);
    $investor = createCompanyManagementInvestor($company);

    $this->actingAs($user)
        ->put(
            route('companies.update', $company),
            companyPayloadWithoutInvestor($region, [
                'bin' => $company->bin,
                'create_investor' => false,
            ])
        )
        ->assertSessionHasErrors(['investor_full_name', 'investor_email']);

    expect($company->investor()->sole()->id)->toBe($investor->id)
        ->and($investor->fresh()->password)->toBe($investor->password);
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

test('turkistan invest and moderator can manage companies but cannot delete them', function (
    string $roleName,
    ?string $investSubRole
) {
    Storage::fake('local');

    $user = createCompanyManagementUser($roleName, $investSubRole);
    $region = createCompanyManagementRegion();

    $this->actingAs($user)
        ->get(route('companies.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', true)
            ->where('canDelete', false)
        );

    $this->get(route('companies.create'))
        ->assertOk();

    $this->post(
        route('companies.store'),
        companyPayloadWithoutInvestor($region, [
            'documents' => [UploadedFile::fake()->create('license.pdf', 10, 'application/pdf')],
        ])
    )
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $company = Company::query()->sole();
    $document = $company->documents()->sole();

    $this->get(route('companies.show', $company))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('company.id', $company->id)
            ->where('canManage', true)
            ->where('canDelete', false)
        );
    $this->get(route('companies.edit', $company))
        ->assertOk();

    $this->put(
        route('companies.update', $company),
        validCompanyPayload($region, [
            'name' => 'Managed company with later investor',
            'create_investor' => true,
        ])
    )
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('companies.show', $company));

    expect($company->fresh()->name)->toBe('Managed company with later investor')
        ->and($company->created_by)->toBe($user->id)
        ->and($company->investor()->count())->toBe(1);

    $this->get(route('companies.documents.download', [$company, $document]))
        ->assertOk();
    $this->delete(route('companies.documents.destroy', [$company, $document]))
        ->assertRedirect();
    $this->delete(route('companies.destroy', $company))
        ->assertForbidden();

    $this->assertDatabaseHas('companies', ['id' => $company->id]);
    $this->assertDatabaseHas('users', ['company_id' => $company->id]);
})->with([
    'turkistan invest' => ['invest', 'turkistan_invest'],
    'moderator' => ['moderator', null],
]);

test('other invest directions cannot access company routes', function (?string $investSubRole) {
    $user = createCompanyManagementUser('invest', $investSubRole);
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);

    $this->actingAs($user);
    foreach (['index', 'create', 'show', 'edit'] as $action) {
        $this->get(route('companies.'.$action, $company))->assertForbidden();
    }
    $this->post(route('companies.store'), companyPayloadWithoutInvestor($region))
        ->assertForbidden();
    $this->put(
        route('companies.update', $company),
        companyPayloadWithoutInvestor($region, ['bin' => $company->bin])
    )->assertForbidden();
    $this->delete(route('companies.destroy', $company))->assertForbidden();
})->with(['aea', 'ia', 'prom_zone', null]);

test('existing company readers retain read access without management permissions', function (string $roleName) {
    $user = createCompanyManagementUser($roleName);
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);

    $this->actingAs($user)
        ->get(route('companies.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', false)
            ->where('canDelete', false)
        );
    $this->get(route('companies.show', $company))
        ->assertOk();
    $this->get(route('companies.edit', $company))
        ->assertForbidden();
    $this->post(route('companies.store'), companyPayloadWithoutInvestor($region))
        ->assertForbidden();
    $this->put(
        route('companies.update', $company),
        companyPayloadWithoutInvestor($region, ['bin' => $company->bin])
    )->assertForbidden();
    $this->delete(route('companies.destroy', $company))->assertForbidden();
})->with(['prokuror', 'akim', 'zamakim']);

test('company project lists and counts expose only the turkistan curator scope', function (
    string $roleName,
    ?string $investSubRole
) {
    $user = createCompanyManagementUser($roleName, $investSubRole);
    $peer = createCompanyManagementUser('invest', 'turkistan_invest');
    $moderator = createCompanyManagementUser('moderator');
    $outsideInvest = createCompanyManagementUser('invest', 'aea');
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);

    $createProject = function (string $name, array $curators, array $attributes = []) use ($company, $region, $user): InvestmentProject {
        $project = InvestmentProject::create([
            'name' => $name,
            'company_id' => $company->id,
            'company_name' => $company->display_name,
            'region_id' => $region->id,
            'total_investment' => 1000000,
            'status' => 'plan',
            'created_by' => $user->id,
            ...$attributes,
        ]);
        $project->curators()->sync($curators);

        return $project;
    };

    $own = $createProject('Own curated project', [$user->id]);
    $shared = $createProject('Peer curated project', [$peer->id, $outsideInvest->id]);
    $moderated = $createProject('Moderator curated project', [$moderator->id]);
    $createProject('Outside project created by viewer', [$outsideInvest->id]);
    $createProject('Creator without curator is outside scope', []);
    $createProject('Deleted own project', [$user->id], [
        'is_deleted' => true,
        'deleted_by' => $user->id,
        'deleted_at' => now(),
    ]);
    $createProject('Deleted outside project', [$outsideInvest->id], [
        'is_deleted' => true,
        'deleted_by' => $user->id,
        'deleted_at' => now(),
    ]);

    $visibleIds = collect([$own->id, $shared->id, $moderated->id])->sort()->values()->all();

    $this->actingAs($user)
        ->get(route('companies.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('companies.data', 1)
            ->where('companies.data.0.id', $company->id)
            ->where('companies.data.0.projects_count', 3)
        );
    $this->get(route('companies.show', $company))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('company.id', $company->id)
            ->where('projectCount', 3)
            ->where('projects.total', 3)
            ->has('projects.data', 3)
            ->where('projects.data', fn ($projects) => collect($projects)
                ->pluck('id')->sort()->values()->all() === $visibleIds)
        );
})->with([
    'turkistan invest' => ['invest', 'turkistan_invest'],
    'moderator' => ['moderator', null],
]);

test('project creation uses an active complete company without an investor and syncs its name', function () {
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

test('legacy project keeps an incomplete company while other fields are edited', function () {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $projectType = ProjectType::create(['name' => 'Legacy project type']);

    $currentCompany = Company::create([
        'legal_form' => 'other',
        'name' => 'A Legacy Current Company',
        'status' => 'active',
    ]);
    $replacementCompany = Company::factory()->create([
        'region_id' => $region->id,
        'name' => 'B Complete Replacement Company',
        'bin' => '555555555555',
    ]);

    $incompleteReplacement = Company::create([
        'legal_form' => 'other',
        'name' => 'C Incomplete Replacement Company',
        'status' => 'active',
    ]);
    createCompanyManagementInvestor($incompleteReplacement);

    $project = InvestmentProject::create([
        'name' => 'Legacy company project',
        'company_id' => $currentCompany->id,
        'company_name' => $currentCompany->display_name,
        'region_id' => $region->id,
        'project_type_id' => $projectType->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'created_by' => $user->id,
    ]);
    $project->projectTypes()->sync([$projectType->id]);

    $this->actingAs($user)
        ->get(route('investment-projects.edit', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/edit')
            ->has('companies', 2)
            ->where('companies.0.id', $currentCompany->id)
            ->where('companies.0.is_project_selectable', false)
            ->where('companies.1.id', $replacementCompany->id)
            ->where('companies.1.is_project_selectable', true)
        );

    $payload = [
        'name' => 'Updated legacy company project',
        'company_id' => $currentCompany->id,
        'region_id' => $region->id,
        'project_type_ids' => [$projectType->id],
        'total_investment' => 2000000,
        'status' => 'implementation',
    ];

    $this->actingAs($user)
        ->put(route('investment-projects.update', $project), $payload)
        ->assertRedirect(route('investment-projects.show', $project));

    $project->refresh();

    expect($project->name)->toBe('Updated legacy company project')
        ->and($project->company_id)->toBe($currentCompany->id);

    $this->actingAs($user)
        ->put(route('investment-projects.update', $project), [
            ...$payload,
            'company_id' => $incompleteReplacement->id,
        ])
        ->assertSessionHasErrors('company_id');

    expect($project->fresh()->company_id)->toBe($currentCompany->id);

    $this->actingAs($user)
        ->put(route('investment-projects.update', $project), [
            ...$payload,
            'company_id' => $replacementCompany->id,
        ])
        ->assertRedirect(route('investment-projects.show', $project));

    expect($project->fresh()->company_id)->toBe($replacementCompany->id);
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
        ->assertRedirect()
        ->assertSessionHas(
            'error',
            'Бұл компанияға 1 жоба тіркелген. Компанияны өшіруге тыйым салынады.'
        );

    $this->assertDatabaseHas('companies', ['id' => $company->id]);
});

test('deleting a company with no projects removes all company data', function () {
    Storage::fake('local');

    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);
    $investor = createCompanyManagementInvestor($company);
    $document = CompanyDocument::create([
        'company_id' => $company->id,
        'name' => 'company-file.pdf',
        'file_path' => "company-documents/{$company->id}/company-file.pdf",
        'type' => 'pdf',
        'size' => 12,
        'uploaded_by' => $user->id,
    ]);
    Storage::disk('local')->put($document->file_path, 'company document');

    $this->actingAs($user)
        ->delete(route('companies.destroy', $company))
        ->assertRedirect(route('companies.index'));

    $this->assertDatabaseMissing('companies', ['id' => $company->id]);
    $this->assertDatabaseMissing('users', ['id' => $investor->id]);
    $this->assertDatabaseMissing('company_documents', ['id' => $document->id]);
    Storage::disk('local')->assertMissing($document->file_path);
});

test('logically deleted projects still prevent company deletion', function () {
    $user = createCompanyManagementUser('superadmin');
    $region = createCompanyManagementRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);
    $project = InvestmentProject::create([
        'name' => 'Deleted company project',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'created_by' => $user->id,
        'is_deleted' => true,
        'deleted_by' => $user->id,
        'deleted_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('companies.show', $company))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('projectCount', 1)
            ->where('projects.total', 0)
        );

    $this->actingAs($user)
        ->delete(route('companies.destroy', $company))
        ->assertRedirect()
        ->assertSessionHas(
            'error',
            'Бұл компанияға 1 жоба тіркелген. Компанияны өшіруге тыйым салынады.'
        );

    $this->assertDatabaseHas('companies', ['id' => $company->id]);
    $this->assertDatabaseHas('investment_projects', ['id' => $project->id]);
});
