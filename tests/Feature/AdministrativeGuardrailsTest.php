<?php

use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createGuardrailRole(string $name): Role
{
    return Role::create([
        'name' => $name,
        'display_name' => ucfirst($name),
    ]);
}

function createGuardrailUser(
    string $roleName,
    ?Region $region = null
): User {
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : $roleName,
        'role_id' => $role->id,
        'region_id' => $region?->id,
    ]);
}

function createGuardrailRegion(
    string $name,
    string $type,
    ?Region $parent = null
): Region {
    return Region::create([
        'name' => $name,
        'type' => $type,
        'parent_id' => $parent?->id,
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

function createGuardrailProject(
    string $name,
    Region $region,
    User $creator,
    int $investment
): InvestmentProject {
    return InvestmentProject::create([
        'name' => $name,
        'company_name' => 'Test company',
        'region_id' => $region->id,
        'total_investment' => $investment,
        'jobs_count' => 5,
        'status' => 'plan',
        'created_by' => $creator->id,
    ]);
}

test('users cannot be deleted through the management endpoint', function () {
    $superadmin = createGuardrailUser('superadmin');
    $target = createGuardrailUser('akim');

    $this->actingAs($superadmin)
        ->delete(route('users.destroy', $target))
        ->assertRedirect()
        ->assertSessionHas('error', 'Пайдаланушыларды жоюға тыйым салынған.');

    $this->assertDatabaseHas('users', ['id' => $target->id]);
});

test('roles cannot be deleted through the management endpoint', function () {
    $superadmin = createGuardrailUser('superadmin');
    $targetRole = createGuardrailRole('temporary-role');

    $this->actingAs($superadmin)
        ->delete(route('roles.destroy', $targetRole))
        ->assertRedirect()
        ->assertSessionHas('error', 'Рөлдерді жоюға тыйым салынған.');

    $this->assertDatabaseHas('roles', ['id' => $targetRole->id]);
});

test('regions cannot be deleted through the management endpoint', function () {
    $superadmin = createGuardrailUser('superadmin');
    $region = createGuardrailRegion('Protected oblast', 'oblast');

    $this->actingAs($superadmin)
        ->delete(route('regions.destroy', $region))
        ->assertRedirect()
        ->assertSessionHas('error', 'Аймақтарды жоюға тыйым салынған.');

    $this->assertDatabaseHas('regions', ['id' => $region->id]);
});

test('district akim dashboard only contains their district data', function () {
    $oblast = createGuardrailRegion('Test oblast', 'oblast');
    $ownDistrict = createGuardrailRegion(
        'Own district',
        'district',
        $oblast
    );
    $otherDistrict = createGuardrailRegion(
        'Other district',
        'district',
        $oblast
    );
    $superadmin = createGuardrailUser('superadmin');
    $akim = createGuardrailUser('akim', $ownDistrict);

    createGuardrailProject('Own project', $ownDistrict, $superadmin, 125);
    createGuardrailProject('Other project', $otherDistrict, $superadmin, 875);

    $this->actingAs($akim)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('regions', 1)
            ->where('regions.0.id', $ownDistrict->id)
            ->where('stats.project_count', 1)
            ->where(
                'stats.total_investment',
                fn ($value) => (float) $value === 125.0
            )
            ->where('sectorSummary.total.all_projects.projectCount', 1)
            ->where('projectsByStatus.0.value', 1)
        );
});

test('district akim cannot open another district or its project', function () {
    $oblast = createGuardrailRegion('Scoped oblast', 'oblast');
    $ownDistrict = createGuardrailRegion(
        'Akim district',
        'district',
        $oblast
    );
    $otherDistrict = createGuardrailRegion(
        'Forbidden district',
        'district',
        $oblast
    );
    $superadmin = createGuardrailUser('superadmin');
    $akim = createGuardrailUser('akim', $ownDistrict);
    $otherProject = createGuardrailProject(
        'Forbidden project',
        $otherDistrict,
        $superadmin,
        500
    );

    $this->actingAs($akim)
        ->get(route('regions.show', $ownDistrict))
        ->assertOk();

    $this->actingAs($akim)
        ->get(route('regions.show', $otherDistrict))
        ->assertForbidden();

    $this->actingAs($akim)
        ->get(route('investment-projects.show', $otherProject))
        ->assertForbidden();
});
