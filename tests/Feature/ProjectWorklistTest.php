<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectAttractionActivity;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function worklistUser(string $role = 'superadmin', array $attributes = []): User
{
    return User::factory()->create([
        'role' => $role === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => Role::firstOrCreate(['name' => $role], ['display_name' => $role])->id,
        ...$attributes,
    ]);
}

function worklistProject(User $owner, array $attributes = []): InvestmentProject
{
    $region = Region::create([
        'name' => 'Жұмыс тізімі ауданы', 'type' => 'district',
        'color' => '#123456', 'icon' => 'factory',
    ]);
    $project = InvestmentProject::create([
        'name' => 'Жұмыс тізімі жобасы', 'region_id' => $region->id,
        'status' => 'plan', 'attraction_stage' => 'negotiation',
        'created_by' => $owner->id, 'total_investment' => 1000,
        ...$attributes,
    ]);
    $project->curators()->attach($owner);

    return $project;
}

function worklistActivity(InvestmentProject $project, User $responsible, array $attributes = []): ProjectAttractionActivity
{
    return $project->attractionActivities()->create([
        'attraction_stage' => 'negotiation', 'next_action' => 'Келесі келіссөзді дайындау',
        'next_action_due_date' => today()->addWeek(), 'responsible_id' => $responsible->id,
        'created_by' => $project->created_by, 'status' => 'planned',
        ...$attributes,
    ]);
}

function worklistTask(InvestmentProject $project, User $responsible, array $attributes = []): ProjectTask
{
    return $project->tasks()->create([
        'title' => 'Техникалық шарттарды алу', 'due_date' => today()->addWeek(),
        'assigned_to' => $responsible->id, 'created_by' => $project->created_by,
        'status' => 'new', 'approval_status' => 'approved', 'definition_version' => 1,
        ...$attributes,
    ]);
}

