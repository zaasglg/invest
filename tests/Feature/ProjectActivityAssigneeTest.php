<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\ProjectAttractionService;
use App\Services\ProjectExecutorAssignmentService;
use App\Services\ProjectTaskAssigneeService;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function activityAssigneeUser(string $role, array $attributes = []): User
{
    return User::factory()->create([
        'role' => $role === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => Role::firstOrCreate(['name' => $role], ['display_name' => $role])->id,
        ...$attributes,
    ]);
}

function activityAssigneeRegion(): Region
{
    return Region::create(['name' => 'Орындаушы ауданы', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
}

function activityAssigneeFixture(): array
{
    $manager = activityAssigneeUser('superadmin');
    $region = activityAssigneeRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);
    $project = InvestmentProject::create([
        'name' => 'Тағайындау жобасы', 'status' => 'plan', 'region_id' => $region->id,
        'company_id' => $company->id, 'created_by' => $manager->id,
    ]);
    $project->curators()->attach($manager);

    return [$manager, $project];
}

function activityAssigneePayload(User $assignee): array
{
    return [
        'next_action' => 'Инвестормен кездесу', 'description' => 'Жоба ұсынысын талқылау',
        'next_action_due_date' => today()->addWeek()->toDateString(), 'responsible_id' => $assignee->id,
    ];
}

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
});

test('attraction and roadmap offer all executors and only eligible project investors', function () {
    [$manager, $project] = activityAssigneeFixture();
    $foreignDistrict = activityAssigneeUser('ispolnitel', [
        'baskarma_type' => 'district', 'region_id' => activityAssigneeRegion()->id,
    ]);
    $department = activityAssigneeUser('ispolnitel', ['baskarma_type' => 'oblast']);
    $investor = activityAssigneeUser('investor', ['company_id' => $project->company_id]);
    activityAssigneeUser('investor');
    activityAssigneeUser('investor', ['company_id' => Company::factory()->create()->id]);
    $service = app(ProjectTaskAssigneeService::class);
    $expected = collect([$foreignDistrict->id, $department->id, $investor->id])->sort()->values()->all();

    expect($service->query($project->id)->pluck('id')->sort()->values()->all())->toBe($expected)
        ->and(app(ProjectAttractionService::class)->responsibleUsers($project, $manager)->pluck('id')->sort()->values()->all())->toBe($expected);

    $this->actingAs($manager)->get(route('investment-projects.show', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('users', fn ($users) => collect($users)->pluck('id')->sort()->values()->all() === $expected)
            ->where('attractionResponsibleUsers', fn ($users) => collect($users)->pluck('id')->sort()->values()->all() === $expected));
});

test('assigning an unattached district executor adds only that person to participants and sends the task', function () {
    [$manager, $project] = activityAssigneeFixture();
    $executor = activityAssigneeUser('ispolnitel', ['baskarma_type' => 'district', 'region_id' => activityAssigneeRegion()->id]);
    $unassigned = activityAssigneeUser('ispolnitel', ['baskarma_type' => 'oblast']);
    expect($project->executors()->exists())->toBeFalse();

    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), activityAssigneePayload($executor))
        ->assertRedirect()->assertSessionHasNoErrors();

    $activity = $project->attractionActivities()->sole();
    expect($project->executors()->sole()->id)->toBe($executor->id)
        ->and($project->executors()->sole()->pivot->assignment_source)->toBe('task')
        ->and($unassigned->isInvolvedInProject($project))->toBeFalse()
        ->and(app(ProjectAttractionService::class)->canReport($executor, $project, $activity))->toBeTrue()
        ->and(TaskNotification::where('attraction_activity_id', $activity->id)->where('user_id', $executor->id)->where('type', 'attraction_assigned')->count())->toBe(1);
});

