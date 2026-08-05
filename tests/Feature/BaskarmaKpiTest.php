<?php

use App\Models\InvestmentProject;
use App\Models\ProjectPhoto;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\TaskCompletion;
use App\Models\User;
use App\Services\BaskarmaKpiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

function createKpiExecutor(
    string $type,
    ?Region $region = null
): User {
    $role = Role::firstOrCreate(
        ['name' => 'ispolnitel'],
        ['display_name' => 'Орындаушы']
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'baskarma_type' => $type,
        'region_id' => $region?->id,
    ]);
}

function createKpiProject(
    Region $region,
    User $creator,
    string $name
): InvestmentProject {
    return InvestmentProject::create([
        'name' => $name,
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'implementation',
        'created_by' => $creator->id,
    ]);
}

function createKpiTask(
    InvestmentProject $project,
    User $executor,
    User $creator,
    string $title,
    string $status,
    string $dueDate
): ProjectTask {
    return ProjectTask::create([
        'project_id' => $project->id,
        'title' => $title,
        'assigned_to' => $executor->id,
        'created_by' => $creator->id,
        'due_date' => $dueDate,
        'status' => $status,
        'approval_status' => 'approved',
        'approved_by' => $creator->id,
        'approved_at' => now(),
    ]);
}

test('district KPI includes cross-district tasks but photos only from own district', function () {
    Carbon::setTestNow('2026-08-05 12:00:00');

    $ownRegion = Region::create([
        'name' => 'Өз ауданы',
        'type' => 'district',
    ]);
    $otherRegion = Region::create([
        'name' => 'Басқа аудан',
        'type' => 'district',
    ]);
    $executor = createKpiExecutor('district', $ownRegion);
    $otherDistrictExecutor = createKpiExecutor('district', $ownRegion);
    $creator = User::factory()->create();
    $ownProjectOne = createKpiProject(
        $ownRegion,
        $creator,
        'Өз ауданындағы бірінші жоба'
    );
    $ownProjectTwo = createKpiProject(
        $ownRegion,
        $creator,
        'Өз ауданындағы екінші жоба'
    );
    $crossDistrictProject = createKpiProject(
        $otherRegion,
        $creator,
        'Басқа ауданнан берілген жоба'
    );

    $completedCrossDistrictTask = createKpiTask(
        $crossDistrictProject,
        $executor,
        $creator,
        'Басқа аудан тапсырмасы',
        'done',
        '2026-08-01'
    );
    TaskCompletion::create([
        'task_id' => $completedCrossDistrictTask->id,
        'submitted_by' => $executor->id,
        'status' => 'approved',
        'reviewed_by' => $creator->id,
        'reviewed_at' => '2026-07-31 12:00:00',
    ]);
    createKpiTask(
        $ownProjectOne,
        $executor,
        $creator,
        'Екі күн кешіккен тапсырма',
        'new',
        '2026-08-03'
    );
    createKpiTask(
        $ownProjectTwo,
        $executor,
        $creator,
        'Мерзімі әлі келмеген тапсырма',
        'new',
        '2026-08-10'
    );

    ProjectPhoto::create([
        'project_id' => $ownProjectOne->id,
        'file_path' => 'photos/own-project.jpg',
        'photo_type' => 'gallery',
        'uploaded_by' => $executor->id,
    ]);
    ProjectPhoto::create([
        'project_id' => $ownProjectTwo->id,
        'file_path' => 'photos/other-executor.jpg',
        'photo_type' => 'gallery',
        'uploaded_by' => $otherDistrictExecutor->id,
    ]);
    ProjectPhoto::create([
        'project_id' => $crossDistrictProject->id,
        'file_path' => 'photos/cross-district.jpg',
        'photo_type' => 'gallery',
        'uploaded_by' => $executor->id,
    ]);

    $kpi = app(BaskarmaKpiService::class)->calculate($executor);

    expect($kpi['formula_type'])->toBe('district')
        ->and($kpi['score'])->toBe(72.0)
        ->and($kpi['stats']['total'])->toBe(3)
        ->and($kpi['stats']['project_count'])->toBe(3)
        ->and($kpi['stats']['evaluated_tasks'])->toBe(2)
        ->and($kpi['components']['completion']['score'])->toBe(50.0)
        ->and($kpi['components']['timeliness']['score'])->toBe(90.0)
        ->and($kpi['components']['quality']['score'])->toBe(100.0)
        ->and($kpi['components']['photo_reporting']['score'])->toBe(50.0)
        ->and($kpi['components']['photo_reporting']['numerator'])->toBe(1)
        ->and($kpi['components']['photo_reporting']['denominator'])->toBe(2);
});

test('oblast and additional executors use the task-only KPI formula', function (
    string $executorType
) {
    Carbon::setTestNow('2026-08-05 12:00:00');

    $region = Region::create([
        'name' => 'Тест ауданы',
        'type' => 'district',
    ]);
    $executor = createKpiExecutor($executorType, $region);
    $creator = User::factory()->create();
    $project = createKpiProject($region, $creator, 'Тест жоба');

    $completedTask = createKpiTask(
        $project,
        $executor,
        $creator,
        'Уақытында орындалған тапсырма',
        'done',
        '2026-08-01'
    );
    TaskCompletion::create([
        'task_id' => $completedTask->id,
        'submitted_by' => $executor->id,
        'status' => 'approved',
        'reviewed_by' => $creator->id,
        'reviewed_at' => '2026-08-01 10:00:00',
    ]);

    $rejectedTask = createKpiTask(
        $project,
        $executor,
        $creator,
        'Төрт күн кешіккен тапсырма',
        'rejected',
        '2026-08-01'
    );
    TaskCompletion::create([
        'task_id' => $rejectedTask->id,
        'submitted_by' => $executor->id,
        'status' => 'rejected',
        'reviewed_by' => $creator->id,
        'reviewed_at' => now(),
    ]);

    $kpi = app(BaskarmaKpiService::class)->calculate($executor);

    expect($kpi['formula_type'])->toBe('management')
        ->and($kpi['score'])->toBe(58.8)
        ->and($kpi['components'])->not->toHaveKey('photo_reporting')
        ->and($kpi['components']['completion']['score'])->toBe(50.0)
        ->and($kpi['components']['timeliness']['score'])->toBe(75.0)
        ->and($kpi['components']['quality']['score'])->toBe(50.0);
})->with(['oblast', 'additional']);
