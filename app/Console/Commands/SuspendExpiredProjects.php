<?php

namespace App\Console\Commands;

use App\Models\InvestmentProject;
use Illuminate\Console\Command;

class SuspendExpiredProjects extends Command
{
    protected $signature = 'projects:suspend-expired';

    protected $description = 'Аяқталу мерзімі өтіп кеткен жобалардың статусын автоматты түрде "Приостановлен" деп өзгерту';

    public function handle(): int
    {
        $count = InvestmentProject::where('status', '!=', 'suspended')
            ->whereNotNull('end_date')
            ->where('end_date', '<', now()->startOfDay())
            ->update(['status' => 'suspended']);

        $this->info("Приостановлено проектов: {$count}");

        return self::SUCCESS;
    }
}
