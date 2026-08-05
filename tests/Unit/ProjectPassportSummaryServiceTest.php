<?php

use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use App\Models\ProjectIssue;
use App\Models\ProjectProductionPlan;
use App\Models\ProjectTask;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\User;
use App\Services\ProjectPassportSummaryService;
use Illuminate\Support\Carbon;

uses(Tests\TestCase::class);

afterEach(function () {
    Carbon::setTestNow();
});

test('passport summary calculates progress timeline risks and next milestone', function () {
    Carbon::setTestNow('2026-07-30 12:00:00');

    $project = new InvestmentProject([
        'name' => 'Өндірістік кешен',
        'company_name' => 'Тест компаниясы',
        'description' => 'Жобаның толық сипаттамасы',
        'current_status' => 'Құрылыс жүргізілуде',
        'total_investment' => 250000000,
        'jobs_count' => 100,
        'status' => 'implementation',
        'start_date' => '2026-01-01',
        'end_date' => '2026-12-31',
    ]);
    $project->forceFill([
        'id' => 10,
        'photos_count' => 1,
        'updated_at' => Carbon::parse('2026-07-20 10:00:00'),
    ]);
    $project->setRelation('region', new Region(['name' => 'Түркістан']));
    $project->setRelation(
        'projectType',
        new ProjectType(['name' => 'Өндіріс'])
    );
    $project->setRelation('creator', new User(['full_name' => 'Куратор']));
    $project->setRelation('curators', collect());
    $project->setRelation(
        'productionPlans',
        collect([
            new ProjectProductionPlan([
                'product_name' => 'Өнім',
                'planned_quantity' => 20000,
                'unit' => 'ton',
                'planned_amount' => 500000000,
                'period' => 'year',
            ]),
        ])
    );
    $project->setRelation(
        'documents',
        collect([
            (new ProjectDocument)->forceFill([
                'id' => 1,
                'updated_at' => Carbon::parse('2026-07-21 10:00:00'),
            ]),
        ])
    );

    $completedTask = (new ProjectTask([
        'title' => 'Бірінші кезең',
        'due_date' => '2026-06-01',
        'status' => 'done',
        'approval_status' => 'approved',
    ]))->forceFill([
        'id' => 1,
        'updated_at' => Carbon::parse('2026-07-22 10:00:00'),
    ]);
    $overdueTask = (new ProjectTask([
        'title' => 'Екінші кезең',
        'due_date' => '2026-07-29',
        'status' => 'in_progress',
        'approval_status' => 'approved',
    ]))->forceFill([
        'id' => 2,
        'updated_at' => Carbon::parse('2026-07-23 10:00:00'),
    ]);
    $project->setRelation(
        'tasks',
        collect([$completedTask, $overdueTask])
    );

    $openIssue = (new ProjectIssue([
        'title' => 'Электр желісі',
        'severity' => 'critical',
        'status' => 'open',
    ]))->forceFill([
        'id' => 1,
        'updated_at' => Carbon::parse('2026-07-24 10:00:00'),
    ]);
    $project->setRelation('issues', collect([$openIssue]));

    $summary = (new ProjectPassportSummaryService)->build($project);

    expect($summary['progress_percent'])->toBe(50)
        ->and($summary['tasks'])->toMatchArray([
            'total' => 2,
            'completed' => 1,
            'in_progress' => 1,
            'overdue' => 1,
            'pending_approval' => 0,
        ])
        ->and($summary['issues'])->toMatchArray([
            'total' => 1,
            'open' => 1,
            'critical' => 1,
            'resolved' => 0,
        ])
        ->and($summary['health']['level'])->toBe('critical')
        ->and($summary['next_milestone'])->toMatchArray([
            'id' => 2,
            'title' => 'Екінші кезең',
            'due_date' => '2026-07-29',
            'is_overdue' => true,
        ])
        ->and($summary['completeness']['percent'])->toBe(100)
        ->and($summary['last_updated_at'])
        ->toStartWith('2026-07-24T10:00:00');
});

test('restricted passport summary omits task and issue aggregates', function () {
    Carbon::setTestNow('2026-07-30 12:00:00');

    $project = new InvestmentProject([
        'name' => 'Шектеулі жоба',
        'status' => 'plan',
        'start_date' => '2026-01-01',
        'end_date' => '2026-12-31',
    ]);
    $project->forceFill([
        'id' => 11,
        'photos_count' => 0,
        'updated_at' => Carbon::now(),
    ]);
    $project->setRelation('region', null);
    $project->setRelation('projectType', null);
    $project->setRelation('creator', null);
    $project->setRelation('curators', collect());
    $project->setRelation('productionPlans', collect());
    $project->setRelation('documents', collect());
    $project->setRelation(
        'tasks',
        collect([
            new ProjectTask([
                'title' => 'Жасырын тапсырма',
                'status' => 'new',
            ]),
        ])
    );
    $project->setRelation(
        'issues',
        collect([
            new ProjectIssue([
                'title' => 'Жасырын мәселе',
                'severity' => 'critical',
                'status' => 'open',
            ]),
        ])
    );

    $summary = (new ProjectPassportSummaryService)->build($project, false);

    expect($summary['tasks']['total'])->toBe(0)
        ->and($summary['issues']['total'])->toBe(0)
        ->and($summary['next_milestone'])->toBeNull()
        ->and($summary['health']['reasons'])
        ->not->toContain('1 жоғары/сыни мәселе ашық');
});
