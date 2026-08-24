<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('dashboard', \App\Http\Controllers\DashboardController::class)
    ->middleware(['auth', 'role.valid'])
    ->name('dashboard');

Route::middleware(['auth', 'verified.registration', 'role.applicant'])
    ->prefix('portal')
    ->name('applicant.')
    ->group(function () {
        Route::get('/', [\App\Http\Controllers\ApplicantPortalController::class, 'index'])
            ->name('portal');
        Route::get('company-lookup', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'companyLookup'])
            ->name('company-lookup');
        Route::get('zones/{zoneType}/{zone}', [\App\Http\Controllers\ApplicantPortalController::class, 'show'])
            ->whereIn('zoneType', ['sez', 'industrial-zone', 'prom-zone'])
            ->whereNumber('zone')
            ->name('zones.show');
        Route::get('zones/{zoneType}/{zone}/applications/create', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'create'])
            ->whereIn('zoneType', ['sez', 'industrial-zone', 'prom-zone'])
            ->whereNumber('zone')
            ->name('applications.create');
        Route::post('zones/{zoneType}/{zone}/applications', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'store'])
            ->whereIn('zoneType', ['sez', 'industrial-zone', 'prom-zone'])
            ->whereNumber('zone')
            ->name('applications.store');
        Route::get('applications', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'index'])
            ->name('applications.index');
        Route::get('applications/{investmentApplication}', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'show'])
            ->name('applications.show');
        Route::get('applications/{investmentApplication}/edit', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'edit'])
            ->name('applications.edit');
        Route::post('applications/{investmentApplication}', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'update'])
            ->name('applications.update');
        Route::post('applications/{investmentApplication}/submit', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'submit'])
            ->name('applications.submit');
        Route::post('applications/{investmentApplication}/withdraw', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'withdraw'])
            ->name('applications.withdraw');
        Route::delete('applications/{investmentApplication}/documents/{document}', [\App\Http\Controllers\ApplicantInvestmentApplicationController::class, 'destroyDocument'])
            ->name('applications.documents.destroy');
    });

Route::middleware(['auth', 'role.application-reviewer'])
    ->prefix('investment-applications')
    ->name('investment-applications.')
    ->group(function () {
        Route::get('/', [\App\Http\Controllers\InvestmentApplicationReviewController::class, 'index'])
            ->name('index');
        Route::get('{investmentApplication}', [\App\Http\Controllers\InvestmentApplicationReviewController::class, 'show'])
            ->name('show');
        Route::post('{investmentApplication}/start-review', [\App\Http\Controllers\InvestmentApplicationReviewController::class, 'startReview'])
            ->name('start-review');
        Route::post('{investmentApplication}/request-clarification', [\App\Http\Controllers\InvestmentApplicationReviewController::class, 'requestClarification'])
            ->name('request-clarification');
        Route::post('{investmentApplication}/approve', [\App\Http\Controllers\InvestmentApplicationReviewController::class, 'approve'])
            ->name('approve');
        Route::post('{investmentApplication}/set-schedule', [\App\Http\Controllers\InvestmentApplicationReviewController::class, 'setSchedule'])
            ->name('set-schedule');
        Route::post('{investmentApplication}/reject', [\App\Http\Controllers\InvestmentApplicationReviewController::class, 'reject'])
            ->name('reject');
        Route::post('{investmentApplication}/convert', [\App\Http\Controllers\InvestmentApplicationReviewController::class, 'convert'])
            ->name('convert');
    });

Route::get('investment-applications/{investmentApplication}/documents/{document}/download', [\App\Http\Controllers\InvestmentApplicationDocumentController::class, 'download'])
    ->middleware(['auth', 'role.valid'])
    ->name('investment-applications.documents.download');

Route::get('akim-analytics', \App\Http\Controllers\OblastAkimAnalyticsController::class)
    ->middleware(['auth', 'role.access'])
    ->name('akim.analytics');

