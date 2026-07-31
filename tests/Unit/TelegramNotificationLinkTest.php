<?php

use App\Services\TelegramService;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

uses(TestCase::class);

test('telegram notification links to the exact project on the current site', function () {
    Route::get('/telegram-link-test/{projectId}', function (
        int $projectId,
        TelegramService $telegram
    ) {
        return $telegram->formatNotification(
            'task_assigned',
            'Тест тапсырмасы',
            $projectId
        );
    });

    $response = $this->get(
        'https://invest.example/telegram-link-test/127'
    );

    $response
        ->assertOk()
        ->assertSee(
            'href="https://invest.example/investment-projects/127"',
            false
        )
        ->assertDontSee('/notifications', false);
});
