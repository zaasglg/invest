<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function planningFlowUser(string $roleName = 'superadmin'): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
    ]);
}

function planningFlowDistrict(): Region
{
    $oblast = Region::create([
        'name' => 'Planning flow oblast',
        'type' => 'oblast',
        'color' => '#123456',
        'icon' => 'factory',
    ]);

    return Region::create([
        'name' => 'Planning flow district',
        'type' => 'district',
        'parent_id' => $oblast->id,
        'color' => '#654321',
        'icon' => 'factory',
    ]);
}

function planningFlowProject(User $creator): InvestmentProject
{
    $district = planningFlowDistrict();
    $company = Company::factory()->create(['region_id' => $district->id]);
    $type = ProjectType::create(['name' => 'Planning project type']);
    $project = InvestmentProject::create([
        'name' => 'Planning flow project',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $district->id,
        'project_type_id' => $type->id,
        'total_investment' => '3500000000.50',
        'status' => 'plan',
        'attraction_stage' => 'potential',
        'created_by' => $creator->id,
    ]);
    $project->projectTypes()->attach($type);
    $project->curators()->attach($creator);

    return $project;
}

function planningFlowPayload(InvestmentProject $project, array $overrides = []): array
{
    return [
        'name' => $project->name,
        'company_id' => $project->company_id,
        'region_id' => $project->region_id,
        'project_type_ids' => $project->projectTypes()->pluck('project_types.id')->all(),
        'total_investment' => $project->total_investment,
        'status' => $project->status,
        'attraction_stage' => $project->attraction_stage,
        ...$overrides,
    ];
}

test('planned projects keep optional company data but require a single investment amount', function () {
    $manager = planningFlowUser();
    $district = planningFlowDistrict();
    $payload = [
        'name' => 'Early investor lead',
        'region_id' => $district->id,
        'status' => 'plan',
        'attraction_stage' => 'potential',
        'total_investment' => '2500000.75',
    ];

    $this->actingAs($manager)->post(route('investment-projects.store'), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();

    $project = InvestmentProject::where('name', 'Early investor lead')->sole();
    expect($project->total_investment)->toBe('2500000.75')
        ->and($project->company_id)->toBeNull()
        ->and($project->company_name)->toBeNull()
        ->and($project->project_type_id)->toBeNull()
        ->and($project->projectTypes()->count())->toBe(0);

    $this->put(route('investment-projects.update', $project), [
        ...$payload,
        'name' => 'Updated early investor lead',
        'description' => 'Алғашқы келіссөз жоспарланған',
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect($project->fresh()->name)->toBe('Updated early investor lead')
        ->and($project->fresh()->total_investment)->toBe('2500000.75')
        ->and($project->fresh()->description)->toBe('Алғашқы келіссөз жоспарланған');

    $this->get(route('investment-projects.edit', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.total_investment', '2500000.75')
            ->where('project.company_id', null));
});

test('planned projects still require their name and district', function () {
    $this->actingAs(planningFlowUser())->post(route('investment-projects.store'), [
        'status' => 'plan',
        'total_investment' => '1000',
        'attraction_stage' => 'potential',
    ])->assertSessionHasErrors(['name', 'region_id']);

    expect(InvestmentProject::count())->toBe(0);
});

test('single investment amounts preserve zero decimals and large values', function (string $amount) {
    $manager = planningFlowUser();
    $district = planningFlowDistrict();

    $this->actingAs($manager)->post(route('investment-projects.store'), [
        'name' => 'Known investment lead',
        'region_id' => $district->id,
        'status' => 'plan',
        'total_investment' => $amount,
    ])->assertSessionHasNoErrors()->assertRedirect();

    $project = InvestmentProject::where('name', 'Known investment lead')->sole();
    expect((float) $project->total_investment)->toBe((float) $amount);

    $this->put(route('investment-projects.update', $project), planningFlowPayload($project))
        ->assertSessionHasNoErrors()->assertRedirect();
    expect((float) $project->fresh()->total_investment)->toBe((float) $amount);
})->with([
    'zero' => '0',
    'decimal amount' => '2020.25',
    'large amount' => '3500000000.50',
]);

test('planned investment amounts reject empty negative and nonnumeric values', function (mixed $amount) {
    $district = planningFlowDistrict();
    $this->actingAs(planningFlowUser())->post(route('investment-projects.store'), [
        'name' => 'Missing investment amount',
        'region_id' => $district->id,
        'status' => 'plan',
        'total_investment' => $amount,
    ])->assertSessionHasErrors('total_investment');
})->with([null, '', '-1', 'invalid']);

test('obsolete investment classifications cannot erase the submitted amount', function () {
    $manager = planningFlowUser();
    $project = planningFlowProject($manager);
    $project->update(['investment_amount_type' => 'unknown', 'total_investment' => null]);

    $project->update(['description' => 'Legacy amount is not yet entered']);
    expect($project->fresh()->total_investment)->toBeNull();

    $this->actingAs($manager)->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'investment_amount_type' => 'unknown',
        'total_investment' => '7800000000.75',
    ]))->assertSessionHasNoErrors()->assertRedirect();
    expect($project->fresh()->total_investment)->toBe('7800000000.75');

    $project->refresh()->update(['current_status' => 'Сома енгізілді']);
    expect($project->fresh()->total_investment)->toBe('7800000000.75');

    $this->post(route('investment-projects.store'), planningFlowPayload($project, [
        'name' => 'Stale form amount',
        'investment_amount_type' => 'unknown',
        'total_investment' => '1500000.25',
    ]))->assertSessionHasNoErrors()->assertRedirect();
    expect(InvestmentProject::where('name', 'Stale form amount')->sole()->total_investment)->toBe('1500000.25');

    $this->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'investment_amount_type' => 'unknown',
        'total_investment' => null,
    ]))->assertSessionHasErrors('total_investment');
    expect($project->fresh()->total_investment)->toBe('7800000000.75');
});

