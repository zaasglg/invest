<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\ProjectAttractionService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

function attractionNotificationUser(string $role, array $attributes = []): User
{
    return User::factory()->create([
        'role' => $role === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => Role::firstOrCreate(['name' => $role], ['display_name' => $role])->id,
        ...$attributes,
    ]);
}

function attractionNotificationProject(User $manager): InvestmentProject
{
    $region = Region::create([
        'name' => 'Notification district', 'type' => 'district',
        'color' => '#123456', 'icon' => 'factory',
    ]);
    $project = InvestmentProject::create([
        'name' => 'Жоба <А> & Б',
        'region_id' => $region->id,
        'status' => 'plan',
        'investment_amount_type' => 'unknown',
        'created_by' => $manager->id,
    ]);
    $project->curators()->attach($manager);

    return $project;
}

function attractionNotificationPayload(User $responsible, array $overrides = []): array
{
    return [
        'attraction_stage' => 'negotiation',
        'next_action' => 'Кездесу <А> & Б',
        'next_action_due_date' => today()->addWeek()->toDateString(),
        'responsible_id' => $responsible->id,
        ...$overrides,
    ];
}

beforeEach(function () {
    config()->set('services.telegram.bot_token', 'attraction-test-token');
    Http::preventStrayRequests();
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);
});

test('attraction assignment notifies its responsible account and telegram with a safe project link', function () {
    $manager = attractionNotificationUser('superadmin');
    $project = attractionNotificationProject($manager);
    $responsible = attractionNotificationUser('ispolnitel', [
        'region_id' => $project->region_id,
        'telegram_chat_id' => '123456789',
    ]);
    $project->executors()->attach($responsible);

    $this->actingAs($manager)
        ->post(route('investment-projects.attraction-activities.store', $project), attractionNotificationPayload($responsible))
        ->assertSessionHasNoErrors()->assertRedirect();

    $activity = $project->attractionActivities()->sole();
    $notification = TaskNotification::query()->sole();
    $destination = route('investment-projects.show', $project, false).'#project-attraction';

    expect($notification->user_id)->toBe($responsible->id)
        ->and($notification->attraction_activity_id)->toBe($activity->id)
        ->and($notification->type)->toBe('attraction_assigned')
        ->and($notification->is_read)->toBeFalse()
        ->and($notification->destination_url)->toBe($destination)
        ->and(TaskNotification::visibleTo($responsible)->count())->toBe(1);
    Http::assertSentCount(1);
    Http::assertSent(fn (ClientRequest $request) => $request['chat_id'] === '123456789'
        && str_contains($request['text'], 'Кездесу &lt;А&gt; &amp; Б')
        && str_contains($request['text'], url($destination))
    );

    $this->actingAs($responsible)->get(route('notifications.unread-count'))
        ->assertOk()->assertJsonPath('count', 1);
    $this->post(route('notifications.open', $notification))->assertRedirect($destination);
    expect($notification->fresh()->is_read)->toBeTrue();
});

test('editing does not duplicate an assignment but changing responsible notifies the new user', function () {
    $manager = attractionNotificationUser('superadmin');
    $project = attractionNotificationProject($manager);
    $first = attractionNotificationUser('ispolnitel', ['region_id' => $project->region_id]);
    $second = attractionNotificationUser('ispolnitel', ['region_id' => $project->region_id]);
    $project->executors()->attach([$first->id, $second->id]);
    $service = app(ProjectAttractionService::class);
    $payload = attractionNotificationPayload($first);
    $service->save($manager, $project, $payload);
    $activity = $project->attractionActivities()->sole();

    $service->save($manager, $project, [...$payload, 'next_action' => 'Кездесуді дайындау'], $activity);
    expect(TaskNotification::count())->toBe(1);
    $service->save($manager, $project, attractionNotificationPayload($second), $activity);

    expect(TaskNotification::count())->toBe(2)
        ->and(TaskNotification::visibleTo($first)->count())->toBe(0)
        ->and(TaskNotification::visibleTo($second)->sole()->user_id)->toBe($second->id);
    Http::assertNothingSent();
});

