<?php

use App\Services\InfrastructureUsageService;
use Illuminate\Support\Collection;

it('calculates every infrastructure resource from used capacity', function () {
    $projects = new Collection([
        (object) [
            'id' => 1,
            'name' => 'Бірінші жоба',
            'status' => 'implementation',
            'infrastructure' => [
                'electricity' => [
                    'needed' => true,
                    'required_capacity' => '1800',
                    'used_capacity' => '1500',
                ],
                'gas' => [
                    'needed' => true,
                    'required_capacity' => '400',
                    'used_capacity' => '300',
                ],
                'water' => [
                    'needed' => false,
                    'required_capacity' => '600',
                    'used_capacity' => '500',
                ],
                'roads' => [
                    'needed' => true,
                    'required_capacity' => '10',
                    'used_capacity' => '8',
                ],
            ],
        ],
        (object) [
            'id' => 2,
            'name' => 'Екінші жоба',
            'status' => 'plan',
            'infrastructure' => [
                'electricity' => [
                    'needed' => true,
                    'required_capacity' => '700',
                    'used_capacity' => '500',
                ],
                'gas' => [
                    'needed' => true,
                    'required_capacity' => '250',
                    'used_capacity' => '200',
                ],
                'water' => [
                    'needed' => true,
                    'required_capacity' => '1500',
                    'used_capacity' => '1200',
                ],
                'roads' => [
                    'needed' => true,
                    'required_capacity' => '15',
                    'used_capacity' => '12',
                ],
            ],
        ],
    ]);

    $summary = app(InfrastructureUsageService::class)->summarize([
        'electricity' => ['capacity' => '5 МВт'],
        'gas' => ['capacity' => '2000'],
        'water' => ['capacity' => '8000'],
        'roads' => ['capacity' => '50'],
        'railway' => ['capacity' => '20'],
        'internet' => ['capacity' => '1000'],
    ], $projects);

    expect($summary['electricity'])
        ->toMatchArray([
            'total' => 5000.0,
            'used' => 2000.0,
            'remaining' => 3000.0,
            'overused' => 0.0,
        ])
        ->and($summary['electricity']['consumers'][0])
        ->toBe([
            'id' => 1,
            'name' => 'Бірінші жоба',
            'capacity' => '1500',
            'required_capacity' => '1800',
            'value' => 1500.0,
            'status' => 'implementation',
        ])
        ->and($summary['gas'])
        ->toMatchArray([
            'total' => 2000.0,
            'used' => 500.0,
            'remaining' => 1500.0,
            'overused' => 0.0,
        ])
        ->and($summary['water'])
        ->toMatchArray([
            'total' => 8000.0,
            'used' => 1200.0,
            'remaining' => 6800.0,
            'overused' => 0.0,
        ])
        ->and($summary['roads'])
        ->toMatchArray([
            'total' => 50.0,
            'used' => 20.0,
            'remaining' => 30.0,
            'overused' => 0.0,
        ]);
});

it('does not subtract the required capacity when used capacity is empty', function () {
    $projects = new Collection([
        (object) [
            'id' => 1,
            'name' => 'Жоспардағы жоба',
            'status' => 'plan',
            'infrastructure' => [
                'electricity' => [
                    'needed' => true,
                    'required_capacity' => '900',
                    'used_capacity' => '',
                ],
            ],
        ],
    ]);

    $summary = app(InfrastructureUsageService::class)->summarize([
        'electricity' => ['capacity' => '1000'],
    ], $projects);

    expect($summary['electricity']['used'])->toBe(0.0)
        ->and($summary['electricity']['remaining'])->toBe(1000.0)
        ->and($summary['electricity']['consumers'][0]['required_capacity'])
        ->toBe('900');
});

it('calculates occupied land from used area and reports overuse', function () {
    $projects = new Collection([
        (object) [
            'id' => 1,
            'name' => 'Зауыт',
            'infrastructure' => [
                'land' => [
                    'needed' => true,
                    'required_capacity' => '35',
                    'used_capacity' => '30',
                ],
            ],
        ],
        (object) [
            'id' => 2,
            'name' => 'Қойма',
            'infrastructure' => [
                'land' => [
                    'needed' => true,
                    'required_capacity' => '25',
                    'used_capacity' => '22.5',
                ],
            ],
        ],
        (object) [
            'id' => 3,
            'name' => 'Кеңсе',
            'infrastructure' => [
                'land' => [
                    'needed' => false,
                    'required_capacity' => '2',
                    'used_capacity' => '2',
                ],
            ],
        ],
    ]);

    $summary = app(InfrastructureUsageService::class)->summarizeArea(
        50,
        $projects
    );

    expect($summary)->toBe([
        'total' => 50.0,
        'occupied' => 52.5,
        'available' => 0.0,
        'overused' => 2.5,
        'consumers' => [
            [
                'id' => 1,
                'name' => 'Зауыт',
                'area' => 30.0,
                'capacity' => '30',
                'required_capacity' => '35',
            ],
            [
                'id' => 2,
                'name' => 'Қойма',
                'area' => 22.5,
                'capacity' => '22.5',
                'required_capacity' => '25',
            ],
        ],
    ]);
});
