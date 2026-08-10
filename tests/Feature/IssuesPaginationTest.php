<?php

use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('issues index paginates issues while keeping totals for the full result', function () {
    $role = Role::create([
        'name' => 'superadmin',
        'display_name' => 'Superadmin',
    ]);
    $user = User::factory()->create([
        'role' => 'admin',
        'role_id' => $role->id,
    ]);
    $region = Region::create([
        'name' => 'Test district',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
    $project = InvestmentProject::create([
        'name' => 'Test project',
        'company_name' => 'Test company',
        'region_id' => $region->id,
        'total_investment' => 1000,
        'jobs_count' => 5,
        'status' => 'plan',
        'created_by' => $user->id,
    ]);

    foreach (range(1, 13) as $number) {
        ProjectIssue::create([
            'project_id' => $project->id,
            'title' => "Issue {$number}",
            'description' => "Issue description {$number}",
            'severity' => 'medium',
            'status' => $number <= 8 ? 'open' : 'resolved',
            'created_by' => $user->id,
        ]);
    }

    $this->actingAs($user)
        ->get(route('issues.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/index')
            ->has('issues.data', 12)
            ->where('issues.current_page', 1)
            ->where('issues.last_page', 2)
            ->where('issues.per_page', 12)
            ->where('issues.total', 13)
            ->where('issueStats.total', 13)
            ->where('issueStats.open', 8)
            ->where('issueStats.in_progress', 0)
            ->where('issueStats.resolved', 5));

    $this->actingAs($user)
        ->get(route('issues.index', ['page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/index')
            ->has('issues.data', 1)
            ->where('issues.current_page', 2)
            ->where('issues.total', 13));
});
