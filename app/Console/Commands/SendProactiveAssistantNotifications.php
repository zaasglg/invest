<?php

namespace App\Console\Commands;

use App\Services\ProactiveAssistantService;
use Illuminate\Console\Command;

class SendProactiveAssistantNotifications extends Command
{
    protected $signature = 'assistant:notify';

    protected $description = 'Рөлдік ұсыныстар мен мерзімі жақындаған тапсырмалар туралы көмекші хабарламаларын жіберу';

    public function handle(ProactiveAssistantService $assistant): int
    {
        $counts = $assistant->sendNotifications();

        $this->info(
            "Көмекші хабарламалары: {$counts['suggestions']} ұсыныс, "
            ."{$counts['deadlines']} мерзім ескертуі."
        );

        return self::SUCCESS;
    }
}
