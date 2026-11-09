<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use App\Support\ProjectAttractionStages;
use Inertia\Testing\AssertableInertia as Assert;

function attractionWorkflowUser(string $roleName, array $attributes = []): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
        ...$attributes,
    ]);
}

function attractionWorkflowProject(User $creator): InvestmentProject
{
    $oblast = Region::create([
        'name' => 'Attraction test oblast',
        'type' => 'oblast',
        'color' => '#123456',
        'icon' => 'factory',
    ]);
    $district = Region::create([
        'name' => 'Attraction test district',
        'type' => 'district',
        'parent_id' => $oblast->id,
        'color' => '#123456',
        'icon' => 'factory',
    ]);
    $company = Company::factory()->create(['region_id' => $district->id]);
    $type = ProjectType::create(['name' => 'Attraction project type']);
    $project = InvestmentProject::create([
        'name' => 'Attraction workflow project',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $district->id,
        'project_type_id' => $type->id,
        'total_investment' => 3000000000,
        'status' => 'plan',
        'attraction_stage' => 'potential',
        'created_by' => $creator->id,
    ]);
    $project->projectTypes()->attach($type);
    $project->curators()->attach($creator);

    return $project;
}

function attractionWorkflowProjectPayload(InvestmentProject $project, array $overrides = []): array
{
    return [
        'name' => 'Saved attraction project',
        'company_id' => $project->company_id,
        'region_id' => $project->region_id,
        'project_type_ids' => [$project->project_type_id],
        'total_investment' => 3000000000,
        'status' => 'plan',
        ...$overrides,
    ];
}

function attractionWorkflowActivityPayload(User $responsible, array $overrides = []): array
{
    return [
        'attraction_stage' => 'negotiation',
        'event_name' => null,
        'event_date' => null,
        'result' => null,
        'next_action' => 'Инвестормен кездесуді ұйымдастыру',
        'next_action_due_date' => now()->addWeek()->toDateString(),
        'responsible_id' => $responsible->id,
        ...$overrides,
    ];
}

function attractionWorkflowStageDetails(?string $stage): array
{
    return match ($stage) {
        'handover' => [
            'attraction_handover_to_id' => attractionWorkflowUser('superadmin')->id,
        ],
        'declined' => [
            'attraction_decline_reason' => 'Инвестор қаржыландырудан бас тартты',
        ],
        'paused' => [
            'attraction_resume_on' => today()->addWeek()->toDateString(),
        ],
        default => [],
    };
}

