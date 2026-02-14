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
    Route::get('passport', [\App\Http\Controllers\InvestmentProjectController::class, 'passport'])->name('investment-projects.passport');

    Route::get('documents', [\App\Http\Controllers\ProjectDocumentController::class, 'index'])->name('investment-projects.documents.index');
    Route::post('documents', [\App\Http\Controllers\ProjectDocumentController::class, 'store'])->name('investment-projects.documents.store');
    Route::delete('documents/{document}', [\App\Http\Controllers\ProjectDocumentController::class, 'destroy'])->name('investment-projects.documents.destroy');

    Route::get('gallery', [\App\Http\Controllers\ProjectPhotoController::class, 'index'])->name('investment-projects.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\ProjectPhotoController::class, 'store'])->name('investment-projects.gallery.store');
    Route::put('gallery/{photo}', [\App\Http\Controllers\ProjectPhotoController::class, 'update'])->name('investment-projects.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\ProjectPhotoController::class, 'destroy'])->name('investment-projects.gallery.destroy');

    Route::get('issues', [\App\Http\Controllers\ProjectIssueController::class, 'index'])->name('investment-projects.issues.index');
    Route::post('issues', [\App\Http\Controllers\ProjectIssueController::class, 'store'])->name('investment-projects.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\ProjectIssueController::class, 'update'])->name('investment-projects.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\ProjectIssueController::class, 'destroy'])->name('investment-projects.issues.destroy');
});

Route::prefix('sezs/{sez}')->middleware(['auth', 'verified', 'role.access'])->group(function () {
    Route::get('issues', [\App\Http\Controllers\SezIssueController::class, 'index'])->name('sezs.issues.index');
    Route::post('issues', [\App\Http\Controllers\SezIssueController::class, 'store'])->name('sezs.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\SezIssueController::class, 'update'])->name('sezs.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\SezIssueController::class, 'destroy'])->name('sezs.issues.destroy');
});

Route::prefix('industrial-zones/{industrialZone}')->middleware(['auth', 'verified', 'role.access'])->group(function () {
    Route::get('issues', [\App\Http\Controllers\IndustrialZoneIssueController::class, 'index'])->name('industrial-zones.issues.index');
    Route::post('issues', [\App\Http\Controllers\IndustrialZoneIssueController::class, 'store'])->name('industrial-zones.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\IndustrialZoneIssueController::class, 'update'])->name('industrial-zones.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\IndustrialZoneIssueController::class, 'destroy'])->name('industrial-zones.issues.destroy');
});

Route::prefix('subsoil-users/{subsoilUser}')->middleware(['auth', 'verified', 'role.access'])->group(function () {
    Route::get('passport', [\App\Http\Controllers\SubsoilUserController::class, 'passport'])->name('subsoil-users.passport');

    Route::get('issues', [\App\Http\Controllers\SubsoilIssueController::class, 'index'])->name('subsoil-users.issues.index');
    Route::post('issues', [\App\Http\Controllers\SubsoilIssueController::class, 'store'])->name('subsoil-users.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\SubsoilIssueController::class, 'update'])->name('subsoil-users.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\SubsoilIssueController::class, 'destroy'])->name('subsoil-users.issues.destroy');

    Route::get('documents', [\App\Http\Controllers\SubsoilDocumentController::class, 'index'])->name('subsoil-users.documents.index');
    Route::post('documents', [\App\Http\Controllers\SubsoilDocumentController::class, 'store'])->name('subsoil-users.documents.store');
    Route::delete('documents/{document}', [\App\Http\Controllers\SubsoilDocumentController::class, 'destroy'])->name('subsoil-users.documents.destroy');

    Route::get('gallery', [\App\Http\Controllers\SubsoilPhotoController::class, 'index'])->name('subsoil-users.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\SubsoilPhotoController::class, 'store'])->name('subsoil-users.gallery.store');
    Route::put('gallery/{photo}', [\App\Http\Controllers\SubsoilPhotoController::class, 'update'])->name('subsoil-users.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\SubsoilPhotoController::class, 'destroy'])->name('subsoil-users.gallery.destroy');
});

Route::resource('roles', \App\Http\Controllers\RoleController::class)
    ->middleware(['auth', 'verified', 'role.access']);

Route::resource('users', \App\Http\Controllers\UserController::class)
    ->middleware(['auth', 'verified', 'role.access']);

require __DIR__ . '/settings.php';
