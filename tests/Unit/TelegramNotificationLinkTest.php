<?php

use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Contracts\LoginResponse;
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

test('login returns a telegram visitor to the linked project', function () {
    Route::get(
        '/telegram-login-response-test',
        function (Request $request, LoginResponse $response) {
            return $response->toResponse($request);
        }
    )->middleware('web');

    $projectUrl = 'https://invest.example/investment-projects/127';

    $this->get($projectUrl)
        ->assertRedirect('https://invest.example/login');

    expect(session('url.intended'))->toBe($projectUrl);

    $this->get('https://invest.example/telegram-login-response-test')
        ->assertRedirect($projectUrl);
});
