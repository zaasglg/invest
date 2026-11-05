<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskCompletion;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\BaskarmaKpiService;
use App\Services\ChatContextService;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

function plannedAccessUser(string $roleName, ?string $subRole = null): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'invest_sub_role' => $subRole,
    ]);
}

function plannedAccessProject(User $creator): InvestmentProject
{
    $region = Region::create([
        'name' => 'Жоспарланған жоба ауданы',
        'type' => 'district',
        'color' => '#123456',
        'icon' => 'factory',
    ]);

    $project = InvestmentProject::create([
        'name' => 'Инвестор тарту жобасы',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'created_by' => $creator->id,
    ]);
    $project->curators()->attach($creator);

    return $project;
}

beforeEach(function () {
    Route::middleware(['web', 'auth', 'role.access'])
        ->post('/planned-access/{investmentProject}/activity', function (InvestmentProject $investmentProject) {
            return response()->json(['project_id' => $investmentProject->id]);
        })
        ->name('investment-projects.attraction-activities.access-check');

    Route::middleware(['web', 'auth', 'role.access'])
        ->get('/planned-access/{investmentProject}/historical-evidence', function (InvestmentProject $investmentProject) {
            return response()->json(['project_id' => $investmentProject->id]);
        })
        ->name('investment-projects.tasks.completions.files.access-check');

    Route::getRoutes()->refreshNameLookups();
});

test('planned projects reject every roadmap mutation while retaining historical records', function () {
    $admin = plannedAccessUser('superadmin');
    $executor = plannedAccessUser('ispolnitel');
    $project = plannedAccessProject($admin);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Бұрынғы жол картасының тапсырмасы',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'status' => 'new',
        'approval_status' => 'pending',
    ]);
    $completion = TaskCompletion::create([
        'task_id' => $task->id,
        'submitted_by' => $executor->id,
        'status' => 'pending',
    ]);

    $this->actingAs($admin);
    foreach ([
        ['post', 'store', [$project]],
        ['put', 'update', [$project, $task]],
        ['delete', 'destroy', [$project, $task]],
        ['post', 'approve', [$project, $task]],
        ['post', 'reject', [$project, $task]],
        ['post', 'view', [$project, $task]],
        ['post', 'completions.store', [$project, $task]],
        ['put', 'completions.review', [$project, $task, $completion]],
    ] as [$method, $suffix, $parameters]) {
        $this->{$method}(route('investment-projects.tasks.'.$suffix, $parameters))
            ->assertStatus(409);
    }

    $this->actingAs($executor)
        ->post(route('investment-projects.tasks.view', [$project, $task]))
        ->assertStatus(409);
    $this->post(route('investment-projects.tasks.completions.store', [$project, $task]))
        ->assertStatus(409);

    expect($task->fresh()->status)->toBe('new')
        ->and($task->fresh()->viewed_at)->toBeNull()
        ->and($completion->fresh()->status)->toBe('pending');

    $this->actingAs($admin)
        ->get(route('investment-projects.tasks.completions.files.access-check', $project))
        ->assertOk();
});

test('planned attraction writes are allowed only for scoped project managers', function (string $roleName) {
    $manager = plannedAccessUser($roleName);
    $project = plannedAccessProject($manager);

    $this->actingAs($manager)
        ->post(route('investment-projects.attraction-activities.access-check', $project))
        ->assertOk();
})->with(['superadmin', 'invest', 'moderator']);

test('other roles cannot mutate planned attraction activity', function (string $roleName) {
    $admin = plannedAccessUser('superadmin');
    $project = plannedAccessProject($admin);
    $user = plannedAccessUser($roleName);

    $this->actingAs($user)
        ->post(route('investment-projects.attraction-activities.access-check', $project))
        ->assertForbidden();
})->with(['ispolnitel', 'investor', 'akim', 'zamakim', 'prokuror', 'applicant']);

test('managers cannot mutate attraction activities outside their project scope', function (string $roleName, ?string $subRole) {
    $admin = plannedAccessUser('superadmin');
    $project = plannedAccessProject($admin);
    $manager = plannedAccessUser($roleName, $subRole);

    $this->actingAs($manager)
        ->post(route('investment-projects.attraction-activities.access-check', $project))
        ->assertForbidden();
})->with([
    'direct curator' => ['invest', null],
    'Turkistan Invest curator' => ['invest', 'turkistan_invest'],
    'sector curator' => ['invest', 'aea'],
    'moderator' => ['moderator', null],
]);

