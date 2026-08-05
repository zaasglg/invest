<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('profile page is displayed', function () {
    config()->set('services.telegram.bot_url', 'https://t.me/invest_test_bot');

    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where(
                'telegramBotUrl',
                'https://t.me/invest_test_bot'
            )
        );
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'full_name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->full_name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
});

test('user can update their own telegram id', function () {
    $user = User::factory()->create([
        'telegram_chat_id' => '111111111',
    ]);

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'full_name' => $user->full_name,
            'email' => $user->email,
            'telegram_chat_id' => '987654321',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->telegram_chat_id)->toBe('987654321');
});

test('telegram id must contain only numbers', function () {
    $user = User::factory()->create([
        'telegram_chat_id' => '111111111',
    ]);

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), [
            'full_name' => $user->full_name,
            'email' => $user->email,
            'telegram_chat_id' => '@telegram-user',
        ])
        ->assertSessionHasErrors('telegram_chat_id')
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->telegram_chat_id)->toBe('111111111');
});

test('user can remove their telegram id', function () {
    $user = User::factory()->create([
        'telegram_chat_id' => '111111111',
    ]);

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'full_name' => $user->full_name,
            'email' => $user->email,
            'telegram_chat_id' => '',
        ])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->telegram_chat_id)->toBeNull();
});

test('user cannot delete their own account', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->delete('/settings/profile')
        ->assertMethodNotAllowed();

    $this->assertAuthenticatedAs($user);
    expect($user->fresh())->not->toBeNull();
});
