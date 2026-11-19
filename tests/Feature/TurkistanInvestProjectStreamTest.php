<?php

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\SezIssue;
use App\Models\SubsoilUser;
use App\Models\User;
use App\Services\InvestmentProjectAccessService;
use App\Services\ProjectAttractionHandoverService;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

function projectStreamUser(string $subRole, ?Region $region = null): User
{
    return User::factory()->create([
        'role' => 'invest',
        'role_id' => Role::firstOrCreate(
            ['name' => 'invest'],
            ['display_name' => 'Invest']
        )->id,
        'invest_sub_role' => $subRole,
        'region_id' => $region?->id,
    ]);
}

function projectStreamExecutor(): User
{
    return User::factory()->create([
        'role' => 'district_user',
        'role_id' => Role::firstOrCreate(
            ['name' => 'ispolnitel'],
            ['display_name' => 'Орындаушы']
        )->id,
        'baskarma_type' => 'additional',
    ]);
}

function projectStreamRegion(string $name): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#2563EB',
        'icon' => 'factory',
    ]);
}

function projectStreamProject(
    User $curator,
    Region $region,
    string $status,
    string $name
): InvestmentProject {
    $project = InvestmentProject::create([
        'name' => $name,
        'region_id' => $region->id,
        'status' => $status,
        'attraction_stage' => $status === 'plan' ? 'potential' : null,
        'total_investment' => 1000000,
        'created_by' => $curator->id,
    ]);
    $project->curators()->attach($curator);

    return $project;
}

test('both Turkistan Invest directions can access sector pages', function (
    string $subRole
) {
    $region = projectStreamRegion("Сектор беттері {$subRole}");
    $user = projectStreamUser($subRole, $region);
    $sez = Sez::create([
        'name' => "Тест АЭА {$subRole}",
        'region_id' => $region->id,
        'status' => 'active',
        'total_area' => 10,
    ]);
    $industrialZone = IndustrialZone::create([
        'name' => "Тест ИА {$subRole}",
        'region_id' => $region->id,
        'status' => 'active',
        'total_area' => 10,
    ]);
    $promZone = PromZone::create([
        'name' => "Тест Пром зона {$subRole}",
        'region_id' => $region->id,
        'status' => 'active',
        'total_area' => 10,
    ]);
    $subsoilUser = SubsoilUser::create([
        'name' => "Тест жер қойнауы {$subRole}",
        'bin' => '123456789012',
        'region_id' => $region->id,
        'mineral_type' => 'Тест минералы',
        'license_status' => 'active',
    ]);

    $this->actingAs($user)
        ->get(route('sezs.index'))
        ->assertOk();
    $this->get(route('industrial-zones.index'))->assertOk();
    $this->get(route('prom-zones.index'))->assertOk();
    $this->get(route('subsoil-users.index'))->assertOk();
    $this->get(route('sezs.show', $sez))->assertOk();
    $this->get(route('industrial-zones.show', $industrialZone))->assertOk();
    $this->get(route('prom-zones.show', $promZone))->assertOk();
    $this->get(route('subsoil-users.show', $subsoilUser))->assertOk();
})->with([
    'сүйемелдеу' => 'turkistan_invest',
    'инвестор тарту' => 'turkistan_invest_attraction',
]);

