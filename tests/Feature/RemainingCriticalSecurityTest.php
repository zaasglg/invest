<?php

use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\SubsoilTask;
use App\Models\SubsoilUser;
use App\Models\User;
use App\Services\PrivateFileService;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createRemainingSecurityUser(
    string $roleName,
    ?string $investSubRole = null
): User {
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'invest_sub_role' => $investSubRole,
    ]);
}

function createRemainingSecurityRegion(string $name): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

function createRemainingSecurityProject(
    User $creator,
    Region $region,
    string $name
): InvestmentProject {
    return InvestmentProject::create([
        'name' => $name,
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'created_by' => $creator->id,
    ]);
}

test('unsupported roles cannot enter shared crm routes', function () {
    $unknownRole = createRemainingSecurityUser('custom-role');

    $this->actingAs($unknownRole)
        ->get(route('dashboard'))
        ->assertForbidden();
    $this->get(route('notifications.index'))->assertForbidden();
    $this->get(route('chats.index'))->assertForbidden();

    $roleless = User::factory()->create(['role_id' => null]);

    $this->actingAs($roleless)
        ->get(route('dashboard'))
        ->assertForbidden();
});

test('moderator can review tasks but cannot mutate project data', function () {
    $admin = createRemainingSecurityUser('superadmin');
    $moderator = createRemainingSecurityUser('moderator');
    $turkistanInvest = createRemainingSecurityUser(
        'invest',
        'turkistan_invest'
    );
    $executor = createRemainingSecurityUser('ispolnitel');
    $region = createRemainingSecurityRegion('Moderator security region');
    $project = createRemainingSecurityProject(
        $admin,
        $region,
        'Moderator security project'
    );
    $project->curators()->attach($turkistanInvest);
    $task = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Moderator review task',
        'assigned_to' => $executor->id,
        'created_by' => $turkistanInvest->id,
        'status' => 'new',
        'approval_status' => 'pending',
    ]);

    $this->actingAs($moderator)
        ->post(route('investment-projects.issues.store', $project), [
            'title' => 'Forbidden issue',
            'description' => 'Moderator must not create this issue.',
            'severity' => 'high',
            'status' => 'open',
        ])
        ->assertForbidden();

    $this->post(route(
        'investment-projects.tasks.approve',
        [$project, $task]
    ))->assertRedirect();

    expect($project->issues()->count())->toBe(0)
        ->and($task->fresh()->approval_status)->toBe('approved');
});

test('project archive and ordering operations enforce project scope', function () {
    $admin = createRemainingSecurityUser('superadmin');
    $invest = createRemainingSecurityUser('invest');
    $region = createRemainingSecurityRegion('Ordering security region');
    $foreignProject = createRemainingSecurityProject(
        $admin,
        $region,
        'Foreign ordering project'
    );
    $foreignProject->update(['sort_order' => 50]);
    $manageableProject = createRemainingSecurityProject(
        $admin,
        $region,
        'Manageable ordering project'
    );
    $manageableProject->update(['sort_order' => 20]);
    $manageableProject->curators()->attach($invest);

    $this->actingAs($invest)
        ->post(route('investment-projects.archive', $foreignProject))
        ->assertForbidden();
    $this->post(route('investment-projects.reorder'), [
        'project_ids' => [$foreignProject->id],
        'page' => 1,
    ])->assertForbidden();
    $this->post(route(
        'investment-projects.moveToPage',
        $foreignProject
    ), [
        'target_page' => 1,
    ])->assertForbidden();
    $this->post(route('regions.projects.reorder', $region), [
        'project_ids' => [$foreignProject->id],
    ])->assertForbidden();
    $this->post(route(
        'investment-projects.moveToPage',
        $manageableProject
    ), [
        'target_page' => 1,
    ])->assertRedirect();

    expect($foreignProject->fresh()->is_archived)->toBeFalse()
        ->and($foreignProject->fresh()->sort_order)->toBe(50)
        ->and($manageableProject->fresh()->sort_order)->toBe(1);

    $foreignProject->update(['is_archived' => true]);
    $manageableProject->update(['is_archived' => true]);

    $this->get(route('investment-projects.archived'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $manageableProject->id));
});

