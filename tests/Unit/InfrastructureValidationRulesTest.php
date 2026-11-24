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

it('defaults blank used capacities to zero without consuming the required amount', function ($blankValue) {
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
        expect($prepared[$resource]['used_capacity'])->toBe(0);
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

it('requires the necessary amount while defaulting an omitted actual amount to zero', function () {
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
        ]);
});

it('defaults an omitted used capacity and accepts a zero required capacity', function () {
    $prepared = ProjectInfrastructureInput::withDefaultUsedCapacity([
        'electricity' => ['needed' => '1', 'required_capacity' => '0'],
        'land' => ['needed' => 1, 'required_capacity' => '5'],
    ]);

    expect($prepared['electricity']['used_capacity'])->toBe(0)
        ->and($prepared['land']['used_capacity'])->toBe(0);
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

it('ignores the retired equal-capacity flag when preparing actual usage', function () {
    $prepared = ProjectInfrastructureInput::withDefaultUsedCapacity([
        'electricity' => ['needed' => true, 'required_capacity' => '60', 'used_capacity' => '', 'use_required_capacity' => false],
    ]);
    expect($prepared['electricity']['used_capacity'])->toBe(0);
});

it('accepts resource-specific units and excludes the retired equal-capacity flag', function () {
    $infrastructure = [];
    foreach (InfrastructureValidationRules::PROJECT_RESOURCES as $resource) {
        $infrastructure[$resource] = [
            'needed' => true,
            'required_capacity' => 100,
            'used_capacity' => 0,
            'unit' => \App\Support\InfrastructureUnits::codes($resource)[0],
            'use_required_capacity' => true,
        ];
    }

    $validator = Validator::make(['infrastructure' => $infrastructure], InfrastructureValidationRules::project());

    expect($validator->passes())->toBeTrue()
        ->and($validator->validated()['infrastructure']['electricity'])->not->toHaveKey('use_required_capacity');

    $infrastructure['roads']['unit'] = 'm3_month';
    expect(Validator::make(['infrastructure' => $infrastructure], InfrastructureValidationRules::project())->errors()->has('infrastructure.roads.unit'))->toBeTrue();
});

it('validates zone units without reinterpreting numeric capacities', function () {
    $infrastructure = [];
    foreach (InfrastructureValidationRules::ZONE_RESOURCES as $resource) {
        $infrastructure[$resource] = [
            'available' => true,
            'capacity' => 100,
            'unit' => \App\Support\InfrastructureUnits::codes($resource)[0],
        ];
    }
    $infrastructure['water']['capacity'] = 3000;
    $infrastructure['water']['unit'] = 'm3_month';
    $validator = Validator::make(['infrastructure' => $infrastructure], InfrastructureValidationRules::zone());

    expect($validator->passes())->toBeTrue()
        ->and($validator->validated()['infrastructure']['water'])->toBe([
            'available' => true,
            'capacity' => 3000,
            'unit' => 'm3_month',
        ]);

    $infrastructure['water']['unit'] = 'km';
    expect(Validator::make(['infrastructure' => $infrastructure], InfrastructureValidationRules::zone())->errors()->has('infrastructure.water.unit'))->toBeTrue();
});