test('other project statuses require company type and an investment amount', function (string $status) {
    $manager = planningFlowUser();
    $project = planningFlowProject($manager);

    $this->actingAs($manager)->post(route('investment-projects.store'), [
        'name' => 'Incomplete execution project',
        'region_id' => $project->region_id,
        'status' => $status,
    ])->assertSessionHasErrors(['company_id', 'project_type_ids', 'total_investment']);

    $this->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'status' => $status,
        'total_investment' => null,
    ]))->assertSessionHasErrors('total_investment');

    expect($project->fresh()->status)->toBe('plan');
})->with(['implementation', 'launched', 'suspended']);

test('planned edits and later status changes preserve optional operational data', function () {
    $manager = planningFlowUser();
    $project = planningFlowProject($manager);
    $infrastructure = [];
    foreach (\App\Support\InfrastructureValidationRules::PROJECT_RESOURCES as $resource) {
        $infrastructure[$resource] = [
            'needed' => $resource === 'electricity',
            'required_capacity' => $resource === 'electricity' ? '60' : null,
            'used_capacity' => $resource === 'electricity' ? '25' : null,
        ];
    }
    $payload = planningFlowPayload($project, [
        'jobs_count' => 0,
        'description' => 'Деректері алдын ала белгілі жоба',
        'geometry' => [['lat' => 43.3, 'lng' => 68.2]],
        'infrastructure' => $infrastructure,
        'start_date' => '2027-01-01',
        'end_date' => '2028-12-31',
    ]);

    $this->actingAs($manager)->put(route('investment-projects.update', $project), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();
    $receiver = planningFlowUser();
    $this->put(route('investment-projects.update', $project), [
        ...$payload,
        'attraction_stage' => 'handover',
        'attraction_handover_to_id' => $receiver->id,
    ])->assertSessionHasNoErrors()->assertRedirect();
    $this->actingAs($receiver)->post(route('investment-projects.attraction-handover.accept', $project))
        ->assertRedirect();
    $this->actingAs($manager);
    $this->put(route('investment-projects.update', $project), [
        ...$payload,
        'status' => 'implementation',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $project->refresh();
    expect($project->status)->toBe('implementation')
        ->and($project->jobs_count)->toBe(0)
        ->and($project->company_id)->toBe($payload['company_id'])
        ->and($project->projectTypes()->count())->toBe(1)
        ->and($project->geometry)->toBe($payload['geometry'])
        ->and(data_get($project->infrastructure, 'electricity.used_capacity'))->toBe('25')
        ->and($project->start_date->toDateString())->toBe('2027-01-01')
        ->and($project->total_investment)->toBe('3500000000.50');
});

test('special attraction stages require their own metadata', function (string $stage, string $field) {
    $manager = planningFlowUser();
    $project = planningFlowProject($manager);

    $this->actingAs($manager)->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'attraction_stage' => $stage,
    ]))->assertSessionHasErrors($field);

    expect($project->fresh()->attraction_stage)->toBe('potential');
})->with([
    'declined' => ['declined', 'attraction_decline_reason'],
    'paused' => ['paused', 'attraction_resume_on'],
    'handover' => ['handover', 'attraction_handover_to_id'],
]);

