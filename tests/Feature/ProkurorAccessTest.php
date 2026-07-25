<?php

use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createProkurorTestRole(string $name, string $displayName): Role
{
    return Role::firstOrCreate(
        ['name' => $name],
        [
            'display_name' => $displayName,
            'description' => "{$displayName} test role",
        ]
    );
}

function createProkurorTestUser(string $roleName): User
{
    $role = createProkurorTestRole(
        $roleName,
        $roleName === 'prokuror' ? 'Прокурор' : ucfirst($roleName)
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
    ]);
}

function createProkurorTestRegion(): Region
{
    return Region::create([
        'name' => 'Прокурор тест ауданы',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

function createProkurorTestProject(User $creator, Region $region, bool $archived = false): InvestmentProject
{
    return InvestmentProject::create([
        'name' => $archived ? 'Архивтік тест жоба' : 'Белсенді тест жоба',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'company_name' => 'Прокурор тест компаниясы',
        'description' => 'Прокурор рөлінің қолжетімділігін тексеру',
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $creator->id,
        'is_archived' => $archived,
    ]);
}

test('prokuror role is registered by migration', function () {
    $this->assertDatabaseHas('roles', [
        'name' => 'prokuror',
        'display_name' => 'Прокурор',
    ]);
});

test('superadmin can create a prokuror account', function () {
    $superadmin = createProkurorTestUser('superadmin');
    $prokurorRole = Role::where('name', 'prokuror')->firstOrFail();

    $this->actingAs($superadmin)
        ->post('/users', [
            'full_name' => 'Тест Прокурор',
            'email' => 'prokuror@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role_id' => $prokurorRole->id,
        ])
        ->assertRedirect('/users');

    $this->assertDatabaseHas('users', [
        'email' => 'prokuror@example.com',
        'role_id' => $prokurorRole->id,
    ]);
});

test('prokuror can view every main section and all projects', function () {
    $prokuror = createProkurorTestUser('prokuror');
    $creator = createProkurorTestUser('superadmin');
    $region = createProkurorTestRegion();
    $activeProject = createProkurorTestProject($creator, $region);
    $archivedProject = createProkurorTestProject($creator, $region, true);

    $this->actingAs($prokuror)->get('/dashboard')->assertOk();
    $this->actingAs($prokuror)->get('/investment-projects')->assertOk();
    $this->actingAs($prokuror)
        ->get("/investment-projects/{$activeProject->id}")
        ->assertOk();
    $this->actingAs($prokuror)
        ->get('/investment-projects-archived')
        ->assertOk();
    $this->actingAs($prokuror)
        ->get("/investment-projects/{$archivedProject->id}")
        ->assertOk();
    $this->actingAs($prokuror)->get('/regions')->assertOk();
    $this->actingAs($prokuror)->get('/project-types')->assertOk();
    $this->actingAs($prokuror)->get('/roles')->assertOk();
    $this->actingAs($prokuror)->get('/sezs')->assertOk();
    $this->actingAs($prokuror)->get('/industrial-zones')->assertOk();
    $this->actingAs($prokuror)->get('/prom-zones')->assertOk();
    $this->actingAs($prokuror)->get('/subsoil-users')->assertOk();
    $this->actingAs($prokuror)->get('/issues')->assertOk();
    $this->actingAs($prokuror)->get('/baskarma-rating')->assertOk();
    $this->actingAs($prokuror)->get('/notifications')->assertOk();
    $this->actingAs($prokuror)->get('/settings/profile')->assertOk();
    $this->actingAs($prokuror)
        ->get('/users')
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->where('canModify', false));
});

test('prokuror cannot create edit or delete regular records', function () {
    $prokuror = createProkurorTestUser('prokuror');
    $creator = createProkurorTestUser('superadmin');
    $region = createProkurorTestRegion();
    $project = createProkurorTestProject($creator, $region);

    $this->actingAs($prokuror)->get('/users/create')->assertForbidden();
    $this->actingAs($prokuror)->get('/roles/create')->assertForbidden();
    $this->actingAs($prokuror)->get('/regions/create')->assertForbidden();
    $this->actingAs($prokuror)
        ->get('/investment-projects/create')
        ->assertForbidden();
    $this->actingAs($prokuror)
        ->put("/investment-projects/{$project->id}", [])
        ->assertForbidden();
    $this->actingAs($prokuror)
        ->delete("/investment-projects/{$project->id}")
        ->assertForbidden();
    $this->actingAs($prokuror)
        ->post("/investment-projects/{$project->id}/archive")
        ->assertForbidden();
});

test('prokuror can create a roadmap task but cannot edit or delete it', function () {
    $prokuror = createProkurorTestUser('prokuror');
    $creator = createProkurorTestUser('superadmin');
    $region = createProkurorTestRegion();
    $project = createProkurorTestProject($creator, $region);
    $ispolnitel = createProkurorTestUser('ispolnitel');

    $this->actingAs($prokuror)
        ->post("/investment-projects/{$project->id}/tasks", [
            'title' => 'Прокурор тапсырмасы',
            'description' => 'Жол картасындағы тест тапсырма',
            'assigned_to' => $ispolnitel->id,
            'start_date' => '2026-08-01',
            'due_date' => '2026-08-31',
        ])
        ->assertRedirect();

    $task = ProjectTask::where('project_id', $project->id)
        ->where('title', 'Прокурор тапсырмасы')
        ->firstOrFail();

    expect($task->created_by)->toBe($prokuror->id)
        ->and($task->approval_status)->toBe('approved');

    $this->actingAs($prokuror)
        ->put("/investment-projects/{$project->id}/tasks/{$task->id}", [
            'title' => 'Өзгертілген тапсырма',
        ])
        ->assertForbidden();

    $this->actingAs($prokuror)
        ->delete("/investment-projects/{$project->id}/tasks/{$task->id}")
        ->assertForbidden();

    expect($task->fresh()->title)->toBe('Прокурор тапсырмасы');
});
