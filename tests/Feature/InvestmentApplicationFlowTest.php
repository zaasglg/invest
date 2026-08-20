<?php

use App\Models\Company;
use App\Models\IndustrialZone;
use App\Models\InvestmentApplication;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectType;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\User;
use App\Services\ZoneCapacityService;
use Inertia\Testing\AssertableInertia as Assert;

function applicationRole(string $name): Role
{
    return Role::query()->firstOrCreate(
        ['name' => $name],
        ['display_name' => ucfirst($name)]
    );
}

function applicationUser(string $role, array $attributes = []): User
{
    return User::factory()->create([
        'role' => match ($role) {
            'superadmin' => 'admin',
            'invest' => 'invest',
            default => 'district_user',
        },
        'role_id' => applicationRole($role)->id,
        'email_verified_at' => now(),
        ...$attributes,
    ]);
}

function applicationRegion(): Region
{
    return Region::create([
        'name' => 'Тест ауданы',
        'type' => 'district',
    ]);
}

function applicationZone(Region $region, float $area = 100): Sez
{
    return Sez::create([
        'name' => 'Тест АЭА',
        'region_id' => $region->id,
        'total_area' => $area,
        'status' => 'active',
        'infrastructure' => [
            'electricity' => ['available' => true, 'capacity' => 1000],
            'water' => ['available' => true, 'capacity' => 500],
        ],
        'description' => 'Өтінім берушіге арналған ашық сипаттама.',
    ]);
}

function applicationProjectType(string $name = 'Өңдеу өнеркәсібі'): ProjectType
{
    return ProjectType::query()->firstOrCreate(['name' => $name]);
}

function validApplicationPayload(Region $region, array $overrides = []): array
{
    $projectType = applicationProjectType();

    return [
        'intent' => 'submit',
        'application_kind' => 'new_project',
        'project_name' => 'Жаңа өндіріс',
        'project_description' => 'Өндірістік жоба сипаттамасы',
        'activity_sector' => 'Өңдеу өнеркәсібі',
        'company_activity_type' => 'Жеңіл өнеркәсіп өнімдерін өндіру',
        'project_type_ids' => [$projectType->id],
        'requested_area' => 30,
        'investment_amount' => 150000000,
        'jobs_count' => 50,
        'infrastructure_requirements' => [
            'electricity' => 100,
            'water' => 20,
        ],
        'company_legal_form' => 'too',
        'company_name' => 'Тест Инвест',
        'company_bin' => '123456789012',
        'company_registration_date' => '2025-01-10',
        'company_region_id' => $region->id,
        'director_full_name' => 'Тест Басшы',
        'contact_person' => 'Тест Байланыс',
        'contact_phone' => '+7 700 000 00 00',
        'contact_email' => 'investor@example.com',
        'legal_address' => 'Түркістан қаласы',
        ...$overrides,
    ];
}

function applicationCompany(Region $region, array $attributes = []): Company
{
    return Company::create([
        'legal_form' => 'too',
        'name' => 'CRM компаниясы',
        'bin' => '987654321098',
        'registration_date' => '2024-03-15',
        'region_id' => $region->id,
        'activity_type' => 'Өңдеу өнеркәсібі',
        'director_full_name' => 'CRM Басшысы',
        'contact_person' => 'CRM Байланыс',
        'phone' => '+7 701 111 22 33',
        'email' => 'crm@example.com',
        'legal_address' => 'Түркістан, CRM көшесі 1',
        'status' => 'active',
        ...$attributes,
    ]);
}

