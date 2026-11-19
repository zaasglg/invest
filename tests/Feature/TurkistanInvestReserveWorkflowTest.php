<?php

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\ProjectAttractionHandoverService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

function reserveFlowRegion(string $name): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#0891B2',
        'icon' => 'factory',
    ]);
}

function reserveFlowUser(string $subRole, ?Region $region = null): User
{
    return User::factory()->create([
        'role' => 'invest',
        'role_id' => Role::firstOrCreate(
            ['name' => 'invest'],
            ['display_name' => 'Invest']
        )->id,
        'invest_sub_role' => $subRole,
        'region_id' => $region?->id,
    ]);
}

function reserveFlowProject(
    User $creator,
    Region $region,
    array $attributes = []
): InvestmentProject {
    $project = InvestmentProject::create([
        'name' => 'Резервке жіберілген жоба',
        'region_id' => $region->id,
        'status' => 'plan',
        'attraction_stage' => 'handover',
        'investor_country_code' => 'TR',
        'total_investment' => 250000000,
        'attraction_handover_requested_at' => now(),
        'attraction_handover_requested_by' => $creator->id,
        'created_by' => $creator->id,
        ...$attributes,
    ]);
    $project->curators()->attach($creator);

    return $project;
}

test('only accompaniment accounts see their regional reserve queue', function () {
    $ownRegion = reserveFlowRegion('Резерв ауданы');
    $otherRegion = reserveFlowRegion('Басқа резерв ауданы');
    $attraction = reserveFlowUser('turkistan_invest_attraction', $ownRegion);
    $accompaniment = reserveFlowUser('turkistan_invest', $ownRegion);
    $otherAccompaniment = reserveFlowUser('turkistan_invest', $otherRegion);

    $ownPending = reserveFlowProject($attraction, $ownRegion, [
        'name' => 'Өз ауданындағы резерв',
    ]);
    reserveFlowProject($attraction, $otherRegion, [
        'name' => 'Басқа аудан резерві',
    ]);
    $notSubmitted = reserveFlowProject($attraction, $ownRegion, [
        'name' => 'Әлі жіберілмеген жоба',
        'attraction_stage' => 'negotiation',
        'attraction_handover_requested_at' => null,
        'attraction_handover_requested_by' => null,
    ]);

    $this->actingAs($accompaniment)
        ->get(route('project-reserves.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/reserves')
            ->has('projects.data', 1)
            ->where('stats.total_projects', 1)
            ->where('stats.total_investment', 250000000)
            ->where('projects.data.0.id', $ownPending->id));

    $this->get(route('investment-projects.show', $ownPending))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('handoverDecisionMode', 'support-reserve')
            ->where('canDeleteProject', false)
            ->where('canArchiveProject', false));

    $this->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('projects.data', 0));

    $this->actingAs($otherAccompaniment)
        ->get(route('project-reserves.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('projects.data', 1));

    $this->actingAs($attraction)
        ->get(route('project-reserves.index'))
        ->assertForbidden();

    $this->post(route('project-reserves.reject', $ownPending))
        ->assertForbidden();

    $this->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $notSubmitted->id));

    $this->get(route('attraction-handovers.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/handovers')
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $ownPending->id));

    $this->get(route('investment-projects.show', $ownPending))
        ->assertOk();
});
test('accepting a reserve atomically moves it into accompaniment projects', function () {
    $region = reserveFlowRegion('Қабылдау ауданы');
    $attraction = reserveFlowUser('turkistan_invest_attraction', $region);
    $accompaniment = reserveFlowUser('turkistan_invest', $region);
    $project = reserveFlowProject($attraction, $region);

    $this->actingAs($accompaniment)
        ->post(route('project-reserves.accept', $project))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $project->refresh();

    expect($project->status)->toBe('implementation')
        ->and($project->attraction_handover_accepted_by)
        ->toBe($accompaniment->id)
        ->and($project->attraction_handover_accepted_at)->not->toBeNull()
        ->and($project->attraction_handover_rejection_reason)->toBeNull()
        ->and($project->attraction_handover_rejected_at)->toBeNull()
        ->and($project->attraction_handover_rejected_by)->toBeNull()
        ->and($project->curators()->whereKey($accompaniment->id)->exists())
        ->toBeTrue();

    $this->get(route('project-reserves.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('projects.data', 0));

    $this->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $project->id));

    $this->actingAs($attraction)
        ->get(route('investment-projects.show', $project))
        ->assertForbidden();

    expect(KpiLog::query()
        ->where('project_id', $project->id)
        ->where('event', 'attraction.reserve_accepted')
        ->exists())->toBeTrue();

    $acceptedNotification = TaskNotification::query()
        ->where('user_id', $attraction->id)
        ->where('type', 'attraction_handover_accepted')
        ->sole();
    expect($acceptedNotification->project_id)->toBeNull()
        ->and($acceptedNotification->destination_url)
        ->toBe(route('attraction-handovers.index', absolute: false));

    $this->actingAs($accompaniment)
        ->post(route('project-reserves.accept', $project))
        ->assertStatus(409);
});

