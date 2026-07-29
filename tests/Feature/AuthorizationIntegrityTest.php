<?php

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\ProjectTaskEvent;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\SubsoilTask;
use App\Models\SubsoilTaskCompletion;
use App\Models\SubsoilUser;
use App\Models\TaskCompletion;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createAuthorizationTestUser(string $roleName): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
    ]);
}

function createAuthorizationTestRegion(): Region
{
    return Region::create([
        'name' => 'Authorization тест ауданы',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

function createAuthorizationTestProject(
    User $creator,
    Region $region
): InvestmentProject {
    return InvestmentProject::create([
        'name' => 'Authorization тест жобасы',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'created_by' => $creator->id,
    ]);
}

test('only task managers can mutate project tasks and assignees are restricted', function () {
    $admin = createAuthorizationTestUser('superadmin');
    $executor = createAuthorizationTestUser('ispolnitel');
    $akim = createAuthorizationTestUser('akim');
    $region = createAuthorizationTestRegion();
    $project = createAuthorizationTestProject($admin, $region);
    $project->executors()->attach($executor);

    $this->actingAs($executor)
        ->post(route('investment-projects.tasks.store', $project), [
            'title' => 'Рұқсатсыз тапсырма',
            'assigned_to' => $executor->id,
        ])
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('investment-projects.tasks.store', $project), [
            'title' => 'Заңды тапсырма',
            'assigned_to' => $executor->id,
        ])
        ->assertRedirect();

    $task = ProjectTask::query()->where('title', 'Заңды тапсырма')->sole();

    $this->actingAs($executor)
        ->put(route('investment-projects.tasks.update', [$project, $task]), [
            'title' => 'Рұқсатсыз өзгеріс',
        ])
        ->assertForbidden();

    $this->actingAs($executor)
        ->delete(route(
            'investment-projects.tasks.destroy',
            [$project, $task]
        ))
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('investment-projects.tasks.store', $project), [
            'title' => 'Қате орындаушы',
            'assigned_to' => $akim->id,
        ])
        ->assertSessionHasErrors('assigned_to');

    expect($task->fresh()->title)->toBe('Заңды тапсырма')
        ->and(ProjectTask::query()->count())->toBe(1);
});

test('completion review is authorized once and duplicate submissions are blocked', function () {
    $admin = createAuthorizationTestUser('superadmin');
    $executor = createAuthorizationTestUser('ispolnitel');
    $region = createAuthorizationTestRegion();
    $project = createAuthorizationTestProject($admin, $region);
    $project->executors()->attach($executor);

    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Review тест тапсырмасы',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'status' => 'in_progress',
        'approval_status' => 'approved',
    ]);
    $completion = TaskCompletion::create([
        'task_id' => $task->id,
        'submitted_by' => $executor->id,
        'status' => 'pending',
    ]);
    $reviewRoute = route(
        'investment-projects.tasks.completions.review',
        [$project, $task, $completion]
    );

    $this->actingAs($executor)
        ->put($reviewRoute, ['status' => 'approved'])
        ->assertForbidden();

    expect($completion->fresh()->status)->toBe('pending');

    $this->actingAs($admin)
        ->put($reviewRoute, ['status' => 'approved'])
        ->assertRedirect();

    $this->actingAs($admin)
        ->put($reviewRoute, ['status' => 'approved'])
        ->assertStatus(409);

    expect($completion->fresh()->status)->toBe('approved')
        ->and($task->fresh()->status)->toBe('done')
        ->and(
            ProjectTaskEvent::query()
                ->where('task_id', $task->id)
                ->where('type', 'completion_approved')
                ->count()
        )->toBe(1);

    $secondTask = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Duplicate submit тесті',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'status' => 'new',
        'approval_status' => 'approved',
    ]);
    $submitRoute = route(
        'investment-projects.tasks.completions.store',
        [$project, $secondTask]
    );

    $this->actingAs($executor)
        ->post($submitRoute, ['comment' => 'Бірінші нәтиже'])
        ->assertRedirect();

    $this->actingAs($executor)
        ->post($submitRoute, ['comment' => 'Қайталанған нәтиже'])
        ->assertStatus(409);

    expect($secondTask->completions()->count())->toBe(1);
});

