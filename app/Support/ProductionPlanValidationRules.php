<?php

namespace App\Support;

use Illuminate\Validation\Rule;

final class ProductionPlanValidationRules
{
    /** @return array<string, array<int, mixed>> */
    public static function rules(bool $allowIncomplete = false): array
    {
        $rowRequirement = $allowIncomplete ? 'nullable' : 'required';

        return [
            'production_not_applicable' => ['sometimes', 'boolean'],
            'planned_production' => ['nullable', 'array', 'max:50'],
            'planned_production.*.id' => ['nullable', 'integer'],
            'planned_production.*.client_key' => [
                'nullable',
                'string',
                'max:64',
            ],
            'planned_production.*.product_name' => [
                $rowRequirement,
                'string',
                'max:255',
            ],
            'planned_production.*.planned_quantity' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:2000000000',
            ],
            'planned_production.*.unit' => [
                $rowRequirement,
                'string',
                Rule::in(array_keys(ProductionOptions::UNITS)),
            ],
            'planned_production.*.custom_unit' => [
                'nullable',
                'string',
                'max:50',
            ],
            'planned_production.*.planned_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:2000000000',
            ],
            'planned_production.*.period' => [
                $rowRequirement,
                'string',
                Rule::in(array_keys(ProductionOptions::PERIODS)),
            ],
        ];
    }
}
