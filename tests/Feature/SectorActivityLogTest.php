<?php

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Role;
use App\Models\SectorActivityLog;
use App\Models\Sez;
use App\Models\SezPhoto;
use App\Models\SubsoilUser;
use App\Models\User;
use App\Services\SectorActivityLogService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createSectorLogUser(string $roleName, Region $region): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'region_id' => $region->id,
    ]);
}

function createSectorLogRegion(): Region
{
    return Region::create([
        'name' => 'Әрекеттер тарихы тест ауданы',
        'type' => 'district',
        'color' => '#334155',
        'icon' => 'factory',
    ]);
}

function createSectorLogEntity(string $type, Region $region): Model
{
    return match ($type) {
        'sez' => Sez::create([
            'name' => 'Тарих СЭЗ',
            'region_id' => $region->id,
            'total_area' => 100,
            'status' => 'active',
        ]),
        'industrial-zone' => IndustrialZone::create([
            'name' => 'Тарих индустриялық аймақ',
            'region_id' => $region->id,
            'status' => 'active',
        ]),
        'prom-zone' => PromZone::create([
            'name' => 'Тарих пром зона',
            'region_id' => $region->id,
            'status' => 'active',
        ]),
        'subsoil-user' => SubsoilUser::create([
            'name' => 'Тарих жер қойнауын пайдаланушы',
            'bin' => '123456789012',
            'region_id' => $region->id,
            'mineral_type' => 'Көмір',
            'license_status' => 'active',
        ]),
    };
}

dataset('sector activity routes', [
    'sez' => [
        'sez',
        'sezs.destroy',
        'sezs.logs',
        'sezs.restore-deleted',
    ],
    'industrial zone' => [
        'industrial-zone',
        'industrial-zones.destroy',
        'industrial-zones.logs',
        'industrial-zones.restore-deleted',
    ],
    'prom zone' => [
        'prom-zone',
        'prom-zones.destroy',
        'prom-zones.logs',
        'prom-zones.restore-deleted',
    ],
    'subsoil user' => [
        'subsoil-user',
        'subsoil-users.destroy',
        'subsoil-users.logs',
        'subsoil-users.restore-deleted',
    ],
]);

test('sector archive and restore actions are visible only to superadmin', function (
    string $type,
    string $destroyRoute,
    string $logsRoute,
    string $restoreRoute,
) {
    $region = createSectorLogRegion();
    $admin = createSectorLogUser('superadmin', $region);
    $prokuror = createSectorLogUser('prokuror', $region);
    $entity = createSectorLogEntity($type, $region);
    $entityId = $entity->id;

    $this->actingAs($admin)
        ->delete(route($destroyRoute, $entity))
        ->assertRedirect();

    expect(SectorActivityLog::query()
        ->where('auditable_type', $entity->getMorphClass())
        ->where('auditable_id', $entityId)
        ->where('event', 'entity.deleted')
        ->exists())->toBeTrue();

    $this->actingAs($prokuror)
        ->get(route($logsRoute, $entityId))
        ->assertForbidden();

    $this->actingAs($admin)
        ->get(route($logsRoute, $entityId))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('sector-activity-logs/index')
            ->has('logs.data', 1)
            ->where('logs.data.0.event', 'entity.deleted')
            ->where('logs.data.0.user.id', $admin->id)
            ->where('categoryCounts.entity', 1));

    $this->post(route($restoreRoute, $entityId))->assertRedirect();

    $this->get(route($logsRoute, $entityId))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('logs.data', 2)
            ->where('logs.data.0.event', 'entity.restored'));
})->with('sector activity routes');

test('gallery and issue actions are recorded with details', function () {
    Storage::fake('public');

    $region = createSectorLogRegion();
    $admin = createSectorLogUser('superadmin', $region);
    $sez = createSectorLogEntity('sez', $region);
    $photo = SezPhoto::create([
        'sez_id' => $sez->id,
        'file_path' => 'sez-photos/history.jpg',
        'photo_type' => 'gallery',
    ]);

    $this->actingAs($admin)
        ->delete(route('sezs.gallery.destroy', [$sez, $photo]))
        ->assertRedirect();

    $this->post(route('sezs.issues.store', $sez), [
        'title' => 'Инфрақұрылым мәселесі',
        'description' => 'Электр желісін жаңарту керек',
        'category' => 'infrastructure',
        'severity' => 'high',
        'status' => 'open',
    ])->assertRedirect();

    $events = SectorActivityLog::query()
        ->where('auditable_type', $sez->getMorphClass())
        ->where('auditable_id', $sez->id)
        ->orderBy('id')
        ->pluck('event')
        ->all();

    expect($events)->toBe(['photo.deleted', 'issue.created']);
});

test('project membership changes are recorded in the sector history', function () {
    $region = createSectorLogRegion();
    $admin = createSectorLogUser('superadmin', $region);
    $sez = createSectorLogEntity('sez', $region);
    $project = InvestmentProject::create([
        'name' => 'СЭЗ-ге байланыстырылатын жоба',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'created_by' => $admin->id,
    ]);

    $service = app(SectorActivityLogService::class);

    $this->actingAs($admin);
    $service->recordProjectMembershipChanges(
        $project,
        Sez::class,
        ['attached' => [$sez->id], 'detached' => [], 'updated' => []]
    );

    $log = SectorActivityLog::query()->sole();

    expect($log->event)->toBe('project.attached')
        ->and($log->category)->toBe('project')
        ->and($log->subject_type)->toBe('InvestmentProject')
        ->and($log->properties['details']['Жоба ID'])->toBe($project->id);
});