test('applicant sees safe zone capacity and cannot open internal zone pages', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $zone->update([
        'location' => [
            ['lat' => 43.3, 'lng' => 68.2],
            ['lat' => 43.31, 'lng' => 68.2],
            ['lat' => 43.31, 'lng' => 68.21],
        ],
    ]);
    $zone->photos()->create([
        'file_path' => 'sezs/test-zone.jpg',
        'photo_type' => 'gallery',
        'description' => 'АЭА көрінісі',
    ]);
    $applicant = applicationUser('applicant');

    $this->actingAs($applicant)
        ->get(route('applicant.portal'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applicant/portal')
            ->where('zones.data.0.name', $zone->name)
            ->where('zones.data.0.area.available', 100)
            ->missing('zones.data.0.investment_projects')
            ->missing('zones.data.0.location')
            ->missing('zones.data.0.geometry'));

    $this->actingAs($applicant)
        ->get(route('applicant.zones.show', [
            'zoneType' => 'sez',
            'zone' => $zone,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('sezs/show')
            ->where('sez.name', $zone->name)
            ->has('sez.location', 3)
            ->where('mainGallery.0.file_path', 'sezs/test-zone.jpg')
            ->where('areaUsage.available', 100)
            ->where('portalContext.accountRole', 'applicant')
            ->where('portalContext.zoneType', 'sez')
            ->has('investmentProjects.data', 0)
            ->has('mapProjects', 0)
            ->missing('sez.issues')
            ->missing('sez.investment_projects')
            ->missing('infrastructureUsage.electricity.consumers'));

    $this->actingAs($applicant)
        ->get(route('sezs.show', $zone))
        ->assertForbidden();

    $this->actingAs($applicant)
        ->get(route('dashboard'))
        ->assertRedirect(route('applicant.portal', absolute: false));
});

test('applicant sees public map and gallery for every supported zone type', function () {
    $region = applicationRegion();
    $applicant = applicationUser('applicant');
    $zoneTypes = [
        'sez' => Sez::class,
        'industrial-zone' => IndustrialZone::class,
        'prom-zone' => PromZone::class,
    ];

    foreach ($zoneTypes as $type => $model) {
        $zone = $model::create([
            'name' => "{$type} ашық беті",
            'region_id' => $region->id,
            'total_area' => 75,
            'status' => 'active',
            'location' => [
                ['lat' => 43.3, 'lng' => 68.2],
                ['lat' => 43.31, 'lng' => 68.2],
                ['lat' => 43.31, 'lng' => 68.21],
            ],
            'infrastructure' => [
                'electricity' => [
                    'available' => true,
                    'capacity' => 1200,
                ],
            ],
            'description' => 'Ашық аймақ сипаттамасы.',
        ]);
        $zone->photos()->create([
            'file_path' => "zones/{$type}.jpg",
            'photo_type' => 'gallery',
            'description' => 'Аймақ көрінісі',
        ]);

        $this->actingAs($applicant)
            ->get(route('applicant.zones.show', [
                'zoneType' => $type,
                'zone' => $zone,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('sezs/show')
                ->where('portalContext.zoneType', $type)
                ->has('sez.location', 3)
                ->where(
                    'mainGallery.0.file_path',
                    "zones/{$type}.jpg"
                )
                ->has('investmentProjects.data', 0)
                ->has('mapProjects', 0)
                ->missing('sez.investment_projects')
                ->missing('sez.issues'));
    }
});

test('investor zone detail only shows their company projects in that zone', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $company = applicationCompany($region);
    $otherCompany = applicationCompany($region, [
        'name' => 'Other zone company',
        'bin' => '444444444444',
    ]);
    $investor = applicationUser('investor', ['company_id' => $company->id]);
    $creator = applicationUser('superadmin', ['region_id' => $region->id]);

    $ownProject = InvestmentProject::create([
        'name' => 'Investor visible zone project',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $region->id,
        'total_investment' => 25000000,
        'status' => 'implementation',
        'infrastructure' => [],
        'created_by' => $creator->id,
    ]);
    $foreignProject = InvestmentProject::create([
        'name' => 'Foreign hidden zone project',
        'company_id' => $otherCompany->id,
        'company_name' => $otherCompany->display_name,
        'region_id' => $region->id,
        'total_investment' => 90000000,
        'status' => 'launched',
        'infrastructure' => [],
        'created_by' => $creator->id,
    ]);
    $ownProject->sezs()->attach($zone);
    $foreignProject->sezs()->attach($zone);

    $this->actingAs($investor)
        ->get(route('applicant.zones.show', [
            'zoneType' => 'sez',
            'zone' => $zone,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('sezs/show')
            ->where('portalContext.accountRole', 'investor')
            ->has('investmentProjects.data', 1)
            ->where('investmentProjects.data.0.id', $ownProject->id)
            ->where('investmentProjects.data.0.name', $ownProject->name)
            ->where(
                'investmentProjects.data.0.company_name',
                $company->display_name
            )
            ->missing('investmentProjects.data.0.issues')
            ->missing('sez.issues'));
});

test('submitted applications do not reserve land and approval reserves it', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $reviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', ['zoneType' => 'sez', 'zone' => $zone]),
            validApplicationPayload($region)
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();
    expect($application->status)->toBe('submitted')
        ->and($application->projectTypes()->pluck('project_types.name')->all())
        ->toBe(['Өңдеу өнеркәсібі'])
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(100.0);

    $this->actingAs($reviewer)
        ->post(route('investment-applications.approve', $application), [
            'approved_area' => 25,
            'comment' => 'Құжаттар талапқа сай.',
        ])
        ->assertRedirect();

    $application->refresh();
    expect($application->status)->toBe('approved')
        ->and((float) $application->approved_area)->toBe(25.0)
        ->and($application->reserved_until)->not->toBeNull()
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(75.0);
});

test('approved application converts into company investor and internal project', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $reviewer = applicationUser('superadmin', ['region_id' => $region->id]);
    $payload = validApplicationPayload($region);
    $application = InvestmentApplication::create([
        ...$payload,
        'application_number' => 'INV-2026-CONVERT1',
        'user_id' => $applicant->id,
        'zoneable_type' => Sez::class,
        'zoneable_id' => $zone->id,
        'status' => 'approved',
        'approved_area' => 30,
        'reviewed_by' => $reviewer->id,
        'submitted_at' => now(),
        'reviewed_at' => now(),
        'reserved_until' => now()->addDays(30),
    ]);
    $application->projectTypes()->sync($payload['project_type_ids']);
    $application->documents()->create([
        'name' => 'Бизнес жоспар.pdf',
        'file_path' => 'investment-applications/test/business-plan.pdf',
        'type' => 'pdf',
        'size' => 1024,
        'uploaded_by' => $applicant->id,
    ]);

    $this->actingAs($reviewer)
        ->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    $application->refresh();
    $applicant->refresh();
    $project = $application->investmentProject()->firstOrFail();
    $company = Company::query()->findOrFail($applicant->company_id);

    expect($application->status)->toBe('converted_to_project')
        ->and($applicant->roleModel?->name)->toBe('investor')
        ->and($applicant->company_id)->not->toBeNull()
        ->and($project->company_id)->toBe($applicant->company_id)
        ->and($project->project_type_id)->toBe($payload['project_type_ids'][0])
        ->and($project->projectTypes()->pluck('project_types.id')->all())
        ->toBe($payload['project_type_ids'])
        ->and($company->activity_type)
        ->toBe($payload['company_activity_type'])
        ->and((float) data_get($project->infrastructure, 'land.used_capacity'))
        ->toBe(30.0)
        ->and($project->documents()
            ->where('source', 'investment_application')
            ->where('name', 'Бизнес жоспар.pdf')
            ->exists())->toBeTrue()
        ->and($project->sezs()->whereKey($zone->id)->exists())->toBeTrue()
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(70.0);
});

test('existing unclaimed company is normalized and reused for applicant', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $company = applicationCompany($region);
    $applicant = applicationUser('applicant');
    $reviewer = applicationUser('superadmin', ['region_id' => $region->id]);

    $this->actingAs($applicant)
        ->getJson(route('applicant.company-lookup', ['bin' => $company->bin]))
        ->assertOk()
        ->assertJsonPath('found', true)
        ->assertJsonPath('can_attach', true)
        ->assertJsonPath('company.name', $company->name)
        ->assertJsonPath('company.activity_type', $company->activity_type);

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region, [
                'company_bin' => $company->bin,
                'company_name' => 'Қолданушы өзгерткен атау',
                'company_activity_type' => 'Қолданушы өзгерткен қызмет саласы',
                'director_full_name' => 'Қолданушы өзгерткен басшы',
            ])
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();
    expect($application->company_name)->toBe($company->name)
        ->and($application->company_activity_type)->toBe($company->activity_type)
        ->and($application->director_full_name)->toBe($company->director_full_name);

    $this->actingAs($reviewer)
        ->post(route('investment-applications.approve', $application), [
            'approved_area' => 20,
        ])
        ->assertRedirect();
    $this->actingAs($reviewer)
        ->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    expect(Company::query()->where('bin', $company->bin)->count())->toBe(1)
        ->and($applicant->fresh()->company_id)->toBe($company->id)
        ->and($applicant->fresh()->roleModel?->name)->toBe('investor');
});

test('applicant cannot submit for a company that already has investor account', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $company = applicationCompany($region);
    applicationUser('investor', ['company_id' => $company->id]);
    $applicant = applicationUser('applicant');

    $this->actingAs($applicant)
        ->getJson(route('applicant.company-lookup', ['bin' => $company->bin]))
        ->assertOk()
        ->assertJsonPath('can_attach', false)
        ->assertJsonMissingPath('company.director_full_name');

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region, ['company_bin' => $company->bin])
        )
        ->assertSessionHasErrors('company_bin');

    expect(InvestmentApplication::query()->count())->toBe(0);
});

