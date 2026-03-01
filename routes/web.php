<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

// Route::get('/', function () {
//     return Inertia::render('welcome', [
//         'canRegister' => Features::enabled(Features::registration()),
//     ]);
// })->name('home');
route::get('/', function () {
    return redirect()->route('dashboard');
});

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

Route::post('investment-projects-bulk-presentation', [\App\Http\Controllers\InvestmentProjectController::class, 'bulkPresentation'])
    ->middleware(['auth', 'verified', 'role.access'])
    ->name('investment-projects.bulk-presentation');

Route::prefix('investment-projects/{investmentProject}')->middleware(['auth', 'verified', 'role.access'])->group(function () {
    Route::get('passport', [\App\Http\Controllers\InvestmentProjectController::class, 'passport'])->name('investment-projects.passport');
    Route::get('presentation', [\App\Http\Controllers\InvestmentProjectController::class, 'presentation'])->name('investment-projects.presentation');

    Route::get('documents', [\App\Http\Controllers\ProjectDocumentController::class, 'index'])->name('investment-projects.documents.index');
    Route::post('documents', [\App\Http\Controllers\ProjectDocumentController::class, 'store'])->name('investment-projects.documents.store');
    Route::get('documents/{document}/download', [\App\Http\Controllers\ProjectDocumentController::class, 'download'])->name('investment-projects.documents.download');
    Route::delete('documents/{document}', [\App\Http\Controllers\ProjectDocumentController::class, 'destroy'])->name('investment-projects.documents.destroy');

    Route::get('gallery', [\App\Http\Controllers\ProjectPhotoController::class, 'index'])->name('investment-projects.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\ProjectPhotoController::class, 'store'])->name('investment-projects.gallery.store');
    Route::get('gallery/{photo}/download', [\App\Http\Controllers\ProjectPhotoController::class, 'download'])->name('investment-projects.gallery.download');
    Route::put('gallery/{photo}', [\App\Http\Controllers\ProjectPhotoController::class, 'update'])->name('investment-projects.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\ProjectPhotoController::class, 'destroy'])->name('investment-projects.gallery.destroy');

    Route::get('issues', [\App\Http\Controllers\ProjectIssueController::class, 'index'])->name('investment-projects.issues.index');
    Route::post('issues', [\App\Http\Controllers\ProjectIssueController::class, 'store'])->name('investment-projects.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\ProjectIssueController::class, 'update'])->name('investment-projects.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\ProjectIssueController::class, 'destroy'])->name('investment-projects.issues.destroy');

    Route::post('tasks', [\App\Http\Controllers\ProjectTaskController::class, 'store'])->name('investment-projects.tasks.store');
    Route::put('tasks/{task}', [\App\Http\Controllers\ProjectTaskController::class, 'update'])->name('investment-projects.tasks.update');
    Route::delete('tasks/{task}', [\App\Http\Controllers\ProjectTaskController::class, 'destroy'])->name('investment-projects.tasks.destroy');

    Route::post('tasks/{task}/completions', [\App\Http\Controllers\TaskCompletionController::class, 'store'])->name('investment-projects.tasks.completions.store');
    Route::put('tasks/{task}/completions/{completion}/review', [\App\Http\Controllers\TaskCompletionController::class, 'review'])->name('investment-projects.tasks.completions.review');
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

Route::get('baskarma-rating', [\App\Http\Controllers\BaskarmaRatingController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('baskarma-rating');

Route::get('baskarma-rating/{user}', [\App\Http\Controllers\BaskarmaRatingController::class, 'show'])
    ->middleware(['auth', 'verified'])
    ->name('baskarma-rating.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('notifications', [\App\Http\Controllers\TaskNotificationController::class, 'index'])->name('notifications.index');
    Route::put('notifications/{notification}/read', [\App\Http\Controllers\TaskNotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/read-all', [\App\Http\Controllers\TaskNotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::get('notifications/unread-count', [\App\Http\Controllers\TaskNotificationController::class, 'unreadCount'])->name('notifications.unread-count');
});

require __DIR__ . '/settings.php';
