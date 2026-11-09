<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectTask;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskCompletion;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\ProjectAttractionHandoverService;
use App\Services\ProjectAttractionService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

function hardenedWorkflowUser(string $role, array $attributes = []): User
{
    return User::factory()->create([
        'role' => $role === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => Role::firstOrCreate(['name' => $role], ['display_name' => $role])->id,
        ...$attributes,
    ]);
}

function hardenedWorkflowProject(User $manager, string $status = 'implementation'): InvestmentProject
{
    $region = Region::create(['name' => 'Жұмыс тәртібі ауданы', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
    $project = InvestmentProject::create([
        'name' => 'Тексерілетін жоба', 'region_id' => $region->id,
        'status' => $status, 'created_by' => $manager->id,
    ]);
    $project->curators()->attach($manager);

    return $project;
}

function hardenedWorkflowTask(InvestmentProject $project, User $responsible, array $attributes = []): ProjectTask
{
    $project->executors()->syncWithoutDetaching([$responsible->id]);

    return ProjectTask::create([
        'project_id' => $project->id, 'title' => 'Бастапқы тапсырма',
        'assigned_to' => $responsible->id, 'created_by' => $project->created_by,
        'status' => 'new', 'approval_status' => 'approved',
        ...$attributes,
    ]);
}

beforeEach(function () {
    Storage::fake('local');
    Http::preventStrayRequests();
    Http::fake();
});

test('ordinary managers cannot change or delete protected roadmap definitions', function (string $approval, string $status) {
    $manager = hardenedWorkflowUser('invest');
    $executor = hardenedWorkflowUser('ispolnitel');
    $project = hardenedWorkflowProject($manager);
    $task = hardenedWorkflowTask($project, $executor, ['approval_status' => $approval, 'status' => $status]);

    $this->actingAs($manager)->put(route('investment-projects.tasks.update', [$project, $task]), ['title' => 'Басқа тапсырма'])
        ->assertSessionHasErrors('title');
    $this->delete(route('investment-projects.tasks.destroy', [$project, $task]))->assertForbidden();
    expect($task->fresh()->title)->toBe('Бастапқы тапсырма');
})->with([
    'awaiting approval' => ['pending', 'new'],
    'approved' => ['approved', 'new'],
    'completed' => ['approved', 'done'],
]);

test('administrative edits reopen completed tasks while preserving versioned evidence and notifying reassignment', function () {
    $admin = hardenedWorkflowUser('superadmin');
    $first = hardenedWorkflowUser('ispolnitel');
    $next = hardenedWorkflowUser('ispolnitel');
    $project = hardenedWorkflowProject($admin);
    $task = hardenedWorkflowTask($project, $first, ['status' => 'done']);
    $report = TaskCompletion::create([
        'task_id' => $task->id, 'task_definition_version' => 1,
        'submitted_by' => $first->id, 'status' => 'approved',
        'comment' => 'Бастапқы жұмыс орындалды', 'reviewed_by' => $admin->id,
    ]);

    $this->actingAs($admin)->put(route('investment-projects.tasks.update', [$project, $task]), [
        'title' => 'Жаңа жұмыс мазмұны', 'assigned_to' => $next->id,
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect($task->fresh()->status)->toBe('new')
        ->and($task->fresh()->definition_version)->toBe(2)
        ->and($report->fresh()->status)->toBe('approved')
        ->and($report->fresh()->task_definition_version)->toBe(1)
        ->and(TaskNotification::where('task_id', $task->id)->where('user_id', $next->id)->where('type', 'task_assigned')->count())->toBe(1)
        ->and(KpiLog::where('event', 'task.reopened')->sole()->properties['before']['title'])->toBe('Бастапқы тапсырма');
    $this->delete(route('investment-projects.tasks.destroy', [$project, $task]))->assertStatus(409);
});

test('revising a moderated task cancels stale pending review and requires new moderator approval', function () {
    $admin = hardenedWorkflowUser('superadmin');
    $creator = hardenedWorkflowUser('invest', ['invest_sub_role' => 'turkistan_invest']);
    $moderator = hardenedWorkflowUser('moderator');
    $executor = hardenedWorkflowUser('ispolnitel');
    $project = hardenedWorkflowProject($creator);
    $task = hardenedWorkflowTask($project, $executor, ['status' => 'in_progress']);
    $report = TaskCompletion::create([
        'task_id' => $task->id, 'submitted_by' => $executor->id,
        'task_definition_version' => 1, 'status' => 'pending',
    ]);

    $this->actingAs($admin)->put(route('investment-projects.tasks.update', [$project, $task]), ['description' => 'Жаңа талап'])
        ->assertSessionHasNoErrors()->assertRedirect();
    expect($task->fresh()->approval_status)->toBe('pending')
        ->and($task->fresh()->approved_by)->toBeNull()
        ->and($report->fresh()->status)->toBe('rejected')
        ->and(TaskNotification::where('task_id', $task->id)->where('user_id', $executor->id)->count())->toBe(0)
        ->and(TaskNotification::where('task_id', $task->id)->where('user_id', $moderator->id)->where('type', 'task_pending_approval')->count())->toBe(1);
    $this->put(route('investment-projects.tasks.completions.review', [$project, $task, $report]), ['status' => 'approved'])
        ->assertStatus(409);
    $this->actingAs($moderator)->post(route('investment-projects.tasks.approve', [$project, $task]))->assertRedirect();
    expect(TaskNotification::where('task_id', $task->id)->where('user_id', $executor->id)->where('type', 'task_assigned')->count())->toBe(1);
});

test('roadmap rejection requires actionable feedback', function () {
    $admin = hardenedWorkflowUser('superadmin');
    $executor = hardenedWorkflowUser('ispolnitel');
    $project = hardenedWorkflowProject($admin);
    $task = hardenedWorkflowTask($project, $executor, ['status' => 'in_progress']);
    $report = TaskCompletion::create(['task_id' => $task->id, 'submitted_by' => $executor->id, 'status' => 'pending']);

    $this->actingAs($admin)->put(route('investment-projects.tasks.completions.review', [$project, $task, $report]), ['status' => 'rejected'])
        ->assertSessionHasErrors('reviewer_comment');
    expect($report->fresh()->status)->toBe('pending');
});

test('planning status transitions still count outstanding work but do not require a handover', function () {
    $admin = hardenedWorkflowUser('superadmin');
    $project = hardenedWorkflowProject($admin, 'plan');
    $activity = $project->attractionActivities()->create([
        'attraction_stage' => 'potential', 'next_action' => 'Кездесу',
        'next_action_due_date' => today()->addDay(), 'responsible_id' => $admin->id,
        'created_by' => $admin->id, 'status' => 'pending_review',
    ]);
    $service = app(ProjectAttractionHandoverService::class);
    try {
        $service->prepare(['status' => 'suspended'], $admin, $project);
        $this->fail('Pending work must block transition.');
    } catch (ValidationException $exception) {
        expect($exception->errors()['status'][0])->toContain('Тексеруді күткен есеп: 1');
    }
    $activity->update(['status' => 'completed']);
    $service->prepare(['status' => 'suspended'], $admin, $project);
    $project->update(['status' => 'suspended']);
    expect($project->fresh()->planning_started_at)->not->toBeNull();
    expect($service->prepare(['status' => 'implementation'], $admin, $project->fresh())['status'])->toBe('implementation');
    expect($project->fresh()->attraction_handover_accepted_at)->toBeNull();
});

test('only administrator can directly import an existing nonplanned project', function (string $status) {
    $admin = hardenedWorkflowUser('superadmin');
    $manager = hardenedWorkflowUser('invest');
    $service = app(ProjectAttractionHandoverService::class);
    expect(fn () => $service->prepare(['status' => $status], $manager))->toThrow(ValidationException::class);
    expect($service->prepare(['status' => $status], $admin)['status'])->toBe($status);
})->with(['implementation', 'launched', 'suspended']);

test('a suspended project cannot be created as a shortcut around the planning workflow', function () {
    $manager = hardenedWorkflowUser('invest');
    $admin = hardenedWorkflowUser('superadmin');
    $existing = hardenedWorkflowProject($manager);
    $company = Company::factory()->create(['region_id' => $existing->region_id]);
    $type = ProjectType::create(['name' => 'Тарихи жоба түрі']);
    $payload = [
        'name' => 'Тоқтатылған тарихи жоба', 'status' => 'suspended',
        'region_id' => $existing->region_id, 'company_id' => $company->id,
        'project_type_ids' => [$type->id], 'total_investment' => 1000000,
    ];

    $this->actingAs($manager)->post(route('investment-projects.store'), $payload)
        ->assertSessionHasErrors('status');
    expect(InvestmentProject::where('name', $payload['name'])->exists())->toBeFalse();
    $this->actingAs($admin)->post(route('investment-projects.store'), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();
    expect(InvestmentProject::where('name', $payload['name'])->sole()->planning_started_at)->toBeNull();
});

test('declining a project cannot conceal outstanding work through the activity editor', function () {
    $admin = hardenedWorkflowUser('superadmin');
    $executor = hardenedWorkflowUser('ispolnitel');
    $project = hardenedWorkflowProject($admin, 'plan');
    $project->update(['attraction_decline_reason' => 'Инвестор шешімі']);
    $data = [
        'attraction_stage' => 'declined', 'next_action' => 'Бас тартуды тіркеу',
        'next_action_due_date' => today()->toDateString(), 'responsible_id' => $executor->id,
    ];
    $this->actingAs($admin)->post(route('investment-projects.attraction-activities.store', $project), $data)
        ->assertSessionHasNoErrors()->assertRedirect();
    expect($project->attractionActivities()->count())->toBe(1)
        ->and($project->fresh()->attraction_stage)->toBe('potential');
    $this->post(route('investment-projects.attraction-activities.store', $project), [...$data, 'status' => 'cancelled'])
        ->assertSessionHasNoErrors()->assertRedirect();
    expect($project->fresh()->attraction_stage)->toBe('potential')
        ->and($project->attractionActivities()->pluck('status')->all())->toBe(['planned', 'planned']);
    expect(fn () => app(ProjectAttractionHandoverService::class)->prepare([
        'status' => 'plan', 'attraction_stage' => 'declined',
    ], $admin, $project->fresh()))->toThrow(ValidationException::class);
});

test('attraction reports notify eligible reviewers and review results notify the responsible person', function () {
    $manager = hardenedWorkflowUser('invest');
    $executor = hardenedWorkflowUser('ispolnitel');
    $unrelated = hardenedWorkflowUser('invest');
    $project = hardenedWorkflowProject($manager, 'plan');
    $project->executors()->attach($executor);
    $activity = $project->attractionActivities()->create([
        'attraction_stage' => 'potential', 'next_action' => 'Кездесу',
        'next_action_due_date' => today()->addDay(), 'responsible_id' => $executor->id,
        'created_by' => $manager->id, 'status' => 'planned',
    ]);
    $service = app(ProjectAttractionService::class);
    $service->report($executor, $project, $activity, [
        'status' => 'pending_review', 'report_result' => 'Келісім алынды',
        'documents' => [UploadedFile::fake()->create('agreement.pdf', 10, 'application/pdf')],
    ]);
    expect(TaskNotification::where('type', 'attraction_report_submitted')->where('user_id', $manager->id)->count())->toBe(1)
        ->and(TaskNotification::where('user_id', $unrelated->id)->count())->toBe(0);
    $service->review($manager, $project, $activity->fresh(), [
        'report_id' => $activity->reports()->sole()->id,
        'decision' => 'rejected', 'reviewer_comment' => 'Құжат нөмірін қосыңыз',
    ]);
    expect(TaskNotification::where('type', 'attraction_report_rejected')->where('user_id', $executor->id)->sole()->message)->toContain('Құжат нөмірін');
});

test('attraction responsibility excludes stale curators who cannot access the project', function () {
    $admin = hardenedWorkflowUser('superadmin');
    $project = hardenedWorkflowProject($admin, 'plan');
    $otherRegion = Region::create(['name' => 'Басқа аудан', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
    $staleCurator = hardenedWorkflowUser('invest', ['region_id' => $otherRegion->id]);
    $project->curators()->attach($staleCurator);
    expect(app(ProjectAttractionService::class)->responsibleUsers($project, $admin)->pluck('id')->all())
        ->not->toContain($staleCurator->id);

    $this->actingAs($admin)->post(route('investment-projects.attraction-activities.store', $project), [
        'attraction_stage' => 'potential', 'next_action' => 'Кездесу',
        'next_action_due_date' => today()->addDay()->toDateString(), 'responsible_id' => $staleCurator->id,
    ])->assertSessionHasErrors('responsible_id');
});

test('handover requests and acceptance notify participants only once', function () {
    $admin = hardenedWorkflowUser('superadmin');
    $recipient = hardenedWorkflowUser('superadmin');
    $project = hardenedWorkflowProject($admin, 'plan');
    $project->update([
        'attraction_stage' => 'handover', 'attraction_handover_to_id' => $recipient->id,
        'attraction_handover_requested_at' => now(),
    ]);
    $project->touch();
    expect(TaskNotification::where('type', 'attraction_handover_requested')->where('user_id', $recipient->id)->count())->toBe(1);
    app(ProjectAttractionHandoverService::class)->accept($recipient, $project->fresh());
    expect(TaskNotification::where('type', 'attraction_handover_accepted')->where('user_id', $admin->id)->count())->toBe(1);
});
