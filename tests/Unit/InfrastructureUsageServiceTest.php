<?php

use App\Services\InfrastructureUsageService;
use Illuminate\Support\Collection;

it('calculates infrastructure usage from project requirements', function () {
    $projects = new Collection([
        (object) [
            'id' => 1,
            'name' => 'Бірінші жоба',
            'status' => 'active',
            'infrastructure' => [
                'electricity' => ['needed' => true, 'capacity' => '1.5 МВт'],
                'gas' => ['needed' => true, 'capacity' => '300 м³/сағ'],
                'water' => ['needed' => false, 'capacity' => '500 м³/тәу'],
            ],
        ],
        (object) [
            'id' => 2,
            'name' => 'Екінші жоба',
            'status' => 'planning',
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
        'consumers' => [
            [
                'id' => 1,
                'name' => 'Бірінші жоба',
                'capacity' => '1.5 МВт',
                'value' => 1500.0,
                'status' => 'active',
            ],
            [
                'id' => 2,
                'name' => 'Екінші жоба',
                'capacity' => '500 кВт',
                'value' => 500.0,
                'status' => 'planning',
            ],
        ],
    ])->and($summary['gas'])->toBe([
        'total' => 2000.0,
        'used' => 500.0,
        'remaining' => 1500.0,
        'consumers' => [
            [
                'id' => 1,
                'name' => 'Бірінші жоба',
                'capacity' => '300 м³/сағ',
                'value' => 300.0,
                'status' => 'active',
            ],
            [
                'id' => 2,
                'name' => 'Екінші жоба',
                'capacity' => '200 м³/сағ',
                'value' => 200.0,
                'status' => 'planning',
            ],
        ],
    ])->and($summary['water'])->toBe([
        'total' => 8000.0,
        'used' => 1200.0,
        'remaining' => 6800.0,
        'consumers' => [
            [
                'id' => 2,
                'name' => 'Екінші жоба',
                'capacity' => '1200 м³/тәу',
                'value' => 1200.0,
                'status' => 'planning',
            ],
        ],
    ]);
});

it('calculates occupied and available land area', function () {
    $projects = new Collection([
        (object) [
            'id' => 1,
            'name' => 'Зауыт',
            'infrastructure' => [
                'land' => ['needed' => true, 'capacity' => '12.5 га'],
            ],
        ],
        (object) [
            'id' => 2,
            'name' => 'Қойма',
            'infrastructure' => [
                'land' => ['needed' => true, 'capacity' => '7,5 га'],
            ],
        ],
        (object) [
            'id' => 3,
            'name' => 'Кеңсе',
            'infrastructure' => [
                'land' => ['needed' => false, 'capacity' => '2 га'],
            ],
        ],
    ]);

    $summary = app(InfrastructureUsageService::class)->summarizeArea(50, $projects);

    expect($summary)->toBe([
        'total' => 50.0,
        'occupied' => 20.0,
        'available' => 30.0,
        'consumers' => [
            [
                'id' => 1,
                'name' => 'Зауыт',
                'area' => 12.5,
                'capacity' => '12.5 га',
            ],
            [
                'id' => 2,
                'name' => 'Қойма',
                'area' => 7.5,
                'capacity' => '7,5 га',
            ],
        ],
    ]);
});
