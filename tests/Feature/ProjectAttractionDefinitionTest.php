<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectAttractionActivity;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use App\Services\ProjectAttractionService;
use Inertia\Testing\AssertableInertia as Assert;

function attractionDefinitionFixture(string $managerRole = 'superadmin'): array
{
    $manager = User::factory()->create([
        'role' => $managerRole === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => Role::firstOrCreate(['name' => $managerRole], ['display_name' => $managerRole])->id,
        'invest_sub_role' => $managerRole === 'invest' ? 'turkistan_invest' : null,
    ]);
    $assignee = User::factory()->create([
        'role' => 'district_user',
        'role_id' => Role::firstOrCreate(['name' => 'ispolnitel'], ['display_name' => 'Executor'])->id,
    ]);
    $region = Region::create(['name' => 'Definition district', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
    $company = Company::factory()->create(['region_id' => $region->id]);
    $project = InvestmentProject::create([
        'name' => 'Definition project', 'company_id' => $company->id, 'region_id' => $region->id,
        'status' => 'plan', 'attraction_stage' => 'negotiation', 'created_by' => $manager->id,
    ]);
    $project->curators()->attach($manager);
    $project->executors()->attach($assignee);

    return [$manager, $assignee, $project];
}

function attractionDefinitionPayload(User $assignee, array $extra = []): array
{
    return [
        'next_action' => 'Кездесу өткізу', 'description' => 'Кездесудің күн тәртібін дайындау',
        'next_action_due_date' => today()->addWeek()->toDateString(), 'responsible_id' => $assignee->id,
        ...$extra,
    ];
}

function attractionDefinitionActivity(InvestmentProject $project, User $assignee, array $extra = []): ProjectAttractionActivity
{
    return $project->attractionActivities()->create([
        ...attractionDefinitionPayload($assignee), 'attraction_stage' => 'potential',
        'created_by' => $project->created_by, 'status' => 'planned', ...$extra,
    ]);
}

test('project managers cannot send attraction reports unless they are the responsible assignee', function (string $role) {
    [$manager, $assignee, $project] = attractionDefinitionFixture($role);
    $activity = attractionDefinitionActivity($project, $assignee);
    $service = app(ProjectAttractionService::class);
    expect($service->canManage($manager, $project))->toBeTrue()
        ->and($service->canReport($manager, $project, $activity))->toBeFalse()
        ->and($service->canReport($assignee, $project, $activity))->toBeTrue();
    $this->actingAs($manager)->get(route('investment-projects.show', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('project.attraction_activities.0.can_report', false));
    $this->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Басқа адамның орнына жіберілген есеп',
    ])->assertForbidden();
    expect($activity->fresh()->status)->toBe('planned');

    $activity->update(['responsible_id' => $manager->id]);
    $this->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Өзіме берілген жұмыстың есебі',
    ])->assertSessionHasNoErrors()->assertRedirect();
    expect($activity->fresh()->reported_by)->toBe($manager->id);
})->with(['superadmin', 'invest', 'moderator']);

test('new attraction definitions always start planned and ignore forged workflow fields', function (string $status) {
    [$manager, $assignee, $project] = attractionDefinitionFixture();
    $payload = attractionDefinitionPayload($assignee, [
        'status' => $status, 'attraction_stage' => 'handover',
        'event_name' => 'Forged event', 'event_date' => '2000-01-01', 'result' => 'Forged result',
        'report_result' => 'Forged report', 'reviewed_by' => $manager->id,
    ]);
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();
    $activity = $project->attractionActivities()->sole();
    expect($activity->status)->toBe('planned')
        ->and($activity->attraction_stage)->toBe('negotiation')
        ->and($activity->description)->toBe($payload['description'])
        ->and($activity->event_name)->toBeNull()
        ->and($activity->event_date)->toBeNull()
        ->and($activity->result)->toBeNull()
        ->and($activity->report_result)->toBeNull()
        ->and($activity->reviewed_by)->toBeNull()
        ->and($project->fresh()->attraction_stage)->toBe('negotiation');
    $this->put(route('investment-projects.attraction-activities.update', [$project, $activity]), $payload)
        ->assertSessionHasNoErrors()->assertRedirect();
    expect($activity->fresh()->status)->toBe('planned');
})->with(['in_progress', 'pending_review', 'completed', 'cancelled']);

