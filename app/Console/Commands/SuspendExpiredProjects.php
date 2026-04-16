<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SuspendExpiredProjects extends Command
{
    protected $signature = 'projects:suspend-expired';

    protected $description = 'Мерзімі өткен жобалар бойынша автоматты статус өзгерту өшірілген';

    public function handle(): int
    {
        $this->info('Автоматты статус өзгерту өшірілген. Ешбір жоба жаңартылмады.');

        return self::SUCCESS;
    }
}
