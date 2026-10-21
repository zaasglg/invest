<?php

use App\Support\InfrastructureValidationRules;
use App\Support\ProjectInfrastructureInput;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

uses(TestCase::class);

it('accepts only standardized numeric zone capacities', function () {
    $infrastructure = [];

    foreach (InfrastructureValidationRules::ZONE_RESOURCES as $resource) {
        $infrastructure[$resource] = [
            'available' => true,
            'capacity' => '100.5',
        ];
    }

    expect(Validator::make(
        ['infrastructure' => $infrastructure],
        InfrastructureValidationRules::zone()
    )->passes())->toBeTrue();

    $infrastructure['electricity']['capacity'] = '50 МВт';

    expect(Validator::make(
        ['infrastructure' => $infrastructure],
        InfrastructureValidationRules::zone()
    )->fails())->toBeTrue();
});

it('requires project required and used values for selected resources', function () {
    $infrastructure = [];

    foreach (InfrastructureValidationRules::PROJECT_RESOURCES as $resource) {
        $infrastructure[$resource] = [
            'needed' => false,
            'required_capacity' => '',
            'used_capacity' => '',
        ];
    }

    $infrastructure['electricity'] = [
        'needed' => true,
        'required_capacity' => '750',
        'used_capacity' => '500',
    ];

    expect(Validator::make(
        ['infrastructure' => $infrastructure],
        InfrastructureValidationRules::project()
    )->passes())->toBeTrue();

    $infrastructure['electricity']['used_capacity'] = '';

    expect(Validator::make(
        ['infrastructure' => $infrastructure],
        InfrastructureValidationRules::project()
    )->fails())->toBeTrue();
});

it('defaults blank used capacities to required values for every selected resource', function ($blankValue) {
    $infrastructure = [];

    foreach (InfrastructureValidationRules::PROJECT_RESOURCES as $resource) {
        $infrastructure[$resource] = [
            'needed' => true,
            'required_capacity' => '60.5',
            'used_capacity' => $blankValue,
        ];
    }

    $prepared = ProjectInfrastructureInput::withDefaultUsedCapacity($infrastructure);

    foreach (InfrastructureValidationRules::PROJECT_RESOURCES as $resource) {
        expect($prepared[$resource]['used_capacity'])->toBe('60.5');
    }

    expect(Validator::make(
        ['infrastructure' => $prepared],
        InfrastructureValidationRules::project()
    )->passes())->toBeTrue();
})->with([null, '', '   ']);

it('preserves explicit used capacities including zero', function ($usedCapacity) {
    $infrastructure = [
        'electricity' => [
            'needed' => true,
            'required_capacity' => '60',
            'used_capacity' => $usedCapacity,
        ],
    ];

    $prepared = ProjectInfrastructureInput::withDefaultUsedCapacity($infrastructure);

    expect($prepared['electricity']['used_capacity'])->toBe($usedCapacity);
})->with([0, '0', '25.5']);

it('keeps both capacities required when a resource is selected without values', function () {
    $infrastructure = [];

    foreach (InfrastructureValidationRules::PROJECT_RESOURCES as $resource) {
        $infrastructure[$resource] = [
            'needed' => $resource === 'electricity',
            'required_capacity' => null,
            'used_capacity' => null,
        ];
    }

    $prepared = ProjectInfrastructureInput::withDefaultUsedCapacity($infrastructure);
    $validator = Validator::make(
        ['infrastructure' => $prepared],
        InfrastructureValidationRules::project()
    );

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->keys())->toBe([
            'infrastructure.electricity.required_capacity',
            'infrastructure.electricity.used_capacity',
        ]);
});

it('defaults an omitted used capacity and accepts a zero required capacity', function () {
    $prepared = ProjectInfrastructureInput::withDefaultUsedCapacity([
        'electricity' => ['needed' => '1', 'required_capacity' => '0'],
        'land' => ['needed' => 1, 'required_capacity' => '5'],
    ]);

    expect($prepared['electricity']['used_capacity'])->toBe('0')
        ->and($prepared['land']['used_capacity'])->toBe('5');
});

it('does not change unselected resources or malformed infrastructure', function () {
    $infrastructure = [
        'electricity' => [
            'needed' => false,
            'required_capacity' => '60',
            'used_capacity' => '',
        ],
        'land' => 'invalid',
    ];

    expect(ProjectInfrastructureInput::withDefaultUsedCapacity($infrastructure))
        ->toBe($infrastructure)
        ->and(ProjectInfrastructureInput::withDefaultUsedCapacity(null))->toBeNull()
        ->and(ProjectInfrastructureInput::withDefaultUsedCapacity('invalid'))->toBe('invalid');
});
