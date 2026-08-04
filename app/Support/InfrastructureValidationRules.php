<?php

namespace App\Support;

final class InfrastructureValidationRules
{
    public const ZONE_RESOURCES = [
        'electricity',
        'water',
        'gas',
        'roads',
        'railway',
        'internet',
    ];

    public const PROJECT_RESOURCES = [
        ...self::ZONE_RESOURCES,
        'land',
    ];

    /** @return array<string, array<int, string>> */
    public static function zone(): array
    {
        $rules = [
            'infrastructure' => [
                'nullable',
                'array:'.implode(',', self::ZONE_RESOURCES),
            ],
        ];

        foreach (self::ZONE_RESOURCES as $resource) {
            $path = "infrastructure.{$resource}";
            $rules[$path] = [
                'required_with:infrastructure',
                'array:available,capacity',
            ];
            $rules["{$path}.available"] = [
                "required_with:{$path}",
                'boolean',
            ];
            $rules["{$path}.capacity"] = [
                'nullable',
                "required_if:{$path}.available,true",
                'numeric',
                'min:0',
            ];
        }

        return $rules;
    }

    /** @return array<string, array<int, string>> */
    public static function project(): array
    {
        $rules = [
            'infrastructure' => [
                'nullable',
                'array:'.implode(',', self::PROJECT_RESOURCES),
            ],
        ];

        foreach (self::PROJECT_RESOURCES as $resource) {
            $path = "infrastructure.{$resource}";
            $rules[$path] = [
                'required_with:infrastructure',
                'array:needed,required_capacity,used_capacity',
            ];
            $rules["{$path}.needed"] = [
                "required_with:{$path}",
                'boolean',
            ];

            foreach (['required_capacity', 'used_capacity'] as $capacity) {
                $rules["{$path}.{$capacity}"] = [
                    'nullable',
                    "required_if:{$path}.needed,true",
                    'numeric',
                    'min:0',
                ];
            }
        }

        return $rules;
    }
}
