<?php

namespace App\Console\Commands;

use App\Models\InvestmentProject;
use App\Services\ProjectExecutorAssignmentService;
use Illuminate\Console\Command;

class SyncDistrictProjectExecutors extends Command
{
    protected $signature = 'projects:sync-district-executors';

    protected $description = 'Аудан/қала орындаушыларын өз өңірінің жобаларына автоматты тіркеу';

    public function handle(
        ProjectExecutorAssignmentService $assignments
    ): int {
        $projectCount = 0;
        $attachedCount = 0;

        InvestmentProject::query()->eachById(
            function (InvestmentProject $project) use (
                $assignments,
                &$projectCount,
                &$attachedCount
            ): void {
                $projectCount++;
                $districtExecutors = $assignments
                    ->districtExecutorsForRegion($project->region_id);

                if ($districtExecutors->isEmpty()) {
                    return;
                }

                $executorIds = $districtExecutors->modelKeys();
                $existingIds = $project->executors()
                    ->whereKey($executorIds)
                    ->pluck('users.id')
                    ->all();

                $attachedCount += count(array_diff(
                    $executorIds,
                    $existingIds
                ));

                $assignments->attachDistrictExecutors($project);
            }
        );

        $this->info(
            "Тексерілген жоба: {$projectCount}; "
            ."жаңадан тіркелген байланыс: {$attachedCount}"
        );

        return self::SUCCESS;
    }
}
