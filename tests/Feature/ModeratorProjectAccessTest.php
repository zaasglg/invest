<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskNotification;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createModeratorScopeUser(
    string $roleName,
    ?string $investSubRole = null
): User {
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        [
            'display_name' => ucfirst($roleName),
            'description' => "Test {$roleName}",
        ]
    );

    return User::factory()->create([
        'role' => $roleName === 'invest' ? 'invest' : 'district_user',
        'role_id' => $role->id,
        'invest_sub_role' => $investSubRole,
    ]);
}

function createModeratorScopeRegion(): Region
{
    $oblast = Region::create([
        'name' => 'Moderator scope облысы',
        'type' => 'oblast',
        'color' => '#123456',
        'icon' => 'factory',
    ]);

    return Region::create([
        'name' => 'Moderator scope ауданы',
        'type' => 'district',
        'parent_id' => $oblast->id,
        'color' => '#654321',
        'icon' => 'factory',
    ]);
}

/**
 * @return array{
 *     company: Company,
 *     project_type: ProjectType,
 *     region: Region
 * }
 */
function createModeratorScopeProjectDependencies(): array
{
    $region = createModeratorScopeRegion();
    $company = Company::factory()->create(['region_id' => $region->id]);
    $investor = createModeratorScopeUser('investor');
    $investor->update(['company_id' => $company->id]);

    return [
        'company' => $company,
        'project_type' => ProjectType::create([
            'name' => 'Moderator scope project type',
        ]),
        'region' => $region,
    ];
}

function createModeratorScopeProject(
    User $creator,
    array $dependencies,
    string $name
): InvestmentProject {
    $project = InvestmentProject::create([
        'name' => $name,
        'company_id' => $dependencies['company']->id,
        'company_name' => $dependencies['company']->display_name,
        'region_id' => $dependencies['region']->id,
        'project_type_id' => $dependencies['project_type']->id,
        'total_investment' => 1000000,
        'status' => 'plan',
        'current_status' => 'Жоспарлау',
        'created_by' => $creator->id,
    ]);
    $project->curators()->attach($creator);

    return $project;
}

function moderatorProjectPayload(array $dependencies): array
{
    return [
        'name' => 'Moderator басқаратын жаңа жоба',
        'company_id' => $dependencies['company']->id,
        'description' => 'Moderator project scope test',
        'current_status' => 'Жоспарлау',
        'jobs_count' => 25,
        'region_id' => $dependencies['region']->id,
        'project_type_id' => $dependencies['project_type']->id,
        'sector' => [],
        'total_investment' => 2500000,
        'status' => 'plan',
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'executor_ids' => [],
        'geometry' => [],
        'infrastructure' => [],
    ];
}

test('moderator sees the active and archived turkistan invest project scope', function () {
    $moderator = createModeratorScopeUser('moderator');
    $turkistanInvest = createModeratorScopeUser(
        'invest',
        'turkistan_invest'
    );
    $otherInvest = createModeratorScopeUser('invest', 'aea');
    $dependencies = createModeratorScopeProjectDependencies();

    $visibleProject = createModeratorScopeProject(
        $otherInvest,
        $dependencies,
        'Moderator көретін жоба'
    );
    $visibleProject->curators()->attach($turkistanInvest);
    $foreignProject = createModeratorScopeProject(
        $turkistanInvest,
        $dependencies,
        'Moderator көрмейтін жоба'
    );
    $foreignProject->curators()->sync([$otherInvest->id]);
    $archivedProject = createModeratorScopeProject(
        $otherInvest,
        $dependencies,
        'Архив жоба'
    );
    $archivedProject->curators()->attach($turkistanInvest);
    $archivedProject->update(['is_archived' => true]);

    $this->actingAs($moderator)
        ->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/index')
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $visibleProject->id)
            ->where('canModify', false));

    $this->get(route('investment-projects.show', $visibleProject))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canAccessChat', true)
            ->where('canModify', false));

    $this->get(route('investment-projects.show', $foreignProject))
        ->assertForbidden();
    $this->get(route('investment-projects.show', $archivedProject))
        ->assertOk();

    $this->get(route('investment-projects.archived'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/archived')
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $archivedProject->id));
});

test('moderator creates a turkistan invest project as its curator', function () {
    $moderator = createModeratorScopeUser('moderator');
    $turkistanInvest = createModeratorScopeUser(
        'invest',
        'turkistan_invest'
    );
    $otherInvest = createModeratorScopeUser('invest', 'aea');
    $dependencies = createModeratorScopeProjectDependencies();

    $this->actingAs($moderator)
        ->get(route('investment-projects.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canSelectCurators', false)
            ->where('requiresCuratorSelection', false)
            ->has('investUsers', 0));

    $payload = moderatorProjectPayload($dependencies);

    $this->post(route('investment-projects.store'), $payload)
        ->assertRedirect(route('investment-projects.index'));

    $project = InvestmentProject::where(
        'name',
        'Moderator басқаратын жаңа жоба'
    )->firstOrFail();

    expect($project->created_by)->toBe($moderator->id)
        ->and($project->curators()->pluck('users.id')->all())
        ->toBe([$moderator->id]);

    $this->actingAs($turkistanInvest)
        ->get(route('investment-projects.show', $project))
        ->assertOk();

    $this->actingAs($otherInvest)
        ->get(route('investment-projects.show', $project))
        ->assertForbidden();
});

