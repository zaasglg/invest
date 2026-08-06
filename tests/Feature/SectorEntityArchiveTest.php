<?php

use App\Models\IndustrialZone;
use App\Models\IndustrialZonePhoto;
use App\Models\InvestmentProject;
use App\Models\ProjectPhoto;
use App\Models\PromZone;
use App\Models\PromZonePhoto;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\SezPhoto;
use App\Models\SubsoilPhoto;
use App\Models\SubsoilUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createSectorArchiveUser(string $roleName, Region $region): User
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
            default => 'district_user',
        },
        'region_id' => $region->id,
    ]);
}

function createSectorArchiveRegion(): Region
{
    return Region::create([
        'name' => 'Архив тест ауданы',
        'type' => 'district',
        'color' => '#334155',
        'icon' => 'factory',
    ]);
}

function createSectorArchiveEntity(string $type, Region $region): Model
{
    return match ($type) {
        'sez' => Sez::create([
            'name' => 'Архив АЭА',
            'region_id' => $region->id,
            'total_area' => 100,
            'status' => 'active',
        ]),
        'industrial-zone' => IndustrialZone::create([
            'name' => 'Архив индустриялық аймақ',
            'region_id' => $region->id,
            'status' => 'active',
        ]),
        'prom-zone' => PromZone::create([
            'name' => 'Архив пром зона',
            'region_id' => $region->id,
            'status' => 'active',
        ]),
        'subsoil-user' => SubsoilUser::create([
            'name' => 'Архив жер қойнауын пайдаланушы',
            'bin' => '123456789012',
            'region_id' => $region->id,
            'mineral_type' => 'Көмір',
            'license_status' => 'active',
        ]),
    };
}

dataset('sector archive routes', [
    'sez' => [
        'sez',
        Sez::class,
        'sezs.destroy',
        'sezs.deleted',
        'sezs.show',
        'sezs.restore-deleted',
        'sezs.gallery.index',
    ],
    'industrial zone' => [
        'industrial-zone',
        IndustrialZone::class,
        'industrial-zones.destroy',
        'industrial-zones.deleted',
        'industrial-zones.show',
        'industrial-zones.restore-deleted',
        'industrial-zones.gallery.index',
    ],
    'prom zone' => [
        'prom-zone',
        PromZone::class,
        'prom-zones.destroy',
        'prom-zones.deleted',
        'prom-zones.show',
        'prom-zones.restore-deleted',
        'prom-zones.gallery.index',
    ],
    'subsoil user' => [
        'subsoil-user',
        SubsoilUser::class,
        'subsoil-users.destroy',
        'subsoil-users.deleted',
        'subsoil-users.show',
        'subsoil-users.restore-deleted',
        'subsoil-users.gallery.index',
    ],
]);

test('sector entities are archived and remain fully accessible only to superadmin', function (
    string $type,
    string $modelClass,
    string $destroyRoute,
    string $deletedRoute,
    string $showRoute,
    string $restoreRoute,
    string $galleryRoute,
) {
    $region = createSectorArchiveRegion();
    $admin = createSectorArchiveUser('superadmin', $region);
    $invest = createSectorArchiveUser('invest', $region);
    $entity = createSectorArchiveEntity($type, $region);
    $entityId = $entity->getKey();

    $this->actingAs($invest)
        ->delete(route($destroyRoute, $entity))
        ->assertRedirect();

    $this->assertDatabaseHas($entity->getTable(), [
        'id' => $entityId,
        'is_deleted' => true,
        'deleted_by' => $invest->id,
    ]);

    expect($modelClass::find($entityId))->toBeNull()
        ->and($modelClass::onlyDeleted()->whereKey($entityId)->exists())
        ->toBeTrue();

    $this->actingAs($invest)
        ->get(route($deletedRoute))
        ->assertForbidden();
    $this->get(route($showRoute, $entityId))->assertNotFound();
    $this->get(route($galleryRoute, $entityId))->assertNotFound();
    $this->post(route($restoreRoute, $entityId))->assertForbidden();

    $this->actingAs($admin)
        ->get(route($deletedRoute))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deleted-entities/index')
            ->has('items.data', 1)
            ->where('items.data.0.id', $entityId)
            ->where('items.data.0.deleter.id', $invest->id));

    $this->get(route($showRoute, $entityId))->assertOk();
    $this->get(route($galleryRoute, $entityId))->assertOk();

    $this->post(route($restoreRoute, $entityId))->assertRedirect();

    $restored = $modelClass::findOrFail($entityId);
    expect($restored->is_deleted)->toBeFalse()
        ->and($restored->deleted_by)->toBeNull()
        ->and($restored->deleted_at)->toBeNull();
})->with('sector archive routes');

