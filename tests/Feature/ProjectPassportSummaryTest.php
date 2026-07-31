<?php

use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createPassportUser(string $roleName): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
    ]);
}

function createPassportProject(User $creator): InvestmentProject
{
    $region = Region::create([
        'name' => 'Паспорт тест аймағы',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);

    return InvestmentProject::create([
        'name' => 'Паспорт тест жобасы',
        'company_name' => 'Тест компаниясы',
        'description' => 'Жобаның толық тест сипаттамасы',
        'current_status' => 'Құрылыс жұмыстары жүргізілуде',
        'region_id' => $region->id,
        'total_investment' => 150000000,
        'jobs_count' => 75,
        'capacity' => 'Жылына 10 000 тонна',
        'status' => 'implementation',
        'start_date' => '2026-01-01',
        'end_date' => '2026-12-31',
        'created_by' => $creator->id,
    ]);
}

test('project passport exposes executive progress risk and milestone summary', function () {
    $this->travelTo(now()->setDate(2026, 7, 30)->startOfDay());

    $admin = createPassportUser('superadmin');
    $executor = createPassportUser('ispolnitel');
    $project = createPassportProject($admin);

    ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Аяқталған кезең',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'due_date' => '2026-06-01',
        'status' => 'done',
        'approval_status' => 'approved',
    ]);
    $overdueTask = ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Кешіккен бақылау нүктесі',
        'assigned_to' => $executor->id,
        'created_by' => $admin->id,
        'due_date' => '2026-07-29',
        'status' => 'in_progress',
        'approval_status' => 'approved',
    ]);
    ProjectIssue::create([
        'project_id' => $project->id,
        'title' => 'Инфрақұрылым тәуекелі',
        'description' => 'Электр желісіне қосылу мерзімі кешігуде',
        'severity' => 'critical',
        'status' => 'open',
        'created_by' => $admin->id,
    ]);
    ProjectIssue::create([
        'project_id' => $project->id,
        'title' => 'Шешілген мәселе',
        'description' => 'Мәселе жабылды',
        'severity' => 'low',
        'status' => 'resolved',
        'created_by' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->get("/investment-projects/{$project->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/show')
            ->where('passportSummary.progress_percent', 50)
            ->where('passportSummary.tasks.total', 2)
            ->where('passportSummary.tasks.completed', 1)
            ->where('passportSummary.tasks.overdue', 1)
            ->where('passportSummary.issues.total', 2)
            ->where('passportSummary.issues.open', 1)
            ->where('passportSummary.issues.critical', 1)
            ->where('passportSummary.health.level', 'critical')
            ->where(
                'passportSummary.next_milestone.id',
                $overdueTask->id
            )
            ->where('passportSummary.next_milestone.is_overdue', true)
            ->where('passportSummary.timeline.has_dates', true)
            ->where('passportSummary.timeline.is_overdue', false)
            ->has('passportSummary.completeness.missing'));

    $this->travelBack();
});

test('uninvolved executor does not receive operational passport aggregates', function () {
    $admin = createPassportUser('superadmin');
    $executor = createPassportUser('ispolnitel');
    $assignedExecutor = createPassportUser('ispolnitel');
    $project = createPassportProject($admin);

    ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'Жабық операциялық кезең',
        'assigned_to' => $assignedExecutor->id,
        'created_by' => $admin->id,
        'status' => 'new',
        'approval_status' => 'approved',
    ]);
    ProjectIssue::create([
        'project_id' => $project->id,
        'title' => 'Жабық операциялық тәуекел',
        'description' => 'Тек жоба қатысушыларына көрінуі тиіс',
        'severity' => 'critical',
        'status' => 'open',
        'created_by' => $admin->id,
    ]);

    $this->actingAs($executor)
        ->get("/investment-projects/{$project->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('isInvolved', false)
            ->where('project.current_status', null)
            ->has('project.documents', 0)
            ->has('project.issues', 0)
            ->has('project.tasks', 0)
            ->where('passportSummary.tasks.total', 0)
            ->where('passportSummary.issues.total', 0)
            ->where('passportSummary.next_milestone', null));
});
