<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectAttractionReport;
use App\Models\ProjectDocument;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use App\Services\PrivateFileService;
use App\Services\ProjectAttractionHistoryService;
use App\Services\ProjectAttractionReportService;
use App\Services\ProjectAttractionService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Storage::fake('public');
});

function attractionFilesFixture(): array
{
    $manager = User::factory()->create([
        'role' => 'admin',
        'role_id' => Role::firstOrCreate(['name' => 'superadmin'], ['display_name' => 'Admin'])->id,
    ]);
    $assignee = User::factory()->create([
        'role' => 'district_user', 'baskarma_type' => 'additional',
        'role_id' => Role::firstOrCreate(['name' => 'ispolnitel'], ['display_name' => 'Executor'])->id,
    ]);
    $region = Region::create(['name' => 'Files district', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
    $company = Company::factory()->create(['region_id' => $region->id]);
    $project = InvestmentProject::create([
        'name' => 'Files project', 'region_id' => $region->id, 'company_id' => $company->id,
        'status' => 'plan', 'attraction_stage' => 'potential', 'created_by' => $manager->id,
    ]);

    return [$manager, $assignee, $project];
}

function attractionFilesDefinition(User $assignee): array
{
    return [
        'next_action' => 'Кездесу өткізу', 'description' => 'Кездесу туралы ақпарат',
        'next_action_due_date' => today()->toDateString(), 'responsible_id' => $assignee->id,
    ];
}

function attractionFilesResult(string $text = 'Кездесу өтті'): array
{
    return [
        'report_result' => $text,
        'documents' => [UploadedFile::fake()->create('report.pdf', 1, 'application/pdf')],
        'photos' => [UploadedFile::fake()->image('meeting.jpg')],
    ];
}

test('historical completed activity immediately publishes files with actual recorder provenance', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), [
        ...attractionFilesDefinition($assignee), ...attractionFilesResult(), 'already_completed' => true,
    ])->assertSessionHasNoErrors()->assertRedirect();
    $activity = $project->attractionActivities()->sole();
    $report = $activity->reports()->sole();
    expect($activity->status)->toBe('completed')
        ->and($activity->reported_by)->toBe($manager->id)
        ->and($activity->reviewed_by)->toBeNull()
        ->and($report->recorded_as_completed)->toBeTrue()
        ->and($report->submitted_by)->toBe($manager->id)
        ->and($report->status)->toBe('approved')
        ->and($project->executors()->whereKey($assignee)->exists())->toBeTrue()
        ->and($report->files()->count())->toBe(2)
        ->and($project->documents()->count())->toBe(2);
    foreach ($project->documents as $document) {
        expect($document->source)->toBe('attraction_activity')
            ->and($document->recorded_as_completed)->toBeTrue()
            ->and($document->source_attraction_activity_id)->toBe($activity->id)
            ->and($document->source_attraction_report_id)->toBe($report->id)
            ->and($document->uploaded_by)->toBe($manager->id)
            ->and($document->approved_by)->toBeNull();
        Storage::disk('local')->assertExists($document->file_path);
        Storage::disk('public')->assertMissing($document->file_path);
    }
    $project->load('attractionActivities');
    app(ProjectAttractionHistoryService::class)->hydrate($project, $manager);
    $types = collect($project->attractionActivities->sole()->events)->pluck('type')->all();
    expect($types)->toContain('attraction.recorded_completed')
        ->not->toContain('attraction.report_submitted', 'attraction.report_approved', 'attraction.viewed');
});

test('review publishes only accepted submission while retaining rejected attachments', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $service = app(ProjectAttractionService::class);
    $service->save($manager, $project, attractionFilesDefinition($assignee));
    $activity = $project->attractionActivities()->sole();
    $reportUrl = route('investment-projects.attraction-activities.report', [$project, $activity]);
    $reviewUrl = route('investment-projects.attraction-activities.review', [$project, $activity]);
    $this->actingAs($assignee)->post($reportUrl, [...attractionFilesResult('First result'), 'status' => 'pending_review'])
        ->assertSessionHasNoErrors();
    $first = $activity->reports()->sole();
    expect($project->documents()->count())->toBe(0);
    $this->actingAs($manager)->put($reviewUrl, ['report_id' => $activity->reports()->first()?->id, 'decision' => 'rejected', 'reviewer_comment' => 'Толықтырыңыз'])
        ->assertSessionHasNoErrors();
    expect($first->fresh()->status)->toBe('rejected')->and($project->documents()->count())->toBe(0);
    $this->actingAs($assignee)->post($reportUrl, [...attractionFilesResult('Corrected result'), 'status' => 'pending_review'])
        ->assertSessionHasNoErrors();
    $second = $activity->reports()->first();
    $this->actingAs($manager)->put($reviewUrl, ['report_id' => $activity->reports()->first()?->id, 'decision' => 'approved'])->assertSessionHasNoErrors();
    expect($activity->fresh()->status)->toBe('completed')
        ->and($first->fresh()->result)->toBe('First result')
        ->and($first->fresh()->reviewer_comment)->toBe('Толықтырыңыз')
        ->and($second->fresh()->status)->toBe('approved')
        ->and($project->documents()->count())->toBe(2)
        ->and($project->documents()->pluck('source_attraction_report_id')->unique()->all())->toBe([$second->id]);
    foreach ($first->files as $file) {
        Storage::disk('local')->assertExists($file->file_path);
    }
    foreach ($project->documents as $document) {
        expect($document->approved_by)->toBe($manager->id)
            ->and($document->uploaded_by)->toBe($assignee->id)
            ->and($document->recorded_as_completed)->toBeFalse();
    }
    $this->put($reviewUrl, ['report_id' => $activity->reports()->first()?->id, 'decision' => 'approved'])->assertForbidden();
    expect($project->documents()->count())->toBe(2);
});

