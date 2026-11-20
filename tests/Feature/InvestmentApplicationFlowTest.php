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
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\ZoneCapacityService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
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
        'planned_start_year' => now()->year,
        'planned_end_year' => now()->year + 2,
        'infrastructure_requirements' => [
            'electricity' => 100,
            'water' => 20,
        ],
        'production_not_applicable' => false,
        'planned_production' => [[
            'client_key' => 'application-plan-1',
            'product_name' => 'Керамикалық кірпіш',
            'planned_quantity' => 500000,
            'unit' => 'piece',
            'custom_unit' => '',
            'planned_amount' => 75000000,
            'period' => 'year',
        ]],
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

/** @return array<string, mixed> */
function validApprovalPayload(
    InvestmentApplication $application,
    float $approvedArea,
    array $overrides = []
): array {
    return [
        'approved_area' => $approvedArea,
        'planned_start_year' => $application->planned_start_year,
        'planned_end_year' => $application->planned_end_year,
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

function approveApplicationThroughSector(
    $testCase,
    InvestmentApplication $application,
    User $manager,
    User $sectorReviewer,
    float $approvedArea,
    array $approvalOverrides = []
): void {
    $testCase->actingAs($manager)
        ->post(route('investment-applications.assign-to-me', $application))
        ->assertRedirect();

    $testCase->post(
        route('investment-applications.request-sector-review', $application)
    )->assertRedirect();

    $testCase->actingAs($sectorReviewer)
        ->post(route('investment-applications.sector-approve', $application), [
            'approved_area' => $approvedArea,
            'comment' => 'Аумақ пен инфрақұрылым техникалық тұрғыдан мақұлданды.',
        ])
        ->assertRedirect();

    $testCase->actingAs($manager)
        ->post(
            route('investment-applications.approve', $application),
            validApprovalPayload(
                $application,
                $approvedArea,
                $approvalOverrides
            )
        )
        ->assertRedirect();
}

test('applicant can save an incomplete draft but cannot submit it', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');

    $this->actingAs($applicant)
        ->post(route('applicant.applications.store', [
            'zoneType' => 'sez',
            'zone' => $zone,
        ]), [
            'intent' => 'draft',
            'application_kind' => 'new_project',
            'production_not_applicable' => false,
            'planned_production' => [[
                'product_name' => 'Толық емес өндіріс жоспары',
            ]],
        ])
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();

    expect($application->status)->toBe('draft')
        ->and($application->project_name)->toBeNull()
        ->and($application->planned_production[0]['product_name'])
        ->toBe('Толық емес өндіріс жоспары')
        ->and($application->projectTypes()->count())->toBe(0);

    $this->actingAs($applicant)
        ->post(route('applicant.applications.submit', $application))
        ->assertSessionHasErrors([
            'project_name',
            'project_description',
            'project_type_ids',
            'requested_area',
            'company_bin',
            'planned_start_year',
            'planned_end_year',
            'planned_production.0.unit',
            'planned_production.0.period',
        ]);

    expect($application->fresh()->status)->toBe('draft');
});

test('applicant cannot submit an invalid planned project period', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region, [
                'planned_start_year' => now()->year + 2,
                'planned_end_year' => now()->year + 1,
            ])
        )
        ->assertSessionHasErrors('planned_end_year');

    expect(InvestmentApplication::query()->count())->toBe(0);
});

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

