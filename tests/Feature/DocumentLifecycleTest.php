<?php

use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\SubsoilDocument;
use App\Models\SubsoilUser;
use App\Models\TaskCompletion;
use App\Models\TaskCompletionFile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createDocumentLifecycleUser(string $roleName): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
    ]);
}

function createDocumentLifecycleRegion(): Region
{
    return Region::create([
        'name' => 'Құжат айналымы ауданы',
        'type' => 'district',
        'color' => '#334155',
        'icon' => 'factory',
    ]);
}

function createDocumentLifecycleProject(
    User $creator,
    Region $region
): InvestmentProject {
    return InvestmentProject::create([
        'name' => 'Құжат айналымы жобасы',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'created_by' => $creator->id,
    ]);
}

test('only superadmin can manually mark a project document as completed', function () {
    Storage::fake('local');
    Storage::fake('public');

    $admin = createDocumentLifecycleUser('superadmin');
    $invest = createDocumentLifecycleUser('invest');
    $region = createDocumentLifecycleRegion();
    $project = createDocumentLifecycleProject($admin, $region);
    $project->curators()->attach($invest);

    $this->actingAs($invest)
        ->post(route('investment-projects.documents.store', $project), [
            'name' => 'Invest құжаты',
            'file' => UploadedFile::fake()->create(
                'invest.pdf',
                100,
                'application/pdf'
            ),
            'is_completed' => true,
        ])
        ->assertRedirect();

    $investDocument = ProjectDocument::query()
        ->where('name', 'Invest құжаты')
        ->sole();

    expect($investDocument->is_completed)->toBeFalse()
        ->and($investDocument->uploaded_by)->toBe($invest->id)
        ->and($investDocument->source)->toBe('manual')
        ->and($investDocument->approved_by)->toBeNull();

    $this->actingAs($admin)
        ->post(route('investment-projects.documents.store', $project), [
            'name' => 'Супер әкімші құжаты',
            'file' => UploadedFile::fake()->create(
                'admin.pdf',
                100,
                'application/pdf'
            ),
            'is_completed' => true,
        ])
        ->assertRedirect();

    $adminDocument = ProjectDocument::query()
        ->where('name', 'Супер әкімші құжаты')
        ->sole();

    expect($adminDocument->is_completed)->toBeTrue()
        ->and($adminDocument->approved_by)->toBe($admin->id)
        ->and($adminDocument->approved_at)->not->toBeNull();
});

test('approved task document keeps its complete audit trail', function () {
    Storage::fake('local');
    Storage::fake('public');

    $admin = createDocumentLifecycleUser('superadmin');
    $executor = createDocumentLifecycleUser('ispolnitel');
    $region = createDocumentLifecycleRegion();
    $project = createDocumentLifecycleProject($admin, $region);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Лицензияны өткізу',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'status' => 'in_progress',
        'approval_status' => 'approved',
    ]);
    $completion = TaskCompletion::create([
        'task_id' => $task->id,
        'submitted_by' => $executor->id,
        'status' => 'pending',
    ]);
    $file = TaskCompletionFile::create([
        'completion_id' => $completion->id,
        'file_path' => 'task-completions/license.pdf',
        'file_name' => 'license.pdf',
        'type' => 'document',
    ]);
    Storage::disk('local')->put($file->file_path, 'license');

    $this->actingAs($admin)
        ->put(route('investment-projects.tasks.completions.review', [
            $project,
            $task,
            $completion,
        ]), [
            'status' => 'approved',
            'reviewer_comment' => 'Қабылданды',
        ])
        ->assertRedirect();

    $document = ProjectDocument::query()->sole();

    expect($document->is_completed)->toBeTrue()
        ->and($document->source)->toBe('task_completion')
        ->and($document->source_task_id)->toBe($task->id)
        ->and($document->source_completion_id)->toBe($completion->id)
        ->and($document->source_task_title)->toBe($task->title)
        ->and($document->task_assigned_by)->toBe($admin->id)
        ->and($document->uploaded_by)->toBe($executor->id)
        ->and($document->submitted_at)->not->toBeNull()
        ->and($document->approved_by)->toBe($admin->id)
        ->and($document->approved_at)->not->toBeNull();
});

test('deleting a project document archives it for superadmin without removing the file', function () {
    Storage::fake('local');
    Storage::fake('public');

    $admin = createDocumentLifecycleUser('superadmin');
    $invest = createDocumentLifecycleUser('invest');
    $region = createDocumentLifecycleRegion();
    $project = createDocumentLifecycleProject($admin, $region);
    $project->curators()->attach($invest);
    $document = ProjectDocument::create([
        'project_id' => $project->id,
        'name' => 'Архивтелетін құжат',
        'file_path' => 'project-documents/'.$project->id.'/archive.pdf',
        'type' => 'pdf',
        'uploaded_by' => $admin->id,
    ]);
    Storage::disk('local')->put($document->file_path, 'archive');

    $this->actingAs($invest)
        ->delete(route('investment-projects.documents.destroy', [
            $project,
            $document,
        ]))
        ->assertRedirect();

    $document->refresh();

    expect($document->is_deleted)->toBeTrue()
        ->and($document->deleted_by)->toBe($invest->id)
        ->and($document->deleted_at)->not->toBeNull();
    Storage::disk('local')->assertExists($document->file_path);

    $this->get(route('investment-projects.documents.index', $project))
        ->assertInertia(fn (Assert $page) => $page
            ->has('documents', 0)
            ->has('completedDocuments', 0));

    $this->get(route('investment-projects.documents.deleted', $project))
        ->assertForbidden();
    $this->get(route('investment-projects.documents.download', [
        $project,
        $document,
    ]))->assertNotFound();

    $this->actingAs($admin)
        ->get(route('investment-projects.documents.deleted', $project))
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/deleted-documents')
            ->has('documents', 1)
            ->where('documents.0.id', $document->id)
            ->where('documents.0.deleter.id', $invest->id));

    $this->get(route('investment-projects.documents.download', [
        $project,
        $document,
    ]))->assertOk();
});

test('subsoil documents use the same completion and archive rules', function () {
    Storage::fake('local');
    Storage::fake('public');

    $admin = createDocumentLifecycleUser('superadmin');
    $invest = createDocumentLifecycleUser('invest');
    $region = createDocumentLifecycleRegion();
    $subsoilUser = SubsoilUser::create([
        'name' => 'Құжат айналымы жер қойнауын пайдаланушысы',
        'bin' => '123456789012',
        'region_id' => $region->id,
        'mineral_type' => 'Көмір',
        'license_status' => 'active',
    ]);

    $this->actingAs($invest)
        ->post(route('subsoil-users.documents.store', $subsoilUser), [
            'name' => 'Invest subsoil құжаты',
            'file' => UploadedFile::fake()->create(
                'subsoil.pdf',
                100,
                'application/pdf'
            ),
            'is_completed' => true,
        ])
        ->assertRedirect();

    $document = SubsoilDocument::query()->sole();
    expect($document->is_completed)->toBeFalse();

    $this->delete(route('subsoil-users.documents.destroy', [
        $subsoilUser,
        $document,
    ]))->assertRedirect();

    $document->refresh();
    expect($document->is_deleted)->toBeTrue()
        ->and($document->deleted_by)->toBe($invest->id);
    Storage::disk('local')->assertExists($document->file_path);

    $this->actingAs($admin)
        ->get(route('subsoil-users.documents.deleted', $subsoilUser))
        ->assertInertia(fn (Assert $page) => $page
            ->component('subsoil-users/deleted-documents')
            ->has('documents', 1));
});
