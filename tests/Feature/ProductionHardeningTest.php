<?php

use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskCompletion;
use App\Models\TaskCompletionFile;
use App\Models\User;
use App\Services\CompletionWorkflowService;
use App\Services\SortOrderService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createHardeningTestUser(string $roleName = 'superadmin'): User
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

function createHardeningTestRegion(string $name = 'Hardening district'): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

function createHardeningTestProject(
    User $creator,
    Region $region
): InvestmentProject {
    return InvestmentProject::create([
        'name' => 'Hardening project',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Planning',
        'created_by' => $creator->id,
    ]);
}

test('sort order is persisted with one update query', function () {
    $regions = collect([
        createHardeningTestRegion('Order A'),
        createHardeningTestRegion('Order B'),
        createHardeningTestRegion('Order C'),
    ]);

    DB::flushQueryLog();
    DB::enableQueryLog();

    app(SortOrderService::class)->update(
        Region::class,
        $regions->pluck('id')->reverse()->values()->all(),
        10
    );

    $updateQueries = collect(DB::getQueryLog())
        ->pluck('query')
        ->filter(
            static fn (string $query): bool => str_starts_with(
                strtolower(trim($query)),
                'update "regions"'
            )
        );
    DB::disableQueryLog();

    expect($updateQueries)->toHaveCount(1)
        ->and(
            Region::query()
                ->orderBy('sort_order')
                ->pluck('id')
                ->all()
        )->toBe($regions->pluck('id')->reverse()->values()->all());
});

test('completion uploads have a total request budget', function () {
    $workflow = app(CompletionWorkflowService::class);
    $documents = [
        UploadedFile::fake()->create(
            'first.pdf',
            60 * 1024,
            'application/pdf'
        ),
        UploadedFile::fake()->create(
            'second.pdf',
            60 * 1024,
            'application/pdf'
        ),
    ];

    expect(
        fn () => $workflow->ensureUploadBudget($documents, [])
    )->toThrow(ValidationException::class);
});

test('failed completion persistence rolls back database and uploaded files', function () {
    Storage::fake('local');

    $executor = createHardeningTestUser('ispolnitel');
    $region = createHardeningTestRegion();
    $project = createHardeningTestProject($executor, $region);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Atomic submission',
        'assigned_to' => $executor->id,
        'created_by' => $executor->id,
        'status' => 'new',
        'approval_status' => 'approved',
    ]);

    Event::listen(
        'eloquent.creating: '.TaskCompletionFile::class,
        static function (): void {
            throw new \RuntimeException('Simulated database failure.');
        }
    );

    try {
        expect(fn () => app(CompletionWorkflowService::class)->submitProject(
            $task,
            $executor,
            null,
            [
                UploadedFile::fake()->create(
                    'report.pdf',
                    10,
                    'application/pdf'
                ),
            ],
            []
        ))->toThrow(
            \RuntimeException::class,
            'Simulated database failure.'
        );
    } finally {
        Event::forget('eloquent.creating: '.TaskCompletionFile::class);
    }

    expect(TaskCompletion::query()->count())->toBe(0)
        ->and($task->fresh()->status)->toBe('new')
        ->and(Storage::disk('local')->allFiles('task-completions'))->toBe([]);
});

test('failed completion document copy rolls back the review decision', function () {
    Storage::fake('local');
    Storage::fake('public');

    $reviewer = createHardeningTestUser();
    $executor = createHardeningTestUser('ispolnitel');
    $region = createHardeningTestRegion();
    $project = createHardeningTestProject($reviewer, $region);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Atomic review',
        'assigned_to' => $executor->id,
        'created_by' => $reviewer->id,
        'status' => 'in_progress',
        'approval_status' => 'approved',
    ]);
    $completion = TaskCompletion::create([
        'task_id' => $task->id,
        'submitted_by' => $executor->id,
        'status' => 'pending',
    ]);
    TaskCompletionFile::create([
        'completion_id' => $completion->id,
        'file_path' => 'task-completions/missing.pdf',
        'file_name' => 'missing.pdf',
        'type' => 'document',
    ]);

    expect(fn () => app(CompletionWorkflowService::class)->reviewProject(
        $project,
        $task,
        $completion,
        $reviewer,
        'approved',
        null
    ))->toThrow(\RuntimeException::class);

    expect($completion->fresh()->status)->toBe('pending')
        ->and($task->fresh()->status)->toBe('in_progress')
        ->and($project->documents()->count())->toBe(0);
});

test('region icon upload rejects svg content', function () {
    Storage::fake('public');

    $admin = createHardeningTestUser();
    $parent = Region::create([
        'name' => 'Hardening oblast',
        'type' => 'oblast',
        'color' => '#112233',
        'icon' => 'factory',
    ]);

    $this->actingAs($admin)
        ->post(route('regions.store'), [
            'name' => 'SVG district',
            'color' => '#445566',
            'type' => 'district',
            'subtype' => 'district',
            'parent_id' => $parent->id,
            'icon_file' => UploadedFile::fake()->createWithContent(
                'unsafe.svg',
                '<svg onload="alert(1)"></svg>'
            ),
        ])
        ->assertSessionHasErrors('icon_file');

    expect(Region::query()->where('name', 'SVG district')->exists())
        ->toBeFalse();
});

test('avatar replacement keeps the new file and removes the old file', function () {
    Storage::fake('public');

    $user = createHardeningTestUser();
    $oldPath = 'avatars/'.$user->id.'/old.png';
    Storage::disk('public')->put($oldPath, 'old avatar');
    $user->update(['avatar' => $oldPath]);

    $this->actingAs($user)
        ->post(route('profile.avatar'), [
            'avatar' => UploadedFile::fake()->createWithContent(
                'new.png',
                base64_decode(
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
                    .'AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
                )
            ),
        ])
        ->assertRedirect()
        ->assertSessionHas('status', 'avatar-updated');

    $newPath = $user->fresh()->avatar;

    expect($newPath)->not->toBeNull()
        ->and($newPath)->not->toBe($oldPath);
    Storage::disk('public')->assertExists($newPath);
    Storage::disk('public')->assertMissing($oldPath);
});

test('production query indexes are installed', function () {
    $indexes = [
        ...Schema::getIndexes('investment_projects'),
        ...Schema::getIndexes('project_tasks'),
        ...Schema::getIndexes('task_notifications'),
    ];
    $indexNames = collect($indexes)->pluck('name');

    expect($indexNames)
        ->toContain('investment_projects_region_archive_sort_idx')
        ->toContain('project_tasks_assignee_approval_status_idx')
        ->toContain('task_notifications_user_read_created_idx');
});