test('attraction report downloads enforce every parent and preserve access after planning', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $service = app(ProjectAttractionService::class);
    $service->save($manager, $project, [...attractionFilesDefinition($assignee), ...attractionFilesResult(), 'already_completed' => true]);
    $activity = $project->attractionActivities()->sole();
    $report = $activity->reports()->sole();
    $file = $report->files()->where('type', 'document')->sole();
    $photo = $report->files()->where('type', 'photo')->sole();
    $download = fn ($p, $a, $r, $f) => route('investment-projects.attraction-activities.files.download', [$p, $a, $r, $f]);
    $this->actingAs($assignee)->get($download($project, $activity, $report, $file))->assertOk();
    $this->get(route('investment-projects.attraction-activities.files.preview', [$project, $activity, $report, $photo]))->assertOk();
    $this->get(route('investment-projects.attraction-activities.files.preview', [$project, $activity, $report, $file]))->assertNotFound();
    $project->update(['status' => 'implementation']);
    $this->get($download($project, $activity, $report, $file))->assertOk();
    $project->update(['is_archived' => true]);
    $this->get($download($project, $activity, $report, $file))->assertOk();
    [, $outsider, $other] = attractionFilesFixture();
    $this->actingAs($outsider)->get($download($project, $activity, $report, $file))->assertForbidden();
    $this->actingAs($manager)->get($download($other, $activity, $report, $file))->assertNotFound();
    $otherActivity = $other->attractionActivities()->create([
        ...attractionFilesDefinition($outsider), 'attraction_stage' => 'potential', 'created_by' => $manager->id,
    ]);
    $this->get($download($other, $otherActivity, $report, $file))->assertNotFound();
    $otherReport = $otherActivity->reports()->create(['result' => 'Other', 'status' => 'pending']);
    $this->get($download($other, $otherActivity, $otherReport, $file))->assertNotFound();
    app(ProjectAttractionReportService::class)->hydrateReports($project, $outsider);
    $serialized = $project->attractionActivities->sole()->reports->sole()->files->first()->toArray();
    expect($serialized)->not->toHaveKey('file_path')
        ->and($serialized['download_url'])->toBeNull();
});

test('completed creation and normal reporting require result and suitable supporting documents', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $url = route('investment-projects.attraction-activities.store', $project);
    $base = [...attractionFilesDefinition($assignee), 'already_completed' => true];
    $this->actingAs($manager)->post($url, $base)->assertSessionHasErrors(['report_result', 'documents']);
    $this->post($url, [...$base, 'report_result' => 'Result', 'documents' => [UploadedFile::fake()->image('image.jpg')]])
        ->assertSessionHasErrors('documents.0');
    $this->post($url, [...$base, ...attractionFilesResult(), 'photos' => [UploadedFile::fake()->create('script.html', 1, 'text/html')]])
        ->assertSessionHasErrors('photos.0');
    $this->post($url, [...$base, ...attractionFilesResult(), 'documents' => [UploadedFile::fake()->create('big.pdf', 20481, 'application/pdf')]])
        ->assertSessionHasErrors('documents.0');
    expect($project->attractionActivities()->count())->toBe(0);
    app(ProjectAttractionService::class)->save($manager, $project, attractionFilesDefinition($assignee));
    $activity = $project->attractionActivities()->sole();
    $this->actingAs($assignee)->post(route('investment-projects.attraction-activities.report', [$project, $activity]), [
        'status' => 'pending_review', 'report_result' => 'Done',
    ])->assertSessionHasErrors('documents');
    expect($activity->fresh()->status)->toBe('planned');
    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.update', [$project, $activity]), [
        ...$base, ...attractionFilesResult(),
    ])->assertSessionHasErrors('already_completed');
    $this->put(route('investment-projects.attraction-activities.update', [$project, $activity]), [
        ...attractionFilesDefinition($assignee), 'already_completed' => false,
    ])->assertSessionHasNoErrors();
});

