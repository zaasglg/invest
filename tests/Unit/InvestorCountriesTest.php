<?php

use App\Support\InvestorCountries;

test('every selectable investor country has map coordinates', function () {
    $missing = collect(InvestorCountries::codes())
        ->filter(fn (string $code) => InvestorCountries::coordinates($code) === null)
        ->values()
        ->all();

    expect($missing)->toBe([]);

    foreach (InvestorCountries::codes() as $code) {
        $coordinates = InvestorCountries::coordinates($code);

        expect($coordinates)->not->toBeNull()
            ->and($coordinates['latitude'])->toBeBetween(-90, 90)
            ->and($coordinates['longitude'])->toBeBetween(-180, 180);
    }
});