test('subsoil completion review rejects unauthorized and repeated decisions', function () {
    $admin = createAuthorizationTestUser('superadmin');
    $moderator = createAuthorizationTestUser('moderator');
    $executor = createAuthorizationTestUser('ispolnitel');
    $region = createAuthorizationTestRegion();
    $subsoilUser = SubsoilUser::create([
        'name' => 'Review тест жер қойнауы',
        'bin' => '123456789012',
        'region_id' => $region->id,
        'mineral_type' => 'Көмір',
        'license_status' => 'active',
    ]);
    $task = SubsoilTask::create([
        'subsoil_user_id' => $subsoilUser->id,
        'title' => 'Subsoil review тесті',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'status' => 'in_progress',
    ]);
    $completion = SubsoilTaskCompletion::create([
        'task_id' => $task->id,
        'submitted_by' => $executor->id,
        'status' => 'pending',
    ]);
    $route = route(
        'subsoil-users.tasks.completions.review',
        [$subsoilUser, $task, $completion]
    );

    $this->actingAs($moderator)
        ->put($route, ['status' => 'approved'])
        ->assertForbidden();

    $this->actingAs($admin)
        ->put($route, ['status' => 'approved'])
        ->assertRedirect();

    $this->actingAs($admin)
        ->put($route, ['status' => 'approved'])
        ->assertStatus(409);

    expect($completion->fresh()->status)->toBe('approved')
        ->and($task->fresh()->status)->toBe('done');
});

test('nested issues cannot be deleted through a different parent resource', function () {
    $admin = createAuthorizationTestUser('superadmin');
    $region = createAuthorizationTestRegion();

    $sezA = Sez::create([
        'name' => 'СЭЗ A',
        'region_id' => $region->id,
        'total_area' => 100,
        'status' => 'active',
    ]);
    $sezB = Sez::create([
        'name' => 'СЭЗ B',
        'region_id' => $region->id,
        'total_area' => 100,
        'status' => 'active',
    ]);
    $sezIssue = $sezA->issues()->create([
        'title' => 'СЭЗ issue',
        'description' => 'Сипаттама',
        'severity' => 'high',
        'status' => 'open',
    ]);

    $industrialA = IndustrialZone::create([
        'name' => 'ИА A',
        'region_id' => $region->id,
        'status' => 'active',
    ]);
    $industrialB = IndustrialZone::create([
        'name' => 'ИА B',
        'region_id' => $region->id,
        'status' => 'active',
    ]);
    $industrialIssue = $industrialA->issues()->create([
        'title' => 'ИА issue',
        'description' => 'Сипаттама',
        'severity' => 'high',
        'status' => 'open',
    ]);

    $promA = PromZone::create([
        'name' => 'Пром A',
        'region_id' => $region->id,
        'status' => 'active',
    ]);
    $promB = PromZone::create([
        'name' => 'Пром B',
        'region_id' => $region->id,
        'status' => 'active',
    ]);
    $promIssue = $promA->issues()->create([
        'title' => 'Пром issue',
        'description' => 'Сипаттама',
        'severity' => 'high',
        'status' => 'open',
    ]);

    $subsoilA = SubsoilUser::create([
        'name' => 'Жер қойнауы A',
        'bin' => '100000000001',
        'region_id' => $region->id,
        'mineral_type' => 'Көмір',
        'license_status' => 'active',
    ]);
    $subsoilB = SubsoilUser::create([
        'name' => 'Жер қойнауы B',
        'bin' => '100000000002',
        'region_id' => $region->id,
        'mineral_type' => 'Көмір',
        'license_status' => 'active',
    ]);
    $subsoilIssue = $subsoilA->issues()->create([
        'description' => 'Subsoil issue',
        'severity' => 'high',
        'status' => 'open',
    ]);

    $this->actingAs($admin)
        ->delete(route('sezs.issues.destroy', [$sezB, $sezIssue]))
        ->assertNotFound();
    $this->delete(route(
        'industrial-zones.issues.destroy',
        [$industrialB, $industrialIssue]
    ))->assertNotFound();
    $this->delete(route(
        'prom-zones.issues.destroy',
        [$promB, $promIssue]
    ))->assertNotFound();
    $this->delete(route(
        'subsoil-users.issues.destroy',
        [$subsoilB, $subsoilIssue]
    ))->assertNotFound();

    expect($sezIssue->fresh())->not->toBeNull()
        ->and($industrialIssue->fresh())->not->toBeNull()
        ->and($promIssue->fresh())->not->toBeNull()
        ->and($subsoilIssue->fresh())->not->toBeNull();
});