test('attraction activity writes require an active nondeleted planned project', function () {
    $admin = plannedAccessUser('superadmin');
    $project = plannedAccessProject($admin);
    $url = route('investment-projects.attraction-activities.access-check', $project);

    $this->actingAs($admin);
    $project->update(['is_archived' => true]);
    $this->post($url)->assertForbidden();

    $project->update(['is_archived' => false, 'is_deleted' => true]);
    $this->post($url)->assertForbidden();

    $project->update(['is_deleted' => false, 'status' => 'implementation']);
    $this->post($url)->assertStatus(409);
});

test('planned roadmap notifications remain stored but disappear from user feeds', function () {
    $admin = plannedAccessUser('superadmin');
    $project = plannedAccessProject($admin);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Бұрынғы тапсырма',
        'assigned_to' => $admin->id,
        'created_by' => $admin->id,
        'status' => 'new',
        'approval_status' => 'approved',
    ]);
    $completion = TaskCompletion::create([
        'task_id' => $task->id,
        'submitted_by' => $admin->id,
        'status' => 'pending',
    ]);

    foreach ([['task_id' => $task->id], ['completion_id' => $completion->id]] as $subject) {
        TaskNotification::create([
            ...$subject,
            'user_id' => $admin->id,
            'type' => 'task_assigned',
            'message' => 'Жол картасының бұрынғы хабарламасы',
        ]);
    }
    $general = TaskNotification::create([
        'user_id' => $admin->id,
        'type' => 'assistant_suggestion',
        'message' => 'Жалпы ұсыныс',
    ]);

    expect(TaskNotification::query()->visibleTo($admin)->pluck('id')->all())
        ->toBe([$general->id])
        ->and(TaskNotification::query()->count())->toBe(3);

    $project->update(['status' => 'implementation']);
    expect(TaskNotification::query()->visibleTo($admin)->count())->toBe(3);
});

test('planned projects do not create deadline or overdue roadmap reminders', function () {
    $admin = plannedAccessUser('superadmin');
    $executor = plannedAccessUser('ispolnitel');
    $project = plannedAccessProject($admin);

    foreach ([today()->subDay(), today()->addDay()] as $dueDate) {
        ProjectTask::create([
            'project_id' => $project->id,
            'title' => 'Белсенді емес жол картасы',
            'assigned_to' => $executor->id,
            'created_by' => $admin->id,
            'due_date' => $dueDate,
            'status' => 'new',
            'approval_status' => 'approved',
        ]);
    }

    $this->artisan('tasks:notify-overdue')->assertSuccessful();
    $this->artisan('assistant:notify')->assertSuccessful();

    expect(TaskNotification::query()->whereIn('type', ['task_due_soon', 'task_overdue'])->count())
        ->toBe(0);
});

test('historical planned roadmap tasks do not affect executor KPI or assistant context', function () {
    $admin = plannedAccessUser('superadmin');
    $executor = plannedAccessUser('ispolnitel');
    $project = plannedAccessProject($admin);
    ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Бұрынғы жол картасының тапсырмасы',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'due_date' => today()->subDay(),
        'status' => 'new',
        'approval_status' => 'approved',
    ]);

    $users = User::query()->whereKey($executor->id)->get();
    $kpi = app(BaskarmaKpiService::class)->calculateMany($users)->get($executor->id);
    $context = app(ChatContextService::class)->buildContext('', ['tasks'], $executor);

    expect($kpi['stats']['total'])->toBe(0)
        ->and($kpi['stats']['overdue'])->toBe(0)
        ->and($context['tasks'])->toBe([]);

    $project->update(['status' => 'implementation']);
    $kpi = app(BaskarmaKpiService::class)->calculateMany($users)->get($executor->id);
    $context = app(ChatContextService::class)->buildContext('', ['tasks'], $executor);

    expect($kpi['stats']['total'])->toBe(1)
        ->and($kpi['stats']['overdue'])->toBe(1)
        ->and($context['tasks'])->toHaveCount(1);
});

