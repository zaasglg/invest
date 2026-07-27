<?php

use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createInvestorTestRole(string $name, string $displayName): Role
{
    return Role::firstOrCreate(
        ['name' => $name],
        [
            'display_name' => $displayName,
            'description' => "{$displayName} test role",
        ]
    );
}

function createInvestorTestUser(string $roleName): User
{
    $role = createInvestorTestRole(
        $roleName,
        $roleName === 'investor' ? 'Инвестор' : ucfirst($roleName)
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
    ]);
}

function createInvestorTestRegion(string $name = 'Инвестор тест ауданы'): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

function createInvestorTestProject(
    User $creator,
    Region $region,
    string $name,
    float $investment
): InvestmentProject {
    return InvestmentProject::create([
        'name' => $name,
        'region_id' => $region->id,
        'total_investment' => $investment,
        'status' => 'implementation',
        'current_status' => 'Іске асырылуда',
        'company_name' => "{$name} компаниясы",
        'description' => "{$name} сипаттамасы",
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $creator->id,
    ]);
}

test('investor role and project assignment table are registered', function () {
    $this->assertDatabaseHas('roles', [
        'name' => 'investor',
        'display_name' => 'Инвестор',
    ]);

    expect(Schema::hasTable('investment_project_investor'))->toBeTrue();
});

test('superadmin creates and updates investor with multiple projects', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $investorRole = Role::where('name', 'investor')->firstOrFail();
    $region = createInvestorTestRegion();
    $firstProject = createInvestorTestProject(
        $superadmin,
        $region,
        'Бірінші инвестор жобасы',
        1000000
    );
    $secondProject = createInvestorTestProject(
        $superadmin,
        $region,
        'Екінші инвестор жобасы',
        2000000
    );

    $this->actingAs($superadmin)
        ->post('/users', [
            'full_name' => 'Тест Инвестор',
            'email' => 'investor@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role_id' => $investorRole->id,
            'project_ids' => [$firstProject->id, $secondProject->id],
        ])
        ->assertRedirect('/users');

    $investor = User::where('email', 'investor@example.com')->firstOrFail();
    expect($investor->investorProjects()->pluck('investment_projects.id')->all())
        ->toEqualCanonicalizing([$firstProject->id, $secondProject->id]);

    $this->actingAs($superadmin)
        ->put("/users/{$investor->id}", [
            'full_name' => $investor->full_name,
            'email' => $investor->email,
            'password' => '',
            'password_confirmation' => '',
            'role_id' => $investorRole->id,
            'project_ids' => [$secondProject->id],
        ])
        ->assertRedirect('/users');

    expect($investor->investorProjects()->pluck('investment_projects.id')->all())
        ->toBe([$secondProject->id]);
});

test('investor account requires at least one assigned project', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $investorRole = Role::where('name', 'investor')->firstOrFail();

    $this->actingAs($superadmin)
        ->post('/users', [
            'full_name' => 'Жобасыз Инвестор',
            'email' => 'investor-without-project@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role_id' => $investorRole->id,
            'project_ids' => [],
        ])
        ->assertSessionHasErrors('project_ids');
});

test('investor sees only assigned projects and scoped dashboard totals', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $investor = createInvestorTestUser('investor');
    $assignedRegion = createInvestorTestRegion('Бекітілген аудан');
    $otherRegion = createInvestorTestRegion('Басқа аудан');
    $assignedProject = createInvestorTestProject(
        $superadmin,
        $assignedRegion,
        'Инвесторға бекітілген жоба',
        1500000
    );
    $otherProject = createInvestorTestProject(
        $superadmin,
        $otherRegion,
        'Басқа жабық жоба',
        9000000
    );
    $investor->investorProjects()->attach($assignedProject);

    $this->actingAs($investor)
        ->get('/investment-projects')
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/index')
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $assignedProject->id)
            ->where('stats.total_projects', 1)
            ->where(
                'stats.total_investment',
                fn ($value) => (float) $value === 1500000.0
            ));

    $this->actingAs($investor)
        ->get('/dashboard')
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('stats.project_count', 1)
            ->where(
                'stats.total_investment',
                fn ($value) => (float) $value === 1500000.0
            )
            ->has('regions', 1)
            ->where(
                'sectorSummary.total.all_projects.projectCount',
                1
            )
            ->where(
                'sectorSummary.total.all_projects.investment',
                fn ($value) => (float) $value === 1500000.0
            ));

    $this->actingAs($investor)
        ->get("/investment-projects/{$assignedProject->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/show')
            ->where('project.id', $assignedProject->id)
            ->where('project.investors.0.id', $investor->id)
            ->where('isInvolved', true)
            ->where('canModify', false));

    $this->actingAs($investor)
        ->get("/investment-projects/{$otherProject->id}")
        ->assertForbidden();
});