test('bulk presentation rejects project ids outside the caller scope', function () {
    $admin = createRemainingSecurityUser('superadmin');
    $invest = createRemainingSecurityUser('invest');
    $region = createRemainingSecurityRegion('Export security region');
    $foreignProject = createRemainingSecurityProject(
        $admin,
        $region,
        'Foreign export project'
    );

    $this->actingAs($invest)
        ->post(route('investment-projects.bulk-presentation'), [
            'project_ids' => [$foreignProject->id],
        ])
        ->assertForbidden();
});

test('task status and subsoil task assignment cannot bypass review rules', function () {
    $admin = createRemainingSecurityUser('superadmin');
    $executor = createRemainingSecurityUser('ispolnitel');
    $akim = createRemainingSecurityUser('akim');
    $region = createRemainingSecurityRegion('Task security region');
    $project = createRemainingSecurityProject(
        $admin,
        $region,
        'Task security project'
    );
    $projectTask = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Project workflow task',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'status' => 'in_progress',
        'approval_status' => 'approved',
    ]);
    $subsoilUser = SubsoilUser::create([
        'name' => 'Task security subsoil',
        'bin' => '987654321012',
        'region_id' => $region->id,
        'mineral_type' => 'Көмір',
        'license_status' => 'active',
    ]);

    $this->actingAs($admin)
        ->post(route('subsoil-users.tasks.store', $subsoilUser), [
            'title' => 'Invalid assignee task',
            'assigned_to' => $akim->id,
        ])
        ->assertSessionHasErrors('assigned_to');

    $this->post(route('subsoil-users.tasks.store', $subsoilUser), [
        'title' => 'Valid subsoil task',
        'assigned_to' => $executor->id,
    ])->assertRedirect();

    $subsoilTask = SubsoilTask::query()
        ->where('title', 'Valid subsoil task')
        ->sole();

    $this->put(route(
        'investment-projects.tasks.update',
        [$project, $projectTask]
    ), ['status' => 'done'])->assertSessionHasErrors('status');
    $this->put(route(
        'subsoil-users.tasks.update',
        [$subsoilUser, $subsoilTask]
    ), ['status' => 'done'])->assertSessionHasErrors('status');

    expect($projectTask->fresh()->status)->toBe('in_progress')
        ->and($subsoilTask->fresh()->status)->toBe('new')
        ->and(SubsoilTask::query()->count())->toBe(1);
});

test('passport archive names cannot contain traversal segments', function () {
    Storage::fake('local');
    Storage::fake('public');

    $files = app(PrivateFileService::class);
    expect($files->archiveName('../../outside', 'documents/report.pdf'))
        ->toBe('outside.pdf')
        ->and($files->archiveName('..\\..\\windows', 'documents/report.pdf'))
        ->toBe('windows.pdf');

    $admin = createRemainingSecurityUser('superadmin');
    $region = createRemainingSecurityRegion('Archive security region');
    $project = createRemainingSecurityProject(
        $admin,
        $region,
        'Archive security project'
    );
    $document = ProjectDocument::create([
        'project_id' => $project->id,
        'name' => '../../outside',
        'file_path' => 'project-documents/'.$project->id.'/report.pdf',
        'type' => 'pdf',
        'is_completed' => false,
    ]);
    Storage::disk('local')->put($document->file_path, 'private report');

    $response = $this->actingAs($admin)
        ->get(route('investment-projects.passport', $project))
        ->assertOk()
        ->baseResponse;

    expect($response)->toBeInstanceOf(BinaryFileResponse::class);

    $archivePath = $response->getFile()->getPathname();
    $archive = new ZipArchive;

    try {
        expect($archive->open($archivePath))->toBeTrue();

        $entries = [];
        for ($index = 0; $index < $archive->count(); $index++) {
            $entries[] = $archive->getNameIndex($index);
        }

        expect($entries)
            ->toContain('Құжаттар/Жүктелген құжаттар/outside.pdf');

        foreach ($entries as $entry) {
            expect($entry)->not->toContain('../')
                ->and($entry)->not->toContain('..\\');
        }
    } finally {
        $archive->close();
        @unlink($archivePath);
    }
});
