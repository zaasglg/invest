<?php

namespace App\Observers;

use App\Models\InvestmentProject;
use App\Services\ProjectExecutorAssignmentService;

class InvestmentProjectObserver
{
    public function __construct(
        private readonly ProjectExecutorAssignmentService $assignments
    ) {}

    public function saved(InvestmentProject $project): void
    {
        $this->assignments->attachDistrictExecutors($project);
    }
}
