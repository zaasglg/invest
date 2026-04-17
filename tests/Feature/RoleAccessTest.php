<?php

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// ================ HELPER FUNCTIONS ================

function createRole(string $name, string $displayName = ''): Role
{
    return Role::firstOrCreate(
        ['name' => $name],
        [
            'display_name' => $displayName ?: ucfirst($name),
            'description' => "Test {$name} role",
        ]
    );
}

function createUserWithRole(string $roleName, ?int $regionId = null, array $extra = []): User
{
    $role = createRole($roleName);

    return User::factory()->create(array_merge([
        'role' => $roleName,
        'role_id' => $role->id,
        'region_id' => $regionId,
    ], $extra));
}

function createTestRegion(): Region
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

function createTestProject(int $regionId, int $creatorId): InvestmentProject
{
    return InvestmentProject::create([
        'name' => 'Тест жоба',
        'region_id' => $regionId,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'company_name' => 'Тест компания',
        'description' => 'Тест',
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $creatorId,
    ]);
}

function createTestSez(int $regionId): Sez
{
    return Sez::create([
        'name' => 'Тест СЭЗ',
        'region_id' => $regionId,
        'total_area' => 100.00,
        'status' => 'active',
        'description' => 'Тест',
    ]);
}

function createTestIndustrialZone(int $regionId): IndustrialZone
{
    return IndustrialZone::create([
        'name' => 'Тест ИЗ',
        'region_id' => $regionId,
        'total_area' => 200.00,
        'status' => 'active',
        'description' => 'Тест',
    ]);
}

function createTestSubsoilUser(int $regionId): SubsoilUser
{
    return SubsoilUser::create([
        'name' => 'Тест Жер қойнауын пайдаланушы',
        'bin' => rand(100000000000, 999999999999),
        'region_id' => $regionId,
        'mineral_type' => 'Көмір',
        'total_area' => 500.00,
        'description' => 'Тест',
        'license_status' => 'active',
        'license_start' => '2025-01-01',
        'license_end' => '2030-01-01',
    ]);
}

// ================ SUPERADMIN ROLE TESTS ================

describe('Superadmin role', function () {
    test('can access all pages', function () {
        $user = createUserWithRole('superadmin');
        $oblast = createTestRegion();
        $district = $oblast->children->first();

        // Dashboard
        $this->actingAs($user)->get('/dashboard')->assertStatus(200);

        // Regions
        $this->actingAs($user)->get('/regions')->assertStatus(200);
        $this->actingAs($user)->get('/regions/create')->assertStatus(200);
        $this->actingAs($user)->get("/regions/{$oblast->id}")->assertStatus(200);
        $this->actingAs($user)->get("/regions/{$oblast->id}/edit")->assertStatus(200);

        // Users
        $this->actingAs($user)->get('/users')->assertStatus(200);
        $this->actingAs($user)->get('/users/create')->assertStatus(200);

        // Roles
        $this->actingAs($user)->get('/roles')->assertStatus(200);
        $this->actingAs($user)->get('/roles/create')->assertStatus(200);

        // Project Types
        $this->actingAs($user)->get('/project-types')->assertStatus(200);
        $this->actingAs($user)->get('/project-types/create')->assertStatus(200);
    });

    test('can create and edit investment projects', function () {
        $user = createUserWithRole('superadmin');
        $oblast = createTestRegion();
        $district = $oblast->children->first();

        $this->actingAs($user)->get('/investment-projects/create')->assertStatus(200);

        $project = createTestProject($district->id, $user->id);
        $this->actingAs($user)->get("/investment-projects/{$project->id}/edit")->assertStatus(200);
    });

    test('can access archived projects', function () {
        $user = createUserWithRole('superadmin');
        $oblast = createTestRegion();
        $district = $oblast->children->first();

        $project = createTestProject($district->id, $user->id);
        $project->update(['is_archived' => true]);

        $this->actingAs($user)->get('/investment-projects-archived')->assertStatus(200);
        $this->actingAs($user)->get("/investment-projects/{$project->id}")->assertStatus(200);
    });

    test('can archive and unarchive projects', function () {
        $user = createUserWithRole('superadmin');
        $oblast = createTestRegion();
        $district = $oblast->children->first();

        $project = createTestProject($district->id, $user->id);

        $this->actingAs($user)
            ->post("/investment-projects/{$project->id}/archive")
            ->assertRedirect();

        expect($project->fresh()->is_archived)->toBeTrue();

        $this->actingAs($user)
            ->post("/investment-projects/{$project->id}/unarchive")
            ->assertRedirect();

        expect($project->fresh()->is_archived)->toBeFalse();
    });
});

