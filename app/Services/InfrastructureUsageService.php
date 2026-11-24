<?php

namespace App\Services;

use App\Support\InfrastructureUnits;
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
    public function summarizeArea(mixed $totalArea, Collection $projects, ?array $visibleProjectIds = null): array
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
                    'area' => InfrastructureUnits::toBase($usedCapacity, 'land', $this->projectUnit($project, 'land')),
                    'capacity' => $this->baseString($usedCapacity, 'land', $this->projectUnit($project, 'land')),
                    'required_capacity' => $this->baseString($requiredCapacity, 'land', $this->projectUnit($project, 'land')),
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
            'consumers' => $this->visibleConsumers($consumers, $visibleProjectIds),
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
        Collection $projects,
        ?array $visibleProjectIds = null
    ): array {
        $summary = [];

        foreach (InfrastructureValidationRules::ZONE_RESOURCES as $resource) {
            $total = $this->parseCapacity(
                $this->zoneCapacity($infrastructure, $resource),
                $resource,
                data_get($infrastructure, "{$resource}.unit"),
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
                        'capacity' => $this->baseString($usedCapacity, $resource, $this->projectUnit($project, $resource)),
                        'required_capacity' => $this->baseString($requiredCapacity, $resource, $this->projectUnit($project, $resource)),
                        'value' => $this->parseCapacity(
                            $usedCapacity,
                            $resource,
                            $this->projectUnit($project, $resource)
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
                'consumers' => $this->visibleConsumers($consumers, $visibleProjectIds),
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

    private function baseString(mixed $value, string $resource, ?string $unit): ?string
    {
        return is_scalar($value)
            ? InfrastructureUnits::numericString(InfrastructureUnits::toBase($value, $resource, $unit))
            : null;
    }

    private function projectUnit(object $project, string $resource): ?string
    {
        return data_get($project->infrastructure, "{$resource}.unit");
    }

    private function visibleConsumers(Collection $consumers, ?array $visibleProjectIds): array
    {
        return ($visibleProjectIds === null ? $consumers : $consumers->whereIn('id', $visibleProjectIds))
            ->values()->all();
    }

    private function parseCapacity(mixed $capacity, string $resource, ?string $unit = null): float
    {
        return InfrastructureUnits::toBase($capacity, $resource, $unit);
    }
}
