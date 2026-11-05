<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectAttractionActivity;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use App\Services\ProjectAttractionService;

function attractionReportingUser(string $role): User
{
    $roleModel = Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role)]);

    return User::factory()->create([
        'role' => $role === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $roleModel->id,
    ]);
}

function attractionReportingProject(User $manager, User $responsible): InvestmentProject
{
    $region = Region::create([
        'name' => 'Reporting test district',
        'type' => 'district',
        'color' => '#123456',
        'icon' => 'factory',
    ]);
    $company = Company::factory()->create(['region_id' => $region->id]);
    $project = InvestmentProject::create([
        'name' => 'Reporting project',
        'region_id' => $region->id,
        'company_id' => $company->id,
        'total_investment' => 1000,
        'status' => 'plan',
        'created_by' => $manager->id,
    ]);
    $project->curators()->attach($manager);
    $project->executors()->attach($responsible);

    if ($responsible->roleModel?->name === 'investor') {
        $responsible->update(['company_id' => $company->id]);
    }

    return $project;
}

function attractionReportingActivity(InvestmentProject $project, User $responsible, array $overrides = []): ProjectAttractionActivity
{
    return $project->attractionActivities()->create([
        'attraction_stage' => 'negotiation',
        'next_action' => 'Инвестормен кездесу өткізу',
        'next_action_due_date' => today()->addDays(3),
        'responsible_id' => $responsible->id,
        'created_by' => $project->created_by,
        'status' => 'planned',
        ...$overrides,
    ]);
}

function attractionReportingPayload(ProjectAttractionActivity $activity, array $overrides = []): array
{
    return [
        'attraction_stage' => $activity->attraction_stage,
        'next_action' => $activity->next_action,
        'next_action_due_date' => $activity->next_action_due_date->toDateString(),
        'responsible_id' => $activity->responsible_id,
        ...$overrides,
    ];
}

test('assigned participants start and submit their own attraction work', function (string $role) {
    $manager = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser($role);
    $project = attractionReportingProject($manager, $assignee);
    $activity = attractionReportingActivity($project, $assignee);
    $reportRoute = route('investment-projects.attraction-activities.report', [$project, $activity]);

    $this->actingAs($assignee)->post($reportRoute, ['status' => 'in_progress'])
        ->assertSessionHasNoErrors()->assertRedirect();
    expect($activity->fresh()->status)->toBe('in_progress');

    $this->post($reportRoute, ['status' => 'pending_review', 'report_result' => ''])
        ->assertSessionHasErrors('report_result');
    expect($activity->fresh()->status)->toBe('in_progress');

    $this->post($reportRoute, [
        'status' => 'pending_review',
        'report_result' => 'Кездесу өтті, ұсыныстар келісілді.',
        'responsible_id' => $manager->id,
    ])->assertSessionHasNoErrors()->assertRedirect();

    $activity->refresh();
    expect($activity->status)->toBe('pending_review')
        ->and($activity->report_result)->toBe('Кездесу өтті, ұсыныстар келісілді.')
        ->and($activity->responsible_id)->toBe($assignee->id)
        ->and($activity->reported_by)->toBe($assignee->id)
        ->and($activity->reported_at)->not->toBeNull()
        ->and($activity->reviewed_at)->toBeNull();
})->with(['ispolnitel', 'investor']);

test('manager approval completes an attraction activity and locks ordinary editing', function () {
    $manager = attractionReportingUser('invest');
    $assignee = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($manager, $assignee);
    $activity = attractionReportingActivity($project, $assignee);
    $this->actingAs($assignee)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Шарттар талқыланды.',
    ])->assertSessionHasNoErrors();

    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.review', [$project, $activity]), [
        'decision' => 'approved', 'reviewer_comment' => 'Қабылданды.',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $activity->refresh();
    expect($activity->status)->toBe('completed')
        ->and($activity->reviewed_by)->toBe($manager->id)
        ->and($activity->reviewed_at)->not->toBeNull()
        ->and($activity->reviewer_comment)->toBe('Қабылданды.')
        ->and(app(ProjectAttractionService::class)->canEdit($manager, $project, $activity))->toBeFalse()
        ->and(app(ProjectAttractionService::class)->canReport($assignee, $project, $activity))->toBeFalse();

    $this->put(route('investment-projects.attraction-activities.update', [$project, $activity]), attractionReportingPayload($activity))
        ->assertForbidden();
    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activity]))
        ->assertForbidden();
    $this->actingAs($assignee)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Ауыстырылған нәтиже.',
    ])->assertForbidden();
});

