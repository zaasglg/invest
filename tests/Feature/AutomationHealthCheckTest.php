<?php

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

test('automation check validates telegram without sending notifications', function () {
    config()->set('services.telegram.bot_token', 'automation-check-token');
    Http::fake([
        'api.telegram.org/*' => Http::response([
            'ok' => true,
            'result' => ['username' => 'automation_check_bot'],
        ]),
    ]);

    $this->artisan('automation:check')->assertSuccessful();

    Http::assertSent(fn (Request $request) => str_ends_with(
        $request->url(),
        '/getMe'
    ));
    Http::assertSentCount(1);
});

test('automation check can send one explicit telegram test message', function () {
    config()->set('services.telegram.bot_token', 'automation-check-token');
    Http::fake([
        'api.telegram.org/*' => Http::response([
            'ok' => true,
            'result' => ['username' => 'automation_check_bot'],
        ]),
    ]);

    $this->artisan('automation:check', [
        '--send-test-to' => '123456789',
    ])->assertSuccessful();

    Http::assertSent(fn (Request $request) => str_ends_with(
        $request->url(),
        '/sendMessage'
    ) && $request['chat_id'] === '123456789');
    Http::assertSentCount(2);
});
