<?php

use App\Models\Role;
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
        ->and($user->email_verified_at)->toBeNull()
        ->and($user->requires_email_verification)->toBeTrue();
    $response->assertRedirect(route('dashboard', absolute: false));
    $this->get(route('applicant.portal'))
        ->assertRedirect(route('verification.notice'));
    Notification::assertSentTo($user, VerifyEmailNotification::class);
});

test('legacy accounts do not require email verification to enter the portal', function (string $roleName) {
    $role = Role::query()->firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );
    $user = User::factory()->create([
        'role' => 'district_user',
        'role_id' => $role->id,
        'email_verified_at' => null,
        'requires_email_verification' => false,
    ]);

    $this->actingAs($user)
        ->get(route('applicant.portal'))
        ->assertOk();
})->with(['applicant', 'investor']);

test('registered applicant can enter the portal after email verification', function () {
    Notification::fake();

    $this->post(route('register.store'), [
        'full_name' => 'Verified Applicant',
        'email' => 'verified-applicant@example.com',
        'phone' => '+7 702 000 00 00',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::query()
        ->where('email', 'verified-applicant@example.com')
        ->firstOrFail();
    $user->markEmailAsVerified();

    $this->actingAs($user->fresh())
        ->get(route('applicant.portal'))
        ->assertOk();
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
