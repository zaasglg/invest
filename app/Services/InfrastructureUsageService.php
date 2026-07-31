<?php

namespace App\Services;

use Illuminate\Support\Collection;

class InfrastructureUsageService
{
    /**
     * @param  array<string, mixed>|null  $infrastructure
     * @param  Collection<int, object>  $projects
     * @return array<string, array{total: float, used: float, remaining: float}>
     */
    public function summarize(?array $infrastructure, Collection $projects): array
    {
        $summary = [];

        foreach (['electricity', 'gas', 'water'] as $resource) {
            $total = $this->parseCapacity(
                data_get($infrastructure, "{$resource}.capacity"),
                $resource,
            );
            $used = $projects->sum(function ($project) use ($resource): float {
                $requirement = data_get($project->infrastructure, $resource);

                if (! is_array($requirement) || ! ($requirement['needed'] ?? false)) {
                    return 0;
                }

                return $this->parseCapacity(
                    $requirement['capacity'] ?? null,
                    $resource,
                );
            });

            if ($total > 0) {
                $summary[$resource] = [
                    'total' => $total,
                    'used' => $used,
                    'remaining' => max(0, $total - $used),
                ];
            }
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
