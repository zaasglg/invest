<?php

namespace App\Observers;

use App\Models\User;
use App\Services\ProjectExecutorAssignmentService;

class UserObserver
{
    public function __construct(
        private readonly ProjectExecutorAssignmentService $assignments
    ) {}

    public function saved(User $user): void
    {
        $this->assignments->attachExecutorToRegionProjects($user);
    }
}
