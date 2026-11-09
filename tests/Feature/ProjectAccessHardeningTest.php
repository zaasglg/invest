<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use App\Services\InvestmentProjectAccessService;
use App\Services\ProjectExecutorAssignmentService;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

function hardenedProjectUser(string $role, array $attributes = []): User
{
    return User::factory()->create([
        'role' => $role === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => Role::firstOrCreate(['name' => $role], ['display_name' => $role])->id,
        ...$attributes,
    ]);
}

function hardenedProjectRegion(): Region
{
    return Region::create(['name' => 'Access district', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
}

function hardenedProject(User $creator, ?Region $region = null, string $status = 'plan'): InvestmentProject
{
    $project = InvestmentProject::create([
        'name' => 'Access test project', 'status' => $status,
        'created_by' => $creator->id, 'region_id' => ($region ?? hardenedProjectRegion())->id,
        'total_investment' => 100,
    ]);
    $project->curators()->attach($creator);

    return $project;
}

test('regional readers cannot bypass project scope through nested pages or exports', function (string $role) {
    $admin = hardenedProjectUser('superadmin');
    $project = hardenedProject($admin);
    $reader = hardenedProjectUser($role, ['region_id' => hardenedProjectRegion()->id]);
    $this->actingAs($reader);
    foreach (['show', 'documents.index', 'gallery.index', 'issues.index', 'passport', 'presentation'] as $suffix) {
        $this->get(route('investment-projects.'.$suffix, $project))->assertForbidden();
    }
    expect($reader->canDownloadFromProject($project))->toBeFalse();
})->with(['akim', 'zamakim']);

test('regional deputies can read projects in their oblast but not another oblast', function () {
    $admin = hardenedProjectUser('superadmin');
    $oblast = Region::create(['name' => 'Oblast', 'type' => 'oblast', 'color' => '#123456', 'icon' => 'factory']);
    $district = hardenedProjectRegion();
    $district->update(['parent_id' => $oblast->id]);
    $own = hardenedProject($admin, $district);
    $foreign = hardenedProject($admin);
    $reader = hardenedProjectUser('zamakim', ['region_id' => $oblast->id]);
    $this->actingAs($reader)->get(route('investment-projects.documents.index', $own))->assertOk();
    $this->get(route('investment-projects.documents.index', $foreign))->assertForbidden();
});

test('direction colleagues can manage projects and the audit identifies the actual editor', function (string $direction) {
    $owner = hardenedProjectUser('invest', ['invest_sub_role' => $direction]);
    $colleague = hardenedProjectUser('invest', ['invest_sub_role' => $direction]);
    $project = hardenedProject($owner);
    $this->actingAs($colleague)->get(route('investment-projects.show', $project))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->where('canManageProject', true));
    $this->get(route('investment-projects.edit', $project))->assertOk();
    $this->put(route('investment-projects.update', $project), [
        'name' => 'Updated by a direction colleague', 'region_id' => $project->region_id,
        'status' => 'plan', 'attraction_stage' => 'potential', 'total_investment' => 100,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $project->refresh();
    expect($project->name)->toBe('Updated by a direction colleague')
        ->and($project->created_by)->toBe($owner->id)
        ->and($project->curators()->pluck('users.id')->all())->toBe([$owner->id]);
    $log = KpiLog::where('project_id', $project->id)->where('event', 'project.updated')->latest('id')->firstOrFail();
    expect($log->user_id)->toBe($colleague->id)
        ->and($log->properties['actor_name'])->toBe($colleague->full_name)
        ->and($log->properties['changes']['name']['old'])->toBe('Access test project')
        ->and($log->properties['changes']['name']['new'])->toBe($project->name);

    $this->post(route('investment-projects.archive', $project))->assertRedirect();
    expect($project->fresh()->is_archived)->toBeTrue();
    $this->get(route('investment-projects.edit', $project))->assertStatus(409);
    $this->post(route('investment-projects.unarchive', $project))->assertRedirect();
    $this->delete(route('investment-projects.destroy', $project))->assertRedirect();
    expect($project->fresh()->is_deleted)->toBeTrue();
})->with(['turkistan_invest', 'aea', 'ia', 'prom_zone']);

test('direction colleagues can create attraction work and roadmap tasks with their own authorship', function (string $direction) {
    $owner = hardenedProjectUser('invest', ['invest_sub_role' => $direction]);
    $colleague = hardenedProjectUser('invest', ['invest_sub_role' => $direction]);
    $planned = hardenedProject($owner);
    $operational = hardenedProject($owner, status: 'implementation');
    $executor = hardenedProjectUser('ispolnitel', ['baskarma_type' => 'additional']);

    $this->actingAs($colleague)->post(route('investment-projects.attraction-activities.store', $planned), [
        'attraction_stage' => 'potential', 'next_action' => 'Colleague attraction work',
        'next_action_due_date' => today()->addWeek()->toDateString(), 'responsible_id' => $executor->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($planned->attractionActivities()->sole()->created_by)->toBe($colleague->id);

    $this->post(route('investment-projects.tasks.store', $operational), [
        'title' => 'Colleague roadmap task', 'assigned_to' => $executor->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $task = $operational->tasks()->sole();
    expect($task->created_by)->toBe($colleague->id)
        ->and($task->approval_status)->toBe($direction === 'turkistan_invest' ? 'pending' : 'approved');
    foreach ([[$planned->id, 'attraction.created'], [$operational->id, 'task.created']] as [$projectId, $event]) {
        $log = KpiLog::where('project_id', $projectId)->where('event', $event)->sole();
        expect($log->user_id)->toBe($colleague->id)
            ->and($log->properties['actor_name'])->toBe($colleague->full_name);
    }
})->with(['turkistan_invest', 'aea', 'ia', 'prom_zone']);

test('shared management does not grant access across Invest directions', function (string $direction) {
    $owner = hardenedProjectUser('invest', ['invest_sub_role' => $direction]);
    $project = hardenedProject($owner);
    foreach (array_diff(['turkistan_invest', 'aea', 'ia', 'prom_zone'], [$direction]) as $otherDirection) {
        $outsider = hardenedProjectUser('invest', ['invest_sub_role' => $otherDirection]);
        expect(app(InvestmentProjectAccessService::class)->canManage($outsider, $project))->toBeFalse();
        $this->actingAs($outsider)->get(route('investment-projects.show', $project))->assertForbidden();
        $this->get(route('investment-projects.edit', $project))->assertForbidden();
        $this->put(route('investment-projects.update', $project), ['name' => 'Forbidden change'])->assertForbidden();
        $this->post(route('investment-projects.attraction-activities.store', $project), [])->assertForbidden();
        $this->post(route('investment-projects.tasks.store', $project), [])->assertForbidden();
        $this->post(route('investment-projects.archive', $project))->assertForbidden();
        $this->delete(route('investment-projects.destroy', $project))->assertForbidden();
    }
    expect($project->fresh()->name)->toBe('Access test project')
        ->and(KpiLog::where('project_id', $project->id)->where('event', 'project.updated')->exists())->toBeFalse();
})->with(['turkistan_invest', 'aea', 'ia', 'prom_zone']);

test('Invest users without a direction still require direct curatorship', function () {
    $owner = hardenedProjectUser('invest', ['invest_sub_role' => null]);
    $colleague = hardenedProjectUser('invest', ['invest_sub_role' => null]);
    $project = hardenedProject($owner);
    $this->actingAs($colleague)->get(route('investment-projects.edit', $project))->assertForbidden();
    $project->curators()->attach($colleague);
    $this->get(route('investment-projects.edit', $project))->assertOk();
});

test('archived projects are read only until explicitly restored', function () {
    $admin = hardenedProjectUser('superadmin');
    $project = hardenedProject($admin);
    $project->update(['is_archived' => true]);
    $this->actingAs($admin)->get(route('investment-projects.show', $project))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('canManageProject', false)->where('canRestoreProject', true));
    $this->get(route('investment-projects.edit', $project))->assertStatus(409);
    $this->put(route('investment-projects.update-status', $project), ['current_status' => 'Changed'])->assertStatus(409);
    $this->delete(route('investment-projects.destroy', $project))->assertStatus(409);
    $this->post(route('investment-projects.unarchive', $project))->assertRedirect();
    expect($project->fresh()->is_archived)->toBeFalse();
});

test('moving district executors revokes automatic old access and preserves explicit access', function () {
    $admin = hardenedProjectUser('superadmin');
    $oldRegion = hardenedProjectRegion();
    $newRegion = hardenedProjectRegion();
    $old = hardenedProject($admin, $oldRegion, 'implementation');
    $new = hardenedProject($admin, $newRegion, 'implementation');
    $manual = hardenedProject($admin);
    $executor = hardenedProjectUser('ispolnitel', ['baskarma_type' => 'district', 'region_id' => $oldRegion->id]);
    $manual->executors()->attach($executor, ['assignment_source' => 'manual']);
    expect($executor->isInvolvedInProject($old))->toBeTrue();
    $executor->update(['region_id' => $newRegion->id]);
    expect($executor->isInvolvedInProject($old))->toBeFalse()
        ->and($executor->isInvolvedInProject($new))->toBeTrue()
        ->and($executor->isInvolvedInProject($manual))->toBeTrue();
    $this->actingAs($executor)->put(route('investment-projects.update-status', $old), ['current_status' => 'Invalid'])->assertForbidden();
});

test('planned project negotiation is not automatically shared with all district executors', function () {
    $admin = hardenedProjectUser('superadmin');
    $region = hardenedProjectRegion();
    $executor = hardenedProjectUser('ispolnitel', ['baskarma_type' => 'district', 'region_id' => $region->id]);
    $project = hardenedProject($admin, $region);
    expect($executor->isInvolvedInProject($project))->toBeFalse();
    app(ProjectExecutorAssignmentService::class)->syncProject($project, [$executor->id]);
    expect($executor->isInvolvedInProject($project))->toBeTrue();
});

test('removing an active attraction responsible is refused before participation can be lost', function () {
    $admin = hardenedProjectUser('superadmin');
    $project = hardenedProject($admin);
    $executor = hardenedProjectUser('ispolnitel', ['baskarma_type' => 'additional']);
    $project->executors()->attach($executor);
    $activity = $project->attractionActivities()->create([
        'attraction_stage' => 'potential', 'next_action' => 'Work', 'next_action_due_date' => today()->addDays(3),
        'responsible_id' => $executor->id, 'created_by' => $admin->id, 'status' => 'planned',
    ]);
    expect(fn () => app(ProjectExecutorAssignmentService::class)->syncProject($project, []))
        ->toThrow(ValidationException::class);
    expect($executor->isInvolvedInProject($project))->toBeTrue();
    $activity->update(['status' => 'cancelled']);
    app(ProjectExecutorAssignmentService::class)->syncProject($project, []);
    expect($executor->isInvolvedInProject($project))->toBeFalse();
});

test('curator changes preserve actual creator and reject invalid participant roles', function () {
    $admin = hardenedProjectUser('superadmin');
    $curator = hardenedProjectUser('invest');
    $outsider = hardenedProjectUser('applicant');
    $project = hardenedProject($admin);
    $payload = ['name' => $project->name, 'region_id' => $project->region_id,
        'status' => 'plan', 'total_investment' => 1000, 'curator_ids' => [$curator->id]];
    $this->actingAs($admin)->put(route('investment-projects.update', $project), $payload)
        ->assertRedirect()->assertSessionHasNoErrors();
    expect($project->fresh()->created_by)->toBe($admin->id);
    $this->put(route('investment-projects.update', $project), [...$payload, 'executor_ids' => [$outsider->id]])
        ->assertSessionHasErrors('executor_ids.0');
    $this->put(route('investment-projects.update', $project), [...$payload, 'curator_ids' => [$outsider->id]])
        ->assertSessionHasErrors('curator_ids.0');
});

test('legacy assignment migration keeps assigned work while removing automatic planning access', function () {
    $admin = hardenedProjectUser('superadmin');
    $region = hardenedProjectRegion();
    $executor = hardenedProjectUser('ispolnitel', ['baskarma_type' => 'district', 'region_id' => $region->id]);
    $unassigned = hardenedProject($admin, $region);
    $assigned = hardenedProject($admin, $region);
    $foreign = hardenedProject($admin);
    foreach ([$unassigned, $assigned, $foreign] as $project) {
        $project->executors()->attach($executor);
    }
    $assigned->attractionActivities()->create([
        'attraction_stage' => 'potential', 'next_action' => 'Explicit assignment',
        'next_action_due_date' => today()->addDay(), 'responsible_id' => $executor->id,
        'created_by' => $admin->id, 'status' => 'planned',
    ]);
    $migration = require database_path('migrations/2026_11_05_000004_track_project_executor_assignment_origin.php');
    $migration->down();
    $migration->up();

    expect($unassigned->executors()->whereKey($executor->id)->exists())->toBeFalse()
        ->and($assigned->executors()->whereKey($executor->id)->sole()->pivot->assignment_source)->toBe('manual')
        ->and($foreign->executors()->whereKey($executor->id)->sole()->pivot->assignment_source)->toBe('manual');
});

test('active responsibilities prevent losing curator or investor access during project edits', function (string $role, string $field) {
    $admin = hardenedProjectUser('superadmin');
    $project = hardenedProject($admin);
    $company = Company::factory()->create();
    $project->update(['company_id' => $company->id]);
    $responsible = hardenedProjectUser($role, $role === 'investor' ? ['company_id' => $company->id] : []);
    if ($role === 'invest') {
        $project->curators()->attach($responsible);
    }
    $activity = $project->attractionActivities()->create([
        'attraction_stage' => 'potential', 'next_action' => 'Assigned work',
        'next_action_due_date' => today()->addDay(), 'responsible_id' => $responsible->id,
        'created_by' => $admin->id, 'status' => 'planned',
    ]);
    $payload = ['name' => $project->name, 'region_id' => $project->region_id, 'status' => 'plan',
        'total_investment' => 1000,
        'company_id' => $role === 'investor' ? null : $company->id,
        'curator_ids' => [$admin->id]];
    $this->actingAs($admin)->put(route('investment-projects.update', $project), $payload)
        ->assertSessionHasErrors($field);
    expect($project->fresh()->company_id)->toBe($company->id)
        ->and($activity->fresh()->responsible_id)->toBe($responsible->id);
})->with([['invest', 'curator_ids'], ['investor', 'company_id']]);