test('project create and update accept attraction stages and default omitted legacy values', function (?string $stage) {
    $manager = attractionWorkflowUser('superadmin');
    $existing = attractionWorkflowProject($manager);
    $stagePayload = $stage === null ? [] : [
        'attraction_stage' => $stage,
        ...attractionWorkflowStageDetails($stage),
    ];
    $payload = attractionWorkflowProjectPayload($existing, $stagePayload);

    $this->actingAs($manager)->post(route('investment-projects.store'), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('investment-projects.index'));

    $project = InvestmentProject::where('name', $payload['name'])->sole();
    expect($project->attraction_stage)->toBe($stage ?? 'potential');

    $this->put(route('investment-projects.update', $project), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('investment-projects.show', $project));

    expect($project->fresh()->attraction_stage)->toBe($stage ?? 'potential');

    $this->put(route('investment-projects.update', $project), [
        ...$payload,
        'attraction_stage' => 'agreements',
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect($project->fresh()->attraction_stage)->toBe('agreements');
})->with([null, ...array_keys(ProjectAttractionStages::LABELS)]);

test('project creation and editing reject unknown attraction stages', function () {
    $manager = attractionWorkflowUser('superadmin');
    $project = attractionWorkflowProject($manager);
    $payload = attractionWorkflowProjectPayload($project, ['attraction_stage' => 'unknown-stage']);

    $this->actingAs($manager)->post(route('investment-projects.store'), $payload)
        ->assertSessionHasErrors('attraction_stage');
    $this->put(route('investment-projects.update', $project), $payload)
        ->assertSessionHasErrors('attraction_stage');

    expect(InvestmentProject::count())->toBe(1)
        ->and($project->fresh()->attraction_stage)->toBe('potential');
});

test('project managers manage attraction definitions without changing the project stage', function (string $roleName) {
    $manager = attractionWorkflowUser($roleName);
    $responsible = attractionWorkflowUser('ispolnitel');
    $project = attractionWorkflowProject($manager);
    $payload = attractionWorkflowActivityPayload($responsible);

    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();

    $activity = $project->attractionActivities()->sole();
    expect($activity->created_by)->toBe($manager->id)
        ->and($activity->responsible_id)->toBe($responsible->id)
        ->and($activity->event_name)->toBeNull()
        ->and($activity->attraction_stage)->toBe('potential')
        ->and($activity->status)->toBe('planned')
        ->and($project->fresh()->attraction_stage)->toBe('potential');

    $this->put(route('investment-projects.attraction-activities.update', [$project, $activity]), [
        ...$payload,
        'attraction_stage' => 'conditions',
        'event_name' => 'Инвестормен кездесу',
        'event_date' => now()->subDay()->toDateString(),
        'result' => 'Жобаның негізгі шарттары талқыланды',
        'description' => 'Кездесуге ұсыныстарды дайындау',
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect($activity->fresh()->result)->toBeNull()
        ->and($activity->fresh()->event_name)->toBeNull()
        ->and($activity->fresh()->description)->toBe('Кездесуге ұсыныстарды дайындау')
        ->and($activity->fresh()->attraction_stage)->toBe('potential')
        ->and($project->fresh()->attraction_stage)->toBe('potential');

    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activity]))
        ->assertRedirect();

    expect($project->attractionActivities()->count())->toBe(0)
        ->and(KpiLog::where('project_id', $project->id)->orderBy('id')->pluck('event')->all())->toBe([
            'attraction.created',
            'attraction.updated',
            'attraction.deleted',
        ]);
})->with(['superadmin', 'invest', 'moderator']);

test('attraction activities require a next action deadline and responsible person', function () {
    $manager = attractionWorkflowUser('superadmin');
    $project = attractionWorkflowProject($manager);

    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), [
        ...attractionWorkflowActivityPayload($manager),
        'next_action' => '',
        'next_action_due_date' => '',
        'responsible_id' => null,
        'attraction_stage' => 'unknown-stage',
    ])->assertSessionHasErrors([
        'next_action', 'next_action_due_date', 'responsible_id',
    ]);

    expect($project->attractionActivities()->count())->toBe(0)
        ->and($project->fresh()->attraction_stage)->toBe('potential');
});

test('legacy event inputs cannot write a completed event through the definition form', function (array $event) {
    $manager = attractionWorkflowUser('superadmin');
    $responsible = attractionWorkflowUser('ispolnitel');
    $project = attractionWorkflowProject($manager);

    $this->actingAs($manager)->post(
        route('investment-projects.attraction-activities.store', $project),
        attractionWorkflowActivityPayload($responsible, $event)
    )->assertSessionHasNoErrors()->assertRedirect();

    $activity = $project->attractionActivities()->sole();
    expect($activity->event_name)->toBeNull()
        ->and($activity->event_date)->toBeNull()
        ->and($activity->result)->toBeNull();
})->with([
    'name alone' => [['event_name' => 'Кездесу']],
    'date alone' => [['event_date' => '2026-01-01']],
    'result alone' => [['result' => 'Шарттар талқыланды']],
    'future completed event' => [[
        'event_name' => 'Кездесу',
        'event_date' => '2099-01-01',
        'result' => 'Шарттар талқыланды',
    ]],
]);

