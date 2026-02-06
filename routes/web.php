<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', \App\Http\Controllers\DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::resource('project-types', \App\Http\Controllers\ProjectTypeController::class)
    ->middleware(['auth', 'verified', 'role.access']);

Route::resource('regions', \App\Http\Controllers\RegionController::class)
    ->middleware(['auth', 'verified', 'role.access']);

Route::resource('sezs', \App\Http\Controllers\SezController::class)
    ->middleware(['auth', 'verified', 'role.access']);

Route::resource('industrial-zones', \App\Http\Controllers\IndustrialZoneController::class)
    ->middleware(['auth', 'verified', 'role.access']);

Route::resource('subsoil-users', \App\Http\Controllers\SubsoilUserController::class)
    ->middleware(['auth', 'verified', 'role.access']);

Route::resource('investment-projects', \App\Http\Controllers\InvestmentProjectController::class)
    ->middleware(['auth', 'verified', 'role.access']);

Route::prefix('investment-projects/{investmentProject}')->middleware(['auth', 'verified', 'role.access'])->group(function () {
    Route::get('documents', [\App\Http\Controllers\ProjectDocumentController::class, 'index'])->name('investment-projects.documents.index');
    Route::post('documents', [\App\Http\Controllers\ProjectDocumentController::class, 'store'])->name('investment-projects.documents.store');
    Route::delete('documents/{document}', [\App\Http\Controllers\ProjectDocumentController::class, 'destroy'])->name('investment-projects.documents.destroy');

    Route::get('gallery', [\App\Http\Controllers\ProjectPhotoController::class, 'index'])->name('investment-projects.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\ProjectPhotoController::class, 'store'])->name('investment-projects.gallery.store');
    Route::put('gallery/{photo}', [\App\Http\Controllers\ProjectPhotoController::class, 'update'])->name('investment-projects.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\ProjectPhotoController::class, 'destroy'])->name('investment-projects.gallery.destroy');
});

Route::resource('roles', \App\Http\Controllers\RoleController::class)
    ->middleware(['auth', 'verified', 'role.access']);

Route::resource('users', \App\Http\Controllers\UserController::class)
    ->middleware(['auth', 'verified', 'role.access']);

require __DIR__ . '/settings.php';