test('submitted applications are routed only to attraction and become sector-visible on request', function () {
    $region = applicationRegion();
    $otherRegion = Region::create([
        'name' => 'Басқа тест ауданы',
        'type' => 'district',
    ]);
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $manager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $otherManager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $accompaniment = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT,
    ]);
    $sectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);
    $wrongSectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'ia',
    ]);
    $otherRegionSectorReviewer = applicationUser('invest', [
        'region_id' => $otherRegion->id,
        'invest_sub_role' => 'aea',
    ]);
    $superadmin = applicationUser('superadmin');

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region)
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();
    $submittedRecipients = TaskNotification::query()
        ->where('type', 'investment_application_submitted')
        ->orderBy('user_id')
        ->pluck('user_id')
        ->all();
    $expectedSubmittedRecipients = collect([
        $manager->id,
        $otherManager->id,
        $superadmin->id,
    ])->sort()->values()->all();
    $managerSubmittedNotification = TaskNotification::query()
        ->where('type', 'investment_application_submitted')
        ->where('user_id', $manager->id)
        ->sole();
    $managerSubmittedNotification->forceFill([
        'telegram_status' => 'retry',
        'telegram_next_attempt_at' => now()->addMinute(),
        'telegram_last_error' => 'Уақытша қате',
    ])->saveQuietly();

    expect($application->status)->toBe('submitted')
        ->and($submittedRecipients)->toBe($expectedSubmittedRecipients)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_submitted')
            ->where('action_url', route(
                'investment-applications.show',
                $application,
                false
            ))
            ->count())->toBe(3)
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(100.0);

    $this->actingAs($accompaniment)
        ->get(route('investment-applications.index'))
        ->assertForbidden();
    $this->actingAs($accompaniment)
        ->post(route('investment-applications.assign-to-me', $application))
        ->assertForbidden();

    foreach ([$sectorReviewer, $wrongSectorReviewer, $otherRegionSectorReviewer] as $reviewer) {
        $this->actingAs($reviewer)
            ->get(route('investment-applications.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('applications.data', 0));
    }

    $this->actingAs($manager)
        ->post(route('investment-applications.assign-to-me', $application))
        ->assertRedirect();

    expect($application->fresh()->assigned_to)->toBe($manager->id)
        ->and($application->fresh()->assigned_at)->not->toBeNull()
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_submitted')
            ->where('is_read', false)
            ->exists())->toBeFalse()
        ->and($managerSubmittedNotification->fresh()->telegram_status)
        ->toBe('skipped')
        ->and($managerSubmittedNotification->fresh()->telegram_next_attempt_at)
        ->toBeNull();

    $this->actingAs($otherManager)
        ->post(route('investment-applications.start-review', $application))
        ->assertForbidden();
    $this->post(
        route('investment-applications.set-schedule', $application),
        [
            'planned_start_year' => now()->year,
            'planned_end_year' => now()->year + 2,
            'comment' => 'Мерзімді өзгерту.',
        ]
    )->assertForbidden();
    $this->post(route('investment-applications.request-clarification', $application), [
        'comment' => 'Қосымша құжат керек.',
    ])
        ->assertForbidden();
    $this->post(route('investment-applications.request-sector-review', $application))
        ->assertForbidden();
    $this->post(
        route('investment-applications.approve', $application),
        validApprovalPayload($application, 25)
    )->assertForbidden();
    $this->post(route('investment-applications.reject', $application), [
        'comment' => 'Қабылданбайды.',
    ])->assertForbidden();
    $this->post(route('investment-applications.convert', $application))
        ->assertForbidden();

    $this->actingAs($manager)
        ->post(route('investment-applications.request-sector-review', $application))
        ->assertRedirect();
    $this->post(route('investment-applications.sector-approve', $application), [
        'approved_area' => 25,
    ])->assertForbidden();

    $application->refresh();
    expect($application->sector_review_status)->toBe('pending')
        ->and($application->sector_review_requested_by)->toBe($manager->id)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_sector_review_requested')
            ->where('user_id', $sectorReviewer->id)
            ->count())->toBe(1)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_sector_review_requested')
            ->whereIn('user_id', [
                $accompaniment->id,
                $wrongSectorReviewer->id,
                $otherRegionSectorReviewer->id,
            ])
            ->count())->toBe(0);

    $sectorRequestNotification = TaskNotification::query()
        ->where('type', 'investment_application_sector_review_requested')
        ->where('user_id', $sectorReviewer->id)
        ->sole();
    $sectorRequestNotification->forceFill([
        'telegram_status' => 'retry',
        'telegram_next_attempt_at' => now()->addMinute(),
        'telegram_last_error' => 'Уақытша қате',
    ])->saveQuietly();

    $this->actingAs($sectorReviewer)
        ->get(route('investment-applications.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('applications.data', 1)
            ->where('applications.data.0.id', $application->id));
    $this->actingAs($wrongSectorReviewer)
        ->get(route('investment-applications.show', $application))
        ->assertForbidden();
    $this->actingAs($otherRegionSectorReviewer)
        ->get(route('investment-applications.show', $application))
        ->assertForbidden();

    $this->actingAs($sectorReviewer)
        ->post(
            route('investment-applications.approve', $application),
            validApprovalPayload($application, 25)
        )
        ->assertForbidden();
    $this->post(route('investment-applications.reject', $application), [
        'comment' => 'Соңғы шешім.',
    ])->assertForbidden();
    $this->post(route('investment-applications.convert', $application))
        ->assertForbidden();

    $this->actingAs($applicant)
        ->post(route('applicant.applications.withdraw', $application))
        ->assertRedirect();
    $this->actingAs($sectorReviewer)
        ->post(route('investment-applications.sector-approve', $application), [
            'approved_area' => 25,
        ])
        ->assertForbidden();

    $withdrawnRecipients = TaskNotification::query()
        ->where('type', 'investment_application_withdrawn_internal')
        ->orderBy('user_id')
        ->pluck('user_id')
        ->all();

    expect($application->fresh()->status)->toBe('withdrawn')
        ->and($withdrawnRecipients)->toBe(collect([
            $manager->id,
            $sectorReviewer->id,
            $superadmin->id,
        ])->sort()->values()->all())
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_withdrawn_internal')
            ->where('user_id', $applicant->id)
            ->exists())->toBeFalse()
        ->and($sectorRequestNotification->fresh()->is_read)->toBeTrue()
        ->and($sectorRequestNotification->fresh()->telegram_status)
        ->toBe('skipped')
        ->and($sectorRequestNotification->fresh()->telegram_next_attempt_at)
        ->toBeNull();
});