// ================ INVEST ROLE TESTS ================

describe('Invest role', function () {
    test('cannot access users management', function () {
        $user = createUserWithRole('invest');

        $this->actingAs($user)->get('/users')->assertStatus(403);
        $this->actingAs($user)->get('/users/create')->assertStatus(403);
    });

    test('cannot access roles management', function () {
        $user = createUserWithRole('invest');

        $this->actingAs($user)->get('/roles')->assertStatus(403);
        $this->actingAs($user)->get('/roles/create')->assertStatus(403);
    });

    test('cannot access regions index', function () {
        $oblast = createTestRegion();
        $user = createUserWithRole('invest', $oblast->children->first()->id);

        $this->actingAs($user)->get('/regions')->assertStatus(403);
    });

    test('can access dashboard', function () {
        $user = createUserWithRole('invest');

        $this->actingAs($user)->get('/dashboard')->assertStatus(200);
    });

    test('can access investment projects', function () {
        $user = createUserWithRole('invest');

        $this->actingAs($user)->get('/investment-projects')->assertStatus(200);
        $this->actingAs($user)->get('/investment-projects/create')->assertStatus(200);
    });

    test('can access archived projects', function () {
        $user = createUserWithRole('invest');

        $this->actingAs($user)->get('/investment-projects-archived')->assertStatus(200);
    });

    test('can access sezs', function () {
        $user = createUserWithRole('invest');

        $this->actingAs($user)->get('/sezs')->assertStatus(200);
    });

    test('can access industrial zones', function () {
        $user = createUserWithRole('invest');

        $this->actingAs($user)->get('/industrial-zones')->assertStatus(200);
    });

    test('can access subsoil users', function () {
        $user = createUserWithRole('invest');

        $this->actingAs($user)->get('/subsoil-users')->assertStatus(200);
    });
});

// ================ AKIM ROLE TESTS (READ-ONLY) ================

describe('Akim role (read-only)', function () {
    test('cannot access users management', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/users')->assertStatus(403);
    });

    test('cannot access roles management', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/roles')->assertStatus(403);
    });

    test('cannot access regions management', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/regions')->assertStatus(403);
    });

    test('cannot access project types', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/project-types')->assertStatus(403);
    });

    test('can access dashboard', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/dashboard')->assertStatus(200);
    });

    test('can view investment projects', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/investment-projects')->assertStatus(200);
    });

    test('cannot create investment projects', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/investment-projects/create')->assertStatus(403);
    });

    test('cannot edit investment projects', function () {
        $admin = createUserWithRole('superadmin');
        $user = createUserWithRole('akim');
        $oblast = createTestRegion();
        $district = $oblast->children->first();

        $project = createTestProject($district->id, $admin->id);

        $this->actingAs($user)->get("/investment-projects/{$project->id}/edit")->assertStatus(403);
    });

    test('can view sezs', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/sezs')->assertStatus(200);
    });

    test('cannot create sezs', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/sezs/create')->assertStatus(403);
    });

    test('can view industrial zones', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/industrial-zones')->assertStatus(200);
    });

    test('cannot create industrial zones', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/industrial-zones/create')->assertStatus(403);
    });

    test('can view subsoil users', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/subsoil-users')->assertStatus(200);
    });

    test('cannot create subsoil users', function () {
        $user = createUserWithRole('akim');

        $this->actingAs($user)->get('/subsoil-users/create')->assertStatus(403);
    });
});

// ================ ZAMAKIM ROLE TESTS (READ-ONLY) ================

describe('Zamakim role (read-only)', function () {
    test('cannot access users management', function () {
        $user = createUserWithRole('zamakim');

        $this->actingAs($user)->get('/users')->assertStatus(403);
    });

    test('cannot access roles management', function () {
        $user = createUserWithRole('zamakim');

        $this->actingAs($user)->get('/roles')->assertStatus(403);
    });

    test('can access dashboard', function () {
        $user = createUserWithRole('zamakim');

        $this->actingAs($user)->get('/dashboard')->assertStatus(200);
    });

    test('can view investment projects', function () {
        $user = createUserWithRole('zamakim');

        $this->actingAs($user)->get('/investment-projects')->assertStatus(200);
    });

    test('cannot create investment projects', function () {
        $user = createUserWithRole('zamakim');

        $this->actingAs($user)->get('/investment-projects/create')->assertStatus(403);
    });
});