test('accompaniment worklist includes only non-planned curated projects', function () {
    $manager = worklistUser('invest', ['invest_sub_role' => 'turkistan_invest']);
    $colleague = worklistUser('invest', ['invest_sub_role' => 'turkistan_invest']);
    $projects = collect(['implementation', 'launched', 'suspended'])
        ->map(fn ($status) => worklistProject($manager, ['status' => $status]));
    $planned = worklistProject($manager);
    $declined = worklistProject($manager, ['attraction_stage' => 'declined']);
    worklistActivity($planned, $colleague, ['status' => 'completed']);
    worklistTask($projects[0], $colleague, ['status' => 'done']);
    $foreign = worklistProject($colleague);
    worklistActivity($foreign, $manager);

    $this->actingAs($manager)->get(route('investment-projects.index', ['work_filter' => 'my']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('projects.data', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all()
            === $projects->pluck('id')->sort()->values()->all())
        ->where('stats.total_projects', 3)
        ->where('filters.work_filter', 'my')
        ->missing('projects.data.0.next_action'));
});

test('executor projects remain mine after tasks and activities are completed or before work is assigned', function () {
    $manager = worklistUser();
    $executor = worklistUser('ispolnitel', ['baskarma_type' => 'additional']);
    $projects = collect(['plan', 'implementation', 'launched', 'suspended'])
        ->map(fn ($status) => worklistProject($manager, ['status' => $status]));
    $projects->each(fn ($project) => $project->executors()->attach($executor));
    worklistActivity($projects[0], $executor, ['status' => 'completed']);
    worklistTask($projects[1], $executor, ['status' => 'done']);
    $unlisted = worklistProject($manager, ['status' => 'implementation']);
    worklistTask($unlisted, $executor);

    $this->actingAs($executor)->get(route('investment-projects.index', ['work_filter' => 'my']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('projects.data', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all()
            === $projects->pluck('id')->sort()->values()->all()));
});

test('company investors see their projects without requiring personal assignments', function () {
    $manager = worklistUser();
    $company = Company::factory()->create();
    $investor = worklistUser('investor', ['company_id' => $company->id]);
    $project = worklistProject($manager, ['company_id' => $company->id]);
    $other = worklistProject($manager, ['company_id' => Company::factory()->create()->id]);
    $other->executors()->attach($investor);

    $this->actingAs($investor)->get(route('investment-projects.index', ['work_filter' => 'my']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 1)->where('projects.data.0.id', $project->id));
});

test('other roles use actual project participation rather than every visible project', function (string $role) {
    $manager = worklistUser();
    $user = worklistUser($role);
    $project = worklistProject($manager);
    $foreign = worklistProject($manager);
    if ($role === 'moderator') {
        $project->curators()->attach($user);
        $foreign->curators()->attach(worklistUser('moderator'));
    } else {
        $project->executors()->attach($user);
    }

    $this->actingAs($user)->get(route('investment-projects.index', ['work_filter' => 'my']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 1)->where('projects.data.0.id', $project->id));
})->with(['superadmin', 'moderator', 'prokuror', 'akim', 'zamakim']);

test('creator fallback matches participants only when no curator exists and excludes archived or deleted projects', function () {
    $manager = worklistUser();
    $colleague = worklistUser('invest');
    $project = worklistProject($manager);
    $project->curators()->detach();
    $reassigned = worklistProject($manager);
    $reassigned->curators()->sync([$colleague->id]);
    worklistProject($manager, ['is_archived' => true]);
    worklistProject($manager, ['is_deleted' => true]);

    $this->actingAs($manager)->get(route('investment-projects.index', ['work_filter' => 'my']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 1)->where('projects.data.0.id', $project->id));
});

test('my projects continue to respect existing regional visibility restrictions', function () {
    $manager = worklistUser('invest', ['invest_sub_role' => 'turkistan_invest']);
    $project = worklistProject($manager, ['status' => 'implementation']);
    $manager->update(['region_id' => $project->region_id]);
    worklistProject($manager, ['status' => 'implementation']);

    $this->actingAs($manager)->get(route('investment-projects.index', ['work_filter' => 'my']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 1)->where('projects.data.0.id', $project->id));
});

test('attraction stage and my projects filters combine without requiring assigned work', function () {
    $manager = worklistUser();
    $colleague = worklistUser();
    $matching = worklistProject($manager, ['attraction_stage' => 'conditions']);
    worklistProject($manager);
    worklistProject($colleague, ['attraction_stage' => 'conditions']);
    worklistProject($manager, ['status' => 'implementation']);

    $this->actingAs($manager)->get(route('investment-projects.index', [
        'status' => 'plan', 'attraction_stage' => 'conditions', 'work_filter' => 'my',
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 1)
        ->where('projects.data.0.id', $matching->id)
        ->where('filters.attraction_stage', 'conditions'));
});

test('removed responsible filters in old urls do not restrict or invalidate project results', function (string $workFilter) {
    $manager = worklistUser();
    $project = worklistProject($manager);
    $foreign = worklistProject(worklistUser());
    $expected = $workFilter === 'my' ? [$project->id] : [$project->id, $foreign->id];
    sort($expected);

    $this->actingAs($manager)->get(route('investment-projects.index', [
        'work_filter' => $workFilter, 'responsible_id' => 'removed-user',
    ]))->assertOk()->assertSessionHasNoErrors()
        ->assertInertia(fn (Assert $page) => $page
            ->where('projects.data', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all() === $expected)
            ->missing('filters.responsible_id'));
})->with(['', 'my']);

test('attraction stage filters are ignored outside the planned project status', function (?string $status, string $stage) {
    $manager = worklistUser();
    $projects = collect([
        worklistProject($manager, ['attraction_stage' => 'conditions']),
        worklistProject($manager, ['attraction_stage' => 'negotiation']),
        worklistProject($manager, ['status' => 'implementation']),
        worklistProject($manager, ['status' => 'launched']),
        worklistProject($manager, ['status' => 'suspended']),
    ]);
    $filters = ['attraction_stage' => $stage];
    if ($status !== null) {
        $filters['status'] = $status;
    }
    $expectedIds = $projects->when($status, fn ($rows) => $rows->where('status', $status))
        ->pluck('id')->sort()->values()->all();

    $this->actingAs($manager)->get(route('investment-projects.index', $filters))
        ->assertOk()->assertSessionHasNoErrors()
        ->assertInertia(fn (Assert $page) => $page
            ->where('projects.data', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all() === $expectedIds)
            ->missing('filters.attraction_stage'));
})->with([null, '', 'implementation', 'launched', 'suspended'])->with(['conditions', 'stale-stage']);

test('planned project filters reject unknown attraction stages', function () {
    $manager = worklistUser();

    $this->actingAs($manager)->get(route('investment-projects.index', [
        'status' => 'plan', 'attraction_stage' => 'stale-stage',
    ]))->assertSessionHasErrors('attraction_stage');
});

test('removed work shortcuts in old urls show all visible projects', function (string $workFilter, string $role) {
    $manager = worklistUser();
    $viewer = $role === 'superadmin' ? $manager : worklistUser($role, ['baskarma_type' => 'additional']);
    $planned = worklistProject($manager);
    worklistActivity($planned, $manager, ['status' => 'pending_review', 'next_action_due_date' => today()->subDay()]);
    $completed = worklistProject($manager);
    worklistActivity($completed, $manager, ['status' => 'completed']);
    $implementation = worklistProject($manager, ['status' => 'implementation']);
    worklistTask($implementation, $manager, ['status' => 'done']);
    $unassigned = worklistProject($manager, ['status' => 'launched']);
    worklistProject($manager, ['is_archived' => true]);
    worklistProject($manager, ['is_deleted' => true]);
    $expectedIds = collect([$planned, $completed, $implementation, $unassigned])->pluck('id')->sort()->values()->all();

    $this->actingAs($viewer)->get(route('investment-projects.index', ['work_filter' => $workFilter]))
        ->assertOk()->assertSessionHasNoErrors()
        ->assertInertia(fn (Assert $page) => $page
            ->where('projects.data', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all() === $expectedIds)
            ->where('stats.total_projects', 4)
            ->missing('filters.work_filter'));
})->with(['pending_review', 'overdue'])->with(['superadmin', 'ispolnitel']);

test('unknown work shortcuts remain invalid', function () {
    $this->actingAs(worklistUser())->get(route('investment-projects.index', ['work_filter' => 'unknown-shortcut']))
        ->assertSessionHasErrors('work_filter');
});
test('unrelated executors see no operational next action in the project list', function () {
    $manager = worklistUser();
    $executor = worklistUser('ispolnitel', ['baskarma_type' => 'additional']);
    $project = worklistProject($manager);
    worklistActivity($project, $manager, ['next_action' => 'Құпия келіссөз']);

    $this->actingAs($executor)->get(route('investment-projects.index'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 1)
        ->missing('projects.data.0.next_action')
        ->missing('projects.data.0.attraction_activities')
        ->missing('projects.data.0.tasks'));
});
