<?php

use App\Models\Role;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $role = Role::create([
        'name' => 'superadmin',
        'display_name' => 'Superadmin',
    ]);
    $user = User::factory()->create(['role_id' => $role->id]);
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('legacy account is not redirected to email verification', function () {
    $role = Role::create([
        'name' => 'superadmin',
        'display_name' => 'Superadmin',
    ]);
    $user = User::factory()->create([
        'role_id' => $role->id,
        'email_verified_at' => null,
        'requires_email_verification' => false,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk();
});
