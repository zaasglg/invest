<?php

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createAdminUser(): User
{
    $role = Role::firstOrCreate(
        ['name' => 'superadmin'],
        ['display_name' => 'Супер Админ', 'description' => 'Тест']
    );

    return User::factory()->create([
        'role' => 'admin',
        'role_id' => $role->id,
    ]);
}

function createRegionWithChildren(): Region
{
    $oblast = Region::create([
        'name' => 'Тест облысы',
        'type' => 'oblast',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);

    Region::create([
        'name' => 'Тест ауданы',
        'type' => 'district',
        'parent_id' => $oblast->id,
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);

    return $oblast;
}

// ===================== DASHBOARD =====================

test('dashboard page loads for authenticated user', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
});

test('dashboard redirects guests to login', function () {
    $response = $this->get('/dashboard');

    $response->assertRedirect('/login');
});

// ===================== REGIONS =====================

test('regions index page loads for admin', function () {
    $user = createAdminUser();
    createRegionWithChildren();

    $response = $this->actingAs($user)->get('/regions');

    $response->assertStatus(200);
});

test('regions create page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/regions/create');

    $response->assertStatus(200);
});

test('regions show page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();

    $response = $this->actingAs($user)->get("/regions/{$oblast->id}");

    $response->assertStatus(200);
});

test('regions edit page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();

    $response = $this->actingAs($user)->get("/regions/{$oblast->id}/edit");

    $response->assertStatus(200);
});

// ===================== SEZs =====================

test('sezs index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/sezs');

    $response->assertStatus(200);
});

test('sezs create page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/sezs/create');

    $response->assertStatus(200);
});

test('sezs show page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $sez = Sez::create([
        'name' => 'Тест СЭЗ',
        'region_id' => $district->id,
        'total_area' => 100.00,
        'status' => 'active',
        'description' => 'Тест',
    ]);

    $response = $this->actingAs($user)->get("/sezs/{$sez->id}");

    $response->assertStatus(200);
});

test('sezs edit page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $sez = Sez::create([
        'name' => 'Тест СЭЗ',
        'region_id' => $district->id,
        'total_area' => 100.00,
        'status' => 'active',
        'description' => 'Тест',
    ]);

    $response = $this->actingAs($user)->get("/sezs/{$sez->id}/edit");

    $response->assertStatus(200);
});

// ===================== INDUSTRIAL ZONES =====================

test('industrial zones index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/industrial-zones');

    $response->assertStatus(200);
});

test('industrial zones create page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/industrial-zones/create');

    $response->assertStatus(200);
});

test('industrial zones show page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $zone = IndustrialZone::create([
        'name' => 'Тест ИЗ',
        'region_id' => $district->id,
        'total_area' => 200.00,
        'status' => 'active',
        'description' => 'Тест',
    ]);

    $response = $this->actingAs($user)->get("/industrial-zones/{$zone->id}");

    $response->assertStatus(200);
});

test('industrial zones edit page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $zone = IndustrialZone::create([
        'name' => 'Тест ИЗ',
        'region_id' => $district->id,
        'total_area' => 200.00,
        'status' => 'active',
        'description' => 'Тест',
    ]);

    $response = $this->actingAs($user)->get("/industrial-zones/{$zone->id}/edit");

    $response->assertStatus(200);
});

// ===================== INVESTMENT PROJECTS =====================

test('investment projects index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/investment-projects');

    $response->assertStatus(200);
});

test('investment projects create page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/investment-projects/create');

    $response->assertStatus(200);
});

test('investment projects show page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $project = InvestmentProject::create([
        'name' => 'Тест жоба',
        'region_id' => $district->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'company_name' => 'Тест компания',
        'description' => 'Тест сипаттама',
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get("/investment-projects/{$project->id}");

    $response->assertStatus(200);
});

test('investment projects edit page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $project = InvestmentProject::create([
        'name' => 'Тест жоба',
        'region_id' => $district->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'company_name' => 'Тест компания',
        'description' => 'Тест сипаттама',
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get("/investment-projects/{$project->id}/edit");

    $response->assertStatus(200);
});

test('investment projects archived page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/investment-projects-archived');

    $response->assertStatus(200);
});

// ===================== SUBSOIL USERS =====================

test('subsoil users index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/subsoil-users');

    $response->assertStatus(200);
});

test('subsoil users create page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/subsoil-users/create');

    $response->assertStatus(200);
});

test('subsoil users show page loads for admin', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $subsoilUser = SubsoilUser::create([
        'name' => 'Тест Жер қойнауын пайдаланушы',
        'bin' => '123456789012',
        'region_id' => $district->id,
        'mineral_type' => 'Көмір',
        'total_area' => 500.00,
        'description' => 'Тест',
        'license_status' => 'active',
        'license_start' => '2025-01-01',
        'license_end' => '2030-01-01',
    ]);

    $response = $this->actingAs($user)->get("/subsoil-users/{$subsoilUser->id}");

    $response->assertStatus(200);
});

// ===================== USERS =====================

test('users index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/users');

    $response->assertStatus(200);
});

test('users create page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/users/create');

    $response->assertStatus(200);
});

test('users edit page loads for admin', function () {
    $user = createAdminUser();
    $targetUser = User::factory()->create();

    $response = $this->actingAs($user)->get("/users/{$targetUser->id}/edit");

    $response->assertStatus(200);
});