test('assigning a new executor adds project participation and company investors remain assignable', function () {
    $manager = attractionWorkflowUser('superadmin');
    $project = attractionWorkflowProject($manager);
    $executor = attractionWorkflowUser('ispolnitel');
    $investor = attractionWorkflowUser('investor', ['company_id' => $project->company_id]);

    $this->actingAs($manager)->post(
        route('investment-projects.attraction-activities.store', $project),
        attractionWorkflowActivityPayload($executor)
    )->assertSessionHasNoErrors()->assertRedirect();
    expect($project->executors()->whereKey($executor->id)->exists())->toBeTrue();
    $this->post(
        route('investment-projects.attraction-activities.store', $project),
        attractionWorkflowActivityPayload($investor)
    )->assertSessionHasNoErrors()->assertRedirect();

    expect($project->attractionActivities()->orderBy('id')->pluck('responsible_id')->sort()->values()->all())
        ->toBe(collect([$executor->id, $investor->id])->sort()->values()->all());
});

test('attraction activities cannot be edited or deleted through another project', function () {
    $manager = attractionWorkflowUser('superadmin');
    $project = attractionWorkflowProject($manager);
    $otherProject = attractionWorkflowProject($manager);
    $activity = $otherProject->attractionActivities()->create([
        ...attractionWorkflowActivityPayload($manager),
        'created_by' => $manager->id,
    ]);

    $this->actingAs($manager)->put(
        route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionWorkflowActivityPayload($manager, ['next_action' => 'Unauthorized change'])
    )->assertNotFound();
    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activity]))
        ->assertNotFound();

    expect($activity->fresh()->next_action)->toBe('Инвестормен кездесуді ұйымдастыру');
});

test('nonmanager roles cannot write attraction activities even when assigned', function (string $roleName) {
    $manager = attractionWorkflowUser('superadmin');
    $project = attractionWorkflowProject($manager);
    $user = attractionWorkflowUser($roleName, ['company_id' => $project->company_id]);
    $project->executors()->attach($user);
    $activity = $project->attractionActivities()->create([
        ...attractionWorkflowActivityPayload($user),
        'created_by' => $manager->id,
    ]);

    $this->actingAs($user)->post(
        route('investment-projects.attraction-activities.store', $project),
        attractionWorkflowActivityPayload($user)
    )->assertForbidden();
    $this->put(
        route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionWorkflowActivityPayload($user)
    )->assertForbidden();
    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activity]))
        ->assertForbidden();

    expect($project->attractionActivities()->count())->toBe(1);
})->with(['akim', 'zamakim', 'prokuror', 'ispolnitel', 'investor']);

test('scoped managers cannot manage another curators project', function (string $roleName) {
    $owner = attractionWorkflowUser('superadmin');
    $project = attractionWorkflowProject($owner);
    $manager = attractionWorkflowUser($roleName);

    $this->actingAs($manager)->post(
        route('investment-projects.attraction-activities.store', $project),
        attractionWorkflowActivityPayload($manager)
    )->assertForbidden();

    expect($project->attractionActivities()->count())->toBe(0);
})->with(['invest', 'moderator']);