test('definition edits preserve existing event details and project stage and allow clearing description', function () {
    [$manager, $assignee, $project] = attractionDefinitionFixture();
    $activity = attractionDefinitionActivity($project, $assignee, [
        'event_name' => 'Алдыңғы кездесу', 'event_date' => '2026-01-15', 'result' => 'Алдыңғы кездесу нәтижесі',
    ]);
    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionDefinitionPayload($assignee, [
            'description' => null, 'attraction_stage' => 'agreements',
            'event_name' => null, 'event_date' => null, 'result' => null,
        ]))->assertSessionHasNoErrors()->assertRedirect();
    $activity->refresh();
    expect($activity->description)->toBeNull()
        ->and($activity->event_name)->toBe('Алдыңғы кездесу')
        ->and($activity->event_date->toDateString())->toBe('2026-01-15')
        ->and($activity->result)->toBe('Алдыңғы кездесу нәтижесі')
        ->and($activity->attraction_stage)->toBe('potential')
        ->and($project->fresh()->attraction_stage)->toBe('negotiation');
    $this->delete(route('investment-projects.attraction-activities.destroy', [$project, $activity]))->assertRedirect();
    expect($project->fresh()->attraction_stage)->toBe('negotiation');
});

test('description validates its length and a change beyond the audit preview resets view eligibility', function () {
    [$manager, $assignee, $project] = attractionDefinitionFixture();
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project),
        attractionDefinitionPayload($assignee, ['description' => str_repeat('Ә', 10001)]))
        ->assertSessionHasErrors('description');
    $prefix = str_repeat('Ә', 3000);
    $activity = attractionDefinitionActivity($project, $assignee, ['description' => $prefix.'A']);
    $view = route('investment-projects.attraction-activities.view', [$project, $activity]);
    $this->actingAs($assignee)->postJson($view)->assertOk();
    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionDefinitionPayload($assignee, ['description' => $prefix.'B']))
        ->assertSessionHasNoErrors()->assertRedirect();
    $audit = KpiLog::where('event', 'attraction.updated')->sole();
    expect($audit->properties['definition_changed'])->toBeTrue()
        ->and($audit->properties['before']['description'])->toBe($audit->properties['after']['description']);
    $this->actingAs($assignee)->get(route('investment-projects.show', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.attraction_activities.0.description', $prefix.'B')
            ->where('project.attraction_activities.0.can_mark_viewed', true));
    $this->postJson($view)->assertOk();
    expect(KpiLog::where('event', 'attraction.viewed')->count())->toBe(2);
});

test('editing and reassigning an existing cancelled definition does not reopen it', function () {
    [$manager, $assignee, $project] = attractionDefinitionFixture();
    $activity = attractionDefinitionActivity($project, $assignee, ['status' => 'cancelled']);
    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.update', [$project, $activity]),
        attractionDefinitionPayload($manager, ['status' => 'planned', 'description' => 'Өзгертілген сипаттама']))
        ->assertSessionHasNoErrors()->assertRedirect();
    expect($activity->fresh()->status)->toBe('cancelled')
        ->and(app(ProjectAttractionService::class)->canReport($manager, $project, $activity->fresh()))->toBeFalse();
});

test('a declined project cannot receive new open activities until its project stage changes', function () {
    [$manager, $assignee, $project] = attractionDefinitionFixture();
    $project->update(['attraction_stage' => 'declined', 'attraction_decline_reason' => 'Инвестор бас тартты']);
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project),
        attractionDefinitionPayload($assignee, ['attraction_stage' => 'negotiation', 'status' => 'cancelled']))
        ->assertSessionHasErrors('next_action');
    expect($project->attractionActivities()->count())->toBe(0)
        ->and($project->fresh()->attraction_stage)->toBe('declined');
});

test('direct submission records a single actual assignee view before the report', function () {
    [$manager, $assignee, $project] = attractionDefinitionFixture();
    $activity = attractionDefinitionActivity($project, $assignee);
    $this->actingAs($assignee)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Жіберілген есеп',
    ])->assertSessionHasNoErrors()->assertRedirect();
    $logs = KpiLog::where('subject_type', 'ProjectAttractionActivity')->where('subject_id', $activity->id)->orderBy('id')->get();
    expect($logs->pluck('event')->all())->toBe(['attraction.viewed', 'attraction.report_submitted'])
        ->and($logs->pluck('user_id')->all())->toBe([$assignee->id, $assignee->id]);
    $timestamp = $project->fresh()->updated_at->toISOString();
    $this->travel(1)->minutes();
    $this->postJson(route('investment-projects.attraction-activities.view', [$project, $activity]))->assertOk();
    expect(KpiLog::where('event', 'attraction.viewed')->count())->toBe(1)
        ->and($project->fresh()->updated_at->toISOString())->toBe($timestamp);
});