test('investor navigation scope is enforced on the server', function () {
    $investor = createInvestorTestUser('investor');

    $this->actingAs($investor)->get('/notifications')->assertOk();
    $this->actingAs($investor)->get('/sezs')->assertForbidden();
    $this->actingAs($investor)->get('/issues')->assertForbidden();
    $this->actingAs($investor)->get('/baskarma-rating')->assertForbidden();
    $this->actingAs($investor)->get('/users')->assertForbidden();
    $this->actingAs($investor)
        ->get('/investment-projects/create')
        ->assertForbidden();
    $this->actingAs($investor)
        ->post('/chat/send', ['message' => 'Барлық жобалар'])
        ->assertForbidden();
});

test('assigned investor receives and completes a project roadmap task', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $investor = createInvestorTestUser('investor');
    $region = createInvestorTestRegion();
    $project = createInvestorTestProject(
        $superadmin,
        $region,
        'Тапсырмасы бар инвестор жобасы',
        3000000
    );
    $project->investors()->attach($investor);

    $this->actingAs($superadmin)
        ->post("/investment-projects/{$project->id}/tasks", [
            'title' => 'Инвестор орындайтын тапсырма',
            'description' => 'Инвестор тапсырмасының сипаттамасы',
            'assigned_to' => $investor->id,
            'start_date' => '2026-08-01',
            'due_date' => '2026-08-31',
        ])
        ->assertRedirect();

    $task = ProjectTask::where('project_id', $project->id)
        ->where('assigned_to', $investor->id)
        ->firstOrFail();

    expect($project->executors()->where('users.id', $investor->id)->exists())
        ->toBeFalse();
    $this->assertDatabaseHas('task_notifications', [
        'user_id' => $investor->id,
        'task_id' => $task->id,
        'type' => 'task_assigned',
    ]);

    $this->actingAs($investor)
        ->post("/investment-projects/{$project->id}/tasks/{$task->id}/view")
        ->assertRedirect();

    $this->actingAs($investor)
        ->post(
            "/investment-projects/{$project->id}/tasks/{$task->id}/completions",
            ['comment' => 'Инвестор тапсырманы орындады']
        )
        ->assertRedirect();

    $this->assertDatabaseHas('task_completions', [
        'task_id' => $task->id,
        'submitted_by' => $investor->id,
        'comment' => 'Инвестор тапсырманы орындады',
        'status' => 'pending',
    ]);

    $this->actingAs($investor)
        ->post("/investment-projects/{$project->id}/tasks", [
            'title' => 'Рұқсатсыз тапсырма',
            'assigned_to' => $investor->id,
        ])
        ->assertForbidden();
});

test('investor cannot be assigned a task outside their projects', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $investor = createInvestorTestUser('investor');
    $region = createInvestorTestRegion();
    $project = createInvestorTestProject(
        $superadmin,
        $region,
        'Инвесторға бекітілмеген жоба',
        4000000
    );

    $this->actingAs($superadmin)
        ->post("/investment-projects/{$project->id}/tasks", [
            'title' => 'Қате тағайындалған тапсырма',
            'assigned_to' => $investor->id,
        ])
        ->assertSessionHasErrors('assigned_to');
});