test('investor submits a new project application for the linked company', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $company = applicationCompany($region);
    $investor = applicationUser('investor', ['company_id' => $company->id]);
    $reviewer = applicationUser('superadmin', ['region_id' => $region->id]);

    $this->actingAs($investor)
        ->get(route('applicant.portal'))
        ->assertOk();
    $this->actingAs($investor)
        ->getJson(route('applicant.company-lookup', ['bin' => $company->bin]))
        ->assertForbidden();
    $this->actingAs($investor)
        ->get(route('applicant.applications.create', [
            'zoneType' => 'sez',
            'zone' => $zone,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applicant/applications/form')
            ->where('accountRole', 'investor')
            ->where('company.id', $company->id));

    $this->actingAs($investor)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region, [
                'company_bin' => '111111111111',
                'company_name' => 'Жалған атау',
                'company_activity_type' => 'Жалған қызмет саласы',
            ])
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();
    expect($application->company_bin)->toBe($company->bin)
        ->and($application->company_name)->toBe($company->name)
        ->and($application->company_activity_type)->toBe($company->activity_type);

    $this->actingAs($reviewer)
        ->post(route('investment-applications.approve', $application), [
            'approved_area' => 10,
        ])
        ->assertRedirect();
    $this->actingAs($reviewer)
        ->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    expect($investor->fresh()->roleModel?->name)->toBe('investor')
        ->and($investor->fresh()->company_id)->toBe($company->id)
        ->and($application->fresh()->investmentProject?->company_id)
        ->toBe($company->id);
});