test('planned project pages expose attraction history and role-specific management permissions', function (string $roleName, bool $canManage) {
    $user = plannedAccessUser($roleName);
    $project = plannedAccessProject($user);
    $activity = $project->attractionActivities()->create([
        'attraction_stage' => 'negotiation',
        'event_name' => 'Инвестормен кездесу',
        'event_date' => today()->toDateString(),
        'result' => 'Ұсыныстар талқыланды',
        'next_action' => 'Келесі келіссөзді өткізу',
        'next_action_due_date' => today()->addWeek()->toDateString(),
        'responsible_id' => $user->id,
        'created_by' => $user->id,
    ]);
    ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Көрсетілмейтін бұрынғы тапсырма',
        'assigned_to' => $user->id,
        'created_by' => $user->id,
        'status' => 'new',
        'approval_status' => 'approved',
    ]);

    $this->actingAs($user)
        ->get(route('investment-projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/show')
            ->where('canManageAttraction', $canManage)
            ->has('project.tasks', 0)
            ->has('project.attraction_activities', 1)
            ->where('project.attraction_activities.0.id', $activity->id)
            ->where('project.attraction_activities.0.responsible.id', $user->id)
            ->where('passportSummary.workflow', 'attraction')
            ->where('passportSummary.tasks.total', 0)
            ->where('passportSummary.next_milestone.title', $activity->next_action)
            ->has('attractionResponsibleUsers', $canManage ? 1 : 0));
})->with([
    'superadmin' => ['superadmin', true],
    'invest curator' => ['invest', true],
    'moderator' => ['moderator', true],
    'involved executor' => ['ispolnitel', false],
    'akim' => ['akim', false],
    'zamakim' => ['zamakim', false],
    'prokuror' => ['prokuror', false],
]);

test('unrelated executors cannot see planned attraction history or next actions', function () {
    $admin = plannedAccessUser('superadmin');
    $executor = plannedAccessUser('ispolnitel');
    $project = plannedAccessProject($admin);
    $project->attractionActivities()->create([
        'attraction_stage' => 'negotiation',
        'event_name' => 'Жабық келіссөз',
        'next_action' => 'Құпия келісімді талқылау',
        'next_action_due_date' => today()->addWeek()->toDateString(),
        'responsible_id' => $admin->id,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($executor)
        ->get(route('investment-projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('isInvolved', false)
            ->where('canManageAttraction', false)
            ->has('project.attraction_activities', 0)
            ->has('project.tasks', 0)
            ->has('attractionResponsibleUsers', 0)
            ->where('passportSummary.next_milestone', null));
});

test('company investors see planned attraction history with read-only permissions', function () {
    $admin = plannedAccessUser('superadmin');
    $investor = plannedAccessUser('investor');
    $project = plannedAccessProject($admin);
    $company = Company::factory()->create(['region_id' => $project->region_id]);
    $project->update(['company_id' => $company->id]);
    $investor->update(['company_id' => $company->id]);
    $activity = $project->attractionActivities()->create([
        'attraction_stage' => 'negotiation',
        'event_name' => 'Компания инвесторымен кездесу',
        'next_action' => 'Шарттарды келісу',
        'next_action_due_date' => today()->addWeek()->toDateString(),
        'responsible_id' => $admin->id,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($investor)
        ->get(route('investment-projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('isInvolved', true)
            ->where('canManageAttraction', false)
            ->has('project.attraction_activities', 1)
            ->where('project.attraction_activities.0.id', $activity->id)
            ->has('attractionResponsibleUsers', 0)
            ->has('project.tasks', 0));
});

test('status transitions restore the roadmap while retaining attraction history', function () {
    $admin = plannedAccessUser('superadmin');
    $project = plannedAccessProject($admin);
    $activity = $project->attractionActivities()->create([
        'attraction_stage' => 'agreements',
        'next_action' => 'Сүйемелдеуге беру',
        'next_action_due_date' => today()->addWeek()->toDateString(),
        'responsible_id' => $admin->id,
        'created_by' => $admin->id,
    ]);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Іске асыру жол картасы',
        'assigned_to' => $admin->id,
        'created_by' => $admin->id,
        'status' => 'new',
        'approval_status' => 'approved',
    ]);

    $project->update(['status' => 'implementation']);
    $this->actingAs($admin)
        ->get(route('investment-projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManageAttraction', false)
            ->where('passportSummary.workflow', 'roadmap')
            ->has('project.tasks', 1)
            ->where('project.tasks.0.id', $task->id));

    $project->update(['status' => 'plan']);
    $this->get(route('investment-projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManageAttraction', true)
            ->where('passportSummary.workflow', 'attraction')
            ->has('project.tasks', 0)
            ->has('project.attraction_activities', 1)
            ->where('project.attraction_activities.0.id', $activity->id));
    expect($task->fresh())->not->toBeNull();
});
