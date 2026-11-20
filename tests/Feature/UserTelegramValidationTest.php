<?php

use App\Models\Role;
use App\Models\User;

test('administrator user forms accept only numeric telegram chat ids', function () {
    $role = Role::firstOrCreate(
        ['name' => 'superadmin'],
        ['display_name' => 'Әкімші']
    );
    $admin = User::factory()->create([
        'role' => 'admin',
        'role_id' => $role->id,
    ]);
    $target = User::factory()->create([
        'role' => 'admin',
        'role_id' => $role->id,
        'telegram_chat_id' => '111111111',
    ]);

    $this->actingAs($admin)
        ->post(route('users.store'), [
            'full_name' => 'Жаңа қызметкер',
            'email' => 'telegram-validation@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role_id' => $role->id,
            'telegram_chat_id' => '@invalid-user',
        ])
        ->assertSessionHasErrors('telegram_chat_id');

    expect(User::query()
        ->where('email', 'telegram-validation@example.test')
        ->exists())->toBeFalse();

    $this->actingAs($admin)
        ->put(route('users.update', $target), [
            'full_name' => $target->full_name,
            'email' => $target->email,
            'role_id' => $role->id,
            'telegram_chat_id' => 'chat-id',
        ])
        ->assertSessionHasErrors('telegram_chat_id');

    expect($target->fresh()->telegram_chat_id)->toBe('111111111');

    $this->actingAs($admin)
        ->put(route('users.update', $target), [
            'full_name' => $target->full_name,
            'email' => $target->email,
            'role_id' => $role->id,
            'telegram_chat_id' => '-100123456789',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('users.index'));

    expect($target->fresh()->telegram_chat_id)->toBe('-100123456789');
});
