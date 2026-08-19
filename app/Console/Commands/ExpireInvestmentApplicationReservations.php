<?php

namespace App\Console\Commands;

use App\Models\InvestmentApplication;
use App\Services\InvestmentApplicationWorkflowService;
use Illuminate\Console\Command;

class ExpireInvestmentApplicationReservations extends Command
{
    protected $signature = 'applications:expire-reservations';

    protected $description = 'Expire overdue investment application land reservations';

    public function handle(
        InvestmentApplicationWorkflowService $workflow
    ): int {
        $expiredCount = 0;

        InvestmentApplication::query()
            ->where('status', 'approved')
            ->whereNotNull('reserved_until')
            ->where('reserved_until', '<=', now())
            ->orderBy('id')
            ->chunkById(100, function ($applications) use (
                $workflow,
                &$expiredCount
            ): void {
                foreach ($applications as $application) {
                    if ($workflow->expire($application)) {
                        $expiredCount++;
                    }
                }
            });

        $this->info("Expired reservations: {$expiredCount}");

        return self::SUCCESS;
    }
}
