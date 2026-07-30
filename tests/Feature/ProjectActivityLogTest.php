<?php

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createActivityLogUser(string $roleName): User
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

function createActivityLogProject(User $creator): InvestmentProject
{
    $region = Region::create([
        'name' => 'Activity log test region',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);

    return InvestmentProject::create([
        'name' => 'Activity log test project',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Planning',
        'created_by' => $creator->id,
    ]);
}

test('structured project activity stores actor and field changes', function () {
    $creator = createActivityLogUser('superadmin');
    $actor = createActivityLogUser('invest');
    $project = createActivityLogProject($creator);

    KpiLog::activity(
        projectId: $project->id,
        event: 'project.status_updated',
        category: 'project',
        action: 'Project status was updated',
        subject: $project,
        properties: [
            'changes' => KpiLog::changes(
                ['status' => 'plan'],
                ['status' => 'active'],
                ['status' => 'Project status']
            ),
        ],
        actor: $actor
    );

    $log = KpiLog::query()->sole();

    expect($log->event)->toBe('project.status_updated')
        ->and($log->category)->toBe('project')
        ->and($log->subject_type)->toBe('InvestmentProject')
        ->and($log->subject_id)->toBe($project->id)
        ->and($log->properties['actor_name'])->toBe($actor->full_name)
        ->and($log->properties['changes']['status'])->toBe([
            'label' => 'Project status',
            'old' => 'plan',
            'new' => 'active',
        ]);
});

test('activity history survives actor and project deletion', function () {
    $creator = createActivityLogUser('superadmin');
    $actor = createActivityLogUser('invest');
    $project = createActivityLogProject($creator);

    KpiLog::activity(
        projectId: $project->id,
        event: 'document.uploaded',
        category: 'document',
        action: 'Document uploaded',
        actor: $actor
    );

    $logId = KpiLog::query()->sole()->id;

    $actor->delete();

    expect(KpiLog::query()->findOrFail($logId)->user_id)->toBeNull();

    $project->delete();

    $preservedLog = KpiLog::query()->findOrFail($logId);

    expect($preservedLog->project_id)->toBeNull()
        ->and($preservedLog->properties['actor_name'])->not->toBeEmpty();
});

test('project activity page filters structured events', function () {
    $viewer = createActivityLogUser('superadmin');
    $actor = createActivityLogUser('invest');
    $project = createActivityLogProject($viewer);

    KpiLog::activity(
        projectId: $project->id,
        event: 'task.created',
        category: 'task',
        action: 'Roadmap task created',
        properties: ['details' => ['Title' => 'Prepare report']],
        actor: $actor
    );
    KpiLog::activity(
        projectId: $project->id,
        event: 'document.uploaded',
        category: 'document',
        action: 'Contract document uploaded',
        actor: $viewer
    );

    $this->actingAs($viewer)
        ->get(route('investment-projects.logs', [
            'investmentProject' => $project,
            'category' => 'task',
            'search' => $actor->full_name,
            'user_id' => $actor->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/logs')
            ->where('filters.category', 'task')
            ->where('filters.search', $actor->full_name)
            ->where('filters.user_id', (string) $actor->id)
            ->has('logs.data', 1)
            ->where('logs.data.0.event', 'task.created')
            ->where('logs.data.0.user.role_model.name', 'invest')
            ->where('categoryCounts.task', 1)
            ->where('categoryCounts.document', 1));
});

test('project status update creates a structured change event', function () {
    $admin = createActivityLogUser('superadmin');
    $project = createActivityLogProject($admin);

    $this->actingAs($admin)
        ->put(route('investment-projects.update-status', $project), [
            'current_status' => 'Construction started',
        ])
        ->assertRedirect();

    $log = KpiLog::query()
        ->where('event', 'project.status_updated')
        ->sole();

    expect($log->properties['changes']['current_status']['old'])
        ->toBe('Planning')
        ->and($log->properties['changes']['current_status']['new'])
        ->toBe('Construction started');
});

test('project reordering records old and new positions', function () {
    $admin = createActivityLogUser('superadmin');
    $firstProject = createActivityLogProject($admin);
    $secondProject = createActivityLogProject($admin);
    $firstProject->update(['sort_order' => 0]);
    $secondProject->update(['sort_order' => 1]);

    $this->actingAs($admin)
        ->post(route('investment-projects.reorder'), [
            'project_ids' => [$secondProject->id, $firstProject->id],
            'page' => 1,
        ])
        ->assertNoContent();

    $firstProjectLog = KpiLog::query()
        ->where('project_id', $firstProject->id)
        ->where('event', 'project.position_changed')
        ->sole();

    expect($firstProjectLog->properties['changes']['sort_order']['old'])
        ->toBe(0)
        ->and($firstProjectLog->properties['changes']['sort_order']['new'])
        ->toBe(1)
        ->and(
            KpiLog::query()
                ->where('event', 'project.position_changed')
                ->count()
        )
        ->toBe(2);
});

test('regular project users cannot open the activity history', function () {
    $admin = createActivityLogUser('superadmin');
    $regularUser = createActivityLogUser('invest');
    $project = createActivityLogProject($admin);

    $this->actingAs($regularUser)
        ->get(route('investment-projects.logs', $project))
        ->assertForbidden();
});
