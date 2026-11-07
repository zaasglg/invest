<?php

use App\Models\InvestmentProject;
use App\Models\ProjectAttractionActivity;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskCompletion;
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

test('my work combines active attraction and approved roadmap assignments and opens the matching action', function () {
    $manager = worklistUser();
    $colleague = worklistUser('invest');
    $planned = worklistProject($manager);
    worklistActivity($planned, $colleague, ['next_action_due_date' => today()->subDay()]);
    $mine = worklistActivity($planned, $manager);
    $implementation = worklistProject($manager, ['status' => 'implementation']);
    worklistTask($implementation, $manager);
    $foreign = worklistProject($manager);
    worklistActivity($foreign, $colleague);
    $closed = worklistProject($manager);
    worklistActivity($closed, $manager, ['status' => 'completed']);
    $pending = worklistProject($manager, ['status' => 'implementation']);
    worklistTask($pending, $manager, ['approval_status' => 'pending']);

    $this->actingAs($manager)->get(route('investment-projects.index', ['work_filter' => 'my']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 2)
        ->where('projects.data', function ($rows) use ($planned, $implementation, $mine) {
            $rows = collect($rows);

            return $rows->pluck('id')->sort()->values()->all() === collect([$planned->id, $implementation->id])->sort()->values()->all()
                && data_get($rows->firstWhere('id', $planned->id), 'next_action.id') === $mine->id;
        })
        ->where('filters.work_filter', 'my'));
});

test('stage and responsible filters combine without including other lifecycle statuses', function () {
    $manager = worklistUser();
    $colleague = worklistUser('invest');
    $matching = worklistProject($manager, ['attraction_stage' => 'conditions']);
    worklistActivity($matching, $manager);
    $differentStage = worklistProject($manager);
    worklistActivity($differentStage, $manager);
    $differentResponsible = worklistProject($manager, ['attraction_stage' => 'conditions']);
    worklistActivity($differentResponsible, $colleague);
    $implementation = worklistProject($manager, ['status' => 'implementation']);
    worklistTask($implementation, $manager);

    $this->actingAs($manager)->get(route('investment-projects.index', [
        'attraction_stage' => 'conditions', 'responsible_id' => $manager->id,
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 1)
        ->where('projects.data.0.id', $matching->id)
        ->where('projects.data.0.next_action.responsible_id', $manager->id));
});

test('overdue work excludes closed declined archived and unapproved work', function () {
    $manager = worklistUser();
    $planned = worklistProject($manager);
    worklistActivity($planned, $manager, ['next_action_due_date' => today()->subDay()]);
    $implementation = worklistProject($manager, ['status' => 'implementation']);
    worklistTask($implementation, $manager, ['due_date' => today()->subDay()]);
    foreach ([['status' => 'completed'], ['status' => 'cancelled'], ['next_action_due_date' => today()->addWeek()]] as $activity) {
        worklistActivity(worklistProject($manager), $manager, ['next_action_due_date' => today()->subDay(), ...$activity]);
    }
    worklistActivity(worklistProject($manager, ['attraction_stage' => 'declined']), $manager, ['next_action_due_date' => today()->subDay()]);
    worklistActivity(worklistProject($manager, ['is_archived' => true]), $manager, ['next_action_due_date' => today()->subDay()]);
    worklistTask(worklistProject($manager, ['status' => 'implementation']), $manager, ['due_date' => today()->subDay(), 'approval_status' => 'pending']);

    $this->actingAs($manager)->get(route('investment-projects.index', ['work_filter' => 'overdue']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 2)
        ->where('projects.data', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all()
            === collect([$planned->id, $implementation->id])->sort()->values()->all()));
});

test('pending review work includes current reports and excludes reports for old task definitions', function () {
    $manager = worklistUser();
    $planned = worklistProject($manager);
    worklistActivity($planned, $manager, ['status' => 'pending_review']);
    $current = worklistProject($manager, ['status' => 'implementation']);
    $currentTask = worklistTask($current, $manager, ['definition_version' => 2]);
    $old = worklistProject($manager, ['status' => 'implementation']);
    $oldTask = worklistTask($old, $manager, ['definition_version' => 2]);
    foreach ([[$currentTask, 2], [$oldTask, 1]] as [$task, $version]) {
        TaskCompletion::create([
            'task_id' => $task->id, 'submitted_by' => $manager->id,
            'status' => 'pending', 'task_definition_version' => $version,
        ]);
    }

    $this->actingAs($manager)->get(route('investment-projects.index', ['work_filter' => 'pending_review']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 2)
        ->where('projects.data', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all()
            === collect([$planned->id, $current->id])->sort()->values()->all()));
});

test('unrelated executors see no operational next action in the project list', function () {
    $manager = worklistUser();
    $executor = worklistUser('ispolnitel', ['baskarma_type' => 'additional']);
    $project = worklistProject($manager);
    worklistActivity($project, $manager, ['next_action' => 'Құпия келіссөз']);

    $this->actingAs($executor)->get(route('investment-projects.index'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('projects.data', 1)
        ->where('projects.data.0.next_action', null)
        ->missing('projects.data.0.attraction_activities')
        ->missing('projects.data.0.tasks'));
});