Route::resource('project-types', \App\Http\Controllers\ProjectTypeController::class)
    ->middleware(['auth', 'role.access']);

Route::resource('companies', \App\Http\Controllers\CompanyController::class)
    ->middleware(['auth', 'role.access']);

Route::get('companies/{company}/documents/{companyDocument}/download', [\App\Http\Controllers\CompanyDocumentController::class, 'download'])
    ->middleware(['auth', 'role.access'])
    ->name('companies.documents.download');

Route::delete('companies/{company}/documents/{companyDocument}', [\App\Http\Controllers\CompanyDocumentController::class, 'destroy'])
    ->middleware(['auth', 'role.access'])
    ->name('companies.documents.destroy');

Route::post('regions/reorder', [\App\Http\Controllers\RegionController::class, 'reorder'])
    ->middleware(['auth', 'role.access'])
    ->name('regions.reorder');

Route::post('regions/{region}/move-to-page', [\App\Http\Controllers\RegionController::class, 'moveToPage'])
    ->middleware(['auth', 'role.access'])
    ->name('regions.moveToPage');

Route::resource('regions', \App\Http\Controllers\RegionController::class)
    ->middleware(['auth', 'role.access']);

Route::post('regions/{region}/projects/reorder', [\App\Http\Controllers\RegionController::class, 'reorderProjects'])
    ->middleware(['auth', 'role.access'])
    ->name('regions.projects.reorder');

Route::resource('sezs', \App\Http\Controllers\SezController::class)
    ->middleware(['auth', 'role.access']);

Route::get('sezs-deleted', [\App\Http\Controllers\SezController::class, 'deleted'])
    ->middleware(['auth', 'role.access'])
    ->name('sezs.deleted');

Route::post('sezs-deleted/{sezId}/restore', [\App\Http\Controllers\SezController::class, 'restoreDeleted'])
    ->whereNumber('sezId')
    ->middleware(['auth', 'role.access'])
    ->name('sezs.restore-deleted');

Route::resource('industrial-zones', \App\Http\Controllers\IndustrialZoneController::class)
    ->middleware(['auth', 'role.access']);

Route::get('industrial-zones-deleted', [\App\Http\Controllers\IndustrialZoneController::class, 'deleted'])
    ->middleware(['auth', 'role.access'])
    ->name('industrial-zones.deleted');

Route::post('industrial-zones-deleted/{industrialZoneId}/restore', [\App\Http\Controllers\IndustrialZoneController::class, 'restoreDeleted'])
    ->whereNumber('industrialZoneId')
    ->middleware(['auth', 'role.access'])
    ->name('industrial-zones.restore-deleted');

Route::resource('prom-zones', \App\Http\Controllers\PromZoneController::class)
    ->middleware(['auth', 'role.access']);

Route::get('prom-zones-deleted', [\App\Http\Controllers\PromZoneController::class, 'deleted'])
    ->middleware(['auth', 'role.access'])
    ->name('prom-zones.deleted');

Route::post('prom-zones-deleted/{promZoneId}/restore', [\App\Http\Controllers\PromZoneController::class, 'restoreDeleted'])
    ->whereNumber('promZoneId')
    ->middleware(['auth', 'role.access'])
    ->name('prom-zones.restore-deleted');

Route::resource('subsoil-users', \App\Http\Controllers\SubsoilUserController::class)
    ->middleware(['auth', 'role.access']);

Route::get('subsoil-users-deleted', [\App\Http\Controllers\SubsoilUserController::class, 'deleted'])
    ->middleware(['auth', 'role.access'])
    ->name('subsoil-users.deleted');

Route::post('subsoil-users-deleted/{subsoilUserId}/restore', [\App\Http\Controllers\SubsoilUserController::class, 'restoreDeleted'])
    ->whereNumber('subsoilUserId')
    ->middleware(['auth', 'role.access'])
    ->name('subsoil-users.restore-deleted');