test('editing older attraction history preserves its stage snapshot and the project stage', function () {
    $manager = attractionWorkflowUser('superadmin');
    $responsible = attractionWorkflowUser('ispolnitel');
    $project = attractionWorkflowProject($manager);
    $project->update([
        'attraction_decline_reason' => 'Алдыңғы ұсыныстан инвестор бас тартқан',
    ]);
    $payload = attractionWorkflowActivityPayload($responsible);

    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();
    $older = $project->attractionActivities()->sole();
    $project->update(['attraction_stage' => 'agreements']);
    $this->post(route('investment-projects.attraction-activities.store', $project), [
        ...$payload,
        'attraction_stage' => 'agreements',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $this->put(route('investment-projects.attraction-activities.update', [$project, $older]), [
        ...$payload,
        'attraction_stage' => 'declined',
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect($older->fresh()->attraction_stage)->toBe('potential')
        ->and($project->fresh()->attraction_stage)->toBe('agreements');
});

test('switching out of plan clears its stage but preserves and locks attraction history', function () {
    $manager = attractionWorkflowUser('superadmin');
    $responsible = attractionWorkflowUser('ispolnitel');
    $project = attractionWorkflowProject($manager);
    $payload = attractionWorkflowActivityPayload($responsible);

    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();
    $activity = $project->attractionActivities()->sole();
    $activity->update(['status' => 'completed']);
    $receiver = attractionWorkflowUser('superadmin');
    $project->update([
        'attraction_stage' => 'handover',
        'attraction_handover_to_id' => $receiver->id,
        'attraction_handover_requested_at' => now(),
    ]);
    $this->actingAs($receiver)->post(route('investment-projects.attraction-handover.accept', $project))
        ->assertRedirect();
    $this->actingAs($manager);

    $this->put(route('investment-projects.update', $project), attractionWorkflowProjectPayload($project, [
        'status' => 'implementation',
        'attraction_stage' => 'negotiation',
    ]))->assertSessionHasNoErrors()->assertRedirect();

    expect($project->fresh()->attraction_stage)->toBeNull()
        ->and($activity->fresh()->attraction_stage)->toBe('potential');

    $this->post(route('investment-projects.attraction-activities.store', $project), $payload)->assertStatus(409);
    $this->put(route('investment-projects.attraction-activities.update', [$project, $activity]), $payload)
        ->assertStatus(409);
    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activity]))
        ->assertStatus(409);

    expect($project->attractionActivities()->count())->toBe(1);

    $this->put(route('investment-projects.update', $project), attractionWorkflowProjectPayload($project))
        ->assertSessionHasNoErrors()->assertRedirect();

    expect($project->fresh()->status)->toBe('plan')
        ->and($project->fresh()->attraction_stage)->toBe('potential')
        ->and($project->attractionActivities()->count())->toBe(1);
});

test('deleting any attraction activity leaves the project stage unchanged', function () {
    $manager = attractionWorkflowUser('superadmin');
    $responsible = attractionWorkflowUser('ispolnitel');
    $project = attractionWorkflowProject($manager);
    $payload = attractionWorkflowActivityPayload($responsible);

    $this->actingAs($manager);

    foreach (['negotiation', 'conditions', 'agreements'] as $stage) {
        $project->update(['attraction_stage' => $stage]);
        $this->post(route('investment-projects.attraction-activities.store', $project), [
            ...$payload,
            'attraction_stage' => $stage,
        ])->assertSessionHasNoErrors()->assertRedirect();
    }

    $activities = $project->attractionActivities()->reorder()->latest('id')->get();
    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activities[2]]))
        ->assertRedirect();
    expect($project->fresh()->attraction_stage)->toBe('agreements');

    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activities[0]]))
        ->assertRedirect();
    expect($project->fresh()->attraction_stage)->toBe('agreements');

    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activities[1]]))
        ->assertRedirect();
    expect($project->fresh()->attraction_stage)->toBe('agreements')
        ->and($project->attractionActivities()->count())->toBe(0);
});

test('attraction activities stay in insertion order after edits and status changes', function () {
    $manager = attractionWorkflowUser('superadmin');
    $responsible = attractionWorkflowUser('ispolnitel');
    $project = attractionWorkflowProject($manager);
    $this->actingAs($manager);

    foreach (['negotiation', 'conditions', 'agreements'] as $stage) {
        $project->update(['attraction_stage' => $stage]);
        $this->post(route('investment-projects.attraction-activities.store', $project),
            attractionWorkflowActivityPayload($responsible, ['attraction_stage' => $stage]))
            ->assertSessionHasNoErrors()->assertRedirect();
    }

    $activities = $project->attractionActivities()->get();
    expect($activities->pluck('attraction_stage')->all())
        ->toBe(['negotiation', 'conditions', 'agreements']);

    $this->put(route('investment-projects.attraction-activities.update', [$project, $activities[0]]),
        attractionWorkflowActivityPayload($responsible, [
            'next_action' => 'Бірінші енгізілген іс-шараның жаңартылған атауы',
        ]))->assertSessionHasNoErrors()->assertRedirect();

    foreach (['plan', 'implementation'] as $status) {
        $project->update(['status' => $status]);
        $this->get(route('investment-projects.show', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('project.attraction_activities', 3)
                ->where('project.attraction_activities.0.id', $activities[0]->id)
                ->where('project.attraction_activities.1.id', $activities[1]->id)
                ->where('project.attraction_activities.2.id', $activities[2]->id));
    }
});
