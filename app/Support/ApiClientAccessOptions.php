<?php

namespace App\Support;

use App\Models\ApiClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

final class ApiClientAccessOptions
{
    public static function values(Command $command, ?ApiClient $client = null): array
    {
        $regions = $command->option('region');
        $projects = $command->option('project');
        $validated = Validator::make([
            'region' => $regions, 'project' => $projects,
        ], [
            'region' => 'array', 'region.*' => 'integer|min:1|distinct|exists:regions,id',
            'project' => 'array', 'project.*' => 'integer|min:1|distinct|exists:investment_projects,id',
        ])->validate();

        return [
            'allowed_region_ids' => $regions ? array_map('intval', $validated['region'])
                : ($command->hasOption('all-regions') && $command->option('all-regions') ? null : $client?->allowed_region_ids),
            'allowed_project_ids' => $projects ? array_map('intval', $validated['project'])
                : ($command->hasOption('all-projects') && $command->option('all-projects') ? null : $client?->allowed_project_ids),
            'include_contacts' => $command->hasOption('without-contacts') && $command->option('without-contacts')
                ? false : ((bool) $command->option('include-contacts') || (bool) $client?->include_contacts),
            'include_internal' => $command->hasOption('without-internal') && $command->option('without-internal')
                ? false : ((bool) $command->option('include-internal') || (bool) $client?->include_internal),
        ];
    }
}
