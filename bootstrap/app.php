<?php

use App\Http\Middleware\AuthenticateApiClient;
use App\Http\Middleware\CheckRoleAccess;
use App\Http\Middleware\EnsureApplicantRole;
use App\Http\Middleware\EnsureApplicationReviewer;
use App\Http\Middleware\EnsureNotApplicant;
use App\Http\Middleware\EnsureSupportedRole;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'api.client' => AuthenticateApiClient::class,
            'role.access' => CheckRoleAccess::class,
            'role.valid' => EnsureSupportedRole::class,
            'role.applicant' => EnsureApplicantRole::class,
            'role.application-reviewer' => EnsureApplicationReviewer::class,
            'role.not-applicant' => EnsureNotApplicant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
