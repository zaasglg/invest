<?php

use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskNotification;
use App\Models\User;
use Carbon\CarbonImmutable;

afterEach(function () {
    CarbonImmutable::setTestNow();
});

function proactiveAssistantUser(string $roleName): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => $roleName]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => match ($roleName) {
            'superadmin' => 'admin',
            'invest' => 'invest',
            'akim' => 'akim',
            'zamakim' => 'deputy_akim',
            default => 'district_user',
        },
    ]);
}

function proactiveAssistantProject(User $creator): InvestmentProject
{
    $region = Region::create([
        'name' => 'Көмекші тест ауданы',
        'type' => 'district',
    ]);

    return InvestmentProject::create([
        'name' => 'Көмекші тест жобасы',
        'region_id' => $region->id,
        'sector' => 'other',
        'total_investment' => 1000000,
        'status' => 'implementation',
        'created_by' => $creator->id,
    ]);
}

test('proactive assistant sends role suggestions and deadline links without duplicates', function () {
    CarbonImmutable::setTestNow('2026-08-05 09:00:00');

    $users = collect(User::SUPPORTED_ROLES)->mapWithKeys(
        fn (string $role) => [$role => proactiveAssistantUser($role)]
    );
    $executor = $users->get('ispolnitel');
    $project = proactiveAssistantProject($executor);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Есепті аяқтау',
        'assigned_to' => $executor->id,
        'created_by' => $executor->id,
        'due_date' => today()->addDays(2),
        'status' => 'in_progress',
        'approval_status' => 'approved',
    ]);

    $this->artisan('assistant:notify')->assertSuccessful();

    foreach ($users as $user) {
        $this->assertDatabaseHas('task_notifications', [
            'user_id' => $user->id,
            'type' => 'assistant_suggestion',
        ]);
    }

    $suggestion = TaskNotification::query()
        ->where('user_id', $executor->id)
        ->where('type', 'assistant_suggestion')
        ->firstOrFail();
    $deadline = TaskNotification::query()
        ->where('user_id', $executor->id)
        ->where('task_id', $task->id)
        ->where('type', 'task_due_soon')
        ->firstOrFail();

    expect($suggestion->destination_url)
        ->toBe(route('investment-projects.index', absolute: false))
        ->and($deadline->destination_url)
        ->toBe(route('investment-projects.show', $project, false))
        ->and($deadline->message)->toContain('2 күн қалды');

    $this->artisan('assistant:notify')->assertSuccessful();

    expect(TaskNotification::query()
        ->where('user_id', $executor->id)
        ->assistant()
        ->count())->toBe(2);

});

test('opening a notification marks it read and redirects to its project', function () {
    $executor = proactiveAssistantUser('ispolnitel');
    $project = proactiveAssistantProject($executor);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Жоба тапсырмасы',
        'assigned_to' => $executor->id,
        'created_by' => $executor->id,
        'status' => 'new',
        'approval_status' => 'approved',
    ]);
    $notification = TaskNotification::create([
        'user_id' => $executor->id,
        'task_id' => $task->id,
        'type' => 'completion_submitted',
        'message' => 'Тапсырма орындалуға жіберілді',
    ]);

    $this->actingAs($executor)
        ->post(route('notifications.open', $notification))
        ->assertRedirect(route('investment-projects.show', $project));

    expect($notification->refresh()->is_read)->toBeTrue();
});

test('a user cannot open another users notification', function () {
    $owner = proactiveAssistantUser('ispolnitel');
    $otherRole = Role::where('name', 'ispolnitel')->firstOrFail();
    $other = User::factory()->create([
        'role_id' => $otherRole->id,
        'role' => 'district_user',
    ]);
    $notification = TaskNotification::create([
        'user_id' => $owner->id,
        'type' => 'assistant_suggestion',
        'message' => 'Жеке ұсыныс',
        'action_url' => '/dashboard',
    ]);

    $this->actingAs($other)
        ->post(route('notifications.open', $notification))
        ->assertForbidden();

    expect($notification->refresh()->is_read)->toBeFalse();
});

test('unread endpoint and assistant feed expose a separate helper count', function () {
    $executor = proactiveAssistantUser('ispolnitel');
    TaskNotification::create([
        'user_id' => $executor->id,
        'type' => 'assistant_suggestion',
        'message' => 'Көмекші ұсынысы',
        'action_url' => '/dashboard',
    ]);
    TaskNotification::create([
        'user_id' => $executor->id,
        'type' => 'task_assigned',
        'message' => 'Қарапайым хабарлама',
    ]);

    $this->actingAs($executor)
        ->getJson(route('notifications.unread-count'))
        ->assertOk()
        ->assertExactJson([
            'count' => 2,
            'assistant_count' => 1,
        ]);

    $this->getJson(route('assistant.notifications.index'))
        ->assertOk()
        ->assertJsonCount(1, 'notifications')
        ->assertJsonPath(
            'notifications.0.destination_url',
            '/dashboard'
        );

    $this->postJson(route('assistant.notifications.read-all'))
        ->assertOk()
        ->assertExactJson([
            'count' => 1,
            'assistant_count' => 0,
        ]);
});
