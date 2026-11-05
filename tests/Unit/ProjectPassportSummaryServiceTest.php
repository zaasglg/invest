<?php

use App\Models\InvestmentProject;
use App\Models\ProjectAttractionActivity;
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
        ->toBe(Carbon::parse('2026-07-24 10:00:00')->toISOString());
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

test('planned passport keeps the earliest outstanding attraction activity and ignores historical roadmap tasks', function () {
    Carbon::setTestNow('2026-11-05 12:00:00');

    $project = plannedSummaryProject();
    $project->setRelation('tasks', collect([
        (new ProjectTask([
            'title' => 'Ескі жол картасы',
            'status' => 'in_progress',
            'approval_status' => 'pending',
            'due_date' => '2026-01-01',
        ]))->forceFill(['id' => 99, 'updated_at' => Carbon::parse('2026-11-05 11:00:00')]),
    ]));
    $project->setRelation('attractionActivities', collect([
        (new ProjectAttractionActivity([
            'next_action' => 'Ескі келіссөз',
            'next_action_due_date' => '2026-01-01',
        ]))->forceFill(['id' => 1, 'updated_at' => Carbon::parse('2026-11-01 10:00:00')]),
        (new ProjectAttractionActivity([
            'next_action' => 'Жер учаскесін қарау',
            'next_action_due_date' => '2026-11-10',
        ]))->forceFill(['id' => 2, 'updated_at' => Carbon::parse('2026-11-04 10:00:00')]),
    ]));

    $summary = (new ProjectPassportSummaryService)->build($project);

    expect($summary['workflow'])->toBe('attraction')
        ->and($summary['progress_percent'])->toBe(0)
        ->and($summary['tasks'])->toBe([
            'total' => 0,
            'completed' => 0,
            'in_progress' => 0,
            'overdue' => 0,
            'pending_approval' => 0,
        ])
        ->and($summary['next_milestone'])->toBe([
            'id' => 1,
            'title' => 'Ескі келіссөз',
            'due_date' => '2026-01-01',
            'is_overdue' => true,
        ])
        ->and($summary['attraction'])->toBe([
            'total' => 2, 'open' => 2, 'completed' => 0, 'pending_review' => 0, 'overdue' => 1,
        ])
        ->and($summary['last_updated_at'])->toBe(Carbon::parse('2026-11-04 10:00:00')->toISOString())
        ->and($summary['health']['reasons'])->not->toContain('1 тапсырманың мерзімі өткен');
});

test('planned passport reports an overdue attraction action without roadmap counts', function () {
    Carbon::setTestNow('2026-11-05 12:00:00');

    $project = plannedSummaryProject();
    $project->setRelation('attractionActivities', collect([
        (new ProjectAttractionActivity([
            'next_action' => 'Инвестормен кездесу',
            'next_action_due_date' => '2026-11-04',
        ]))->forceFill(['id' => 3]),
    ]));

    $summary = (new ProjectPassportSummaryService)->build($project);

    expect($summary['tasks']['overdue'])->toBe(0)
        ->and($summary['next_milestone']['is_overdue'])->toBeTrue()
        ->and($summary['health']['reasons'])
        ->toContain('Инвестор тарту бойынша келесі іс-шараның мерзімі өткен');
});

test('restricted planned passport does not expose attraction activity details', function () {
    $project = plannedSummaryProject();
    $project->setRelation('attractionActivities', collect([
        (new ProjectAttractionActivity([
            'next_action' => 'Жасырын кездесу',
            'next_action_due_date' => '2026-11-10',
        ]))->forceFill(['id' => 4, 'updated_at' => Carbon::parse('2026-12-01 10:00:00')]),
    ]));

    $summary = (new ProjectPassportSummaryService)->build($project, false);

    expect($summary['next_milestone'])->toBeNull()
        ->and($summary['tasks']['total'])->toBe(0)
        ->and($summary['attraction'])->toBe([
            'total' => 0, 'open' => 0, 'completed' => 0, 'pending_review' => 0, 'overdue' => 0,
        ])
        ->and($summary['last_updated_at'])->toBe(Carbon::parse('2026-11-01 10:00:00')->toISOString());
});

test('attraction summary ignores closed actions and includes all outstanding rows', function () {
    Carbon::setTestNow('2026-11-05 12:00:00');
    $project = plannedSummaryProject();
    $project->setRelation('attractionActivities', collect([
        (new ProjectAttractionActivity([
            'status' => 'completed', 'next_action' => 'Орындалған кездесу',
            'next_action_due_date' => '2026-01-01',
        ]))->forceFill(['id' => 1, 'updated_at' => Carbon::parse('2026-11-05 11:00:00')]),
        (new ProjectAttractionActivity([
            'status' => 'cancelled', 'next_action' => 'Бас тартылған іс-шара',
            'next_action_due_date' => '2026-01-02',
        ]))->forceFill(['id' => 2]),
        (new ProjectAttractionActivity([
            'status' => 'in_progress', 'next_action' => 'Ескі орындалмаған кездесу',
            'next_action_due_date' => '2026-11-04',
        ]))->forceFill(['id' => 3]),
        (new ProjectAttractionActivity([
            'status' => 'pending_review', 'next_action' => 'Тексеруді күтетін есеп',
            'next_action_due_date' => '2026-11-03',
        ]))->forceFill(['id' => 4]),
        (new ProjectAttractionActivity([
            'status' => 'planned', 'next_action' => 'Жаңадан жоспарланған кездесу',
            'next_action_due_date' => '2026-11-10',
        ]))->forceFill(['id' => 5, 'updated_at' => Carbon::parse('2026-11-04 10:00:00')]),
    ]));

    $summary = (new ProjectPassportSummaryService)->build($project);

    expect($summary['next_milestone']['id'])->toBe(4)
        ->and($summary['attraction'])->toBe([
            'total' => 5, 'open' => 3, 'completed' => 1, 'pending_review' => 1, 'overdue' => 2,
        ])
        ->and($summary['last_updated_at'])->toBe(Carbon::parse('2026-11-05 11:00:00')->toISOString());
});

