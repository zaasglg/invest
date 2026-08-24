<?php

use App\Models\ProjectTask;
use App\Models\SubsoilTask;
use App\Models\SubsoilTaskCompletion;
use App\Models\TaskCompletion;
use App\Models\TaskNotification;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Contracts\LoginResponse;
use Tests\TestCase;

uses(TestCase::class);

test('all project telegram notification types link to the exact project', function () {
    Route::get('/telegram-link-test/{projectId}', function (
        Request $request,
        int $projectId,
        TelegramService $telegram
    ) {
        return $telegram->formatNotification(
            $request->string('type')->toString(),
            'Тест тапсырмасы',
            $projectId
        );
    });

    $types = [
        'task_assigned',
        'task_pending_approval',
        'task_approved',
        'task_rejected',
        'completion_submitted',
        'completion_approved',
        'completion_rejected',
        'photo_missing',
    ];

    foreach ($types as $type) {
        $response = $this->get(
            'https://invest.example/telegram-link-test/127?type='.$type
        );

        $response
            ->assertOk()
            ->assertSee(
                'href="https://invest.example/investment-projects/127"',
                false
            )
            ->assertDontSee('/notifications', false);
    }
});

test('all subsoil telegram notification types link to the exact record', function () {
    Route::get('/telegram-subsoil-link-test/{subsoilUserId}', function (
        Request $request,
        int $subsoilUserId,
        TelegramService $telegram
    ) {
        return $telegram->formatNotificationForTarget(
            $request->string('type')->toString(),
            'Тест тапсырмасы',
            route('subsoil-users.show', $subsoilUserId)
        );
    });

    $types = [
        'task_assigned',
        'completion_submitted',
        'completion_approved',
        'completion_rejected',
    ];

    foreach ($types as $type) {
        $response = $this->get(
            'https://invest.example/telegram-subsoil-link-test/88?type='
            .$type
        );

        $response
            ->assertOk()
            ->assertSee(
                'href="https://invest.example/subsoil-users/88"',
                false
            )
            ->assertDontSee('/notifications', false);
    }
});

test('telegram project id is resolved from task and completion relations', function () {
    $task = (new ProjectTask)->forceFill(['project_id' => 127]);
    $completion = (new TaskCompletion)->setRelation('task', $task);

    $taskNotification = (new TaskNotification)
        ->setRelation('task', $task)
        ->setRelation('completion', null);
    $completionNotification = (new TaskNotification)
        ->setRelation('task', null)
        ->setRelation('completion', $completion);

    expect($taskNotification->telegramProjectId())->toBe(127)
        ->and($completionNotification->telegramProjectId())->toBe(127);
});

test('telegram subsoil id is resolved from task and completion relations', function () {
    $task = (new SubsoilTask)->forceFill(['subsoil_user_id' => 88]);
    $completion = (new SubsoilTaskCompletion)->setRelation('task', $task);

    $taskNotification = (new TaskNotification)
        ->setRelation('subsoilTask', $task)
        ->setRelation('subsoilCompletion', null);
    $completionNotification = (new TaskNotification)
        ->setRelation('subsoilTask', null)
        ->setRelation('subsoilCompletion', $completion);

    expect($taskNotification->telegramSubsoilUserId())->toBe(88)
        ->and($completionNotification->telegramSubsoilUserId())->toBe(88);
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