test('superadmin reassignment notifies both managers without unsafe or self links', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $firstManager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $secondManager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $superadmin = applicationUser('superadmin');

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region)
        )
        ->assertRedirect();
    $application = InvestmentApplication::query()->firstOrFail();

    $this->actingAs($superadmin)
        ->post(route('investment-applications.assign-to-me', $application), [
            'manager_id' => $firstManager->id,
        ])
        ->assertRedirect();
    $this->post(route('investment-applications.assign-to-me', $application), [
        'manager_id' => $secondManager->id,
    ])->assertRedirect();
    $this->post(route('investment-applications.start-review', $application))
        ->assertRedirect();

    $removed = TaskNotification::query()
        ->where('type', 'investment_application_assignment_removed')
        ->where('user_id', $firstManager->id)
        ->sole();
    $assigned = TaskNotification::query()
        ->where('type', 'investment_application_assigned')
        ->where('user_id', $secondManager->id)
        ->sole();

    expect($application->fresh()->assigned_to)->toBe($secondManager->id)
        ->and($removed->action_url)
        ->toBe(route('notifications.index', absolute: false))
        ->and($assigned->action_url)
        ->toBe(route('investment-applications.show', $application, false))
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_under_review_internal')
            ->where('user_id', $secondManager->id)
            ->count())->toBe(1)
        ->and(TaskNotification::query()
            ->whereIn('type', [
                'investment_application_assigned',
                'investment_application_assignment_removed',
                'investment_application_under_review_internal',
            ])
            ->where('user_id', $superadmin->id)
            ->exists())->toBeFalse();
});

