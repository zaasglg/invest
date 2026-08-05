<?php

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createDeletedProjectTestUser(string $roleName): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'role' => match ($roleName) {
            'superadmin' => 'admin',
            'invest' => 'invest',
            default => 'district_user',
        },
    ]);
}

function createDeletedProjectTestProject(User $creator): InvestmentProject
{
    $region = Region::create([
        'name' => 'Өшіру тест ауданы',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);

    return InvestmentProject::create([
        'name' => 'Логикалық өшіру жобасы',
        'company_name' => 'Өшіру тест компаниясы',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'created_by' => $creator->id,
    ]);
}

test('invest curator sends a project to deleted projects without destroying data', function () {
    $admin = createDeletedProjectTestUser('superadmin');
    $invest = createDeletedProjectTestUser('invest');
    $project = createDeletedProjectTestProject($admin);
    $project->curators()->attach($invest);

    $this->actingAs($invest)
        ->delete(route('investment-projects.destroy', $project))
        ->assertRedirect(route('investment-projects.index'));

    $this->assertDatabaseHas('investment_projects', [
        'id' => $project->id,
        'is_deleted' => true,
        'deleted_by' => $invest->id,
    ]);

    expect(InvestmentProject::find($project->id))->toBeNull()
        ->and(InvestmentProject::active()->whereKey($project->id)->exists())
        ->toBeFalse()
        ->and(InvestmentProject::archived()->whereKey($project->id)->exists())
        ->toBeFalse()
        ->and(
            InvestmentProject::onlyDeleted()
                ->whereKey($project->id)
                ->exists()
        )->toBeTrue();

    $log = KpiLog::query()
        ->where('project_id', $project->id)
        ->where('event', 'project.deleted')
        ->sole();

    expect($log->user_id)->toBe($invest->id)
        ->and($log->properties['actor_name'])->toBe($invest->full_name)
        ->and($log->properties['details']['Өшірілген уақыт'])
        ->not->toBeEmpty();
});

test('only superadmin can view deleted projects and their history', function () {
    $admin = createDeletedProjectTestUser('superadmin');
    $invest = createDeletedProjectTestUser('invest');
    $project = createDeletedProjectTestProject($admin);
    $project->curators()->attach($invest);

    $this->actingAs($invest)
        ->delete(route('investment-projects.destroy', $project))
        ->assertRedirect();

    $this->actingAs($invest)
        ->get(route('investment-projects.deleted'))
        ->assertForbidden();

    $this->actingAs($invest)
        ->get(route('investment-projects.show', $project->id))
        ->assertNotFound();

    $this->actingAs($invest)
        ->get(route('investment-projects.logs', $project->id))
        ->assertNotFound();

    $this->actingAs($invest)
        ->post(route('investment-projects.restore-deleted', $project->id))
        ->assertForbidden();

    $this->actingAs($admin)
        ->get(route('investment-projects.deleted'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/deleted')
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $project->id)
            ->where('projects.data.0.deleter.id', $invest->id));

    $this->actingAs($admin)
        ->get(route('investment-projects.show', $project->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/show')
            ->where('project.id', $project->id)
            ->where('project.is_deleted', true)
            ->where('project.deleter.id', $invest->id));

    $this->actingAs($admin)
        ->get(route('investment-projects.documents.index', $project->id))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('investment-projects.gallery.index', $project->id))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('investment-projects.issues.index', $project->id))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('investment-projects.edit', $project->id))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('investment-projects.logs', $project->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/logs')
            ->where('project.id', $project->id)
            ->where('logs.data.0.event', 'project.deleted'));

    $this->actingAs($admin)
        ->put(route('investment-projects.update-status', $project->id), [
            'current_status' => 'Өшірілген жобадағы тексеру жаңартуы',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('kpi_logs', [
        'project_id' => $project->id,
        'user_id' => $admin->id,
        'event' => 'project.status_updated',
    ]);
});

test('superadmin can restore a deleted project and restoration is logged', function () {
    $admin = createDeletedProjectTestUser('superadmin');
    $invest = createDeletedProjectTestUser('invest');
    $project = createDeletedProjectTestProject($admin);
    $project->curators()->attach($invest);

    $this->actingAs($invest)
        ->delete(route('investment-projects.destroy', $project))
        ->assertRedirect();

    $this->actingAs($admin)
        ->post(route('investment-projects.restore-deleted', $project->id))
        ->assertRedirect(route('investment-projects.deleted'));

    $restored = InvestmentProject::findOrFail($project->id);

    expect($restored->is_deleted)->toBeFalse()
        ->and($restored->deleted_by)->toBeNull()
        ->and($restored->deleted_at)->toBeNull();

    $this->assertDatabaseHas('kpi_logs', [
        'project_id' => $project->id,
        'user_id' => $admin->id,
        'event' => 'project.restored',
        'category' => 'project',
    ]);
});

test('every non superadmin role is blocked from a deleted project', function (
    string $roleName
) {
    $admin = createDeletedProjectTestUser('superadmin');
    $user = createDeletedProjectTestUser($roleName);
    $project = createDeletedProjectTestProject($admin);

    $project->update([
        'is_deleted' => true,
        'deleted_by' => $admin->id,
        'deleted_at' => now(),
    ]);

    $protectedUrls = [
        route('investment-projects.deleted'),
        route('investment-projects.show', $project->id),
        route('investment-projects.edit', $project->id),
        route('investment-projects.documents.index', $project->id),
        route('investment-projects.gallery.index', $project->id),
        route('investment-projects.issues.index', $project->id),
        route('investment-projects.logs', $project->id),
    ];

    foreach ($protectedUrls as $url) {
        expect($this->actingAs($user)->get($url)->status())
            ->toBeIn([403, 404]);
    }
})->with([
    'invest' => 'invest',
    'moderator' => 'moderator',
    'prokuror' => 'prokuror',
    'akim' => 'akim',
    'zamakim' => 'zamakim',
    'ispolnitel' => 'ispolnitel',
    'investor' => 'investor',
]);
