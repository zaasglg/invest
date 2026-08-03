<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Laravel\Fortify\Features;

test('two factor authentication is fully disabled', function () {
    expect(Features::canManageTwoFactorAuthentication())->toBeFalse()
        ->and(Route::has('two-factor.show'))->toBeFalse()
        ->and(Route::has('two-factor.login'))->toBeFalse()
        ->and(Route::has('two-factor.enable'))->toBeFalse();
});

test('two factor endpoints are unavailable', function () {
    $this->get('/settings/two-factor')->assertNotFound();
    $this->get('/two-factor-challenge')->assertNotFound();
    $this->post('/user/two-factor-authentication')->assertNotFound();
});

test('two factor secrets are not stored on users', function () {
    expect(Schema::hasColumn('users', 'two_factor_secret'))->toBeFalse()
        ->and(Schema::hasColumn('users', 'two_factor_recovery_codes'))
        ->toBeFalse()
        ->and(Schema::hasColumn('users', 'two_factor_confirmed_at'))
        ->toBeFalse();
});