test('technical approval enables assigned attraction manager to reserve land', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $manager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $sectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region)
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();
    $this->actingAs($manager)
        ->post(route('investment-applications.assign-to-me', $application))
        ->assertRedirect();
    $this->post(route('investment-applications.request-sector-review', $application))
        ->assertRedirect();
    $sectorRequestNotification = TaskNotification::query()
        ->where('type', 'investment_application_sector_review_requested')
        ->where('user_id', $sectorReviewer->id)
        ->sole();
    $sectorRequestNotification->forceFill([
        'telegram_status' => 'retry',
        'telegram_next_attempt_at' => now()->addMinute(),
        'telegram_last_error' => 'Уақытша қате',
    ])->saveQuietly();
    $this->actingAs($sectorReviewer)
        ->post(route('investment-applications.sector-approve', $application), [
            'approved_area' => 25,
            'comment' => 'Техникалық мақұлдау.',
        ])
        ->assertRedirect();

    expect($sectorRequestNotification->fresh()->is_read)->toBeTrue()
        ->and($sectorRequestNotification->fresh()->telegram_status)
        ->toBe('skipped')
        ->and($sectorRequestNotification->fresh()->telegram_next_attempt_at)
        ->toBeNull();

    $this->actingAs($manager)
        ->post(
            route('investment-applications.approve', $application),
            validApprovalPayload($application, 25, [
                'planned_end_year' => now()->year + 3,
            ])
        )
        ->assertSessionHasErrors('comment');

    expect($application->fresh()->status)->toBe('submitted')
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(100.0);

    $staleSubmittedNotification = TaskNotification::withoutEvents(
        fn () => TaskNotification::create([
            'user_id' => $manager->id,
            'type' => 'investment_application_submitted',
            'message' => 'Ескі әрекет хабарламасы',
            'action_url' => route(
                'investment-applications.show',
                $application,
                false
            ),
            'action_label' => 'Өтінімді қарау',
        ])
    );
    $staleSubmittedNotification->forceFill([
        'telegram_status' => 'retry',
        'telegram_next_attempt_at' => now()->addMinute(),
        'telegram_last_error' => 'Уақытша қате',
    ])->saveQuietly();

    $this->actingAs($manager)
        ->post(
            route('investment-applications.approve', $application),
            validApprovalPayload($application, 25, [
                'planned_end_year' => now()->year + 3,
                'comment' => 'Құжаттар талапқа сай.',
            ])
        )
        ->assertRedirect();

    $application->refresh();
    expect($application->status)->toBe('approved')
        ->and((float) $application->approved_area)->toBe(25.0)
        ->and($application->planned_start_year)->toBe(now()->year)
        ->and($application->planned_end_year)->toBe(now()->year + 3)
        ->and($application->reserved_until)->not->toBeNull()
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(75.0)
        ->and($staleSubmittedNotification->fresh()->is_read)->toBeTrue()
        ->and($staleSubmittedNotification->fresh()->telegram_status)
        ->toBe('skipped')
        ->and($staleSubmittedNotification->fresh()->telegram_next_attempt_at)
        ->toBeNull();
});

test('sector rejection records a reason and blocks final approval', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $manager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $otherManager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $sectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region)
        )
        ->assertRedirect();
    $application = InvestmentApplication::query()->firstOrFail();

    $this->actingAs($manager)
        ->post(route('investment-applications.assign-to-me', $application))
        ->assertRedirect();
    $this->post(route('investment-applications.request-sector-review', $application))
        ->assertRedirect();

    $this->actingAs($sectorReviewer)
        ->post(route('investment-applications.sector-reject', $application))
        ->assertSessionHasErrors('comment');
    $this->post(route('investment-applications.sector-reject', $application), [
        'comment' => 'Бос аумақ жеткіліксіз.',
    ])->assertRedirect();

    $application->refresh();
    expect($application->status)->toBe('submitted')
        ->and($application->sector_review_status)->toBe('rejected')
        ->and($application->sector_review_comment)
        ->toBe('Бос аумақ жеткіліксіз.')
        ->and($application->sector_reviewed_by)->toBe($sectorReviewer->id)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_sector_rejected')
            ->where('user_id', $manager->id)
            ->count())->toBe(1)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_sector_rejected')
            ->where('user_id', $otherManager->id)
            ->count())->toBe(0);

    $this->actingAs($manager)
        ->post(
            route('investment-applications.approve', $application),
            validApprovalPayload($application, 25)
        )
        ->assertSessionHasErrors('sector_review');
    expect($application->fresh()->status)->toBe('submitted');
});

