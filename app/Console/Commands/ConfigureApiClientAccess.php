<?php

namespace App\Console\Commands;

use App\Models\ApiClient;
use App\Support\ApiClientAccessOptions;
use Illuminate\Console\Command;

class ConfigureApiClientAccess extends Command
{
    protected $signature = 'api-client:access
        {client : API клиентінің ID}
        {--region=* : Рұқсат етілген аудан/облыс ID}
        {--project=* : Рұқсат етілген жоба ID}
        {--all-regions : Аудан/облыс шектеуін алып тастау}
        {--all-projects : Жоба тізімі шектеуін алып тастау}
        {--include-contacts : Байланыс деректерін беру}
        {--without-contacts : Байланыс деректерін бермеу}
        {--include-internal : Ішкі жағдай мен мәселелерді беру}
        {--without-internal : Ішкі жағдай мен мәселелерді бермеу}';

    protected $description = 'Configure an existing API client scope without displaying or changing its token';

    public function handle(): int
    {
        $client = ApiClient::find($this->argument('client'));
        if (! $client) {
            $this->error('API клиенті табылмады.');

            return self::FAILURE;
        }

        foreach ([['region', 'all-regions'], ['project', 'all-projects'], ['include-contacts', 'without-contacts'], ['include-internal', 'without-internal']] as [$first, $second]) {
            if ($this->option($first) && $this->option($second)) {
                $this->error("--{$first} және --{$second} қатар берілмейді.");

                return self::FAILURE;
            }
        }

        $client->update(ApiClientAccessOptions::values($this, $client));
        $this->info("API client #{$client->id}: қолжетімділік жаңартылды.");

        return self::SUCCESS;
    }
}