test('moderator can edit scoped projects but cannot mutate other resources', function () {
    $moderator = createModeratorScopeUser('moderator');
    $turkistanInvest = createModeratorScopeUser(
        'invest',
        'turkistan_invest'
    );
    $otherInvest = createModeratorScopeUser('invest', 'ia');
    $dependencies = createModeratorScopeProjectDependencies();
    $visibleProject = createModeratorScopeProject(
        $turkistanInvest,
        $dependencies,
        'Өңделетін жоба'
    );
    $foreignProject = createModeratorScopeProject(
        $otherInvest,
        $dependencies,
        'Жабық жоба'
    );
    $visibleProject->productionPlans()->create([
        'product_name' => 'Тест өнімі',
        'planned_quantity' => 100,
        'unit' => 'piece',
        'planned_amount' => 1000000,
        'period' => 'year',
    ]);

    $this->actingAs($moderator)
        ->get(route('investment-projects.edit', $visibleProject))
        ->assertOk();

    $payload = moderatorProjectPayload($dependencies);
    $payload['name'] = 'Moderator өңдеген жоба';

    $this->put(
        route('investment-projects.update', $visibleProject),
        $payload
    )->assertRedirect(route('investment-projects.show', $visibleProject));

    expect($visibleProject->fresh()->name)->toBe('Moderator өңдеген жоба')
        ->and($visibleProject->productionPlans()->count())->toBe(1);

    $this->post(route('investment-projects.archive', $visibleProject))
        ->assertRedirect();
    expect($visibleProject->fresh()->is_archived)->toBeTrue();

    $this->get(route('investment-projects.archived'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $visibleProject->id));

    $this->post(route('investment-projects.unarchive', $visibleProject))
        ->assertRedirect();
    expect($visibleProject->fresh()->is_archived)->toBeFalse();

    $this->get(route('investment-projects.edit', $foreignProject))
        ->assertForbidden();
    $this->delete(route('investment-projects.destroy', $visibleProject))
        ->assertForbidden();
    $this->get(route('sezs.create'))->assertForbidden();
    $this->post(route('sezs.store'), [])->assertForbidden();
});

test('moderator joins only turkistan invest project chats', function () {
    $moderator = createModeratorScopeUser('moderator');
    $turkistanInvest = createModeratorScopeUser(
        'invest',
        'turkistan_invest'
    );
    $otherInvest = createModeratorScopeUser('invest', 'prom_zone');
    $dependencies = createModeratorScopeProjectDependencies();
    $visibleProject = createModeratorScopeProject(
        $otherInvest,
        $dependencies,
        'Moderator chat жобасы'
    );
    $visibleProject->curators()->attach($turkistanInvest);
    $foreignProject = createModeratorScopeProject(
        $turkistanInvest,
        $dependencies,
        'Жабық chat жобасы'
    );
    $foreignProject->curators()->sync([$otherInvest->id]);

    $this->actingAs($moderator)
        ->get(route('chats.index', $visibleProject))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedChat.id', $visibleProject->id)
            ->where(
                'selectedChat.participants',
                fn ($participants) => collect($participants)
                    ->contains('id', $moderator->id)
            ));

    $this->post(route('chats.messages.store', $visibleProject), [
        'message' => 'Moderator хабарламасы',
    ])->assertRedirect(route('chats.index', $visibleProject));

    $this->assertDatabaseHas('project_chat_messages', [
        'investment_project_id' => $visibleProject->id,
        'user_id' => $moderator->id,
        'message' => 'Moderator хабарламасы',
    ]);

    $this->get(route('chats.index', $foreignProject))->assertForbidden();
    $this->post(route('chats.messages.store', $foreignProject), [
        'message' => 'Жабық хабарлама',
    ])->assertForbidden();
});

