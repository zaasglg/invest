<?php

namespace App\Support;

use InvalidArgumentException;

final class InfrastructureUnits
{
    private static ?array $configuration = null;

    public static function defaultCode(string $resource): string
    {
        return self::resource($resource)['base_unit'];
    }

    /** @return list<string> */
    public static function codes(string $resource): array
    {
        return array_column(self::resource($resource)['units'], 'code');
    }

    public static function label(string $resource, ?string $unit = null): string
    {
        return self::unit($resource, $unit)['label'];
    }

    public static function toBase(mixed $value, string $resource, ?string $unit = null): float
    {
        $number = self::number($value);

        if ($unit === null || $unit === '') {
            $unit = self::legacyCode($value, $resource);
        }

        $definition = self::unit($resource, $unit);

        $converted = $number * $definition['numerator'] / $definition['denominator'];

        return round($converted, self::precision($converted));
    }

    public static function fromBase(float $value, string $resource, ?string $unit = null): float
    {
        $definition = self::unit($resource, $unit);

        $converted = $value * $definition['denominator'] / $definition['numerator'];

        return round($converted, self::precision($converted));
    }

    public static function convert(mixed $value, string $resource, ?string $from, ?string $to): float
    {
        return self::fromBase(self::toBase($value, $resource, $from), $resource, $to);
    }

    public static function format(mixed $value, string $resource, ?string $unit = null): string
    {
        $number = $unit ? self::number($value) : self::toBase($value, $resource);

        return self::numericString($number).' '.self::label($resource, $unit);
    }

    public static function numericString(float $value): string
    {
        $precision = self::precision($value);
        $formatted = number_format($value, $precision, '.', '');

        return $precision > 0 ? rtrim(rtrim($formatted, '0'), '.') : $formatted;
    }

    private static function precision(float $value): int
    {
        // More than 15 significant decimal digits can introduce binary noise
        // even when rounding an exact whole capacity such as 5000 kW.
        return $value == 0.0 ? 12 : min(12, max(0, 14 - (int) floor(log10(abs($value)))));
    }

    /** @return array<string, mixed> */
    private static function resource(string $resource): array
    {
        self::$configuration ??= json_decode(
            file_get_contents(resource_path('data/infrastructure-units.json')),
            true,
            flags: JSON_THROW_ON_ERROR
        );

        return self::$configuration['resources'][$resource]
            ?? throw new InvalidArgumentException('Unsupported infrastructure resource: '.$resource);
    }

    /** @return array{code: string, label: string, numerator: int, denominator: int} */
    private static function unit(string $resource, ?string $unit): array
    {
        $unit = $unit ?: self::defaultCode($resource);

        foreach (self::resource($resource)['units'] as $definition) {
            if ($definition['code'] === $unit) {
                return $definition;
            }
        }

        throw new InvalidArgumentException('Unsupported infrastructure unit for '.$resource.': '.$unit);
    }

    private static function legacyCode(mixed $value, string $resource): string
    {
        if (is_string($value)) {
            if ($resource === 'electricity' && preg_match('/мвт/iu', $value)) {
                return 'mw';
            }

            if ($resource === 'internet' && preg_match('/(гбит|gbps)/iu', $value)) {
                return 'gbps';
            }
        }

        return self::defaultCode($resource);
    }

    private static function number(mixed $value): float
    {
        if (is_numeric($value)) {
            $number = (float) $value;

            return is_finite($number) ? $number : 0.0;
        }

        if (! is_string($value) || ! preg_match('/[-+]?\d[\d\s.,]*/u', $value, $matches)) {
            return 0.0;
        }

        $number = (float) str_replace(',', '.', preg_replace('/\s+/u', '', $matches[0]));

        return is_finite($number) ? $number : 0.0;
    }
}
