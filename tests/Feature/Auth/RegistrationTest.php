<?php

test('registration screen can be rendered', function () {
    $this->markTestSkipped('Registration is disabled.');
});

test('new users can register', function () {
    $this->markTestSkipped('Registration is disabled.');
    $response = $this->post(route('register.store'), [
        'full_name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

});