test('invest reviewer can set schedule for a legacy approved application', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $reviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $sectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);
    $superadmin = applicationUser('superadmin');

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region)
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();
    approveApplicationThroughSector(
        $this,
        $application,
        $reviewer,
        $sectorReviewer,
        25
    );

    $application->refresh();
    $reservedUntil = $application->reserved_until?->toDateTimeString();
    $application->update([
        'planned_start_year' => null,
        'planned_end_year' => null,
    ]);

    $this->actingAs($reviewer)
        ->get(route('investment-applications.show', $application))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('actions.can_set_schedule', true)
            ->where('actions.can_convert', false));

    $this->actingAs($reviewer)
        ->post(route('investment-applications.set-schedule', $application), [
            'planned_start_year' => now()->year,
            'planned_end_year' => now()->year + 4,
        ])
        ->assertSessionHasErrors('comment');

    $this->actingAs($superadmin)
        ->post(route('investment-applications.set-schedule', $application), [
            'planned_start_year' => now()->year,
            'planned_end_year' => now()->year + 4,
            'comment' => 'Ескі өтінімнің жоспарлы мерзімі бекітілді.',
        ])
        ->assertRedirect();

    $application->refresh();
    expect($application->status)->toBe('approved')
        ->and($application->planned_start_year)->toBe(now()->year)
        ->and($application->planned_end_year)->toBe(now()->year + 4)
        ->and($application->reserved_until?->toDateTimeString())
        ->toBe($reservedUntil)
        ->and((float) $application->approved_area)->toBe(25.0)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_schedule_set')
            ->where('user_id', $applicant->id)
            ->count())->toBe(1)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_schedule_set_internal')
            ->where('user_id', $reviewer->id)
            ->count())->toBe(1)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_schedule_set_internal')
            ->where('user_id', $superadmin->id)
            ->exists())->toBeFalse();

    $this->actingAs($reviewer)
        ->get(route('investment-applications.show', $application))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('actions.can_set_schedule', false)
            ->where('actions.can_convert', true));
});

test('invest reviewer rejects an application with a required reason', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $reviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);

    $this->actingAs($applicant)
        ->post(
            route('applicant.applications.store', [
                'zoneType' => 'sez',
                'zone' => $zone,
            ]),
            validApplicationPayload($region)
        )
        ->assertRedirect();

    $application = InvestmentApplication::query()->firstOrFail();

    $this->actingAs($reviewer)
        ->post(route('investment-applications.assign-to-me', $application))
        ->assertRedirect();

    $this->actingAs($reviewer)
        ->post(route('investment-applications.reject', $application))
        ->assertSessionHasErrors('comment');

    expect($application->fresh()->status)->toBe('submitted');

    $this->actingAs($reviewer)
        ->post(route('investment-applications.reject', $application), [
            'comment' => 'Жоба талаптарға сәйкес келмейді.',
        ])
        ->assertRedirect();

    $application->refresh();
    expect($application->status)->toBe('rejected')
        ->and($application->reviewed_by)->toBe($reviewer->id)
        ->and($application->reviewer_comment)
        ->toBe('Жоба талаптарға сәйкес келмейді.')
        ->and($application->statusHistories()
            ->where('to_status', 'rejected')
            ->exists())->toBeTrue();
});