test('a rejected result needs a reason and can be corrected and resubmitted', function () {
    $manager = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($manager, $assignee);
    $activity = attractionReportingActivity($project, $assignee);
    $report = route('investment-projects.attraction-activities.report', [$project, $activity]);
    $review = route('investment-projects.attraction-activities.review', [$project, $activity]);

    $this->actingAs($assignee)->post($report, ['status' => 'pending_review', 'report_result' => 'Алғашқы есеп.'])
        ->assertSessionHasNoErrors();
    $this->actingAs($manager)->put($review, ['decision' => 'rejected'])
        ->assertSessionHasErrors('reviewer_comment');
    expect($activity->fresh()->status)->toBe('pending_review');

    $this->put($review, ['decision' => 'rejected', 'reviewer_comment' => 'Нақты нәтижені толықтырыңыз.'])
        ->assertSessionHasNoErrors();
    expect($activity->fresh()->status)->toBe('in_progress')
        ->and($activity->fresh()->reviewer_comment)->toBe('Нақты нәтижені толықтырыңыз.');

    $this->actingAs($assignee)->post($report, ['status' => 'in_progress', 'report_result' => 'Есепті толықтырып жатырмын.'])
        ->assertSessionHasNoErrors();
    expect($activity->fresh()->reviewer_comment)->toBe('Нақты нәтижені толықтырыңыз.')
        ->and($activity->fresh()->reviewed_by)->toBe($manager->id)
        ->and($activity->fresh()->reported_by)->toBe($assignee->id);

    $this->actingAs($assignee)->post($report, ['status' => 'pending_review', 'report_result' => 'Толықтырылған есеп.'])
        ->assertSessionHasNoErrors();
    expect($activity->fresh()->status)->toBe('pending_review')
        ->and($activity->fresh()->report_result)->toBe('Толықтырылған есеп.')
        ->and($activity->fresh()->reviewed_by)->toBeNull()
        ->and($activity->fresh()->reviewer_comment)->toBeNull();

    expect(KpiLog::where('project_id', $project->id)->orderBy('id')->pluck('event')->all())->toBe([
        'attraction.report_submitted', 'attraction.report_rejected', 'attraction.started', 'attraction.report_submitted',
    ]);
});

test('attraction reports and reviews cannot be sent for another persons work or another project', function () {
    $manager = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser('ispolnitel');
    $other = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($manager, $assignee);
    $project->executors()->attach($other);
    $activity = attractionReportingActivity($project, $assignee);

    $this->actingAs($other)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Бөтен нәтиже.',
    ])->assertForbidden();
    $this->put(route('investment-projects.attraction-activities.review', [$project, $activity]), ['decision' => 'approved'])
        ->assertForbidden();

    $foreignProject = attractionReportingProject($manager, $assignee);
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.report', [$foreignProject, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Бөтен жоба.',
    ])->assertNotFound();
    expect($activity->fresh()->status)->toBe('planned');
});

test('read-only roles cannot report even when responsible for an activity', function (string $role) {
    $manager = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser($role);
    $project = attractionReportingProject($manager, $assignee);
    $activity = attractionReportingActivity($project, $assignee);

    $this->actingAs($assignee)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Жарамсыз есеп.',
    ])->assertForbidden();
})->with(['akim', 'zamakim', 'prokuror']);

test('self review is restricted to superadmin', function (string $role, bool $allowed) {
    $manager = attractionReportingUser($role);
    $project = attractionReportingProject($manager, $manager);
    $activity = attractionReportingActivity($project, $manager);

    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Өз есебім.',
    ])->assertSessionHasNoErrors();
    $response = $this->put(route('investment-projects.attraction-activities.review', [$project, $activity]), [
        'decision' => 'approved',
    ]);
    $allowed ? $response->assertRedirect() : $response->assertForbidden();
    expect($activity->fresh()->status)->toBe($allowed ? 'completed' : 'pending_review');
})->with([
    'curator' => ['invest', false],
    'moderator' => ['moderator', false],
    'superadmin' => ['superadmin', true],
]);

test('activities cannot become completed through ordinary manager edits', function () {
    $manager = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($manager, $assignee);
    $activity = attractionReportingActivity($project, $assignee);

    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionReportingPayload($activity, ['status' => 'completed']))
        ->assertSessionHasErrors('status');
    expect($activity->fresh()->status)->toBe('planned');
});

