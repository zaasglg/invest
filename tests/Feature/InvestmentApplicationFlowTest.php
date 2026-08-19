<?php

use App\Models\IndustrialZone;
use App\Models\InvestmentApplication;
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
        'project_name' => 'Жаңа өндіріс',
        'project_description' => 'Өндірістік жоба сипаттамасы',
        'activity_sector' => 'Өңдеу өнеркәсібі',
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
            ->component('applicant/zones/show')
            ->where('zone.name', $zone->name)
            ->has('zone.location', 3)
            ->where('zone.main_gallery.0.file_path', 'sezs/test-zone.jpg')
            ->where('zone.area.available', 100)
            ->missing('zone.investment_projects')
            ->missing('zone.projects')
            ->missing('zone.geometry')
            ->missing('zone.infrastructure.electricity.consumers'));

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
                ->component('applicant/zones/show')
                ->where('zone.type', $type)
                ->has('zone.location', 3)
                ->where(
                    'zone.main_gallery.0.file_path',
                    "zones/{$type}.jpg"
                )
                ->missing('zone.investment_projects')
                ->missing('zone.projects'));
    }
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

    $this->actingAs($reviewer)
        ->post(route('investment-applications.convert', $application))
        ->assertRedirect();

    $application->refresh();
    $applicant->refresh();
    $project = $application->investmentProject()->firstOrFail();

    expect($application->status)->toBe('converted_to_project')
        ->and($applicant->roleModel?->name)->toBe('investor')
        ->and($applicant->company_id)->not->toBeNull()
        ->and($project->company_id)->toBe($applicant->company_id)
        ->and($project->project_type_id)->toBe($payload['project_type_ids'][0])
        ->and($project->projectTypes()->pluck('project_types.id')->all())
        ->toBe($payload['project_type_ids'])
        ->and((float) data_get($project->infrastructure, 'land.used_capacity'))
        ->toBe(30.0)
        ->and($project->sezs()->whereKey($zone->id)->exists())->toBeTrue()
        ->and(app(ZoneCapacityService::class)->summarize($zone)['available'])
        ->toBe(70.0);
});

test('applicant can select multiple project activity types', function () {
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

test('applicant must select at least one project activity type', function () {
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