test('Turkistan Invest project streams are separated by lifecycle status', function () {
    $region = projectStreamRegion('Жоба ағындары ауданы');
    $accompaniment = projectStreamUser('turkistan_invest');
    $attraction = projectStreamUser('turkistan_invest_attraction');

    $implementation = projectStreamProject(
        $accompaniment,
        $region,
        'implementation',
        'Сүйемелденетін жоба'
    );
    $launched = projectStreamProject(
        $attraction,
        $region,
        'launched',
        'Іске қосылған жоба'
    );
    $planned = projectStreamProject(
        $accompaniment,
        $region,
        'plan',
        'Тартылатын жоба'
    );

    $access = app(InvestmentProjectAccessService::class);

    expect($access->canView($accompaniment, $implementation))->toBeTrue()
        ->and($access->canView($accompaniment, $launched))->toBeTrue()
        ->and($access->canView($accompaniment, $planned))->toBeFalse()
        ->and($access->canManage($accompaniment, $implementation))->toBeTrue()
        ->and($access->canManage($accompaniment, $planned))->toBeFalse()
        ->and($access->canView($attraction, $planned))->toBeTrue()
        ->and($access->canView($attraction, $implementation))->toBeFalse()
        ->and($access->canView($attraction, $launched))->toBeFalse()
        ->and($access->canManage($attraction, $planned))->toBeTrue()
        ->and($access->canManage($attraction, $implementation))->toBeFalse();

    $this->actingAs($accompaniment)
        ->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where(
            'projects.data',
            fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all()
                === collect([$implementation->id, $launched->id])->sort()->values()->all()
        ));

    $this->get(route('investment-projects.index', ['status' => 'plan']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('projects.data', 0));

    $this->actingAs($attraction)
        ->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $planned->id));

    $this->get(route('investment-projects.index', ['status' => 'implementation']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('projects.data', 0));
});

test('direct curatorship cannot bypass the Turkistan Invest project stream boundary', function () {
    $region = projectStreamRegion('Тікелей рұқсат ауданы');
    $accompaniment = projectStreamUser('turkistan_invest');
    $attraction = projectStreamUser('turkistan_invest_attraction');
    $planned = projectStreamProject($attraction, $region, 'plan', 'Жоспардағы жоба');
    $operational = projectStreamProject(
        $accompaniment,
        $region,
        'implementation',
        'Жүріп жатқан жоба'
    );

    $planned->curators()->attach($accompaniment);
    $operational->curators()->attach($attraction);

    foreach ([$planned, $operational] as $project) {
        $viewer = $project->status === 'plan' ? $accompaniment : $attraction;
        $this->actingAs($viewer);

        foreach (['show', 'edit', 'documents.index', 'gallery.index', 'issues.index', 'passport', 'presentation'] as $route) {
            $this->get(route('investment-projects.'.$route, $project))->assertForbidden();
        }

        $this->get(route('chats.index', $project))->assertForbidden();
        $this->put(route('investment-projects.update', $project), [
            'name' => 'Рұқсатсыз өзгеріс',
        ])->assertForbidden();
        $this->post(route('investment-projects.tasks.store', $project), [
            'title' => 'Рұқсатсыз тапсырма',
        ])->assertForbidden();
        $this->post(route('investment-projects.attraction-activities.store', $project), [
            'next_action' => 'Рұқсатсыз іс-шара',
        ])->assertForbidden();
    }

    expect($planned->fresh()->name)->toBe('Жоспардағы жоба')
        ->and($operational->fresh()->name)->toBe('Жүріп жатқан жоба')
        ->and($planned->tasks()->count())->toBe(0)
        ->and($operational->tasks()->count())->toBe(0)
        ->and($planned->attractionActivities()->count())->toBe(0)
        ->and($operational->attractionActivities()->count())->toBe(0);
});

