<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\TelegramNotificationDeliveryService;
use Illuminate\Support\Facades\Http;

function deliveryFixture(): array
{
    $role = Role::firstOrCreate(['name' => 'superadmin'], ['display_name' => 'Әкімші']);
    $user = User::factory()->create(['role_id' => $role->id, 'telegram_chat_id' => '1234']);
    $region = Region::create(['name' => 'Test', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
    $project = InvestmentProject::create(['name' => 'Жоба', 'status' => 'plan', 'region_id' => $region->id, 'created_by' => $user->id]);
    $project->curators()->attach($user);

    return [$user, $project];
}

beforeEach(function () {
    config()->set('services.telegram.bot_token', 'test-token');
    Http::preventStrayRequests();
});

test('failed telegram delivery retries from persisted outbox without duplicating site notification', function () {
    [$user, $project] = deliveryFixture();
    Http::fake(['api.telegram.org/*' => Http::sequence()->push([], 500)->push(['ok' => true])]);
    $notification = TaskNotification::create([
        'user_id' => $user->id, 'project_id' => $project->id,
        'type' => 'attraction_handover_requested', 'message' => 'Жоба <А>',
    ])->fresh();
    expect($notification->telegram_status)->toBe('retry')->and($notification->telegram_attempts)->toBe(1);
    app(TelegramNotificationDeliveryService::class)->deliver($notification->id);
    Http::assertSentCount(1);
    $this->travel(3)->minutes();
    $this->artisan('notifications:retry-telegram')->assertSuccessful();
    expect($notification->fresh()->telegram_status)->toBe('sent')
        ->and($notification->fresh()->telegram_sent_at)->not->toBeNull()
        ->and(TaskNotification::count())->toBe(1);
    $this->artisan('notifications:retry-telegram')->assertSuccessful();
    Http::assertSentCount(2);
});

test('retry stops after access is removed or the project is archived', function () {
    [$user, $project] = deliveryFixture();
    Http::fake(['api.telegram.org/*' => Http::response([], 500)]);
    $notification = TaskNotification::create([
        'user_id' => $user->id, 'project_id' => $project->id,
        'type' => 'attraction_handover_requested', 'message' => 'Жоба',
    ]);
    $project->update(['is_archived' => true]);
    $this->travel(3)->minutes();
    $this->artisan('notifications:retry-telegram')->assertSuccessful();
    expect($notification->fresh()->telegram_status)->toBe('skipped');
    Http::assertSentCount(1);
});

test('attraction reminders are deduplicated and ignore declined closed and review work', function () {
    [$user, $project] = deliveryFixture();
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);
    foreach (['planned', 'completed', 'pending_review', 'cancelled'] as $status) {
        $project->attractionActivities()->create([
            'attraction_stage' => 'negotiation', 'next_action' => $status,
            'next_action_due_date' => today()->subDay(), 'responsible_id' => $user->id,
            'created_by' => $user->id, 'status' => $status,
        ]);
    }
    $this->artisan('attraction:notify-deadlines')->assertSuccessful();
    $this->artisan('attraction:notify-deadlines')->assertSuccessful();
    expect(TaskNotification::where('type', 'attraction_overdue')->count())->toBe(1);
    $project->update(['attraction_stage' => 'declined']);
    $this->travel(1)->days();
    $this->artisan('attraction:notify-deadlines')->assertSuccessful();
    expect(TaskNotification::count())->toBe(1);
});