function createGalleryArchiveSubject(
    string $type,
    Region $region,
    User $admin
): array {
    if ($type === 'project') {
        $subject = InvestmentProject::create([
            'name' => 'Галерея архив жобасы',
            'region_id' => $region->id,
            'total_investment' => 1000000,
            'status' => 'plan',
            'created_by' => $admin->id,
        ]);
        $photo = ProjectPhoto::create([
            'project_id' => $subject->id,
            'file_path' => 'project-photos/archive.jpg',
            'photo_type' => 'gallery',
            'gallery_date' => now()->toDateString(),
            'uploaded_by' => $admin->id,
        ]);

        return [$subject, $photo];
    }

    $subject = createSectorArchiveEntity($type, $region);
    $photo = match ($type) {
        'sez' => SezPhoto::create([
            'sez_id' => $subject->id,
            'file_path' => 'sez-photos/archive.jpg',
            'photo_type' => 'gallery',
        ]),
        'industrial-zone' => IndustrialZonePhoto::create([
            'industrial_zone_id' => $subject->id,
            'file_path' => 'industrial-zone-photos/archive.jpg',
            'photo_type' => 'gallery',
        ]),
        'prom-zone' => PromZonePhoto::create([
            'prom_zone_id' => $subject->id,
            'file_path' => 'prom-zone-photos/archive.jpg',
            'photo_type' => 'gallery',
        ]),
        'subsoil-user' => SubsoilPhoto::create([
            'subsoil_user_id' => $subject->id,
            'file_path' => 'subsoil-photos/archive.jpg',
            'photo_type' => 'gallery',
        ]),
    };

    return [$subject, $photo];
}

dataset('gallery archive routes', [
    'project photo' => [
        'project',
        ProjectPhoto::class,
        'investment-projects.gallery.destroy',
        'investment-projects.gallery.index',
        'investment-projects/gallery',
    ],
    'sez photo' => [
        'sez',
        SezPhoto::class,
        'sezs.gallery.destroy',
        'sezs.gallery.index',
        'sezs/gallery',
    ],
    'industrial zone photo' => [
        'industrial-zone',
        IndustrialZonePhoto::class,
        'industrial-zones.gallery.destroy',
        'industrial-zones.gallery.index',
        'industrial-zones/gallery',
    ],
    'prom zone photo' => [
        'prom-zone',
        PromZonePhoto::class,
        'prom-zones.gallery.destroy',
        'prom-zones.gallery.index',
        'prom-zones/gallery',
    ],
    'subsoil photo' => [
        'subsoil-user',
        SubsoilPhoto::class,
        'subsoil-users.gallery.destroy',
        'subsoil-users.gallery.index',
        'subsoil-users/gallery',
    ],
]);

test('gallery deletion preserves files and exposes audit only to superadmin', function (
    string $type,
    string $photoClass,
    string $destroyRoute,
    string $galleryRoute,
    string $component,
) {
    Storage::fake('public');

    $region = createSectorArchiveRegion();
    $admin = createSectorArchiveUser('superadmin', $region);
    $prokuror = createSectorArchiveUser('prokuror', $region);
    [$subject, $photo] = createGalleryArchiveSubject($type, $region, $admin);
    Storage::disk('public')->put($photo->file_path, 'photo');

    $this->actingAs($admin)
        ->delete(route($destroyRoute, [$subject, $photo]))
        ->assertRedirect();

    $this->assertDatabaseHas($photo->getTable(), [
        'id' => $photo->id,
        'is_deleted' => true,
        'deleted_by' => $admin->id,
    ]);
    Storage::disk('public')->assertExists($photo->file_path);
    expect($photoClass::find($photo->id))->toBeNull()
        ->and($photoClass::onlyDeleted()->whereKey($photo->id)->exists())
        ->toBeTrue();

    $this->get(route($galleryRoute, $subject))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component($component)
            ->where('canViewDeleted', true)
            ->has('deletedPhotos', 1)
            ->where('deletedPhotos.0.id', $photo->id)
            ->where('deletedPhotos.0.deleter.id', $admin->id));

    $this->actingAs($prokuror)
        ->get(route($galleryRoute, $subject))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component($component)
            ->where('canViewDeleted', false)
            ->has('deletedPhotos', 0));
})->with('gallery archive routes');
