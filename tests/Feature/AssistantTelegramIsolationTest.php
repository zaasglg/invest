<?php

use App\Models\TaskNotification;
use App\Models\User;
use App\Observers\TaskNotificationObserver;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

test('action helper notifications stay on the site while ordinary notifications use telegram', function () {
    config()->set('services.telegram.bot_token', 'assistant-isolation-token');
    Http::fake([
        'api.telegram.org/*' => Http::response(['ok' => true], 200),
    ]);

    $user = User::factory()->create([
        'telegram_chat_id' => '123456789',
    ]);
    $observer = app(TaskNotificationObserver::class);

    foreach (TaskNotification::ASSISTANT_TYPES as $type) {
        $notification = TaskNotification::withoutEvents(
            fn () => TaskNotification::create([
                'user_id' => $user->id,
                'type' => $type,
                'message' => 'Іс-қимыл көмекшісінің ескертуі',
            ])
        );

        $observer->created($notification);
    }

    Http::assertNothingSent();

    $ordinaryNotification = TaskNotification::withoutEvents(
        fn () => TaskNotification::create([
            'user_id' => $user->id,
            'type' => 'task_assigned',
            'message' => 'Жаңа тапсырма берілді',
        ])
    );
    $observer->created($ordinaryNotification);

    Http::assertSent(fn (Request $request) => $request['chat_id'] === '123456789'
        && str_contains($request['text'], 'Жаңа тапсырма берілді')
    );
    Http::assertSentCount(1);
});