test('only completed and cancelled attraction activities have no next milestone or overdue risk', function () {
    Carbon::setTestNow('2026-11-05 12:00:00');
    $project = plannedSummaryProject();
    $project->setRelation('attractionActivities', collect([
        new ProjectAttractionActivity([
            'status' => 'completed', 'next_action' => 'Орындалған кездесу',
            'next_action_due_date' => '2026-01-01',
        ]),
        new ProjectAttractionActivity([
            'status' => 'cancelled', 'next_action' => 'Бас тартылған кездесу',
            'next_action_due_date' => '2026-01-01',
        ]),
    ]));

    $summary = (new ProjectPassportSummaryService)->build($project);

    expect($summary['next_milestone'])->toBeNull()
        ->and($summary['attraction']['open'])->toBe(0)
        ->and($summary['attraction']['overdue'])->toBe(0)
        ->and($summary['health']['reasons'])->not->toContain('Инвестор тарту бойынша келесі іс-шараның мерзімі өткен');
});

test('paused contact date competes with outstanding activity deadlines', function (string $resumeOn, string $title, bool $overdue) {
    Carbon::setTestNow('2026-11-05 12:00:00');
    $project = plannedSummaryProject();
    $project->fill(['attraction_stage' => 'paused', 'attraction_resume_on' => $resumeOn]);
    $project->setRelation('attractionActivities', collect([
        (new ProjectAttractionActivity([
            'status' => 'planned', 'next_action' => 'Келесі келіссөз',
            'next_action_due_date' => '2026-11-08',
        ]))->forceFill(['id' => 2]),
    ]));

    $summary = (new ProjectPassportSummaryService)->build($project);

    expect($summary['next_milestone']['title'])->toBe($title)
        ->and($summary['next_milestone']['is_overdue'])->toBe($overdue);

    $restricted = (new ProjectPassportSummaryService)->build($project, false);
    expect($restricted['next_milestone'])->toBeNull()
        ->and($restricted['attraction']['total'])->toBe(0);
})->with([
    ['2026-11-04', 'Инвестормен қайта байланысу', true],
    ['2026-11-06', 'Инвестормен қайта байланысу', false],
    ['2026-11-10', 'Келесі келіссөз', false],
]);

test('a paused project without activities still exposes its next contact date', function () {
    Carbon::setTestNow('2026-11-05 12:00:00');
    $project = plannedSummaryProject();
    $project->fill(['attraction_stage' => 'paused', 'attraction_resume_on' => '2026-11-04']);

    $summary = (new ProjectPassportSummaryService)->build($project);

    expect($summary['next_milestone'])->toMatchArray([
        'title' => 'Инвестормен қайта байланысу', 'due_date' => '2026-11-04', 'is_overdue' => true,
    ])
        ->and($summary['health']['reasons'])->toContain('Инвестор тарту бойынша келесі іс-шараның мерзімі өткен');
});

test('planned passport completeness requires only the basic planning information', function () {
    $project = plannedSummaryProject();
    $project->setRelation('region', new Region(['name' => 'Тест ауданы']));
    $project->setRelation('creator', new User(['full_name' => 'Куратор']));

    $summary = (new ProjectPassportSummaryService)->build($project);

    expect($summary['completeness'])->toBe([
        'percent' => 100, 'completed' => 4, 'total' => 4, 'missing' => [],
    ]);
});

test('planned completeness checks the required special stage information', function (string $stage, array $metadata, array $missing) {
    $project = plannedSummaryProject();
    $project->fill(['attraction_stage' => $stage]);
    $project->setRelation('region', new Region(['name' => 'Тест ауданы']));
    $project->setRelation('creator', new User(['full_name' => 'Куратор']));

    $summary = (new ProjectPassportSummaryService)->build($project);
    expect($summary['completeness']['missing'])->toBe($missing);

    $project->fill($metadata);
    $summary = (new ProjectPassportSummaryService)->build($project);
    expect($summary['completeness']['percent'])->toBe(100);
})->with([
    ['handover', ['attraction_handover_to_id' => 1, 'attraction_handover_requested_at' => '2026-11-05 10:00:00'], ['Сүйемелдеуді қабылдайтын жауапты', 'Сүйемелдеуге берілген күні']],
    ['declined', ['attraction_decline_reason' => 'Инвестор шешімі'], ['Инвестордың бас тарту себебі']],
    ['paused', ['attraction_resume_on' => '2026-11-10'], ['Инвестормен қайта байланысу күні']],
]);

function plannedSummaryProject(): InvestmentProject
{
    $project = (new InvestmentProject([
        'name' => 'Жоспарланған жоба',
        'status' => 'plan',
        'attraction_stage' => 'negotiation',
    ]))->forceFill([
        'id' => 20,
        'photos_count' => 0,
        'updated_at' => Carbon::parse('2026-11-01 10:00:00'),
    ]);
    $project->setRelation('region', null);
    $project->setRelation('projectType', null);
    $project->setRelation('creator', null);
    $project->setRelation('curators', collect());
    $project->setRelation('productionPlans', collect());
    $project->setRelation('documents', collect());
    $project->setRelation('tasks', collect());
    $project->setRelation('issues', collect());
    $project->setRelation('attractionActivities', collect());

    return $project;
}
