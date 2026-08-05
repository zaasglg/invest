<?php

namespace App\Support;

final class ProductionOptions
{
    public const UNITS = [
        'piece' => 'дана',
        'ton' => 'тонна',
        'kilogram' => 'килограмм',
        'gram' => 'грамм',
        'liter' => 'литр',
        'cubic_meter' => 'м³',
        'square_meter' => 'м²',
        'linear_meter' => 'қума метр',
        'hectare' => 'гектар',
        'kilometer' => 'километр',
        'pair' => 'жұп',
        'set' => 'жиынтық',
        'package' => 'қаптама',
        'batch' => 'партия',
        'head' => 'бас',
        'apartment' => 'пәтер',
        'house' => 'үй',
        'room' => 'бөлме',
        'place' => 'орын',
        'person' => 'адам',
        'visit' => 'келуші',
        'service' => 'қызмет',
        'object' => 'объект',
        'kilowatt_hour' => 'кВт·сағ',
        'megawatt_hour' => 'МВт·сағ',
        'gigawatt_hour' => 'ГВт·сағ',
        'other' => 'басқа',
    ];

    public const PERIODS = [
        'month' => 'айына',
        'quarter' => 'тоқсанына',
        'year' => 'жылына',
        'project' => 'жоба бойынша барлығы',
    ];

    public static function unitLabel(string $unit, ?string $customUnit): string
    {
        if ($unit === 'other') {
            return filled($customUnit) ? $customUnit : self::UNITS['other'];
        }

        return self::UNITS[$unit] ?? $unit;
    }

    public static function periodLabel(string $period): string
    {
        return self::PERIODS[$period] ?? $period;
    }

    public static function factPeriodLabel(
        string $period,
        ?int $year,
        ?int $periodNumber
    ): string {
        return match ($period) {
            'month' => sprintf(
                '%d ж. %s',
                $year,
                self::monthNames()[$periodNumber] ?? $periodNumber
            ),
            'quarter' => sprintf('%d ж. %d-тоқсан', $year, $periodNumber),
            'year' => sprintf('%d жыл', $year),
            default => 'Жоба бойынша барлығы',
        };
    }

    /** @return array<int, string> */
    private static function monthNames(): array
    {
        return [
            1 => 'қаңтар',
            2 => 'ақпан',
            3 => 'наурыз',
            4 => 'сәуір',
            5 => 'мамыр',
            6 => 'маусым',
            7 => 'шілде',
            8 => 'тамыз',
            9 => 'қыркүйек',
            10 => 'қазан',
            11 => 'қараша',
            12 => 'желтоқсан',
        ];
    }
}
