<?php

namespace App\Support;

final class ProjectInfrastructureInput
{
    public static function withDefaultUsedCapacity(mixed $infrastructure): mixed
    {
        if (! is_array($infrastructure)) {
            return $infrastructure;
        }

        foreach (InfrastructureValidationRules::PROJECT_RESOURCES as $resource) {
            $details = $infrastructure[$resource] ?? null;

            if (! is_array($details)
                || ! in_array($details['needed'] ?? null, [true, 1, '1'], true)) {
                continue;
            }

            if (blank($details['used_capacity'] ?? null)
                && filled($details['required_capacity'] ?? null)) {
                $infrastructure[$resource]['used_capacity'] = $details['required_capacity'];
            }
        }

        return $infrastructure;
    }
}
