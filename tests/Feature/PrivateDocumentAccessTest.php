<?php

use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskCompletion;
use App\Models\TaskCompletionFile;
use App\Models\User;
use App\Services\PrivateFileService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createPrivateFileTestUser(string $roleName = 'superadmin'): User
{
    $role = Role::create([
        'name' => $roleName,
        'display_name' => ucfirst($roleName),
    ]);

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
    ]);
}

function createPrivateFileTestProject(User $creator): InvestmentProject
{
    $region = Region::create([
        'name' => 'Құжат тест ауданы',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);

    return InvestmentProject::create([
        'name' => 'Құжат тест жобасы',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'created_by' => $creator->id,
    ]);
}

test('project documents are stored privately and downloaded through authorization', function () {
    Storage::fake('local');
    Storage::fake('public');

    $user = createPrivateFileTestUser();
    $project = createPrivateFileTestProject($user);

    $this->actingAs($user)
        ->post(route('investment-projects.documents.store', $project), [
            'name' => 'Келісімшарт',
            'file' => UploadedFile::fake()->create(
                'contract.pdf',
                100,
                'application/pdf'
            ),
        ])
        ->assertRedirect();

    $document = ProjectDocument::query()->sole();

    Storage::disk('local')->assertExists($document->file_path);
    Storage::disk('public')->assertMissing($document->file_path);
    expect(app(PrivateFileService::class)->path($document->file_path))
        ->toBe(Storage::disk('local')->path($document->file_path));

    $this->get(route('investment-projects.documents.download', [
        $project,
        $document,
    ]))
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff');
});

test('executable html cannot be uploaded as a document', function () {
    Storage::fake('local');
    Storage::fake('public');

    $user = createPrivateFileTestUser();
    $project = createPrivateFileTestProject($user);

    $this->actingAs($user)
        ->post(route('investment-projects.documents.store', $project), [
            'name' => 'Қауіпті файл',
            'file' => UploadedFile::fake()->create(
                'attack.html',
                10,
                'text/html'
            ),
        ])
        ->assertSessionHasErrors('file');

    expect(ProjectDocument::query()->count())->toBe(0);
});

test('legacy public documents stay downloadable until they are migrated', function () {
    Storage::fake('local');
    Storage::fake('public');

    $user = createPrivateFileTestUser();
    $project = createPrivateFileTestProject($user);
    $document = ProjectDocument::create([
        'project_id' => $project->id,
        'name' => 'Ескі құжат',
        'file_path' => 'project-documents/'.$project->id.'/legacy.pdf',
        'type' => 'pdf',
        'is_completed' => false,
    ]);
    Storage::disk('public')->put($document->file_path, 'legacy content');

    $this->actingAs($user)
        ->get(route('investment-projects.documents.download', [
            $project,
            $document,
        ]))
        ->assertOk();

    $this->artisan('documents:migrate-private', ['--dry-run' => true])
        ->assertSuccessful();
    Storage::disk('public')->assertExists($document->file_path);
    Storage::disk('local')->assertMissing($document->file_path);

    $this->artisan('documents:migrate-private')->assertSuccessful();
    Storage::disk('local')->assertExists($document->file_path);
    Storage::disk('public')->assertMissing($document->file_path);
});

test('completion files require project access and matching parent records', function () {
    Storage::fake('local');
    Storage::fake('public');

    $owner = createPrivateFileTestUser();
    $project = createPrivateFileTestProject($owner);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Құжатты тексеру',
        'assigned_to' => $owner->id,
        'created_by' => $owner->id,
        'status' => 'in_progress',
        'approval_status' => 'approved',
    ]);
    $completion = TaskCompletion::create([
        'task_id' => $task->id,
        'submitted_by' => $owner->id,
        'status' => 'pending',
    ]);
    $file = TaskCompletionFile::create([
        'completion_id' => $completion->id,
        'file_path' => 'task-completions/report.pdf',
        'file_name' => 'report.pdf',
        'type' => 'document',
    ]);
    Storage::disk('local')->put($file->file_path, 'private report');

    $routeParameters = [$project, $task, $completion, $file];

    $this->actingAs($owner)
        ->get(route(
            'investment-projects.tasks.completions.files.download',
            $routeParameters
        ))
        ->assertOk();

    $outsider = createPrivateFileTestUser('ispolnitel');

    $this->actingAs($outsider)
        ->get(route(
            'investment-projects.tasks.completions.files.download',
            $routeParameters
        ))
        ->assertForbidden();
});