test('decline reasons and pause dates remain in history after status changes', function (string $stage, string $field, string $value) {
    $manager = planningFlowUser();
    $project = planningFlowProject($manager);

    $this->actingAs($manager)->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'attraction_stage' => $stage,
        $field => $value,
    ]))->assertSessionHasNoErrors()->assertRedirect();

    $this->put(route('investment-projects.update', $project), planningFlowPayload($project->fresh(), [
        'status' => 'suspended',
    ]))->assertSessionHasNoErrors()->assertRedirect();

    $actual = $project->fresh()->getAttribute($field);
    expect($actual instanceof \Carbon\CarbonInterface ? $actual->toDateString() : $actual)->toBe($value);
})->with([
    'investor refused' => ['declined', 'attraction_decline_reason', 'Инвестор қаржыландырудан бас тартты'],
    'temporary pause' => ['paused', 'attraction_resume_on', '2027-01-15'],
]);

test('optional handover is accepted only by its receiver and its history survives execution', function () {
    $manager = planningFlowUser();
    $receiver = planningFlowUser();
    $other = planningFlowUser();
    $project = planningFlowProject($manager);
    $payload = planningFlowPayload($project, [
        'attraction_stage' => 'handover',
        'attraction_handover_to_id' => $receiver->id,
    ]);

    $this->actingAs($manager)->put(route('investment-projects.update', $project), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();
    expect($project->fresh()->attraction_handover_requested_at)->not->toBeNull()
        ->and($project->fresh()->attraction_handover_accepted_at)->toBeNull();

    $this->actingAs($other)->post(route('investment-projects.attraction-handover.accept', $project))
        ->assertForbidden();
    $this->actingAs($receiver)->post(route('investment-projects.attraction-handover.accept', $project))
        ->assertRedirect();

    expect($project->fresh()->attraction_handover_accepted_by)->toBe($receiver->id)
        ->and($project->fresh()->attraction_handover_accepted_at)->not->toBeNull();

    $this->actingAs($manager)->put(route('investment-projects.update', $project), [
        ...$payload,
        'status' => 'implementation',
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect($project->fresh()->status)->toBe('implementation')
        ->and($project->fresh()->attraction_handover_to_id)->toBe($receiver->id)
        ->and($project->fresh()->attraction_handover_accepted_at)->not->toBeNull();
});

test('handover refuses self assignment and foreign receivers then resets acceptance on reassignment', function () {
    $manager = planningFlowUser();
    $receiver = planningFlowUser();
    $newReceiver = planningFlowUser();
    $foreign = planningFlowUser('invest');
    $project = planningFlowProject($manager);

    $this->actingAs($manager);
    foreach ([$manager->id, $foreign->id] as $invalidReceiverId) {
        $this->put(route('investment-projects.update', $project), planningFlowPayload($project, [
            'attraction_stage' => 'handover',
            'attraction_handover_to_id' => $invalidReceiverId,
        ]))->assertSessionHasErrors('attraction_handover_to_id');
    }

    $this->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'attraction_stage' => 'handover',
        'attraction_handover_to_id' => $receiver->id,
    ]))->assertSessionHasNoErrors()->assertRedirect();
    $this->actingAs($receiver)->post(route('investment-projects.attraction-handover.accept', $project))
        ->assertRedirect();

    $this->actingAs($manager)->put(route('investment-projects.update', $project), planningFlowPayload($project->fresh(), [
        'attraction_stage' => 'handover',
        'attraction_handover_to_id' => $newReceiver->id,
    ]))->assertSessionHasNoErrors()->assertRedirect();

    expect($project->fresh()->attraction_handover_to_id)->toBe($newReceiver->id)
        ->and($project->fresh()->attraction_handover_accepted_at)->toBeNull()
        ->and($project->fresh()->attraction_handover_accepted_by)->toBeNull();
    $this->actingAs($receiver)->post(route('investment-projects.attraction-handover.accept', $project))
        ->assertForbidden();
});

