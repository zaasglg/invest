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
        if ($user->wasRecentlyCreated || $user->wasChanged(['region_id', 'role_id', 'baskarma_type'])) {
            $this->assignments->attachExecutorToRegionProjects($user);
        }
    }
}