test('investor expansion application updates the existing project without duplication', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $company = applicationCompany($region);
    $investor = applicationUser('investor', ['company_id' => $company->id]);
    $reviewer = applicationUser('superadmin', ['region_id' => $region->id]);
    $projectType = applicationProjectType();
    $project = InvestmentProject::create([
        'name' => 'Қолданыстағы зауыт',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'description' => 'Жұмыс істеп тұрған өндіріс',
        'region_id' => $region->id,
        'project_type_id' => $projectType->id,
        'jobs_count' => 40,
        'total_investment' => 100000000,
        'status' => 'implementation',
        'infrastructure' => [
            'electricity' => [
                'needed' => true,
                'required_capacity' => 50,
                'used_capacity' => 20,
            ],
            'land' => [
                'needed' => true,
                'required_capacity' => 10,
                'used_capacity' => 10,
            ],
        ],
        'created_by' => $reviewer->id,
    ]);
    $project->projectTypes()->sync([$projectType->id]);
    $project->sezs()->sync([$zone->id]);
    $projectCount = InvestmentProject::query()->count();

    $this->actingAs($investor)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region, [
                'application_kind' => 'expansion',
                'source_investment_project_id' => $project->id,
                'project_name' => 'Өзгертілмеуі керек',
                'requested_area' => 5,
                'investment_amount' => 25000000,
                'jobs_count' => 8,
                'infrastructure_requirements' => [
                    'electricity' => 15,
                    'water' => 5,
                ],
            ])
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();
    expect($application->project_name)->toBe($project->name)
        ->and($application->application_kind)->toBe('expansion');

    $this->actingAs($reviewer)
        ->post(route('investment-applications.approve', $application), [
            'approved_area' => 5,
        ])
        ->assertRedirect();
    $this->actingAs($reviewer)
        ->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    $project->refresh();
    $application->refresh();
    expect(InvestmentProject::query()->count())->toBe($projectCount)
        ->and($application->investment_project_id)->toBe($project->id)
        ->and($application->status)->toBe('converted_to_project')
        ->and((float) $project->total_investment)->toBe(125000000.0)
        ->and($project->jobs_count)->toBe(48)
        ->and((float) data_get($project->infrastructure, 'land.used_capacity'))
        ->toBe(15.0)
        ->and((float) data_get($project->infrastructure, 'electricity.required_capacity'))
        ->toBe(65.0)
        ->and((float) data_get($project->infrastructure, 'electricity.used_capacity'))
        ->toBe(20.0)
        ->and(KpiLog::query()
            ->where('project_id', $project->id)
            ->where('event', 'project.expanded_from_application')
            ->exists())->toBeTrue();
});