test('approved application converts into company investor and internal project', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $manager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $sectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);
    $accompaniment = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT,
    ]);
    $superadmin = applicationUser('superadmin', ['region_id' => $region->id]);
    $payload = validApplicationPayload($region);
    $application = InvestmentApplication::create([
        ...$payload,
        'application_number' => 'INV-2026-CONVERT1',
        'user_id' => $applicant->id,
        'zoneable_type' => Sez::class,
        'zoneable_id' => $zone->id,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);
    $application->projectTypes()->sync($payload['project_type_ids']);
    $application->documents()->create([
        'name' => 'Бизнес жоспар.pdf',
        'file_path' => 'investment-applications/test/business-plan.pdf',
        'type' => 'pdf',
        'size' => 1024,
        'uploaded_by' => $applicant->id,
    ]);

    $this->actingAs($superadmin)
        ->post(route('investment-applications.assign-to-me', $application), [
            'manager_id' => $manager->id,
        ])
        ->assertRedirect();
    $this->post(
        route('investment-applications.request-sector-review', $application)
    )->assertRedirect();
    $this->actingAs($sectorReviewer)
        ->post(route('investment-applications.sector-approve', $application), [
            'approved_area' => 25,
            'comment' => 'Техникалық мақұлдау.',
        ])
        ->assertRedirect();
    $this->actingAs($superadmin)
        ->post(
            route('investment-applications.approve', $application),
            validApprovalPayload($application, 25)
        )
        ->assertRedirect();
    expect(TaskNotification::query()
        ->where('type', 'investment_application_approved_internal')
        ->where('user_id', $manager->id)
        ->count())->toBe(1);

    $manager->update(['telegram_chat_id' => '99887766']);
    config()->set('services.telegram.bot_token', 'application-test-token');
    Http::fake([
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);
    $this->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    $application->refresh();
    $applicant->refresh();
    $project = $application->investmentProject()->firstOrFail();
    $company = Company::query()->findOrFail($applicant->company_id);

    expect($application->status)->toBe('converted_to_project')
        ->and($applicant->roleModel?->name)->toBe('investor')
        ->and($applicant->company_id)->not->toBeNull()
        ->and($project->company_id)->toBe($applicant->company_id)
        ->and($project->status)->toBe('plan')
        ->and($project->attraction_stage)->toBe('potential')
        ->and($project->created_by)->toBe($manager->id)
        ->and($project->curators()->pluck('users.id')->all())
        ->toBe([$manager->id])
        ->and($project->curators()->whereKey($superadmin->id)->exists())
        ->toBeFalse()
        ->and($project->curators()->whereKey($sectorReviewer->id)->exists())
        ->toBeFalse()
        ->and($project->curators()->whereKey($accompaniment->id)->exists())
        ->toBeFalse()
        ->and($project->project_type_id)->toBe($payload['project_type_ids'][0])
        ->and($project->projectTypes()->pluck('project_types.id')->all())
        ->toBe($payload['project_type_ids'])
        ->and($company->activity_type)
        ->toBe($payload['company_activity_type'])
        ->and($project->start_date?->format('Y-m-d'))
        ->toBe(now()->year.'-01-01')
        ->and($project->end_date?->format('Y-m-d'))
        ->toBe((now()->year + 2).'-12-31')
        ->and($project->production_not_applicable)->toBeFalse()
        ->and($project->productionPlans()->count())->toBe(1)
        ->and($project->productionPlans()->first()->product_name)
        ->toBe('Керамикалық кірпіш')
        ->and((float) $project->productionPlans()->first()->planned_quantity)
        ->toBe(500000.0)
        ->and((float) data_get($project->infrastructure, 'land.required_capacity'))
        ->toBe(30.0)
        ->and((float) data_get($project->infrastructure, 'land.used_capacity'))
        ->toBe(25.0)
        ->and($project->documents()
            ->where('source', 'investment_application')
            ->where('name', 'Бизнес жоспар.pdf')
            ->exists())->toBeTrue()
        ->and($project->sezs()->whereKey($zone->id)->exists())->toBeTrue()
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(75.0);

    $managerNotification = TaskNotification::query()
        ->where('type', 'investment_application_converted_internal')
        ->where('user_id', $manager->id)
        ->sole();
    $projectUrl = route('investment-projects.show', $project, false);
    expect($managerNotification->action_url)->toBe($projectUrl)
        ->and($managerNotification->destination_url)->toBe($projectUrl);
    Http::assertSentCount(1);
    Http::assertSent(
        fn (ClientRequest $request) => $request['chat_id'] === '99887766'
            && str_contains($request['text'], url($projectUrl))
    );

    $this->actingAs($applicant)
        ->get(route('applicant.applications.show', $application))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applicant/applications/show')
            ->where('application.status', 'converted_to_project')
            ->where('application.is_withdrawable', false)
            ->where('application.investment_project.id', $project->id));

    $this->actingAs($applicant)
        ->post(route('applicant.applications.withdraw', $application))
        ->assertForbidden();

    expect($application->fresh()->status)->toBe('converted_to_project');
});

test('legacy conversion assigns and notifies the attraction manager', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $manager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $superadmin = applicationUser('superadmin');
    $payload = validApplicationPayload($region);
    $application = InvestmentApplication::create([
        ...$payload,
        'application_number' => 'INV-2026-LEGACY-NOTIFY',
        'user_id' => $applicant->id,
        'zoneable_type' => Sez::class,
        'zoneable_id' => $zone->id,
        'status' => 'approved',
        'approved_area' => 20,
        'sector_review_status' => 'approved',
        'sector_approved_area' => 20,
        'reviewed_by' => $superadmin->id,
        'submitted_at' => now()->subDay(),
        'reviewed_at' => now(),
        'reserved_until' => now()->addDays(30),
    ]);
    $application->projectTypes()->sync($payload['project_type_ids']);

    $this->actingAs($superadmin)
        ->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    $application->refresh();
    $project = $application->investmentProject()->firstOrFail();
    expect($application->assigned_to)->toBe($manager->id)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_assigned')
            ->where('user_id', $manager->id)
            ->where('action_url', route(
                'investment-applications.show',
                $application,
                false
            ))
            ->count())->toBe(1)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_converted_internal')
            ->where('user_id', $manager->id)
            ->where('action_url', route(
                'investment-projects.show',
                $project,
                false
            ))
            ->count())->toBe(1);
});