Route::post('investment-projects/reorder', [\App\Http\Controllers\InvestmentProjectController::class, 'reorder'])
    ->middleware(['auth', 'role.access'])
    ->name('investment-projects.reorder');

Route::post('investment-projects/{investmentProject}/move-to-page', [\App\Http\Controllers\InvestmentProjectController::class, 'moveToPage'])
    ->middleware(['auth', 'role.access'])
    ->name('investment-projects.moveToPage');

Route::resource('investment-projects', \App\Http\Controllers\InvestmentProjectController::class)
    ->middleware(['auth', 'role.access']);

Route::get('investment-projects-archived', [\App\Http\Controllers\InvestmentProjectController::class, 'archived'])
    ->middleware(['auth', 'role.access'])
    ->name('investment-projects.archived');

Route::get('investment-projects-deleted', [\App\Http\Controllers\InvestmentProjectController::class, 'deleted'])
    ->middleware(['auth', 'role.access'])
    ->name('investment-projects.deleted');

Route::post('investment-projects-deleted/{projectId}/restore', [\App\Http\Controllers\InvestmentProjectController::class, 'restoreDeleted'])
    ->whereNumber('projectId')
    ->middleware(['auth', 'role.access'])
    ->name('investment-projects.restore-deleted');

Route::post('investment-projects/{investmentProject}/archive', [\App\Http\Controllers\InvestmentProjectController::class, 'archive'])
    ->middleware(['auth', 'role.access'])
    ->name('investment-projects.archive');

Route::post('investment-projects/{investmentProject}/unarchive', [\App\Http\Controllers\InvestmentProjectController::class, 'unarchive'])
    ->middleware(['auth', 'role.access'])
    ->name('investment-projects.unarchive');

Route::post('investment-projects-bulk-presentation', [\App\Http\Controllers\InvestmentProjectController::class, 'bulkPresentation'])
    ->middleware(['auth', 'role.access'])
    ->name('investment-projects.bulk-presentation');