test('a pending handover survives suspension and does not prevent returning to implementation', function () {
    $manager = planningFlowUser();
    $receiver = planningFlowUser();
    $project = planningFlowProject($manager);

    $this->actingAs($manager)->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'attraction_stage' => 'handover',
        'attraction_handover_to_id' => $receiver->id,
    ]))->assertSessionHasNoErrors()->assertRedirect();
    $this->put(route('investment-projects.update', $project), planningFlowPayload($project->fresh(), [
        'status' => 'suspended',
    ]))->assertSessionHasNoErrors()->assertRedirect();

    expect($project->fresh()->status)->toBe('suspended')
        ->and($project->fresh()->attraction_handover_to_id)->toBe($receiver->id)
        ->and($project->fresh()->attraction_handover_requested_at)->not->toBeNull()
        ->and($project->fresh()->attraction_handover_accepted_at)->toBeNull();

    $this->put(route('investment-projects.update', $project), planningFlowPayload($project->fresh(), [
        'status' => 'implementation',
    ]))->assertSessionHasNoErrors()->assertRedirect();
    expect($project->fresh()->status)->toBe('implementation')
        ->and($project->fresh()->attraction_handover_to_id)->toBe($receiver->id)
        ->and($project->fresh()->attraction_handover_requested_at)->not->toBeNull()
        ->and($project->fresh()->attraction_handover_accepted_at)->toBeNull();
});

test('authorized curators can change planned status directly without a handover', function (string $role, string $status) {
    $manager = planningFlowUser($role);
    $project = planningFlowProject($manager);

    $this->actingAs($manager)->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'status' => $status,
    ]))->assertSessionHasNoErrors()->assertRedirect(route('investment-projects.show', $project));

    expect($project->fresh()->status)->toBe($status)
        ->and($project->fresh()->attraction_handover_to_id)->toBeNull()
        ->and($project->fresh()->attraction_handover_requested_at)->toBeNull()
        ->and($project->fresh()->attraction_handover_accepted_at)->toBeNull()
        ->and($project->fresh()->planning_started_at)->not->toBeNull();
    $log = KpiLog::where('project_id', $project->id)->where('event', 'project.updated')->sole();
    expect($log->user_id)->toBe($manager->id)
        ->and(data_get($log->properties, 'changes.status.old'))->toBe('plan')
        ->and(data_get($log->properties, 'changes.status.new'))->toBe($status);
})->with(['superadmin', 'invest'])->with(['implementation', 'launched', 'suspended']);

test('direct status changes preserve pending handover metadata without fabricating acceptance', function (string $status) {
    $manager = planningFlowUser('invest');
    $receiver = planningFlowUser();
    $project = planningFlowProject($manager);
    $this->actingAs($manager)->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'attraction_stage' => 'handover',
        'attraction_handover_to_id' => $receiver->id,
    ]))->assertSessionHasNoErrors()->assertRedirect();
    $requestedAt = $project->fresh()->attraction_handover_requested_at;

    $this->put(route('investment-projects.update', $project), planningFlowPayload($project->fresh(), [
        'status' => $status,
    ]))->assertSessionHasNoErrors()->assertRedirect();

    expect($project->fresh()->status)->toBe($status)
        ->and($project->fresh()->attraction_handover_to_id)->toBe($receiver->id)
        ->and($project->fresh()->attraction_handover_requested_at->equalTo($requestedAt))->toBeTrue()
        ->and($project->fresh()->attraction_handover_accepted_at)->toBeNull()
        ->and($project->fresh()->attraction_handover_accepted_by)->toBeNull();
    $this->actingAs($receiver)->post(route('investment-projects.attraction-handover.accept', $project))->assertForbidden();
})->with(['implementation', 'launched']);

test('ordinary status editing does not grant project management to unrelated users', function (string $role) {
    $owner = planningFlowUser();
    $project = planningFlowProject($owner);
    $other = planningFlowUser($role);
    if ($role === 'ispolnitel') {
        $project->executors()->attach($other);
    }

    $this->actingAs($other)->put(route('investment-projects.update', $project), planningFlowPayload($project, [
        'status' => 'implementation',
    ]))->assertForbidden();
    expect($project->fresh()->status)->toBe('plan')
        ->and($project->fresh()->attraction_handover_accepted_at)->toBeNull();
})->with(['invest', 'ispolnitel']);