test('each Turkistan Invest stream can run only its own project workflow', function () {
    $region = projectStreamRegion('Жұмыс барысы ауданы');
    $legacyAttractionCurator = projectStreamUser('turkistan_invest_attraction');
    $legacyAccompanimentCurator = projectStreamUser('turkistan_invest');
    $accompaniment = projectStreamUser('turkistan_invest');
    $attraction = projectStreamUser('turkistan_invest_attraction');
    $executor = projectStreamExecutor();

    // Status, not the historical curator sub-role, owns the project stream.
    $operational = projectStreamProject(
        $legacyAttractionCurator,
        $region,
        'implementation',
        'Сүйемелдеу жұмысы'
    );
    $planned = projectStreamProject(
        $legacyAccompanimentCurator,
        $region,
        'plan',
        'Инвестор тарту жұмысы'
    );

    $this->actingAs($accompaniment)
        ->post(route('investment-projects.tasks.store', $operational), [
            'title' => 'Жол картасының тапсырмасы',
            'assigned_to' => $executor->id,
            'due_date' => today()->addWeek()->toDateString(),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $task = $operational->tasks()->sole();
    expect($task->created_by)->toBe($accompaniment->id)
        ->and($task->approval_status)->toBe('pending');

    $this->post(route('investment-projects.attraction-activities.store', $planned), [
        'attraction_stage' => 'potential',
        'next_action' => 'Инвестормен кездесу',
        'next_action_due_date' => today()->addWeek()->toDateString(),
        'responsible_id' => $executor->id,
    ])->assertForbidden();

    $this->actingAs($attraction)
        ->post(route('investment-projects.attraction-activities.store', $planned), [
            'attraction_stage' => 'potential',
            'next_action' => 'Инвестормен кездесу',
            'next_action_due_date' => today()->addWeek()->toDateString(),
            'responsible_id' => $executor->id,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($planned->attractionActivities()->sole()->created_by)
        ->toBe($attraction->id);

    $this->post(route('investment-projects.tasks.store', $operational), [
        'title' => 'Басқа ағын тапсырмасы',
        'assigned_to' => $executor->id,
    ])->assertForbidden();
});

test('both Turkistan Invest streams retain their district restriction', function () {
    $ownRegion = projectStreamRegion('Өз ауданы');
    $otherRegion = projectStreamRegion('Басқа аудан');
    $accompaniment = projectStreamUser('turkistan_invest', $ownRegion);
    $attraction = projectStreamUser('turkistan_invest_attraction', $ownRegion);

    $ownOperational = projectStreamProject(
        $accompaniment,
        $ownRegion,
        'implementation',
        'Өз ауданындағы сүйемелдеу жобасы'
    );
    projectStreamProject(
        $accompaniment,
        $otherRegion,
        'implementation',
        'Басқа аудандағы сүйемелдеу жобасы'
    );
    $ownPlanned = projectStreamProject(
        $attraction,
        $ownRegion,
        'plan',
        'Өз ауданындағы тартылатын жоба'
    );
    projectStreamProject(
        $attraction,
        $otherRegion,
        'plan',
        'Басқа аудандағы тартылатын жоба'
    );

    $this->actingAs($accompaniment)
        ->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $ownOperational->id));

    $this->actingAs($attraction)
        ->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $ownPlanned->id));
});

test('new project status choices follow the Turkistan Invest stream', function () {
    $accompaniment = projectStreamUser('turkistan_invest');
    $attraction = projectStreamUser('turkistan_invest_attraction');
    $handover = app(ProjectAttractionHandoverService::class);

    $this->actingAs($accompaniment)
        ->get(route('investment-projects.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canCreateOperationalProject', true));

    $this->actingAs($attraction)
        ->get(route('investment-projects.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canCreateOperationalProject', false));

    expect(fn () => $handover->prepare([
        'status' => 'plan',
        'attraction_stage' => 'potential',
    ], $accompaniment))->toThrow(ValidationException::class)
        ->and(fn () => $handover->prepare([
            'status' => 'implementation',
            'attraction_stage' => null,
        ], $attraction))->toThrow(ValidationException::class)
        ->and($handover->prepare([
            'status' => 'implementation',
            'attraction_stage' => null,
        ], $accompaniment)['status'])->toBe('implementation')
        ->and($handover->prepare([
            'status' => 'plan',
            'attraction_stage' => 'potential',
        ], $attraction)['status'])->toBe('plan');
});