// ===================== ROLES =====================

test('roles index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/roles');

    $response->assertStatus(200);
});

test('roles create page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/roles/create');

    $response->assertStatus(200);
});

test('roles edit page loads for admin', function () {
    $user = createAdminUser();
    $role = Role::firstOrCreate(
        ['name' => 'test-role'],
        ['display_name' => 'Тест рөл', 'description' => 'Тест']
    );

    $response = $this->actingAs($user)->get("/roles/{$role->id}/edit");

    $response->assertStatus(200);
});

// ===================== PROJECT TYPES =====================

test('project types index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/project-types');

    $response->assertStatus(200);
});

test('project types create page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/project-types/create');

    $response->assertStatus(200);
});

// ===================== BASKARMA RATING =====================

test('baskarma rating index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/baskarma-rating');

    $response->assertStatus(200);
});

test('baskarma rating show page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get("/baskarma-rating/{$user->id}");

    $response->assertStatus(200);
});

// ===================== NOTIFICATIONS =====================

test('notifications index page loads for admin', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/notifications');

    $response->assertStatus(200);
});

test('notifications unread count returns json', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->getJson('/notifications/unread-count');

    $response->assertStatus(200);
    $response->assertJsonStructure(['count']);
});

// ===================== SETTINGS =====================

test('settings profile page loads', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/settings/profile');

    $response->assertStatus(200);
});

test('settings password page loads', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/settings/password');

    $response->assertStatus(200);
});

test('settings two-factor page redirects to password confirm', function () {
    $user = createAdminUser();

    $response = $this->actingAs($user)->get('/settings/two-factor');

    $response->assertRedirect();
});

// ===================== AUTH PAGES =====================

test('login page loads', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('forgot password page loads', function () {
    $response = $this->get('/forgot-password');

    $response->assertStatus(200);
});

// ===================== NESTED RESOURCES =====================

test('investment project issues page loads', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $project = InvestmentProject::create([
        'name' => 'Тест жоба Issues',
        'region_id' => $district->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'company_name' => 'Тест',
        'description' => 'Тест',
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get("/investment-projects/{$project->id}/issues");

    $response->assertStatus(200);
});

test('investment project documents page loads', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $project = InvestmentProject::create([
        'name' => 'Тест жоба Docs',
        'region_id' => $district->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'company_name' => 'Тест',
        'description' => 'Тест',
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get("/investment-projects/{$project->id}/documents");

    $response->assertStatus(200);
});

test('investment project gallery page loads', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $project = InvestmentProject::create([
        'name' => 'Тест жоба Gallery',
        'region_id' => $district->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'company_name' => 'Тест',
        'description' => 'Тест',
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get("/investment-projects/{$project->id}/gallery");

    $response->assertStatus(200);
});

test('sez issues page loads', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $sez = Sez::create([
        'name' => 'Тест СЭЗ Issues',
        'region_id' => $district->id,
        'total_area' => 100.00,
        'status' => 'active',
        'description' => 'Тест',
    ]);

    $response = $this->actingAs($user)->get("/sezs/{$sez->id}/issues");

    $response->assertStatus(200);
});

test('industrial zone issues page loads', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $zone = IndustrialZone::create([
        'name' => 'Тест ИЗ Issues',
        'region_id' => $district->id,
        'total_area' => 200.00,
        'status' => 'active',
        'description' => 'Тест',
    ]);

    $response = $this->actingAs($user)->get("/industrial-zones/{$zone->id}/issues");

    $response->assertStatus(200);
});

test('subsoil user issues page loads', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $subsoilUser = SubsoilUser::create([
        'name' => 'Тест ЖП Issues',
        'bin' => '111111111111',
        'region_id' => $district->id,
        'mineral_type' => 'Көмір',
        'total_area' => 500.00,
        'description' => 'Тест',
        'license_status' => 'active',
        'license_start' => '2025-01-01',
        'license_end' => '2030-01-01',
    ]);

    $response = $this->actingAs($user)->get("/subsoil-users/{$subsoilUser->id}/issues");

    $response->assertStatus(200);
});

test('subsoil user documents page loads', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $subsoilUser = SubsoilUser::create([
        'name' => 'Тест ЖП Docs',
        'bin' => '222222222222',
        'region_id' => $district->id,
        'mineral_type' => 'Мұнай',
        'total_area' => 300.00,
        'description' => 'Тест',
        'license_status' => 'active',
        'license_start' => '2025-01-01',
        'license_end' => '2030-01-01',
    ]);

    $response = $this->actingAs($user)->get("/subsoil-users/{$subsoilUser->id}/documents");

    $response->assertStatus(200);
});

test('subsoil user gallery page loads', function () {
    $user = createAdminUser();
    $oblast = createRegionWithChildren();
    $district = $oblast->children->first();

    $subsoilUser = SubsoilUser::create([
        'name' => 'Тест ЖП Gallery',
        'bin' => '333333333333',
        'region_id' => $district->id,
        'mineral_type' => 'Газ',
        'total_area' => 400.00,
        'description' => 'Тест',
        'license_status' => 'active',
        'license_start' => '2025-01-01',
        'license_end' => '2030-01-01',
    ]);

    $response = $this->actingAs($user)->get("/subsoil-users/{$subsoilUser->id}/gallery");

    $response->assertStatus(200);
});
