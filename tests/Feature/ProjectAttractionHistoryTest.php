<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectAttractionActivity;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use App\Services\ProjectAttractionHistoryService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
});

function attractionHistoryUser(string $role): User
{
    return User::factory()->create([
        'role_id' => Role::firstOrCreate(['name' => $role], ['display_name' => $role])->id,
        'role' => $role === 'superadmin' ? 'admin' : 'district_user',
        'baskarma_type' => $role === 'ispolnitel' ? 'additional' : null,
    ]);
}

function attractionHistoryFixture(string $assigneeRole = 'ispolnitel'): array
{
    $manager = attractionHistoryUser('superadmin');
    $assignee = attractionHistoryUser($assigneeRole);
    $region = Region::create(['name' => 'History district', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
    $company = Company::factory()->create(['region_id' => $region->id]);
    $project = InvestmentProject::create([
        'name' => 'History project', 'region_id' => $region->id, 'company_id' => $company->id,
        'status' => 'plan', 'attraction_stage' => 'potential', 'created_by' => $manager->id,
    ]);
    $project->curators()->attach($manager);
    if ($assigneeRole === 'invest') {
        $project->curators()->attach($assignee);
    } elseif ($assigneeRole === 'investor') {
        $assignee->update(['company_id' => $company->id]);
    } else {
        $project->executors()->attach($assignee);
    }

    return [$manager, $assignee, $project];
}

function attractionHistoryActivity(InvestmentProject $project, User $assignee, array $overrides = []): ProjectAttractionActivity
{
    return $project->attractionActivities()->create([
        'attraction_stage' => 'potential', 'next_action' => 'Prepare investor offer',
        'next_action_due_date' => today()->addWeek(), 'responsible_id' => $assignee->id,
        'created_by' => $project->created_by, 'status' => 'planned', ...$overrides,
    ]);
}

function attractionHistoryEvents(InvestmentProject $project, User $viewer): array
{
    $project->load(['attractionActivities.creator', 'attractionActivities.reporter', 'attractionActivities.reviewer']);
    app(ProjectAttractionHistoryService::class)->hydrate($project, $viewer);

    return $project->attractionActivities->sole()->getAttribute('events');
}

test('attraction history preserves every report and review with actual actors and no private audit metadata', function () {
    [$manager, $assignee, $project] = attractionHistoryFixture();
    $this->travelTo(now()->startOfMinute());
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), [
        'attraction_stage' => 'potential', 'next_action' => 'Prepare investor offer',
        'next_action_due_date' => today()->addWeek()->toDateString(), 'responsible_id' => $assignee->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $activity = $project->attractionActivities()->sole();
    $view = route('investment-projects.attraction-activities.view', [$project, $activity]);
    $report = route('investment-projects.attraction-activities.report', [$project, $activity]);
    $review = route('investment-projects.attraction-activities.review', [$project, $activity]);
    $this->travel(1)->minutes();
    $this->actingAs($assignee)->postJson($view)->assertOk();
    $this->travel(1)->minutes();
    $this->post($report, ['documents' => [UploadedFile::fake()->create('result.pdf', 1, 'application/pdf')], 'status' => 'pending_review', 'report_result' => 'First report'])->assertSessionHasNoErrors();
    $this->travel(1)->minutes();
    $this->actingAs($manager)->put($review, ['report_id' => $activity->reports()->first()?->id, 'decision' => 'rejected', 'reviewer_comment' => 'Add evidence'])->assertSessionHasNoErrors();
    $this->travel(1)->minutes();
    $this->actingAs($assignee)->post($report, ['documents' => [UploadedFile::fake()->create('result.pdf', 1, 'application/pdf')], 'status' => 'pending_review', 'report_result' => 'Corrected report'])->assertSessionHasNoErrors();
    $this->travel(1)->minutes();
    $this->actingAs($manager)->put($review, ['report_id' => $activity->reports()->first()?->id, 'decision' => 'approved', 'reviewer_comment' => 'Accepted'])->assertSessionHasNoErrors();

    $events = attractionHistoryEvents($project, $assignee);
    expect(array_column($events, 'type'))->toBe([
        'attraction.created', 'attraction.viewed', 'attraction.report_submitted',
        'attraction.report_rejected', 'attraction.report_submitted', 'attraction.report_approved',
    ])->and(array_column($events, 'actor_name'))->toBe([
        $manager->full_name, $assignee->full_name, $assignee->full_name,
        $manager->full_name, $assignee->full_name, $manager->full_name,
    ])->and($events[2]['comment'])->toBe('First report')
        ->and($events[3]['comment'])->toBe('Add evidence')
        ->and($events[4]['comment'])->toBe('Corrected report');
    foreach ($events as $event) {
        expect(array_diff(array_keys($event), ['id', 'type', 'label', 'actor_name', 'created_at', 'comment']))->toBe([]);
    }
    $this->actingAs($assignee)->get(route('investment-projects.show', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('project.attraction_activities.0.events', 6)
            ->where('project.attraction_activities.0.can_mark_viewed', false)
            ->where('project.attraction_activities.0.events.4.comment', 'Corrected report'));
});

test('view receipts are idempotent for assigned participants and do not change the project timestamp', function (string $role) {
    [$manager, $assignee, $project] = attractionHistoryFixture($role);
    $activity = attractionHistoryActivity($project, $assignee);
    $timestamp = $project->fresh()->updated_at->toISOString();
    $route = route('investment-projects.attraction-activities.view', [$project, $activity]);
    $this->actingAs($assignee)->get(route('investment-projects.show', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('project.attraction_activities.0.can_mark_viewed', true));
    $first = $this->postJson($route)->assertOk()->assertJsonPath('event.actor_name', $assignee->full_name)->json();
    $this->travel(1)->minutes();
    $this->postJson($route)->assertExactJson($first);
    expect(KpiLog::where('event', 'attraction.viewed')->count())->toBe(1)
        ->and($project->fresh()->updated_at->toISOString())->toBe($timestamp);
    $this->actingAs($manager)->postJson($route)->assertForbidden();
})->with(['ispolnitel', 'investor', 'invest']);

test('attraction history retains complete validated reports and review comments after resubmission', function () {
    [$manager, $assignee, $project] = attractionHistoryFixture();
    $activity = attractionHistoryActivity($project, $assignee);
    $report = route('investment-projects.attraction-activities.report', [$project, $activity]);
    $review = route('investment-projects.attraction-activities.review', [$project, $activity]);
    $firstReport = str_repeat('Ә', 10000);
    $rejection = str_repeat('Қ', 5000);
    $correctedReport = str_repeat('Ө', 10000);
    $acceptance = str_repeat('Ғ', 5000);

    $this->actingAs($assignee)->post($report, ['documents' => [UploadedFile::fake()->create('result.pdf', 1, 'application/pdf')], 'status' => 'pending_review', 'report_result' => $firstReport])
        ->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($manager)->put($review, ['report_id' => $activity->reports()->first()?->id, 'decision' => 'rejected', 'reviewer_comment' => $rejection])
        ->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($assignee)->post($report, ['documents' => [UploadedFile::fake()->create('result.pdf', 1, 'application/pdf')], 'status' => 'pending_review', 'report_result' => $correctedReport])
        ->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($manager)->put($review, ['report_id' => $activity->reports()->first()?->id, 'decision' => 'approved', 'reviewer_comment' => $acceptance])
        ->assertRedirect()->assertSessionHasNoErrors();

    $events = attractionHistoryEvents($project, $manager);
    expect(array_column($events, 'comment'))->toBe([$firstReport, $rejection, $correctedReport, $acceptance])
        ->and($activity->fresh()->report_result)->toBe($correctedReport)
        ->and(KpiLog::where('event', 'attraction.report_rejected')->sole()->properties['details']['Орындалу нәтижесі'])
        ->toBe($firstReport);
});

test('only bounded attraction report detail snapshots bypass the ordinary audit text limit', function () {
    [$manager, $assignee, $project] = attractionHistoryFixture();
    $activity = attractionHistoryActivity($project, $assignee);
    $longText = str_repeat('Ә', 10001);
    $details = [
        'Орындалу нәтижесі' => $longText,
        'Тексерушінің түсіндірмесі' => $longText,
        'Unrelated detail' => $longText,
    ];
    foreach ([['attraction.report_submitted', $activity], ['project.updated', $activity], ['attraction.report_submitted', $project]] as [$event, $subject]) {
        KpiLog::activity(
            projectId: $project->id, event: $event, category: 'project', action: 'Audit limit regression',
            subject: $subject, properties: ['details' => $details], actor: $manager
        );
    }

    [$attraction, $otherEvent, $otherSubject] = KpiLog::orderBy('id')->get()->all();
    expect($attraction->properties['details']['Орындалу нәтижесі'])->toBe(Str::substr($longText, 0, 10000))
        ->and($attraction->properties['details']['Тексерушінің түсіндірмесі'])->toBe(Str::substr($longText, 0, 5000));
    foreach ([$attraction, $otherEvent, $otherSubject] as $log) {
        expect($log->properties['details']['Unrelated detail'])->toBe(Str::limit($longText, 2000));
    }
    foreach ([$otherEvent, $otherSubject] as $log) {
        expect($log->properties['details']['Орындалу нәтижесі'])->toBe(Str::limit($longText, 2000))
            ->and($log->properties['details']['Тексерушінің түсіндірмесі'])->toBe(Str::limit($longText, 2000));
    }
});

test('view receipts reject foreign activity IDs and inaccessible or inactive projects', function () {
    [$manager, $assignee, $project] = attractionHistoryFixture();
    $activity = attractionHistoryActivity($project, $assignee);
    $other = attractionHistoryUser('ispolnitel');
    $project->executors()->attach($other);
    $view = route('investment-projects.attraction-activities.view', [$project, $activity]);
    $this->actingAs($other)->postJson($view)->assertForbidden();
    [$foreignManager, $foreignAssignee, $foreignProject] = attractionHistoryFixture();
    $this->actingAs($foreignAssignee)->postJson(route('investment-projects.attraction-activities.view', [$foreignProject, $activity]))->assertNotFound();
    $project->update(['is_archived' => true]);
    $this->actingAs($assignee)->postJson($view)->assertStatus(409);
    $project->update(['is_archived' => false, 'status' => 'implementation']);
    $this->postJson($view)->assertStatus(409);
    [$scopedManager, $scopedAssignee, $scopedProject] = attractionHistoryFixture('invest');
    $scopedActivity = attractionHistoryActivity($scopedProject, $scopedAssignee);
    $scopedAssignee->update(['region_id' => $foreignProject->region_id]);
    $this->actingAs($scopedAssignee->fresh())
        ->postJson(route('investment-projects.attraction-activities.view', [$scopedProject, $scopedActivity]))->assertForbidden();
    expect(KpiLog::where('event', 'attraction.viewed')->count())->toBe(0);
});

test('reassignment keeps past receipts and lets the new current assignment be viewed once', function () {
    [$manager, $assignee, $project] = attractionHistoryFixture();
    $activity = attractionHistoryActivity($project, $assignee);
    $replacement = attractionHistoryUser('ispolnitel');
    $project->executors()->attach($replacement);
    $view = route('investment-projects.attraction-activities.view', [$project, $activity]);
    $this->actingAs($assignee)->postJson($view)->assertOk();
    foreach ([$replacement, $assignee] as $next) {
        $this->actingAs($manager)->put(route('investment-projects.attraction-activities.update', [$project, $activity]), [
            'attraction_stage' => 'potential', 'next_action' => $activity->next_action,
            'next_action_due_date' => $activity->next_action_due_date->toDateString(), 'responsible_id' => $next->id,
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->actingAs($next)->get(route('investment-projects.show', $project))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('project.attraction_activities.0.can_mark_viewed', true));
        $this->postJson($view)->assertOk();
        $this->postJson($view)->assertOk();
    }
    expect(KpiLog::where('event', 'attraction.viewed')->count())->toBe(3);
    $events = attractionHistoryEvents($project, $manager);
    expect(collect($events)->where('type', 'attraction.viewed')->pluck('actor_name')->all())
        ->toBe([$assignee->full_name, $replacement->full_name, $assignee->full_name]);
});

test('legacy timestamps provide honest history without fabricated views or duplicate delayed audit entries', function () {
    [$manager, $assignee, $project] = attractionHistoryFixture();
    $reported = now()->subHours(2)->startOfSecond();
    $reviewed = now()->subHour()->startOfSecond();
    $activity = attractionHistoryActivity($project, $assignee, [
        'status' => 'completed', 'report_result' => 'Legacy report', 'reported_at' => $reported,
        'reported_by' => $assignee->id, 'reviewed_at' => $reviewed,
        'reviewed_by' => $manager->id, 'reviewer_comment' => 'Legacy acceptance',
    ]);
    $activity->forceFill(['created_at' => $reported->copy()->subHour()])->saveQuietly();
    $events = attractionHistoryEvents($project, $manager);
    expect(array_column($events, 'type'))->toBe(['attraction.created', 'attraction.report_submitted', 'attraction.report_approved'])
        ->and($events[1]['comment'])->toBe('Legacy report');
    KpiLog::forceCreate([
        'project_id' => $project->id, 'user_id' => $assignee->id,
        'subject_type' => 'ProjectAttractionActivity', 'subject_id' => $activity->id,
        'event' => 'attraction.report_submitted', 'action' => 'Report submitted', 'score' => 0,
        'properties' => ['actor_name' => $assignee->full_name, 'ip_address' => '127.0.0.1', 'user_agent' => 'Private', 'details' => ['Орындалу нәтижесі' => 'Legacy report']],
        'created_at' => $reported->copy()->addSecond(),
    ]);
    $events = attractionHistoryEvents($project, $manager);
    expect($events)->toHaveCount(3)
        ->and(collect($events)->where('type', 'attraction.viewed'))->toBeEmpty()
        ->and(collect($events)->where('type', 'attraction.report_submitted')->sole()['id'])->not->toStartWith('legacy-');
});

test('history survives the planning stage and remains hidden from unrelated restricted viewers', function () {
    [$manager, $assignee, $project] = attractionHistoryFixture();
    $activity = attractionHistoryActivity($project, $assignee);
    $this->actingAs($assignee)->postJson(route('investment-projects.attraction-activities.view', [$project, $activity]))->assertOk();
    $project->update(['status' => 'implementation']);
    $this->actingAs($manager)->get(route('investment-projects.show', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('project.attraction_activities.0.events', 2)
            ->where('project.attraction_activities.0.can_mark_viewed', false));
    $unrelated = attractionHistoryUser('ispolnitel');
    $this->actingAs($unrelated)->get(route('investment-projects.show', $project))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('project.attraction_activities', 0));
});