test('rejecting a reserve requires a reason and returns it to attraction', function () {
    $region = reserveFlowRegion('Кері қайтару ауданы');
    $attraction = reserveFlowUser('turkistan_invest_attraction', $region);
    $accompaniment = reserveFlowUser('turkistan_invest', $region);
    $project = reserveFlowProject($attraction, $region);

    $this->actingAs($accompaniment)
        ->post(route('project-reserves.reject', $project))
        ->assertSessionHasErrors('rejection_reason');

    expect($project->fresh()->attraction_handover_requested_at)->not->toBeNull();

    $reason = 'Инвестор туралы құжаттар толық емес.';
    $this->post(route('project-reserves.reject', $project), [
        'rejection_reason' => $reason,
    ])->assertSessionHasNoErrors()->assertRedirect();

    $project->refresh();

    expect($project->status)->toBe('plan')
        ->and($project->attraction_stage)->toBe('handover')
        ->and($project->attraction_handover_requested_at)->toBeNull()
        ->and($project->attraction_handover_requested_by)
        ->toBe($attraction->id)
        ->and($project->attraction_handover_accepted_at)->toBeNull()
        ->and($project->attraction_handover_accepted_by)->toBeNull()
        ->and($project->attraction_handover_rejection_reason)->toBe($reason)
        ->and($project->attraction_handover_rejected_at)->not->toBeNull()
        ->and($project->attraction_handover_rejected_by)
        ->toBe($accompaniment->id);

    $this->get(route('project-reserves.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('projects.data', 0));

    $this->actingAs($attraction)
        ->get(route('attraction-handovers.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $project->id)
            ->where('projects.data.0.status', 'plan')
            ->where('projects.data.0.attraction_stage', 'handover')
            ->where(
                'projects.data.0.attraction_handover_rejection_reason',
                $reason
            ));

    $this->get(route('investment-projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canResubmitAttractionHandover', true)
            ->where(
                'project.attraction_handover_rejection_reason',
                $reason
            ));

    expect(KpiLog::query()
        ->where('project_id', $project->id)
        ->where('event', 'attraction.reserve_rejected')
        ->exists())->toBeTrue();

    $rejectedNotification = TaskNotification::query()
        ->where('user_id', $attraction->id)
        ->where('type', 'attraction_handover_rejected')
        ->sole();
    expect($rejectedNotification->project_id)->toBe($project->id)
        ->and($rejectedNotification->message)->toContain($reason);

    $this->actingAs($attraction)
        ->post(route(
            'investment-projects.attraction-handover.resubmit',
            $project
        ))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('attraction-handovers.index'));

    $project->refresh();

    expect($project->attraction_handover_requested_at)->not->toBeNull()
        ->and($project->attraction_handover_requested_by)->toBe($attraction->id)
        ->and($project->attraction_handover_to_id)->toBeNull()
        ->and($project->attraction_handover_rejection_reason)->toBeNull()
        ->and($project->attraction_handover_rejected_at)->toBeNull()
        ->and($project->attraction_handover_rejected_by)->toBeNull();

    expect(KpiLog::query()
        ->where('project_id', $project->id)
        ->where('event', 'attraction.reserve_resubmitted')
        ->exists())->toBeTrue();
});

test('a named attraction handover moves to reserve and notifies support accounts', function () {
    config()->set('services.telegram.bot_token', 'handover-test-token');
    Http::preventStrayRequests();
    Http::fake([
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);

    $region = reserveFlowRegion('Атаулы қабылдау ауданы');
    $otherRegion = reserveFlowRegion('Атаулы өзге аудан');
    $sender = reserveFlowUser('turkistan_invest_attraction', $region);
    $recipient = reserveFlowUser('turkistan_invest_attraction', $region);
    $recipient->update(['telegram_chat_id' => '99887766']);
    $unselected = reserveFlowUser('turkistan_invest_attraction', $region);
    $foreignAttraction = reserveFlowUser(
        'turkistan_invest_attraction',
        $otherRegion
    );
    $accompaniment = reserveFlowUser('turkistan_invest', $region);
    $secondAccompaniment = reserveFlowUser('turkistan_invest', $region);
    $foreignAccompaniment = reserveFlowUser(
        'turkistan_invest',
        $otherRegion
    );
    $project = reserveFlowProject($sender, $region, [
        'name' => 'Таңдалған маман қабылдайтын жоба',
        'attraction_stage' => 'negotiation',
        'attraction_handover_requested_at' => null,
        'attraction_handover_requested_by' => null,
    ]);
    $service = app(ProjectAttractionHandoverService::class);

    $candidateIds = $service->candidates($sender, $project)
        ->pluck('id')
        ->all();
    expect($candidateIds)
        ->toContain($sender->id, $recipient->id, $unselected->id)
        ->not->toContain($foreignAttraction->id, $accompaniment->id);

    expect(fn () => $service->prepare([
        'status' => 'implementation',
    ], $sender, $project))->toThrow(ValidationException::class);

    $prepared = $service->prepare([
        'status' => 'plan',
        'attraction_stage' => 'handover',
        'attraction_handover_to_id' => $recipient->id,
    ], $sender, $project);
    $project->update($prepared);
    $project->refresh();

    expect($service->canAccept($recipient, $project))->toBeTrue()
        ->and($service->canAccept($sender, $project))->toBeFalse()
        ->and($service->canAccept($unselected, $project))->toBeFalse()
        ->and($service->canAccept($accompaniment, $project))->toBeFalse();

    $this->actingAs($recipient)
        ->get(route('investment-projects.show', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.id', $project->id)
            ->where('canAcceptAttractionHandover', true)
            ->where('handoverDecisionMode', 'named-attraction'));

    $this->actingAs($unselected)
        ->get(route('investment-projects.show', $project))
        ->assertForbidden();
    $this->post(
        route('investment-projects.attraction-handover.accept', $project)
    )->assertForbidden();

    $notification = TaskNotification::query()
        ->where('type', 'attraction_handover_requested')
        ->sole();
    $destination = route('investment-projects.show', $project, false);
    expect($notification->user_id)->toBe($recipient->id)
        ->and($notification->project_id)->toBe($project->id)
        ->and($notification->destination_url)->toBe($destination)
        ->and(TaskNotification::visibleTo($recipient)->count())->toBe(1);
    Http::assertSentCount(1);
    Http::assertSent(fn (ClientRequest $request) => $request['chat_id'] === '99887766'
        && str_contains($request['text'], url($destination))
    );

    $project->touch();
    expect(TaskNotification::query()
        ->where('type', 'attraction_handover_requested')
        ->count())->toBe(1);

    $this->actingAs($recipient)
        ->post(route(
            'investment-projects.attraction-handover.accept',
            $project
        ))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $project->refresh();
    expect($project->status)->toBe('plan')
        ->and($project->attraction_stage)->toBe('handover')
        ->and($project->attraction_handover_to_id)->toBeNull()
        ->and($project->attraction_handover_requested_by)
        ->toBe($recipient->id)
        ->and($project->attraction_handover_requested_at)->not->toBeNull()
        ->and($project->attraction_handover_accepted_by)->toBeNull()
        ->and($project->attraction_handover_accepted_at)->toBeNull();

    expect(TaskNotification::query()
        ->where('user_id', $sender->id)
        ->where('type', 'attraction_handover_accepted')
        ->exists())->toBeTrue();

    $reserveRecipientIds = TaskNotification::query()
        ->where('type', 'attraction_handover_requested')
        ->where('project_id', null)
        ->pluck('user_id')
        ->all();
    expect($reserveRecipientIds)
        ->toContain($accompaniment->id, $secondAccompaniment->id)
        ->not->toContain($foreignAccompaniment->id);

    expect(KpiLog::query()
        ->where('project_id', $project->id)
        ->where('event', 'attraction.handover_approved')
        ->exists())->toBeTrue()
        ->and(KpiLog::query()
            ->where('project_id', $project->id)
            ->where('event', 'attraction.reserve_submitted')
            ->exists())->toBeTrue();

    $this->actingAs($accompaniment)
        ->get(route('project-reserves.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $project->id));

    $reserveReason = 'Жоба паспортының деректерін нақтылау қажет.';
    $this->post(route(
        'investment-projects.attraction-handover.reject',
        $project
    ), [
        'rejection_reason' => $reserveReason,
    ])->assertSessionHasNoErrors()
        ->assertRedirect(route('project-reserves.index'));

    $project->refresh();
    expect($project->attraction_handover_to_id)->toBe($recipient->id)
        ->and($project->attraction_handover_requested_by)
        ->toBe($recipient->id)
        ->and($project->attraction_handover_requested_at)->toBeNull()
        ->and($project->attraction_handover_rejection_reason)
        ->toBe($reserveReason);

    $returnedNotification = TaskNotification::query()
        ->where('user_id', $recipient->id)
        ->where('type', 'attraction_handover_rejected')
        ->sole();
    expect($returnedNotification->destination_url)
        ->toBe(route('investment-projects.show', $project, false));

    Http::assertSentCount(2);
    Http::assertSent(fn (ClientRequest $request) => $request['chat_id'] === '99887766'
        && str_contains(
            $request['text'],
            url(route('investment-projects.show', $project, false))
        )
    );
});

test('a named attraction recipient can reject only with a reason', function () {
    $region = reserveFlowRegion('Атаулы кері қайтару ауданы');
    $sender = reserveFlowUser('turkistan_invest_attraction', $region);
    $recipient = reserveFlowUser('turkistan_invest_attraction', $region);
    $project = reserveFlowProject($sender, $region, [
        'name' => 'Атаулы кері қайтарылатын жоба',
        'attraction_handover_to_id' => $recipient->id,
    ]);

    $this->actingAs($recipient)
        ->post(route(
            'investment-projects.attraction-handover.reject',
            $project
        ))
        ->assertSessionHasErrors('rejection_reason');

    expect($project->fresh()->attraction_handover_requested_at)
        ->not->toBeNull();

    $reason = 'Инвестордың байланыс деректері толық емес.';
    $this->post(route(
        'investment-projects.attraction-handover.reject',
        $project
    ), [
        'rejection_reason' => $reason,
    ])->assertSessionHasNoErrors()
        ->assertRedirect(route('attraction-handovers.index'));

    $project->refresh();
    expect($project->status)->toBe('plan')
        ->and($project->attraction_handover_to_id)->toBe($recipient->id)
        ->and($project->attraction_handover_requested_at)->toBeNull()
        ->and($project->attraction_handover_rejection_reason)->toBe($reason)
        ->and($project->attraction_handover_rejected_by)
        ->toBe($recipient->id)
        ->and($project->attraction_handover_rejected_at)->not->toBeNull();

    $notification = TaskNotification::query()
        ->where('user_id', $sender->id)
        ->where('type', 'attraction_handover_rejected')
        ->sole();
    expect($notification->project_id)->toBe($project->id)
        ->and($notification->message)->toContain($reason);

    expect(KpiLog::query()
        ->where('project_id', $project->id)
        ->where('event', 'attraction.handover_rejected')
        ->exists())->toBeTrue();
});

test('pending reserve projects cannot be deleted or archived', function () {
    $region = reserveFlowRegion('Резервті қорғау ауданы');
    $attraction = reserveFlowUser('turkistan_invest_attraction', $region);
    $accompaniment = reserveFlowUser('turkistan_invest', $region);
    $project = reserveFlowProject($attraction, $region);

    $this->actingAs($accompaniment)
        ->delete(route('investment-projects.destroy', $project))
        ->assertStatus(409);
    $this->post(route('investment-projects.archive', $project))
        ->assertStatus(409);

    $project->refresh();
    expect($project->is_deleted)->toBeFalse()
        ->and($project->is_archived)->toBeFalse()
        ->and($project->attraction_handover_requested_at)->not->toBeNull();
});

test('reserve decisions enforce the accompaniment regional boundary', function () {
    $projectRegion = reserveFlowRegion('Жоба резерв ауданы');
    $otherRegion = reserveFlowRegion('Өзге қабылдаушы ауданы');
    $attraction = reserveFlowUser(
        'turkistan_invest_attraction',
        $projectRegion
    );
    $foreignAccompaniment = reserveFlowUser('turkistan_invest', $otherRegion);
    $project = reserveFlowProject($attraction, $projectRegion);

    $this->actingAs($foreignAccompaniment)
        ->post(route('project-reserves.accept', $project))
        ->assertForbidden();
    $this->post(route('project-reserves.reject', $project), [
        'rejection_reason' => 'Басқа аудан шешімі',
    ])->assertForbidden();

    $project->refresh();
    expect($project->status)->toBe('plan')
        ->and($project->attraction_handover_requested_at)->not->toBeNull()
        ->and($project->attraction_handover_accepted_at)->toBeNull()
        ->and($project->attraction_handover_rejected_at)->toBeNull();
});

test('attraction dashboard groups planned projects by investor country', function () {
    $region = reserveFlowRegion('Карта ауданы');
    $attraction = reserveFlowUser('turkistan_invest_attraction', $region);
    $turkeyYear = (int) now()->year;
    $projectStartYear = (int) now()->subYears(2)->year;

    $turkeyProject = reserveFlowProject($attraction, $region, [
        'name' => 'Түркия жобасы 1',
        'attraction_stage' => 'negotiation',
        'attraction_handover_requested_at' => null,
        'attraction_handover_requested_by' => null,
        'investor_country_code' => 'TR',
        'total_investment' => 100000000,
        'jobs_count' => 40,
        'start_date' => now()->subYears(2)->startOfYear(),
        'planning_started_at' => now()->subDay(),
    ]);
    $turkeyProject->forceFill(['created_at' => now()->subDay()])->saveQuietly();
    $turkeyProject->issues()->create([
        'title' => 'Инфрақұрылым мәселесі',
        'description' => 'Инфрақұрылым мәселесі',
        'severity' => 'medium',
    ]);
    $turkeyProject->issues()->create([
        'title' => 'Құжат мәселесі',
        'description' => 'Құжат мәселесі',
        'severity' => 'low',
    ]);

    $newestTurkeyProject = reserveFlowProject($attraction, $region, [
        'name' => 'Түркия жобасы 2',
        'attraction_stage' => 'conditions',
        'attraction_handover_requested_at' => null,
        'attraction_handover_requested_by' => null,
        'investor_country_code' => 'TR',
        'total_investment' => 150000000,
        'jobs_count' => 60,
        'start_date' => null,
        'planning_started_at' => now(),
    ]);
    $newestTurkeyProject->forceFill(['created_at' => now()])->saveQuietly();
    reserveFlowProject($attraction, $region, [
        'name' => 'Германия жобасы',
        'attraction_stage' => 'potential',
        'attraction_handover_requested_at' => null,
        'attraction_handover_requested_by' => null,
        'investor_country_code' => 'DE',
        'total_investment' => 300000000,
        'jobs_count' => 70,
        'start_date' => now()->subYear()->startOfYear(),
    ]);
    reserveFlowProject($attraction, $region, [
        'name' => 'Елі белгіленбеген жоба',
        'attraction_stage' => 'potential',
        'attraction_handover_requested_at' => null,
        'attraction_handover_requested_by' => null,
        'investor_country_code' => null,
    ]);
    reserveFlowProject($attraction, $region, [
        'name' => 'Шешімді күткен резерв жобасы',
        'investor_country_code' => 'TR',
        'total_investment' => 900000000,
    ]);

    $this->actingAs($attraction)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where(
            'attractionCountries',
            function ($countries) use (
                $newestTurkeyProject,
                $projectStartYear,
                $turkeyProject,
                $turkeyYear
            ) {
                $byCode = collect($countries)->keyBy('country_code');
                $turkey = $byCode->get('TR');
                $year = collect($turkey['yearly'])->firstWhere(
                    'year',
                    $turkeyYear
                );
                $startYear = collect($turkey['yearly'])->firstWhere(
                    'year',
                    $projectStartYear
                );

                return $byCode->keys()->sort()->values()->all()
                        === ['DE', 'TR']
                    && $turkey['project_count'] === 2
                    && (float) $turkey['total_investment'] === 250000000.0
                    && $turkey['jobs_count'] === 100
                    && $turkey['issues_count'] === 2
                    && count($turkey['yearly']) === 5
                    && (float) $year['investment'] === 250000000.0
                    && $year['projects'] === 2
                    && $year['jobs'] === 100
                    && $year['issues'] === 2
                    && $startYear['projects'] === 0
                    && count($turkey['projects']) === 2
                    && collect($turkey['projects'])->pluck('id')->all()
                        === [$newestTurkeyProject->id, $turkeyProject->id]
                    && filled($turkey['projects'][0]['created_at'])
                    && is_numeric($turkey['latitude'])
                    && is_numeric($turkey['longitude']);
            }
        ));
});

test('attraction project creation requires a valid investor country', function () {
    $region = reserveFlowRegion('Елді тексеру ауданы');
    $attraction = reserveFlowUser('turkistan_invest_attraction', $region);
    $payload = [
        'name' => 'Инвестор елі бар жоба',
        'region_id' => $region->id,
        'status' => 'plan',
        'attraction_stage' => 'potential',
        'total_investment' => 1000000,
    ];

    $this->actingAs($attraction)
        ->post(route('investment-projects.store'), $payload)
        ->assertSessionHasErrors('investor_country_code');

    $this->post(route('investment-projects.store'), [
        ...$payload,
        'investor_country_code' => 'ZZ',
    ])->assertSessionHasErrors('investor_country_code');

    $this->post(route('investment-projects.store'), [
        ...$payload,
        'investor_country_code' => 'tr',
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect(InvestmentProject::where('name', $payload['name'])->sole()
        ->investor_country_code)->toBe('TR');
});