test('an old review modal cannot accept a resubmitted attraction report', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $service = app(ProjectAttractionService::class);
    $service->save($manager, $project, attractionFilesDefinition($assignee));
    $activity = $project->attractionActivities()->sole();
    $service->report($assignee, $project, $activity, [...attractionFilesResult('First'), 'status' => 'pending_review']);
    $firstId = $activity->reports()->first()->id;
    $service->review($manager, $project, $activity, ['report_id' => $firstId, 'decision' => 'rejected', 'reviewer_comment' => 'Толықтырыңыз']);
    $service->report($assignee, $project, $activity, [...attractionFilesResult('Second'), 'status' => 'pending_review']);
    $this->actingAs($manager)->put(route('investment-projects.attraction-activities.review', [$project, $activity]), [
        'report_id' => $firstId, 'decision' => 'approved',
    ])->assertSessionHasErrors('report_id');
    expect($activity->fresh()->status)->toBe('pending_review')
        ->and($activity->reports()->first()->status)->toBe('pending')
        ->and($activity->reports()->first()->result)->toBe('Second')
        ->and(ProjectDocument::count())->toBe(0);
});

test('combined upload size is limited before any attraction report is stored', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $documents = array_map(fn ($number) => UploadedFile::fake()->create("report{$number}.pdf", 20480, 'application/pdf'), range(1, 6));
    $this->actingAs($manager)->post(route('investment-projects.attraction-activities.store', $project), [
        ...attractionFilesDefinition($assignee), 'already_completed' => true, 'report_result' => 'Done', 'documents' => $documents,
    ])->assertSessionHasErrors('documents');
    expect($project->attractionActivities()->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles())->toBe([]);
});

test('failed document publication rolls back historical creation and its stored originals', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $this->partialMock(PrivateFileService::class, function ($mock) {
        $mock->shouldReceive('copyToPrivate')->once()->andReturn(false);
    });
    expect(fn () => app(ProjectAttractionService::class)->save($manager, $project, [
        ...attractionFilesDefinition($assignee), ...attractionFilesResult(), 'already_completed' => true,
    ]))->toThrow(RuntimeException::class);
    expect($project->attractionActivities()->count())->toBe(0)
        ->and(ProjectAttractionReport::count())->toBe(0)
        ->and(ProjectDocument::count())->toBe(0)
        ->and($project->executors()->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles())->toBe([]);
});

test('failed approval publication leaves pending report available for retry', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $service = app(ProjectAttractionService::class);
    $service->save($manager, $project, attractionFilesDefinition($assignee));
    $activity = $project->attractionActivities()->sole();
    $service->report($assignee, $project, $activity, [...attractionFilesResult(), 'status' => 'pending_review']);
    $this->partialMock(PrivateFileService::class, function ($mock) {
        $mock->shouldReceive('copyToPrivate')->once()->andReturn(false);
    });
    expect(fn () => app(ProjectAttractionService::class)->review($manager, $project, $activity, ['report_id' => $activity->reports()->first()?->id, 'decision' => 'approved']))
        ->toThrow(RuntimeException::class);
    expect($activity->fresh()->status)->toBe('pending_review')
        ->and($activity->reports()->sole()->status)->toBe('pending')
        ->and(ProjectDocument::count())->toBe(0)
        ->and(count(Storage::disk('local')->allFiles()))->toBe(2);
});

test('deleting historical activity preserves independently copied document provenance', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $service = app(ProjectAttractionService::class);
    $service->save($manager, $project, [...attractionFilesDefinition($assignee), ...attractionFilesResult(), 'already_completed' => true]);
    $activity = $project->attractionActivities()->sole();
    $service->delete($manager, $project, $activity);
    expect($project->documents()->count())->toBe(2)->and(ProjectAttractionReport::count())->toBe(0);
    foreach ($project->documents as $document) {
        expect($document->source_attraction_report_id)->toBeNull()
            ->and($document->recorded_as_completed)->toBeTrue()
            ->and($document->source_task_title)->toBe('Кездесу өткізу');
        Storage::disk('local')->assertExists($document->file_path);
    }
});

test('reopening a pending activity supersedes its immutable report and retains evidence', function () {
    [$manager, $assignee, $project] = attractionFilesFixture();
    $service = app(ProjectAttractionService::class);
    $service->save($manager, $project, attractionFilesDefinition($assignee));
    $activity = $project->attractionActivities()->sole();
    $service->report($assignee, $project, $activity, [...attractionFilesResult(), 'status' => 'pending_review']);
    $service->save($manager, $project, [...attractionFilesDefinition($assignee), 'next_action' => 'Жаңа кездесу'], $activity);
    expect($activity->fresh()->status)->toBe('planned')
        ->and($activity->reports()->sole()->status)->toBe('superseded')
        ->and($activity->reports()->sole()->result)->toBe('Кездесу өтті')
        ->and(KpiLog::where('event', 'attraction.report_submitted')->count())->toBe(1);
    foreach ($activity->reports()->sole()->files as $file) {
        Storage::disk('local')->assertExists($file->file_path);
    }
});
