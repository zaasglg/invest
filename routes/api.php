<?php

use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\InvestmentProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->name('api.v1.')
    ->middleware(['throttle:60,1', 'api.client'])
    ->group(function (): void {
        Route::apiResource('companies', CompanyController::class)
            ->only('index');
        Route::apiResource('projects', InvestmentProjectController::class)
            ->only('index');
    });
