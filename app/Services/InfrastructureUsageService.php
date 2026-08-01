<?php

namespace App\Services;

use Illuminate\Support\Collection;

class InfrastructureUsageService
{
    /**
     * @param  Collection<int, object>  $projects
     * @return array{
     *     total: float,
     *     occupied: float,
     *     available: float,
     *     consumers: array<int, array{id: int|null, name: string, area: float, capacity: string|null}>
     * }
     */
    public function summarizeArea(mixed $totalArea, Collection $projects): array
    {
        $total = $this->parseCapacity($totalArea, 'land');
        $consumers = $projects
            ->filter(function ($project): bool {
                $land = data_get($project->infrastructure, 'land');

                return is_array($land) && ($land['needed'] ?? false);
            })
            ->map(function ($project): array {
                $capacity = data_get($project->infrastructure, 'land.capacity');

                return [
                    'id' => isset($project->id) ? (int) $project->id : null,
                    'name' => (string) ($project->name ?? 'Атаусыз жоба'),
                    'area' => $this->parseCapacity($capacity, 'land'),
                    'capacity' => is_scalar($capacity) ? (string) $capacity : null,
                ];
            })
            ->filter(fn (array $consumer): bool => $consumer['area'] > 0)
            ->sortByDesc('area')
            ->values();
        $occupied = (float) $consumers->sum('area');

        return [
            'total' => $total,
            'occupied' => $occupied,
            'available' => max(0, $total - $occupied),
            'consumers' => $consumers->all(),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $infrastructure
     * @param  Collection<int, object>  $projects
     * @return array<string, array{
     *     total?: float,
     *     used?: float,
     *     remaining?: float,
     *     consumers: array<int, array{
     *         id: int|null,
     *         name: string,
     *         capacity: string|null,
     *         value: float,
     *         status: string|null
     *     }>
     * }>
     */
    public function summarize(?array $infrastructure, Collection $projects): array
    {
        $summary = [];

        foreach (['electricity', 'gas', 'water', 'roads', 'railway', 'internet'] as $resource) {
            $total = $this->parseCapacity(
                data_get($infrastructure, "{$resource}.capacity"),
                $resource,
            );
            $consumers = $projects
                ->filter(function ($project) use ($resource): bool {
                    $requirement = data_get($project->infrastructure, $resource);

                    return is_array($requirement) && ($requirement['needed'] ?? false);
                })
                ->map(function ($project) use ($resource): array {
                    $capacity = data_get($project->infrastructure, "{$resource}.capacity");

                    return [
                        'id' => isset($project->id) ? (int) $project->id : null,
                        'name' => (string) ($project->name ?? 'Атаусыз жоба'),
                        'capacity' => is_scalar($capacity) ? (string) $capacity : null,
                        'value' => $this->parseCapacity($capacity, $resource),
                        'status' => isset($project->status) ? (string) $project->status : null,
                    ];
                })
                ->values();
            $used = $consumers->sum(function (array $consumer): float {
                return $consumer['value'];
            });

            if (in_array($resource, ['electricity', 'gas', 'water'], true) && $total > 0) {
                $summary[$resource] = [
                    'total' => $total,
                    'used' => $used,
                    'remaining' => max(0, $total - $used),
                    'consumers' => $consumers->all(),
                ];

                continue;
            }

            $summary[$resource] = [
                'consumers' => $consumers->all(),
            ];
        }

        return $summary;
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

        return $parsed;
    }
}