test('reassignment clears earlier reports and cancelled activities reject reporting', function () {
    $manager = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser('ispolnitel');
    $replacement = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($manager, $assignee);
    $project->executors()->attach($replacement);
    $activity = attractionReportingActivity($project, $assignee, [
        'status' => 'in_progress', 'report_result' => 'Бұрынғы есеп.',
        'reported_by' => $assignee->id, 'reported_at' => now(),
    ]);

    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionReportingPayload($activity, ['responsible_id' => $replacement->id]))
        ->assertSessionHasNoErrors();
    expect($activity->fresh()->status)->toBe('planned')
        ->and($activity->fresh()->report_result)->toBeNull()
        ->and($activity->fresh()->reported_by)->toBeNull();

    $this->put(route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionReportingPayload($activity->fresh(), ['status' => 'cancelled']))
        ->assertSessionHasNoErrors();
    $this->actingAs($replacement)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Бас тартылған іс-шара есебі.',
    ])->assertForbidden();
});

test('reporting and reviewing stop when project is archived or leaves planning', function () {
    $manager = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($manager, $assignee);
    $activity = attractionReportingActivity($project, $assignee);
    $project->update(['is_archived' => true]);

    $this->actingAs($assignee)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Есеп.',
    ])->assertForbidden();

    $project->update(['is_archived' => false, 'status' => 'implementation']);
    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.review', [$project, $activity]), [
        'decision' => 'approved',
    ])->assertStatus(409);
});

test('superadmin changes to reviewed work reopen it and preserve the old approval in the audit log', function (array $changes) {
    $admin = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($admin, $assignee);
    $activity = attractionReportingActivity($project, $assignee, [
        'status' => 'completed',
        'report_result' => 'Бұрынғы расталған есеп.',
        'reported_at' => now()->subDay(),
        'reported_by' => $assignee->id,
        'reviewed_at' => now(),
        'reviewed_by' => $admin->id,
        'reviewer_comment' => 'Бұрынғы жұмыс қабылданды.',
    ]);

    $this->actingAs($admin)->put(route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionReportingPayload($activity, $changes))
        ->assertSessionHasNoErrors()->assertRedirect();

    $activity->refresh();
    expect($activity->status)->toBe($changes['status'] ?? 'planned')
        ->and($activity->report_result)->toBeNull()
        ->and($activity->reported_at)->toBeNull()
        ->and($activity->reported_by)->toBeNull()
        ->and($activity->reviewed_at)->toBeNull()
        ->and($activity->reviewed_by)->toBeNull()
        ->and($activity->reviewer_comment)->toBeNull();

    $audit = KpiLog::where('project_id', $project->id)->where('event', 'attraction.updated')->sole();
    expect($audit->properties['before']['status'])->toBe('completed')
        ->and($audit->properties['before']['report_result'])->toBe('Бұрынғы расталған есеп.')
        ->and($audit->properties['after']['status'])->toBe($changes['status'] ?? 'planned')
        ->and($audit->properties['after']['reviewed_by'])->toBeNull();
})->with([
    'changed work definition' => [['next_action' => 'Жаңа келіссөз өткізу']],
    'changed deadline' => [['next_action_due_date' => '2099-01-01']],
    'explicit reopen' => [['status' => 'in_progress']],
]);

test('administrative changes outside a completed work definition preserve its approval', function () {
    $admin = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($admin, $assignee);
    $activity = attractionReportingActivity($project, $assignee, [
        'status' => 'completed', 'report_result' => 'Расталған есеп.',
        'reported_by' => $assignee->id, 'reported_at' => now()->subDay(),
        'reviewed_by' => $admin->id, 'reviewed_at' => now(),
    ]);

    $this->actingAs($admin)->put(route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionReportingPayload($activity, ['attraction_stage' => 'conditions']))
        ->assertSessionHasNoErrors()->assertRedirect();

    expect($activity->fresh()->status)->toBe('completed')
        ->and($activity->fresh()->reviewed_by)->toBe($admin->id)
        ->and($activity->fresh()->report_result)->toBe('Расталған есеп.');
});

test('deleting the newest activity cannot restore an uninitialized historical handover', function () {
    $admin = attractionReportingUser('superadmin');
    $assignee = attractionReportingUser('ispolnitel');
    $project = attractionReportingProject($admin, $assignee);
    $older = attractionReportingActivity($project, $assignee, ['attraction_stage' => 'handover']);
    $latest = attractionReportingActivity($project, $assignee, ['attraction_stage' => 'negotiation']);
    $project->update([
        'attraction_stage' => 'negotiation',
        'attraction_handover_to_id' => null,
        'attraction_handover_requested_at' => null,
    ]);

    $this->actingAs($admin)->delete(route('investment-projects.attraction-activities.destroy', [$project, $latest]))
        ->assertRedirect();

    expect($project->fresh()->attraction_stage)->toBe('potential')
        ->and($project->attractionActivities()->sole()->id)->toBe($older->id);
});
