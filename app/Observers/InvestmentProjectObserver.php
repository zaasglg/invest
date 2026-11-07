<?php

namespace App\Observers;

use App\Models\InvestmentProject;
use App\Services\ProjectAttractionHandoverService;
use App\Services\ProjectExecutorAssignmentService;

class InvestmentProjectObserver
{
    public function __construct(
        private readonly ProjectExecutorAssignmentService $assignments
    ) {}

    public function saved(InvestmentProject $project): void
    {
        if ($project->wasRecentlyCreated || $project->wasChanged(['region_id', 'status', 'is_archived', 'is_deleted'])) {
            $this->assignments->attachDistrictExecutors($project);
        }
        app(ProjectAttractionHandoverService::class)->notifyRequested($project);
    }
}
