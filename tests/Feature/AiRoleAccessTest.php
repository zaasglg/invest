<?php

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createAiRoleAccessUser(
    string $roleName,
    ?int $regionId = null,
    ?string $investSubRole = null
): User {
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        [
            'display_name' => ucfirst($roleName),
            'description' => "AI {$roleName} test role",
        ]
    );

    $legacyRole = match ($roleName) {
        'superadmin' => 'admin',
        'invest' => 'invest',
        'akim' => 'akim',
        'zamakim' => 'deputy_akim',
        default => 'district_user',
    };

    return User::factory()->create([
        'role' => $legacyRole,
        'role_id' => $role->id,
        'region_id' => $regionId,
        'invest_sub_role' => $investSubRole,
    ]);
}

function createAiRoleAccessRegion(
    string $name,
    ?int $parentId = null
): Region {
    return Region::create([
        'name' => $name,
        'type' => $parentId ? 'district' : 'oblast',
        'parent_id' => $parentId,
        'color' => '#2563EB',
        'icon' => 'factory',
    ]);
}

function createAiRoleAccessProject(
    User $creator,
    Region $region,
    string $name
): InvestmentProject {
    return InvestmentProject::create([
        'name' => $name,
        'company_name' => "{$name} компаниясы",
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'implementation',
        'current_status' => 'Іске асырылуда',
        'created_by' => $creator->id,
    ]);
}

test('AI assistant is available to every supported account role', function () {
    config(['services.gemini.api_key' => '']);

    foreach (User::SUPPORTED_ROLES as $roleName) {
        $user = createAiRoleAccessUser($roleName);

        $this->actingAs($user)
            ->postJson(route('chat.send'), [
                'message' => 'Жүйе бойынша көмек көрсет',
            ])
            ->assertOk()
            ->assertJsonStructure(['message']);
    }
});

test('moderator AI only returns active Turkistan Invest projects', function () {
    config(['services.gemini.api_key' => '']);

    $region = createAiRoleAccessRegion('AI moderator облысы');
    $moderator = createAiRoleAccessUser('moderator');
    $turkistanInvest = createAiRoleAccessUser(
        'invest',
        null,
        'turkistan_invest'
    );
    $aeaInvest = createAiRoleAccessUser('invest', null, 'aea');
    $creator = createAiRoleAccessUser('superadmin');

    $visibleProject = createAiRoleAccessProject(
        $creator,
        $region,
        'AI модератор көретін жоба'
    );
    $visibleProject->curators()->attach($turkistanInvest);

    $hiddenProject = createAiRoleAccessProject(
        $creator,
        $region,
        'AI модераторға жабық жоба'
    );
    $hiddenProject->curators()->attach($aeaInvest);

    $archivedProject = createAiRoleAccessProject(
        $creator,
        $region,
        'AI архивтік модератор жобасы'
    );
    $archivedProject->curators()->attach($turkistanInvest);
    $archivedProject->update(['is_archived' => true]);

    $message = $this->actingAs($moderator)
        ->postJson(route('chat.send'), [
            'message' => 'Барлық инвестициялық жобаларды көрсет',
        ])
        ->assertOk()
        ->json('message');

    expect($message)
        ->toContain($visibleProject->name)
        ->not->toContain($hiddenProject->name)
        ->not->toContain($archivedProject->name);
});

test('district akim and executor receive role scoped AI data', function () {
    config(['services.gemini.api_key' => '']);

    $oblast = createAiRoleAccessRegion('AI scope облысы');
    $ownRegion = createAiRoleAccessRegion('AI өз ауданы', $oblast->id);
    $otherRegion = createAiRoleAccessRegion('AI басқа ауданы', $oblast->id);
    $creator = createAiRoleAccessUser('superadmin');
    $akim = createAiRoleAccessUser('akim', $ownRegion->id);
    $executor = createAiRoleAccessUser('ispolnitel');
    $otherExecutor = createAiRoleAccessUser('ispolnitel');

    $ownProject = createAiRoleAccessProject(
        $creator,
        $ownRegion,
        'AI әкімнің өз жобасы'
    );
    $otherProject = createAiRoleAccessProject(
        $creator,
        $otherRegion,
        'AI әкімге жабық жоба'
    );

    $akimMessage = $this->actingAs($akim)
        ->postJson(route('chat.send'), [
            'message' => 'Инвестициялық жобаларды көрсет',
        ])
        ->assertOk()
        ->json('message');

    expect($akimMessage)
        ->toContain($ownProject->name)
        ->not->toContain($otherProject->name);

    IndustrialZone::create([
        'name' => 'AI әкімнің өз индустриалды аймағы',
        'region_id' => $ownRegion->id,
        'status' => 'active',
    ]);
    IndustrialZone::create([
        'name' => 'AI әкімге жабық индустриалды аймақ',
        'region_id' => $otherRegion->id,
        'status' => 'active',
    ]);

    $akimAssetsMessage = $this->actingAs($akim)
        ->postJson(route('chat.send'), [
            'message' => 'Индустриалды аймақтарды көрсет',
        ])
        ->assertOk()
        ->json('message');

    expect($akimAssetsMessage)
        ->toContain('AI әкімнің өз индустриалды аймағы')
        ->not->toContain('AI әкімге жабық индустриалды аймақ');

    ProjectTask::create([
        'project_id' => $ownProject->id,
        'title' => 'AI орындаушының тапсырмасы',
        'assigned_to' => $executor->id,
        'created_by' => $creator->id,
        'status' => 'new',
    ]);
    ProjectTask::create([
        'project_id' => $ownProject->id,
        'title' => 'AI басқа орындаушы тапсырмасы',
        'assigned_to' => $otherExecutor->id,
        'created_by' => $creator->id,
        'status' => 'new',
    ]);

    $executorMessage = $this->actingAs($executor)
        ->postJson(route('chat.send'), [
            'message' => 'Менің тапсырмаларымды көрсет',
        ])
        ->assertOk()
        ->json('message');

    expect($executorMessage)
        ->toContain('AI орындаушының тапсырмасы')
        ->not->toContain('AI басқа орындаушы тапсырмасы');
});
