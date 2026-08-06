<?php

namespace App\Console\Commands;

use App\Models\ApiClient;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Throwable;

class CreateApiClient extends Command
{
    protected $signature = 'api-client:create
        {name : API пайдаланушысының атауы}
        {--expires-at= : Token мерзімі (мысалы: 2027-12-31)}';

    protected $description = 'Create an external read-only API client token';

    public function handle(): int
    {
        $name = trim((string) $this->argument('name'));

        if ($name === '' || mb_strlen($name) > 255) {
            $this->error('Атау 1–255 таңба аралығында болуы керек.');

            return self::FAILURE;
        }

        $expiresAt = null;
        if ($this->option('expires-at')) {
            try {
                $expiresAt = CarbonImmutable::parse(
                    (string) $this->option('expires-at')
                )->endOfDay();
            } catch (Throwable) {
                $this->error('Token мерзімінің форматы дұрыс емес.');

                return self::FAILURE;
            }

            if ($expiresAt->isPast()) {
                $this->error('Token мерзімі болашақта болуы керек.');

                return self::FAILURE;
            }
        }

        $plainTextToken = 'inv_'.bin2hex(random_bytes(32));
        $client = ApiClient::create([
            'name' => $name,
            'token_hash' => hash('sha256', $plainTextToken),
            'expires_at' => $expiresAt,
        ]);

        $this->info("API client #{$client->id} құрылды: {$client->name}");
        $this->warn('Token тек осы рет көрсетіледі. Қауіпсіз жерге көшіріңіз:');
        $this->line($plainTextToken);

        return self::SUCCESS;
    }
}
