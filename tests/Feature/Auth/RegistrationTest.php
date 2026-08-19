<?php

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Support\Facades\Notification;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    Notification::fake();

    $response = $this->post(route('register.store'), [
        'full_name' => 'Test User',
        'email' => 'test@example.com',
        'phone' => '+7 700 000 00 00',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::query()->where('email', 'test@example.com')->firstOrFail();

    $this->assertAuthenticatedAs($user);
    expect($user->roleModel?->name)->toBe('applicant')
        ->and($user->phone)->toBe('+7 700 000 00 00')
        ->and($user->email_verified_at)->toBeNull();
    $response->assertRedirect(route('dashboard', absolute: false));
    Notification::assertSentTo($user, VerifyEmailNotification::class);
});

test('verification email uses the localized branded template', function () {
    Notification::fake();

    $this->post(route('register.store'), [
        'full_name' => 'Тест Пайдаланушы',
        'email' => 'localized@example.com',
        'phone' => '+7 701 000 00 00',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::query()->where('email', 'localized@example.com')->firstOrFail();

    Notification::assertSentTo(
        $user,
        VerifyEmailNotification::class,
        function (VerifyEmailNotification $notification) use ($user) {
            $message = $notification->toMail($user);

            expect($message->subject)
                ->toBe('IN-MAP · Email мекенжайыңызды растаңыз')
                ->and($message->view)
                ->toBe([
                    'html' => 'emails.auth.verify-email',
                    'text' => 'emails.auth.verify-email-text',
                ])
                ->and($message->viewData['url'])
                ->toContain('/email/verify/')
                ->and($message->viewData['user']->is($user))
                ->toBeTrue();

            return true;
        }
    );
});
