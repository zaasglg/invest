<?php

namespace App\Console\Commands;

use App\Models\ApiClient;
use Illuminate\Console\Command;

class RevokeApiClient extends Command
{
    protected $signature = 'api-client:revoke
        {client : API client ID}';

    protected $description = 'Revoke an external API client token';

    public function handle(): int
    {
        $client = ApiClient::find($this->argument('client'));

        if (! $client) {
            $this->error('API client табылмады.');

            return self::FAILURE;
        }

        $client->update(['is_active' => false]);
        $this->info("API client #{$client->id} өшірілді.");

        return self::SUCCESS;
    }
}
