<?php

use App\Services\InfrastructureUsageService;
use Illuminate\Support\Collection;

it('calculates infrastructure usage from project requirements', function () {
    $projects = new Collection([
        (object) [
            'infrastructure' => [
                'electricity' => ['needed' => true, 'capacity' => '1.5 МВт'],
                'gas' => ['needed' => true, 'capacity' => '300 м³/сағ'],
                'water' => ['needed' => false, 'capacity' => '500 м³/тәу'],
            ],
        ],
        (object) [
            'infrastructure' => [
                'electricity' => ['needed' => true, 'capacity' => '500 кВт'],
                'gas' => ['needed' => true, 'capacity' => '200 м³/сағ'],
                'water' => ['needed' => true, 'capacity' => '1200 м³/тәу'],
            ],
        ],
    ]);

    $summary = app(InfrastructureUsageService::class)->summarize([
        'electricity' => ['capacity' => '5 МВт'],
        'gas' => ['capacity' => '2000 м³/сағ'],
        'water' => ['capacity' => '8000 м³/тәу'],
    ], $projects);

    expect($summary['electricity'])->toBe([
        'total' => 5000.0,
        'used' => 2000.0,
        'remaining' => 3000.0,
    ])->and($summary['gas'])->toBe([
        'total' => 2000.0,
        'used' => 500.0,
        'remaining' => 1500.0,
    ])->and($summary['water'])->toBe([
        'total' => 8000.0,
        'used' => 1200.0,
        'remaining' => 6800.0,
    ]);
});