test('application without planned production creates a project without plans', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $manager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $reviewer = applicationUser('superadmin', ['region_id' => $region->id]);
    $payload = validApplicationPayload($region, [
        'production_not_applicable' => true,
        'planned_production' => [],
    ]);
    $application = InvestmentApplication::create([
        ...$payload,
        'application_number' => 'INV-2026-NOPRODUCTION',
        'user_id' => $applicant->id,
        'zoneable_type' => Sez::class,
        'zoneable_id' => $zone->id,
        'status' => 'approved',
        'approved_area' => 25,
        'assigned_to' => $manager->id,
        'assigned_at' => now(),
        'sector_review_status' => 'approved',
        'sector_approved_area' => 25,
        'reviewed_by' => $manager->id,
        'submitted_at' => now(),
        'reviewed_at' => now(),
        'reserved_until' => now()->addDays(30),
    ]);
    $application->projectTypes()->sync($payload['project_type_ids']);

    $this->actingAs($reviewer)
        ->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    $project = $application->fresh()->investmentProject()->firstOrFail();
    expect($project->production_not_applicable)->toBeTrue()
        ->and($project->productionPlans()->count())->toBe(0);
});

test('existing converted projects restore requested and approved land areas', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $applicant = applicationUser('applicant');
    $reviewer = applicationUser('superadmin', ['region_id' => $region->id]);
    $payload = validApplicationPayload($region, ['requested_area' => 200]);
    $project = InvestmentProject::create([
        'name' => $payload['project_name'],
        'region_id' => $region->id,
        'total_investment' => $payload['investment_amount'],
        'status' => 'plan',
        'created_by' => $reviewer->id,
        'infrastructure' => [
            'land' => [
                'needed' => true,
                'required_capacity' => 180,
                'used_capacity' => 180,
            ],
        ],
    ]);
    $project->sezs()->sync([$zone->id]);

    InvestmentApplication::create([
        ...$payload,
        'application_number' => 'INV-2026-BACKFILL1',
        'user_id' => $applicant->id,
        'zoneable_type' => Sez::class,
        'zoneable_id' => $zone->id,
        'status' => 'converted_to_project',
        'approved_area' => 180,
        'reviewed_by' => $reviewer->id,
        'investment_project_id' => $project->id,
        'submitted_at' => now(),
        'reviewed_at' => now(),
        'converted_at' => now(),
    ]);

    $migration = require database_path(
        'migrations/2026_08_24_000000_correct_converted_application_land_capacity.php'
    );
    $migration->up();

    $project->refresh();
    expect((float) data_get($project->infrastructure, 'land.required_capacity'))
        ->toBe(200.0)
        ->and((float) data_get($project->infrastructure, 'land.used_capacity'))
        ->toBe(180.0);
});

