<?php

use App\Models\InvestmentApplication;
use App\Services\InvestmentApplicationWorkflowService;

uses(Tests\TestCase::class);

test('application conversion preserves selected infrastructure units without consuming demand', function () {
    $application = new InvestmentApplication([
        'infrastructure_requirements' => [
            'electricity' => ['value' => 1.5, 'unit' => 'mw'],
            'water' => ['value' => 300, 'unit' => 'm3_month'],
            'gas' => 10,
        ],
        'requested_area' => 2,
        'approved_area' => 1,
    ]);
    $method = new ReflectionMethod(InvestmentApplicationWorkflowService::class, 'projectInfrastructure');
    $result = $method->invoke(app(InvestmentApplicationWorkflowService::class), $application);

    expect($result['electricity'])->toMatchArray([
        'needed' => true,
        'unit' => 'mw',
        'required_capacity' => 1.5,
        'used_capacity' => 0,
    ])->and($result['water'])->toMatchArray([
        'unit' => 'm3_month',
        'required_capacity' => 300.0,
        'used_capacity' => 0,
    ])->and($result['gas'])->toMatchArray([
        'unit' => 'm3_hour',
        'required_capacity' => 10.0,
        'used_capacity' => 0,
    ])->and($result['land'])->toMatchArray([
        'unit' => 'ha',
        'required_capacity' => 2.0,
        'used_capacity' => 1.0,
    ]);
});

test('expansion converts new demand into existing units and preserves actual infrastructure use', function () {
    $application = new InvestmentApplication([
        'infrastructure_requirements' => [
            'electricity' => ['value' => 750, 'unit' => 'kw'],
            'water' => ['value' => 4, 'unit' => 'm3_day'],
        ],
        'requested_area' => 2,
        'approved_area' => 1,
    ]);
    $infrastructure = [
        'electricity' => ['needed' => true, 'required_capacity' => 1, 'used_capacity' => 0.25, 'unit' => 'mw'],
        'water' => ['needed' => true, 'required_capacity' => 300, 'used_capacity' => 30, 'unit' => 'm3_month'],
        'land' => ['needed' => true, 'required_capacity' => 10000, 'used_capacity' => 5000, 'unit' => 'm2'],
    ];
    $method = new ReflectionMethod(InvestmentApplicationWorkflowService::class, 'expandedInfrastructure');
    $result = $method->invoke(app(InvestmentApplicationWorkflowService::class), $infrastructure, $application);

    expect($result['electricity']['unit'])->toBe('mw')
        ->and($result['electricity']['required_capacity'])->toBe(1.75)
        ->and($result['electricity']['used_capacity'])->toBe(0.25)
        ->and($result['water']['unit'])->toBe('m3_month')
        ->and($result['water']['required_capacity'])->toEqualWithDelta(420, 0.000001)
        ->and($result['water']['used_capacity'])->toEqualWithDelta(30, 0.000001)
        ->and($result['land']['unit'])->toBe('m2')
        ->and($result['land']['required_capacity'])->toEqualWithDelta(30000, 0.000001)
        ->and($result['land']['used_capacity'])->toEqualWithDelta(15000, 0.000001);
});
