<?php

namespace App\Services;

use App\Support\InfrastructureValidationRules;
use Illuminate\Support\Collection;

class InfrastructureUsageService
{
    /**
     * @param  Collection<int, object>  $projects
     * @return array{
     *     total: float,
     *     occupied: float,
     *     available: float,
     *     overused: float,
     *     consumers: array<int, array{
     *         id: int|null,
     *         name: string,
     *         area: float,
     *         capacity: string|null,
     *         required_capacity: string|null
     *     }>
     * }
     */
    public function summarizeArea(mixed $totalArea, Collection $projects): array
    {
        $total = $this->parseCapacity($totalArea, 'land');
        $consumers = $projects
            ->filter(fn ($project): bool => $this->isNeeded($project, 'land'))
            ->map(function ($project): array {
                $usedCapacity = data_get(
                    $project->infrastructure,
                    'land.used_capacity'
                );
                $requiredCapacity = $this->requiredCapacity($project, 'land');

                return [
                    'id' => isset($project->id) ? (int) $project->id : null,
                    'name' => (string) ($project->name ?? 'Атаусыз жоба'),
                    'area' => $this->parseCapacity($usedCapacity, 'land'),
                    'capacity' => $this->scalarString($usedCapacity),
                    'required_capacity' => $this->scalarString(
                        $requiredCapacity
                    ),
                ];
            })
            ->filter(fn (array $consumer): bool => $consumer['area'] > 0)
            ->sortByDesc('area')
            ->values();
        $occupied = (float) $consumers->sum('area');

        return [
            'total' => $total,
            'occupied' => $occupied,
            'available' => max(0.0, $total - $occupied),
            'overused' => max(0.0, $occupied - $total),
            'consumers' => $consumers->all(),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $infrastructure
     * @param  Collection<int, object>  $projects
     * @return array<string, array{
     *     total: float,
     *     used: float,
     *     remaining: float,
     *     overused: float,
     *     consumers: array<int, array{
     *         id: int|null,
     *         name: string,
     *         capacity: string|null,
     *         required_capacity: string|null,
     *         value: float,
     *         status: string|null
     *     }>
     * }>
     */
    public function summarize(
        ?array $infrastructure,
        Collection $projects
    ): array {
        $summary = [];

        foreach (InfrastructureValidationRules::ZONE_RESOURCES as $resource) {
            $total = $this->parseCapacity(
                $this->zoneCapacity($infrastructure, $resource),
                $resource,
            );
            $consumers = $projects
                ->filter(
                    fn ($project): bool => $this->isNeeded(
                        $project,
                        $resource
                    )
                )
                ->map(function ($project) use ($resource): array {
                    $usedCapacity = data_get(
                        $project->infrastructure,
                        "{$resource}.used_capacity"
                    );
                    $requiredCapacity = $this->requiredCapacity(
                        $project,
                        $resource
                    );

                    return [
                        'id' => isset($project->id)
                            ? (int) $project->id
                            : null,
                        'name' => (string) ($project->name ?? 'Атаусыз жоба'),
                        'capacity' => $this->scalarString($usedCapacity),
                        'required_capacity' => $this->scalarString(
                            $requiredCapacity
                        ),
                        'value' => $this->parseCapacity(
                            $usedCapacity,
                            $resource
                        ),
                        'status' => isset($project->status)
                            ? (string) $project->status
                            : null,
                    ];
                })
                ->values();
            $used = (float) $consumers->sum('value');

            $summary[$resource] = [
                'total' => $total,
                'used' => $used,
                'remaining' => max(0.0, $total - $used),
                'overused' => max(0.0, $used - $total),
                'consumers' => $consumers->all(),
            ];
        }

        return $summary;
    }

    private function isNeeded(object $project, string $resource): bool
    {
        $requirement = data_get($project->infrastructure, $resource);

        return is_array($requirement) && ($requirement['needed'] ?? false);
    }

    private function requiredCapacity(object $project, string $resource): mixed
    {
        return data_get(
            $project->infrastructure,
            "{$resource}.required_capacity",
            data_get($project->infrastructure, "{$resource}.capacity")
        );
    }

    /** @param array<string, mixed>|null $infrastructure */
    private function zoneCapacity(
        ?array $infrastructure,
        string $resource
    ): mixed {
        return data_get(
            $infrastructure,
            "{$resource}.capacity",
            data_get(
                $infrastructure,
                "{$resource}.distance",
                data_get($infrastructure, "{$resource}.type")
            )
        );
    }

    private function scalarString(mixed $value): ?string
    {
        return is_scalar($value) ? (string) $value : null;
    }

    private function parseCapacity(mixed $capacity, string $resource): float
    {
        if (! is_string($capacity) && ! is_numeric($capacity)) {
            return 0;
        }

        $value = (string) $capacity;
        preg_match('/[\d\s.,]+/u', $value, $matches);
        $number = str_replace([' ', ','], ['', '.'], $matches[0] ?? '0');
        $parsed = (float) $number;

        if ($resource === 'electricity' && preg_match('/мвт/iu', $value)) {
            return $parsed * 1000;
        }

        if ($resource === 'internet' && preg_match('/(гбит|gbps)/iu', $value)) {
            return $parsed * 1000;
        }

        return $parsed;
    }
}