test('activity reassignment releases only unused task participation and deletion preserves manual participants', function () {
    [$manager, $project] = activityAssigneeFixture();
    $original = activityAssigneeUser('ispolnitel');
    $replacement = activityAssigneeUser('ispolnitel');
    $project->executors()->attach($replacement, ['assignment_source' => 'manual']);
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), activityAssigneePayload($original))
        ->assertSessionHasNoErrors();
    $activity = $project->attractionActivities()->sole();

    $this->put(route('investment-projects.attraction-activities.update', [$project, $activity]), activityAssigneePayload($replacement))
        ->assertSessionHasNoErrors();
    expect($project->executors()->whereKey($original->id)->exists())->toBeFalse()
        ->and($project->executors()->whereKey($replacement->id)->sole()->pivot->assignment_source)->toBe('manual');

    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activity]))->assertRedirect();
    expect($project->executors()->whereKey($replacement->id)->exists())->toBeTrue();
});

test('a completed activity keeps its executor participant during task cleanup', function () {
    [$manager, $project] = activityAssigneeFixture();
    $executor = activityAssigneeUser('ispolnitel');
    $project->attractionActivities()->create([
        ...activityAssigneePayload($executor), 'attraction_stage' => 'potential',
        'status' => 'completed', 'created_by' => $manager->id,
    ]);
    $assignments = app(ProjectExecutorAssignmentService::class);
    $assignments->assignTaskExecutor($project, $executor->id);
    $assignments->releaseTaskAssignment($project, $executor->id);
    expect($project->executors()->whereKey($executor->id)->exists())->toBeTrue()
        ->and($executor->canDownloadFromProject($project))->toBeTrue();
});

test('activity assignment keeps company investors outside the executor pivot', function () {
    [$manager, $project] = activityAssigneeFixture();
    $investor = activityAssigneeUser('investor', ['company_id' => $project->company_id]);
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), activityAssigneePayload($investor))
        ->assertSessionHasNoErrors();

    expect($project->executors()->whereKey($investor->id)->exists())->toBeFalse()
        ->and($project->investors()->whereKey($investor->id)->exists())->toBeTrue()
        ->and(app(ProjectAttractionService::class)->canReport($investor, $project, $project->attractionActivities()->sole()))->toBeTrue();
});

test('legacy manager activity assignments remain editable but cannot be selected for new work', function () {
    [$manager, $project] = activityAssigneeFixture();
    $anotherManager = activityAssigneeUser('superadmin');
    $legacy = $project->attractionActivities()->create([
        ...activityAssigneePayload($manager), 'attraction_stage' => 'potential',
        'status' => 'planned', 'created_by' => $manager->id,
    ]);
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), activityAssigneePayload($manager))
        ->assertSessionHasErrors('responsible_id');
    $this->put(route('investment-projects.attraction-activities.update', [$project, $legacy]), [
        ...activityAssigneePayload($manager), 'description' => 'Бұрынғы тапсырманың жаңа сипаттамасы',
    ])->assertSessionHasNoErrors();
    expect($legacy->fresh()->description)->toBe('Бұрынғы тапсырманың жаңа сипаттамасы');
    $this->put(route('investment-projects.attraction-activities.update', [$project, $legacy]), activityAssigneePayload($anotherManager))
        ->assertSessionHasErrors('responsible_id');
});

test('project edits retain a district executor attached through an activity while rejecting a new foreign participant', function () {
    [$manager, $project] = activityAssigneeFixture();
    $executor = activityAssigneeUser('ispolnitel', ['baskarma_type' => 'district', 'region_id' => activityAssigneeRegion()->id]);
    $outsider = activityAssigneeUser('ispolnitel', ['baskarma_type' => 'district', 'region_id' => activityAssigneeRegion()->id]);
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), activityAssigneePayload($executor))
        ->assertSessionHasNoErrors();
    $payload = [
        'name' => $project->name, 'region_id' => $project->region_id, 'status' => 'plan',
        'company_id' => $project->company_id, 'executor_ids' => [$executor->id],
        'total_investment' => 1000,
    ];
    $this->put(route('investment-projects.update', $project), $payload)->assertSessionHasNoErrors();
    expect($project->executors()->whereKey($executor->id)->exists())->toBeTrue();
    $this->put(route('investment-projects.update', $project), [...$payload, 'executor_ids' => [$executor->id, $outsider->id]])
        ->assertSessionHasErrors('executor_ids.1');
});
