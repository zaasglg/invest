<?php

namespace App\Services;

use App\Models\InvestmentProject;
use Illuminate\Support\Facades\DB;

class InvestmentProjectStatusService
{
    /**
     * @return array{old: ?string, new: string}
     */
    public function append(
        InvestmentProject $project,
        string $statusUpdate
    ): array {
        return DB::transaction(function () use ($project, $statusUpdate) {
            $lockedProject = InvestmentProject::query()
                ->lockForUpdate()
                ->findOrFail($project->id);

            $previousStatus = $lockedProject->current_status;
            $newStatus = collect([
                trim((string) $previousStatus),
                trim($statusUpdate),
            ])->filter(fn (string $status) => $status !== '')
                ->implode("\n\n");

            $lockedProject->update(['current_status' => $newStatus]);
            $project->setAttribute('current_status', $newStatus);

            return [
                'old' => $previousStatus,
                'new' => $newStatus,
            ];
        });
    }

    /**
     * @return array{old: ?string, new: ?string}
     */
    public function replace(
        InvestmentProject $project,
        ?string $status
    ): array {
        return DB::transaction(function () use ($project, $status) {
            $lockedProject = InvestmentProject::query()
                ->lockForUpdate()
                ->findOrFail($project->id);

            $previousStatus = $lockedProject->current_status;
            $lockedProject->update(['current_status' => $status]);
            $project->setAttribute('current_status', $status);

            return [
                'old' => $previousStatus,
                'new' => $status,
            ];
        });
    }
}