test('only turkistan invest tasks require moderator approval', function () {
    $moderator = createModeratorScopeUser('moderator');
    $turkistanInvest = createModeratorScopeUser(
        'invest',
        'turkistan_invest'
    );
    $otherInvest = createModeratorScopeUser('invest', 'aea');
    $executor = createModeratorScopeUser('ispolnitel');
    $dependencies = createModeratorScopeProjectDependencies();
    $visibleProject = createModeratorScopeProject(
        $otherInvest,
        $dependencies,
        'Task scope жобасы'
    );
    $visibleProject->curators()->attach($turkistanInvest);
    $foreignProject = createModeratorScopeProject(
        $otherInvest,
        $dependencies,
        'Task жабық жобасы'
    );
    $turkistanTaskPayload = [
        'title' => 'Расталатын тапсырма',
        'assigned_to' => $executor->id,
        'start_date' => '2026-08-01',
        'due_date' => '2026-08-10',
    ];

    $this->actingAs($turkistanInvest)
        ->post(route(
            'investment-projects.tasks.store',
            $visibleProject
        ), $turkistanTaskPayload)
        ->assertRedirect();

    $visibleTask = ProjectTask::where(
        'title',
        'Расталатын тапсырма'
    )->firstOrFail();

    expect($visibleTask->approval_status)->toBe('pending')
        ->and($visibleTask->events()->orderBy('id')->pluck('type')->all())
        ->toBe(['created']);

    $this->assertDatabaseHas('task_notifications', [
        'user_id' => $moderator->id,
        'task_id' => $visibleTask->id,
        'type' => 'task_pending_approval',
    ]);

    $foreignTask = ProjectTask::create([
        'project_id' => $foreignProject->id,
        'title' => 'Жабық тапсырма',
        'assigned_to' => $executor->id,
        'created_by' => $otherInvest->id,
        'status' => 'new',
        'approval_status' => 'pending',
    ]);

    $this->actingAs($moderator)
        ->post(route(
            'investment-projects.tasks.approve',
            [$visibleProject, $visibleTask]
        ))
        ->assertRedirect();

    $this->post(route(
        'investment-projects.tasks.approve',
        [$visibleProject, $visibleTask]
    ))->assertStatus(409);

    $directTaskPayload = [
        'title' => 'Тікелей жіберілетін тапсырма',
        'assigned_to' => $executor->id,
        'start_date' => '2026-08-01',
        'due_date' => '2026-08-10',
    ];

    $this->actingAs($moderator)
        ->post(route(
            'investment-projects.tasks.store',
            $visibleProject
        ), $directTaskPayload)
        ->assertRedirect();

    $directTask = ProjectTask::where(
        'title',
        'Тікелей жіберілетін тапсырма'
    )->firstOrFail();

    expect($directTask->approval_status)->toBe('approved')
        ->and($directTask->approved_by)->toBe($moderator->id)
        ->and($directTask->events()->orderBy('id')->pluck('type')->all())
        ->toBe(['created', 'dispatched']);

    expect(TaskNotification::query()
        ->where('user_id', $moderator->id)
        ->where('task_id', $directTask->id)
        ->exists())->toBeFalse();

    $this->assertDatabaseHas('task_notifications', [
        'user_id' => $executor->id,
        'task_id' => $directTask->id,
        'type' => 'task_assigned',
    ]);

    $this->actingAs($moderator);
    $this->post(route(
        'investment-projects.tasks.reject',
        [$foreignProject, $foreignTask]
    ), [
        'approval_comment' => 'Қайтару себебі',
    ])->assertForbidden();
});

test('rating stays global while project links follow viewer access', function () {
    $moderator = createModeratorScopeUser('moderator');
    $turkistanInvest = createModeratorScopeUser(
        'invest',
        'turkistan_invest'
    );
    $aeaInvest = createModeratorScopeUser('invest', 'aea');
    $executor = createModeratorScopeUser('ispolnitel');
    $executor->update(['baskarma_type' => 'district']);
    $dependencies = createModeratorScopeProjectDependencies();

    $turkistanProject = createModeratorScopeProject(
        $turkistanInvest,
        $dependencies,
        'Turkistan Invest rating project'
    );
    $aeaProject = createModeratorScopeProject(
        $aeaInvest,
        $dependencies,
        'AEA rating project'
    );

    $turkistanTask = ProjectTask::create([
        'project_id' => $turkistanProject->id,
        'title' => 'Turkistan Invest rating task',
        'assigned_to' => $executor->id,
        'created_by' => $turkistanInvest->id,
        'start_date' => now()->toDateString(),
        'due_date' => now()->addWeek()->toDateString(),
        'status' => 'new',
        'approval_status' => 'approved',
    ]);
    $aeaTask = ProjectTask::create([
        'project_id' => $aeaProject->id,
        'title' => 'AEA rating task',
        'assigned_to' => $executor->id,
        'created_by' => $aeaInvest->id,
        'start_date' => now()->toDateString(),
        'due_date' => now()->addWeek()->toDateString(),
        'status' => 'new',
        'approval_status' => 'approved',
    ]);

    $this->actingAs($moderator)
        ->get(route('baskarma-rating'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('districtRatings', 1)
            ->where('districtRatings.0.id', $executor->id)
            ->where('districtRatings.0.total', 2));

    $this->get(route('baskarma-rating.show', $executor))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeTasks', function ($tasks) use (
                $turkistanTask,
                $aeaTask
            ) {
                $tasksById = collect($tasks)->keyBy('id');

                return $tasksById->count() === 2
                    && $tasksById[$turkistanTask->id]['can_view_project']
                    && ! $tasksById[$aeaTask->id]['can_view_project'];
            }));

    $this->actingAs($aeaInvest)
        ->get(route('baskarma-rating.show', $executor))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeTasks', function ($tasks) use (
                $turkistanTask,
                $aeaTask
            ) {
                $tasksById = collect($tasks)->keyBy('id');

                return $tasksById->count() === 2
                    && ! $tasksById[$turkistanTask->id]['can_view_project']
                    && $tasksById[$aeaTask->id]['can_view_project'];
            }));
});