Route::prefix('investment-projects/{investmentProject}')->middleware(['auth', 'role.access'])->group(function () {
    Route::get('passport', [\App\Http\Controllers\InvestmentProjectController::class, 'passport'])->name('investment-projects.passport');
    Route::get('presentation', [\App\Http\Controllers\InvestmentProjectController::class, 'presentation'])->name('investment-projects.presentation');

    Route::get('documents', [\App\Http\Controllers\ProjectDocumentController::class, 'index'])->name('investment-projects.documents.index');
    Route::get('documents/deleted', [\App\Http\Controllers\ProjectDocumentController::class, 'deleted'])->name('investment-projects.documents.deleted');
    Route::post('documents', [\App\Http\Controllers\ProjectDocumentController::class, 'store'])->name('investment-projects.documents.store');
    Route::get('documents/{document}/download', [\App\Http\Controllers\ProjectDocumentController::class, 'download'])->name('investment-projects.documents.download');
    Route::delete('documents/{document}', [\App\Http\Controllers\ProjectDocumentController::class, 'destroy'])->name('investment-projects.documents.destroy');

    Route::post('production-facts', [\App\Http\Controllers\ProjectProductionFactController::class, 'store'])->name('investment-projects.production-facts.store');

    Route::get('gallery', [\App\Http\Controllers\ProjectPhotoController::class, 'index'])->name('investment-projects.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\ProjectPhotoController::class, 'store'])->name('investment-projects.gallery.store');
    Route::get('gallery/{photo}/download', [\App\Http\Controllers\ProjectPhotoController::class, 'download'])->name('investment-projects.gallery.download');
    Route::put('gallery/{photo}', [\App\Http\Controllers\ProjectPhotoController::class, 'update'])->name('investment-projects.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\ProjectPhotoController::class, 'destroy'])->name('investment-projects.gallery.destroy');

    Route::get('issues', [\App\Http\Controllers\ProjectIssueController::class, 'index'])->name('investment-projects.issues.index');
    Route::post('issues', [\App\Http\Controllers\ProjectIssueController::class, 'store'])->name('investment-projects.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\ProjectIssueController::class, 'update'])->name('investment-projects.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\ProjectIssueController::class, 'destroy'])->name('investment-projects.issues.destroy');

    Route::put('update-status', [\App\Http\Controllers\InvestmentProjectController::class, 'updateStatus'])->name('investment-projects.update-status');

    Route::get('logs', [\App\Http\Controllers\InvestmentProjectController::class, 'logs'])->name('investment-projects.logs');

    Route::post('tasks', [\App\Http\Controllers\ProjectTaskController::class, 'store'])->name('investment-projects.tasks.store');
    Route::put('tasks/{task}', [\App\Http\Controllers\ProjectTaskController::class, 'update'])->name('investment-projects.tasks.update');
    Route::delete('tasks/{task}', [\App\Http\Controllers\ProjectTaskController::class, 'destroy'])->name('investment-projects.tasks.destroy');
    Route::post('tasks/{task}/approve', [\App\Http\Controllers\ProjectTaskController::class, 'approve'])->name('investment-projects.tasks.approve');
    Route::post('tasks/{task}/reject', [\App\Http\Controllers\ProjectTaskController::class, 'reject'])->name('investment-projects.tasks.reject');
    Route::post('tasks/{task}/view', [\App\Http\Controllers\ProjectTaskController::class, 'markViewed'])->name('investment-projects.tasks.view');

    Route::post('tasks/{task}/completions', [\App\Http\Controllers\TaskCompletionController::class, 'store'])->name('investment-projects.tasks.completions.store');
    Route::put('tasks/{task}/completions/{completion}/review', [\App\Http\Controllers\TaskCompletionController::class, 'review'])->name('investment-projects.tasks.completions.review');
    Route::get('tasks/{task}/completions/{completion}/files/{file}/preview', [\App\Http\Controllers\TaskCompletionController::class, 'previewFile'])->name('investment-projects.tasks.completions.files.preview');
    Route::get('tasks/{task}/completions/{completion}/files/{file}/download', [\App\Http\Controllers\TaskCompletionController::class, 'downloadFile'])->name('investment-projects.tasks.completions.files.download');
});

Route::prefix('sezs/{sez}')->middleware(['auth', 'role.access'])->group(function () {
    Route::get('logs', [\App\Http\Controllers\SectorActivityLogController::class, 'sez'])->name('sezs.logs');
    Route::get('gallery', [\App\Http\Controllers\SezPhotoController::class, 'index'])->name('sezs.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\SezPhotoController::class, 'store'])->name('sezs.gallery.store');
    Route::put('gallery/{photo}', [\App\Http\Controllers\SezPhotoController::class, 'update'])->name('sezs.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\SezPhotoController::class, 'destroy'])->name('sezs.gallery.destroy');

    Route::get('issues', [\App\Http\Controllers\SezIssueController::class, 'index'])->name('sezs.issues.index');
    Route::post('issues', [\App\Http\Controllers\SezIssueController::class, 'store'])->name('sezs.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\SezIssueController::class, 'update'])->name('sezs.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\SezIssueController::class, 'destroy'])->name('sezs.issues.destroy');
});

Route::prefix('industrial-zones/{industrialZone}')->middleware(['auth', 'role.access'])->group(function () {
    Route::get('logs', [\App\Http\Controllers\SectorActivityLogController::class, 'industrialZone'])->name('industrial-zones.logs');
    Route::get('gallery', [\App\Http\Controllers\IndustrialZonePhotoController::class, 'index'])->name('industrial-zones.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\IndustrialZonePhotoController::class, 'store'])->name('industrial-zones.gallery.store');
    Route::put('gallery/{photo}', [\App\Http\Controllers\IndustrialZonePhotoController::class, 'update'])->name('industrial-zones.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\IndustrialZonePhotoController::class, 'destroy'])->name('industrial-zones.gallery.destroy');

    Route::get('issues', [\App\Http\Controllers\IndustrialZoneIssueController::class, 'index'])->name('industrial-zones.issues.index');
    Route::post('issues', [\App\Http\Controllers\IndustrialZoneIssueController::class, 'store'])->name('industrial-zones.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\IndustrialZoneIssueController::class, 'update'])->name('industrial-zones.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\IndustrialZoneIssueController::class, 'destroy'])->name('industrial-zones.issues.destroy');
});

Route::prefix('prom-zones/{promZone}')->middleware(['auth', 'role.access'])->group(function () {
    Route::get('logs', [\App\Http\Controllers\SectorActivityLogController::class, 'promZone'])->name('prom-zones.logs');
    Route::get('gallery', [\App\Http\Controllers\PromZonePhotoController::class, 'index'])->name('prom-zones.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\PromZonePhotoController::class, 'store'])->name('prom-zones.gallery.store');
    Route::put('gallery/{photo}', [\App\Http\Controllers\PromZonePhotoController::class, 'update'])->name('prom-zones.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\PromZonePhotoController::class, 'destroy'])->name('prom-zones.gallery.destroy');

    Route::get('issues', [\App\Http\Controllers\PromZoneIssueController::class, 'index'])->name('prom-zones.issues.index');
    Route::post('issues', [\App\Http\Controllers\PromZoneIssueController::class, 'store'])->name('prom-zones.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\PromZoneIssueController::class, 'update'])->name('prom-zones.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\PromZoneIssueController::class, 'destroy'])->name('prom-zones.issues.destroy');
});

Route::prefix('subsoil-users/{subsoilUser}')->middleware(['auth', 'role.access'])->group(function () {
    Route::get('logs', [\App\Http\Controllers\SectorActivityLogController::class, 'subsoilUser'])->name('subsoil-users.logs');
    Route::get('passport', [\App\Http\Controllers\SubsoilUserController::class, 'passport'])->name('subsoil-users.passport');

    Route::get('issues', [\App\Http\Controllers\SubsoilIssueController::class, 'index'])->name('subsoil-users.issues.index');
    Route::post('issues', [\App\Http\Controllers\SubsoilIssueController::class, 'store'])->name('subsoil-users.issues.store');
    Route::put('issues/{issue}', [\App\Http\Controllers\SubsoilIssueController::class, 'update'])->name('subsoil-users.issues.update');
    Route::delete('issues/{issue}', [\App\Http\Controllers\SubsoilIssueController::class, 'destroy'])->name('subsoil-users.issues.destroy');

    Route::get('documents', [\App\Http\Controllers\SubsoilDocumentController::class, 'index'])->name('subsoil-users.documents.index');
    Route::get('documents/deleted', [\App\Http\Controllers\SubsoilDocumentController::class, 'deleted'])->name('subsoil-users.documents.deleted');
    Route::post('documents', [\App\Http\Controllers\SubsoilDocumentController::class, 'store'])->name('subsoil-users.documents.store');
    Route::get('documents/{document}/download', [\App\Http\Controllers\SubsoilDocumentController::class, 'download'])->name('subsoil-users.documents.download');
    Route::delete('documents/{document}', [\App\Http\Controllers\SubsoilDocumentController::class, 'destroy'])->name('subsoil-users.documents.destroy');

    Route::get('gallery', [\App\Http\Controllers\SubsoilPhotoController::class, 'index'])->name('subsoil-users.gallery.index');
    Route::post('gallery', [\App\Http\Controllers\SubsoilPhotoController::class, 'store'])->name('subsoil-users.gallery.store');
    Route::put('gallery/{photo}', [\App\Http\Controllers\SubsoilPhotoController::class, 'update'])->name('subsoil-users.gallery.update');
    Route::delete('gallery/{photo}', [\App\Http\Controllers\SubsoilPhotoController::class, 'destroy'])->name('subsoil-users.gallery.destroy');

    Route::post('tasks', [\App\Http\Controllers\SubsoilTaskController::class, 'store'])->name('subsoil-users.tasks.store');
    Route::put('tasks/{task}', [\App\Http\Controllers\SubsoilTaskController::class, 'update'])->name('subsoil-users.tasks.update');
    Route::delete('tasks/{task}', [\App\Http\Controllers\SubsoilTaskController::class, 'destroy'])->name('subsoil-users.tasks.destroy');

    Route::post('tasks/{task}/completions', [\App\Http\Controllers\SubsoilTaskCompletionController::class, 'store'])->name('subsoil-users.tasks.completions.store');
    Route::put('tasks/{task}/completions/{completion}/review', [\App\Http\Controllers\SubsoilTaskCompletionController::class, 'review'])->name('subsoil-users.tasks.completions.review');
    Route::get('tasks/{task}/completions/{completion}/files/{file}/preview', [\App\Http\Controllers\SubsoilTaskCompletionController::class, 'previewFile'])->name('subsoil-users.tasks.completions.files.preview');
    Route::get('tasks/{task}/completions/{completion}/files/{file}/download', [\App\Http\Controllers\SubsoilTaskCompletionController::class, 'downloadFile'])->name('subsoil-users.tasks.completions.files.download');
});

Route::resource('roles', \App\Http\Controllers\RoleController::class)
    ->middleware(['auth', 'role.access']);

Route::resource('users', \App\Http\Controllers\UserController::class)
    ->middleware(['auth', 'role.access']);

Route::get('issues', [\App\Http\Controllers\IssuesController::class, 'index'])
    ->middleware(['auth', 'role.access'])
    ->name('issues.index');

Route::get('baskarma-rating', [\App\Http\Controllers\BaskarmaRatingController::class, 'index'])
    ->middleware(['auth', 'role.access'])
    ->name('baskarma-rating');

Route::get('baskarma-rating/{user}', [\App\Http\Controllers\BaskarmaRatingController::class, 'show'])
    ->middleware(['auth', 'role.access'])
    ->name('baskarma-rating.show');

Route::middleware(['auth', 'role.valid'])->group(function () {
    Route::get('notifications', [\App\Http\Controllers\TaskNotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/open', [\App\Http\Controllers\TaskNotificationController::class, 'open'])->name('notifications.open');
    Route::put('notifications/{notification}/read', [\App\Http\Controllers\TaskNotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/read-all', [\App\Http\Controllers\TaskNotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::get('notifications/unread-count', [\App\Http\Controllers\TaskNotificationController::class, 'unreadCount'])->name('notifications.unread-count');

    Route::get('assistant/notifications', [\App\Http\Controllers\ProactiveAssistantController::class, 'index'])->name('assistant.notifications.index');
    Route::post('assistant/notifications/read-all', [\App\Http\Controllers\ProactiveAssistantController::class, 'markAllAsRead'])->name('assistant.notifications.read-all');

    Route::middleware('role.not-applicant')->group(function () {
        Route::get('chats/unread-count', [\App\Http\Controllers\ProjectChatController::class, 'unreadCount'])->name('chats.unread-count');
        Route::get('chats/attachments/{attachment}/preview', [\App\Http\Controllers\ProjectChatController::class, 'previewAttachment'])->name('chats.attachments.preview');
        Route::get('chats/attachments/{attachment}', [\App\Http\Controllers\ProjectChatController::class, 'downloadAttachment'])->name('chats.attachments.download');
        Route::post('chats/{investmentProject}/messages', [\App\Http\Controllers\ProjectChatController::class, 'store'])->name('chats.messages.store');
        Route::get('chats/{investmentProject?}', [\App\Http\Controllers\ProjectChatController::class, 'index'])->name('chats.index');
    });
});

Route::middleware(['auth', 'role.access'])->prefix('chat')->name('chat.')->group(function () {
    Route::post('send', [\App\Http\Controllers\ChatController::class, 'send'])->name('send');
});

require __DIR__.'/settings.php';