// ================ ISPOLNITEL ROLE TESTS ================

describe('Ispolnitel role', function () {
    test('cannot access users management', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/users')->assertStatus(403);
    });

    test('cannot access roles management', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/roles')->assertStatus(403);
    });

    test('cannot access project types', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/project-types')->assertStatus(403);
    });

    test('cannot access regions management except show', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/regions/create')->assertStatus(403);
    });

    test('can access dashboard', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/dashboard')->assertStatus(200);
    });

    test('can view investment projects', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/investment-projects')->assertStatus(200);
    });

    test('cannot create investment projects', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/investment-projects/create')->assertStatus(403);
    });

    test('cannot edit investment projects', function () {
        $admin = createUserWithRole('superadmin');
        $user = createUserWithRole('ispolnitel');
        $oblast = createTestRegion();
        $district = $oblast->children->first();

        $project = createTestProject($district->id, $admin->id);

        $this->actingAs($user)->get("/investment-projects/{$project->id}/edit")->assertStatus(403);
    });

    test('cannot upload project documents to uninvolved project', function () {
        $this->withoutMiddleware();

        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => 'admin',
            'role_id' => createRole('superadmin')->id,
        ]);
        $user = User::factory()->create([
            'role' => 'district_user',
            'role_id' => createRole('ispolnitel')->id,
        ]);
        $oblast = createTestRegion();
        $district = $oblast->children->first();
        $project = createTestProject($district->id, $admin->id);

        $response = $this->actingAs($user)->post(
            "/investment-projects/{$project->id}/documents",
            [
                'name' => 'Бөгде құжат',
                'file' => UploadedFile::fake()->create('document.pdf', 100),
            ]
        );

        $response->assertStatus(403);

        $this->assertDatabaseMissing('project_documents', [
            'project_id' => $project->id,
            'name' => 'Бөгде құжат',
        ]);
    });

    test('can view sezs', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/sezs')->assertStatus(200);
    });

    test('cannot create sezs', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/sezs/create')->assertStatus(403);
    });

    test('can view industrial zones', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/industrial-zones')->assertStatus(200);
    });

    test('cannot create industrial zones', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/industrial-zones/create')->assertStatus(403);
    });

    test('can view subsoil users', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/subsoil-users')->assertStatus(200);
    });

    test('cannot create subsoil users', function () {
        $user = createUserWithRole('ispolnitel');

        $this->actingAs($user)->get('/subsoil-users/create')->assertStatus(403);
    });

    test('cannot access archived projects', function () {
        $admin = createUserWithRole('superadmin');
        $user = createUserWithRole('ispolnitel');
        $oblast = createTestRegion();
        $district = $oblast->children->first();

        $project = createTestProject($district->id, $admin->id);
        $project->update(['is_archived' => true]);

        $this->actingAs($user)->get("/investment-projects/{$project->id}")->assertStatus(403);
    });
});

// ================ DISTRICT SCOPING TESTS ================

describe('District scoping', function () {
    test('invest user can only access own region resources', function () {
        $oblast = createTestRegion();
        $district1 = $oblast->children->first();

        // Create another district
        $district2 = Region::create([
            'name' => 'Басқа аудан',
            'type' => 'district',
            'parent_id' => $oblast->id,
            'color' => '#EF4444',
            'icon' => 'building',
        ]);

        $user = createUserWithRole('invest', $district1->id);

        // Create resources in different districts
        $sez1 = createTestSez($district1->id);
        $sez2 = createTestSez($district2->id);

        // User can access own district SEZ
        $this->actingAs($user)->get("/sezs/{$sez1->id}")->assertStatus(200);

        // User cannot access other district SEZ
        $this->actingAs($user)->get("/sezs/{$sez2->id}")->assertStatus(403);
    });

    test('invest user can only access own region industrial zones', function () {
        $oblast = createTestRegion();
        $district1 = $oblast->children->first();

        $district2 = Region::create([
            'name' => 'Басқа аудан IZ',
            'type' => 'district',
            'parent_id' => $oblast->id,
            'color' => '#EF4444',
            'icon' => 'building',
        ]);

        $user = createUserWithRole('invest', $district1->id);

        $iz1 = createTestIndustrialZone($district1->id);
        $iz2 = createTestIndustrialZone($district2->id);

        $this->actingAs($user)->get("/industrial-zones/{$iz1->id}")->assertStatus(200);
        $this->actingAs($user)->get("/industrial-zones/{$iz2->id}")->assertStatus(403);
    });

    test('invest user can only access own region subsoil users', function () {
        $oblast = createTestRegion();
        $district1 = $oblast->children->first();

        $district2 = Region::create([
            'name' => 'Басқа аудан SU',
            'type' => 'district',
            'parent_id' => $oblast->id,
            'color' => '#EF4444',
            'icon' => 'building',
        ]);

        $user = createUserWithRole('invest', $district1->id);

        $su1 = createTestSubsoilUser($district1->id);
        $su2 = createTestSubsoilUser($district2->id);

        $this->actingAs($user)->get("/subsoil-users/{$su1->id}")->assertStatus(200);
        $this->actingAs($user)->get("/subsoil-users/{$su2->id}")->assertStatus(403);
    });
});