test('investor cannot expand another company project', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $company = applicationCompany($region);
    $otherCompany = applicationCompany($region, [
        'name' => 'Басқа компания',
        'bin' => '222222222222',
    ]);
    $investor = applicationUser('investor', ['company_id' => $company->id]);
    $projectType = applicationProjectType();
    $otherProject = InvestmentProject::create([
        'name' => 'Басқа компания жобасы',
        'company_id' => $otherCompany->id,
        'company_name' => $otherCompany->display_name,
        'region_id' => $region->id,
        'project_type_id' => $projectType->id,
        'jobs_count' => 1,
        'total_investment' => 1000,
        'status' => 'plan',
        'infrastructure' => [],
        'created_by' => $investor->id,
    ]);
    $otherProject->projectTypes()->sync([$projectType->id]);
    $otherProject->sezs()->sync([$zone->id]);

    $this->actingAs($investor)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region, [
                'application_kind' => 'expansion',
                'source_investment_project_id' => $otherProject->id,
            ])
        )
        ->assertSessionHasErrors('source_investment_project_id');

    expect(InvestmentApplication::query()->count())->toBe(0);
});

test('applicant can select multiple project types independently from company activity', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $firstType = applicationProjectType();
    $secondType = applicationProjectType('Тамақ өнеркәсібі');

    $this->actingAs($applicant)
        ->get(route('applicant.applications.create', [
            'zoneType' => 'sez',
            'zone' => $zone,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applicant/applications/form')
            ->has('projectTypes', 2));

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region, [
                'intent' => 'draft',
                'project_type_ids' => [$firstType->id, $secondType->id],
                'activity_sector' => 'Қолданушы енгізген еркін мәтін',
            ])
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();

    expect($application->activity_sector)
        ->toBe('Өңдеу өнеркәсібі, Тамақ өнеркәсібі')
        ->and($application->company_activity_type)
        ->toBe('Жеңіл өнеркәсіп өнімдерін өндіру')
        ->and($application->projectTypes()->pluck('project_types.id')->all())
        ->toBe([$firstType->id, $secondType->id]);

    $this->actingAs($applicant)
        ->get(route('applicant.applications.edit', $application))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applicant/applications/form')
            ->has('application.project_types', 2));

    $this->actingAs($applicant)
        ->get(route('applicant.applications.show', $application))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applicant/applications/show')
            ->has('application.project_types', 2));
});

test('applicant must select at least one project type', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region, ['project_type_ids' => []])
        )
        ->assertSessionHasErrors('project_type_ids');

    expect(InvestmentApplication::query()->count())->toBe(0);
});

test('company main activity type is required', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $payload = validApplicationPayload($region);
    unset($payload['company_activity_type']);

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            $payload
        )
        ->assertSessionHasErrors('company_activity_type');

    expect(InvestmentApplication::query()->count())->toBe(0);
});

test('expired reservation is released by the scheduled command', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $application = InvestmentApplication::create([
        ...validApplicationPayload($region),
        'application_number' => 'INV-2026-EXPIRED1',
        'user_id' => $applicant->id,
        'zoneable_type' => Sez::class,
        'zoneable_id' => $zone->id,
        'status' => 'approved',
        'approved_area' => 40,
        'submitted_at' => now()->subDays(40),
        'reviewed_at' => now()->subDays(31),
        'reserved_until' => now()->subMinute(),
    ]);

    $this->artisan('applications:expire-reservations')
        ->expectsOutput('Expired reservations: 1')
        ->assertSuccessful();

    expect($application->fresh()->status)->toBe('expired')
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(100.0);
});