test('cancelled and self assigned activities do not send assignment notifications', function () {
    $manager = attractionNotificationUser('superadmin');
    $project = attractionNotificationProject($manager);
    $responsible = attractionNotificationUser('ispolnitel', ['region_id' => $project->region_id]);
    $project->executors()->attach($responsible);
    $service = app(ProjectAttractionService::class);

    $service->save($manager, $project, attractionNotificationPayload($manager));
    $service->save($manager, $project, attractionNotificationPayload($responsible, ['status' => 'cancelled']));
    expect(TaskNotification::count())->toBe(0);

    $cancelled = $project->attractionActivities()->where('status', 'cancelled')->sole();
    $service->save($manager, $project, attractionNotificationPayload($responsible, ['status' => 'planned']), $cancelled);
    expect(TaskNotification::count())->toBe(1);
    Http::assertNothingSent();
});

test('attraction notifications are hidden when the recipient loses project access or involvement', function () {
    $manager = attractionNotificationUser('superadmin');
    $project = attractionNotificationProject($manager);
    $responsible = attractionNotificationUser('ispolnitel', ['region_id' => $project->region_id]);
    $project->executors()->attach($responsible);
    app(ProjectAttractionService::class)->save($manager, $project, attractionNotificationPayload($responsible));
    $notification = TaskNotification::query()->sole();

    expect(TaskNotification::visibleTo($responsible)->count())->toBe(1);
    $project->executors()->detach($responsible);
    expect(TaskNotification::visibleTo($responsible)->count())->toBe(0);
    $this->actingAs($responsible)->post(route('notifications.open', $notification))->assertForbidden();

    $project->executors()->attach($responsible);
    $project->update(['is_archived' => true]);
    expect(TaskNotification::visibleTo($responsible)->count())->toBe(0);
});

test('moderators receive visible attraction assignments without reviving planned roadmap notifications', function () {
    $manager = attractionNotificationUser('invest', ['invest_sub_role' => 'turkistan_invest']);
    $project = attractionNotificationProject($manager);
    $responsible = attractionNotificationUser('moderator');
    $project->curators()->attach($responsible);
    app(ProjectAttractionService::class)->save($manager, $project, attractionNotificationPayload($responsible));

    expect(TaskNotification::visibleTo($responsible)->count())->toBe(1);
    $project->curators()->detach([$manager->id, $responsible->id]);
    expect(TaskNotification::visibleTo($responsible)->count())->toBe(0);
});

test('rolled back activity creation sends neither site nor telegram notifications', function () {
    $manager = attractionNotificationUser('superadmin');
    $project = attractionNotificationProject($manager);
    $responsible = attractionNotificationUser('ispolnitel', [
        'region_id' => $project->region_id, 'telegram_chat_id' => '123456789',
    ]);
    $project->executors()->attach($responsible);

    try {
        DB::transaction(function () use ($manager, $project, $responsible) {
            app(ProjectAttractionService::class)->save($manager, $project, attractionNotificationPayload($responsible));
            throw new RuntimeException('Rollback assignment');
        });
    } catch (RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Rollback assignment');
    }

    expect(TaskNotification::count())->toBe(0)
        ->and($project->attractionActivities()->count())->toBe(0);
    Http::assertNothingSent();
});

test('deleting an attraction activity removes its obsolete notifications', function () {
    $manager = attractionNotificationUser('superadmin');
    $project = attractionNotificationProject($manager);
    $responsible = attractionNotificationUser('ispolnitel', ['region_id' => $project->region_id]);
    $project->executors()->attach($responsible);
    $service = app(ProjectAttractionService::class);
    $service->save($manager, $project, attractionNotificationPayload($responsible));

    $service->delete($manager, $project, $project->attractionActivities()->sole());

    expect(TaskNotification::count())->toBe(0);
});