test('attraction project list filters visible projects by investor country', function () {
    $region = projectStreamRegion('Инвестор елдері ауданы');
    $attraction = projectStreamUser('turkistan_invest_attraction');

    $turkeyFirst = projectStreamProject(
        $attraction,
        $region,
        'plan',
        'Түркия жобасы 1'
    );
    $turkeyFirst->update(['investor_country_code' => 'TR']);

    $turkeySecond = projectStreamProject(
        $attraction,
        $region,
        'plan',
        'Түркия жобасы 2'
    );
    $turkeySecond->update(['investor_country_code' => 'TR']);

    $germany = projectStreamProject(
        $attraction,
        $region,
        'plan',
        'Германия жобасы'
    );
    $germany->update(['investor_country_code' => 'DE']);

    $pending = projectStreamProject(
        $attraction,
        $region,
        'plan',
        'Резерв шешімін күткен Қытай жобасы'
    );
    $pending->update([
        'investor_country_code' => 'CN',
        'attraction_stage' => 'handover',
        'attraction_handover_requested_at' => now(),
    ]);

    $this->actingAs($attraction)
        ->get(route('investment-projects.index', [
            'investor_country_code' => 'tr',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.investor_country_code', 'TR')
            ->where(
                'investorCountries',
                fn ($rows) => collect($rows)->pluck('code')->sort()->values()->all()
                    === ['DE', 'TR']
            )
            ->has('projects.data', 2)
            ->where(
                'projects.data',
                fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all()
                    === collect([$turkeyFirst->id, $turkeySecond->id])
                        ->sort()
                        ->values()
                        ->all()
            ));
});

test('attraction issues page contains only visible planned project issues', function () {
    $region = projectStreamRegion('Мәселелер ауданы');
    $attraction = projectStreamUser('turkistan_invest_attraction');
    $otherDirection = projectStreamUser('ia');

    $visible = projectStreamProject(
        $attraction,
        $region,
        'plan',
        'Көрінетін жоспарлы жоба'
    );
    $implementation = projectStreamProject(
        $attraction,
        $region,
        'implementation',
        'Жүріп жатқан жоба'
    );
    $launched = projectStreamProject(
        $attraction,
        $region,
        'launched',
        'Іске қосылған жоба'
    );
    $pending = projectStreamProject(
        $attraction,
        $region,
        'plan',
        'Резерв шешімін күтіп тұрған жоба'
    );
    $pending->update([
        'attraction_stage' => 'handover',
        'attraction_handover_requested_at' => now(),
    ]);
    $archived = projectStreamProject(
        $attraction,
        $region,
        'plan',
        'Архивтегі жоспарлы жоба'
    );
    $archived->update(['is_archived' => true]);
    $nonCurated = projectStreamProject(
        $otherDirection,
        $region,
        'plan',
        'Басқа бағыттың жоспарлы жобасы'
    );

    foreach ([
        [$visible, 'Көрінетін мәселе'],
        [$implementation, 'Жүріп жатқан жоба мәселесі'],
        [$launched, 'Іске қосылған жоба мәселесі'],
        [$pending, 'Резервтегі жоба мәселесі'],
        [$archived, 'Архивтегі жоба мәселесі'],
        [$nonCurated, 'Басқа бағыт мәселесі'],
    ] as [$project, $title]) {
        ProjectIssue::create([
            'project_id' => $project->id,
            'title' => $title,
            'description' => $title,
            'severity' => 'medium',
            'status' => 'open',
            'created_by' => $attraction->id,
        ]);
    }

    $sez = Sez::create([
        'name' => 'Жасырын АЭА',
        'region_id' => $region->id,
        'total_area' => 10,
        'status' => 'active',
    ]);
    SezIssue::create([
        'sez_id' => $sez->id,
        'title' => 'АЭА мәселесі',
        'description' => 'Тарту аккаунтына көрінбеуі керек',
        'severity' => 'high',
        'status' => 'open',
        'created_by' => $attraction->id,
    ]);

    foreach ([null, 'sez', 'invest'] as $requestedSector) {
        $parameters = $requestedSector
            ? ['sector' => $requestedSector]
            : [];

        $this->actingAs($attraction)
            ->get(route('issues.index', $parameters))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.sector', 'all_projects')
                ->has('sectorLabels', 1)
                ->where('sectorLabels.all_projects', 'Тартылатын жобалар')
                ->has('issues.data', 1)
                ->where('issues.data.0.entity_id', $visible->id)
                ->where('issues.data.0.title', 'Көрінетін мәселе')
                ->where('issues.data.0.type_label', 'Тартылатын жобалар')
                ->where('issues.total', 1)
                ->where('issueStats.total', 1)
                ->where('issueStats.open', 1));
    }
});
