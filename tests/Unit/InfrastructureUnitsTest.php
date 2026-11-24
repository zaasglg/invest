<?php

use App\Support\InfrastructureUnits;
use Tests\TestCase;

uses(TestCase::class);

it('converts compatible infrastructure units to the original canonical standard', function (string $resource, string $unit, float $input, float $expected) {
    expect(InfrastructureUnits::toBase($input, $resource, $unit))->toEqualWithDelta($expected, 0.000000001)
        ->and(InfrastructureUnits::fromBase($expected, $resource, $unit))->toEqualWithDelta($input, 0.000000001);
})->with([
    ['electricity', 'mw', 2.5, 2500.0],
    ['roads', 'm', 500.0, 0.5],
    ['railway', 'm', 1200.0, 1.2],
    ['land', 'm2', 12500.0, 1.25],
    ['internet', 'gbps', 1.5, 1500.0],
    ['water', 'm3_hour', 5.0, 120.0],
    ['water', 'm3_day', 5.0, 5.0],
    ['water', 'm3_month', 3000.0, 100.0],
    ['water', 'm3_year', 36500.0, 100.0],
    ['gas', 'm3_day', 2400.0, 100.0],
    ['gas', 'm3_month', 72000.0, 100.0],
    ['gas', 'm3_year', 876000.0, 100.0],
]);

it('preserves unitless historical standards and textual legacy multipliers', function () {
    expect(InfrastructureUnits::toBase('5 МВт', 'electricity'))->toBe(5000.0)
        ->and(InfrastructureUnits::toBase('1,5 Гбит/с', 'internet'))->toBe(1500.0)
        ->and(InfrastructureUnits::toBase('2.5', 'roads'))->toBe(2.5)
        ->and(InfrastructureUnits::toBase('50', 'water'))->toBe(50.0)
        ->and(InfrastructureUnits::format('5 МВт', 'electricity'))->toBe('5000 кВт')
        ->and(InfrastructureUnits::format(3000, 'water', 'm3_month'))->toBe('3000 м³/ай');
});

it('rejects units from another measurement dimension', function () {
    expect(fn () => InfrastructureUnits::toBase(10, 'electricity', 'km'))
        ->toThrow(InvalidArgumentException::class);
});

it('uses the same normative month and year across water and gas', function () {
    expect(InfrastructureUnits::convert(36500, 'water', 'm3_year', 'm3_day'))->toBe(100.0)
        ->and(InfrastructureUnits::convert(3000, 'water', 'm3_month', 'm3_day'))->toBe(100.0)
        ->and(InfrastructureUnits::convert(36500, 'gas', 'm3_year', 'm3_day'))->toEqualWithDelta(100.0, 0.000000001)
        ->and(InfrastructureUnits::convert(3000, 'gas', 'm3_month', 'm3_day'))->toEqualWithDelta(100.0, 0.000000001);
});