// ================ SETTINGS PAGES TESTS ================

describe('Settings pages', function () {
    test('all roles can access profile settings', function () {
        $roles = ['superadmin', 'invest', 'akim', 'zamakim', 'ispolnitel'];

        foreach ($roles as $roleName) {
            $user = createUserWithRole($roleName);
            $this->actingAs($user)->get('/settings/profile')->assertStatus(200);
        }
    });

    test('all roles can access password settings', function () {
        $roles = ['superadmin', 'invest', 'akim', 'zamakim', 'ispolnitel'];

        foreach ($roles as $roleName) {
            $user = createUserWithRole($roleName);
            $this->actingAs($user)->get('/settings/password')->assertStatus(200);
        }
    });
});

// ================ NOTIFICATIONS TESTS ================

describe('Notifications', function () {
    test('all roles can access notifications', function () {
        $roles = ['superadmin', 'invest', 'akim', 'zamakim', 'ispolnitel'];

        foreach ($roles as $roleName) {
            $user = createUserWithRole($roleName);
            $this->actingAs($user)->get('/notifications')->assertStatus(200);
        }
    });

    test('unread count returns json for all roles', function () {
        $roles = ['superadmin', 'invest', 'akim', 'zamakim', 'ispolnitel'];

        foreach ($roles as $roleName) {
            $user = createUserWithRole($roleName);
            $this->actingAs($user)
                ->getJson('/notifications/unread-count')
                ->assertStatus(200)
                ->assertJsonStructure(['count']);
        }
    });
});

// ================ BASKARMA RATING TESTS ================

describe('Baskarma rating', function () {
    test('all roles can access baskarma rating index', function () {
        $roles = ['superadmin', 'invest', 'akim', 'zamakim', 'ispolnitel'];

        foreach ($roles as $roleName) {
            $user = createUserWithRole($roleName);
            $this->actingAs($user)->get('/baskarma-rating')->assertStatus(200);
        }
    });

    test('all roles can view user baskarma rating', function () {
        $roles = ['superadmin', 'invest', 'akim', 'zamakim', 'ispolnitel'];

        foreach ($roles as $roleName) {
            $user = createUserWithRole($roleName);
            $this->actingAs($user)->get("/baskarma-rating/{$user->id}")->assertStatus(200);
        }
    });
});

// ================ ISSUES PAGE TESTS ================

describe('Issues page', function () {
    test('all roles can access global issues page', function () {
        $roles = ['superadmin', 'invest', 'akim', 'zamakim', 'ispolnitel'];

        foreach ($roles as $roleName) {
            $user = createUserWithRole($roleName);
            $this->actingAs($user)->get('/issues')->assertStatus(200);
        }
    });
});

// ================ GUEST ACCESS TESTS ================

describe('Guest access', function () {
    test('dashboard redirects guests to login', function () {
        $this->get('/dashboard')->assertRedirect('/login');
    });

    test('investment projects redirects guests to login', function () {
        $this->get('/investment-projects')->assertRedirect('/login');
    });

    test('regions redirects guests to login', function () {
        $this->get('/regions')->assertRedirect('/login');
    });

    test('sezs redirects guests to login', function () {
        $this->get('/sezs')->assertRedirect('/login');
    });

    test('login page is accessible to guests', function () {
        $this->get('/login')->assertStatus(200);
    });

    test('forgot password page is accessible to guests', function () {
        $this->get('/forgot-password')->assertStatus(200);
    });
});