test('existing unclaimed company is normalized and reused for applicant', function () {
    $region = applicationRegion();
    $zone = applicationZone($region);
    $company = applicationCompany($region);
    $applicant = applicationUser('applicant');
    $reviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $sectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);

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

    approveApplicationThroughSector(
        $this,
        $application,
        $reviewer,
        $sectorReviewer,
        20
    );
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
    $reviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $sectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);

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

    approveApplicationThroughSector(
        $this,
        $application,
        $reviewer,
        $sectorReviewer,
        10
    );
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
    $superadmin = applicationUser('superadmin');
    $reviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $sectorReviewer = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => 'aea',
    ]);
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
        'start_date' => now()->year.'-01-01',
        'end_date' => (now()->year + 1).'-12-31',
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
        ->and($application->application_kind)->toBe('expansion')
        ->and($application->planned_start_year)->toBe(now()->year)
        ->and($application->planned_end_year)->toBe(now()->year + 2);

    $this->actingAs($reviewer)
        ->post(route('investment-applications.assign-to-me', $application))
        ->assertRedirect();
    $this->post(
        route('investment-applications.request-sector-review', $application)
    )->assertRedirect();
    $this->actingAs($sectorReviewer)
        ->post(route('investment-applications.sector-approve', $application), [
            'approved_area' => 3,
            'comment' => 'Кеңейту аумағы мақұлданды.',
        ])
        ->assertRedirect();

    $this->actingAs($reviewer)
        ->post(route('investment-applications.approve', $application), validApprovalPayload($application, 3, [
            'planned_end_year' => now()->year,
            'comment' => 'Мерзімді қысқарту әрекеті.',
        ]))
        ->assertSessionHasErrors('planned_end_year');

    expect($application->fresh()->status)->toBe('submitted');

    $this->actingAs($reviewer)
        ->post(route('investment-applications.approve', $application), validApprovalPayload($application, 3, [
            'planned_end_year' => now()->year + 3,
            'comment' => 'Кеңейту мерзімі келісілді.',
        ]))
        ->assertRedirect();
    $reviewer->update(['telegram_chat_id' => '55667788']);
    config()->set('services.telegram.bot_token', 'expansion-test-token');
    Http::fake([
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);
    $this->actingAs($superadmin)
        ->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    $project->refresh();
    $application->refresh();
    expect(InvestmentProject::query()->count())->toBe($projectCount)
        ->and($application->investment_project_id)->toBe($project->id)
        ->and($application->status)->toBe('converted_to_project')
        ->and($project->start_date?->format('Y-m-d'))
        ->toBe(now()->year.'-01-01')
        ->and($project->end_date?->format('Y-m-d'))
        ->toBe((now()->year + 3).'-12-31')
        ->and((float) $project->total_investment)->toBe(125000000.0)
        ->and($project->jobs_count)->toBe(48)
        ->and((float) data_get($project->infrastructure, 'land.required_capacity'))
        ->toBe(15.0)
        ->and((float) data_get($project->infrastructure, 'land.used_capacity'))
        ->toBe(13.0)
        ->and((float) data_get($project->infrastructure, 'electricity.required_capacity'))
        ->toBe(65.0)
        ->and((float) data_get($project->infrastructure, 'electricity.used_capacity'))
        ->toBe(20.0)
        ->and($project->productionPlans()->count())->toBe(1)
        ->and($project->productionPlans()->first()->product_name)
        ->toBe('Керамикалық кірпіш')
        ->and(KpiLog::query()
            ->where('project_id', $project->id)
            ->where('event', 'project.expanded_from_application')
            ->exists())->toBeTrue();

    $managerNotification = TaskNotification::query()
        ->where('type', 'investment_application_converted_internal')
        ->where('user_id', $reviewer->id)
        ->sole();
    $applicationUrl = route(
        'investment-applications.show',
        $application,
        false
    );
    expect($managerNotification->destination_url)->toBe($applicationUrl)
        ->and($managerNotification->action_label)->toBe('Өтінімді қарау');
    $this->actingAs($reviewer)->get($applicationUrl)->assertOk();
    $this->get(route('investment-projects.show', $project))->assertForbidden();
    Http::assertSentCount(1);
    Http::assertSent(
        fn (ClientRequest $request) => $request['chat_id'] === '55667788'
            && str_contains($request['text'], url($applicationUrl))
    );
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
    $manager = applicationUser('invest', [
        'region_id' => $region->id,
        'invest_sub_role' => User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ]);
    $superadmin = applicationUser('superadmin');
    $application = InvestmentApplication::create([
        ...validApplicationPayload($region),
        'application_number' => 'INV-2026-EXPIRED1',
        'user_id' => $applicant->id,
        'zoneable_type' => Sez::class,
        'zoneable_id' => $zone->id,
        'status' => 'approved',
        'approved_area' => 40,
        'assigned_to' => $manager->id,
        'assigned_at' => now()->subDays(31),
        'submitted_at' => now()->subDays(40),
        'reviewed_at' => now()->subDays(31),
        'reserved_until' => now()->subMinute(),
    ]);

    $this->artisan('applications:expire-reservations')
        ->expectsOutput('Expired reservations: 1')
        ->assertSuccessful();

    expect($application->fresh()->status)->toBe('expired')
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(100.0)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_expired')
            ->where('user_id', $applicant->id)
            ->count())->toBe(1)
        ->and(TaskNotification::query()
            ->where('type', 'investment_application_expired_internal')
            ->whereIn('user_id', [$manager->id, $superadmin->id])
            ->count())->toBe(2);
});
