<?php

use App\Support\InfrastructureValidationRules;
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
