<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;

class TelegramGetUpdates extends Command
{
    protected $signature = 'telegram:updates';

    protected $description = 'Fetch Telegram bot updates to see chat IDs of users who messaged the bot';

    public function handle(): int
    {
        $telegram = app(TelegramService::class);
        $updates = $telegram->getUpdates();

        if (empty($updates)) {
            $this->warn('Хабарламалар жоқ. Пайдаланушыларға ботқа /start жіберуін айтыңыз.');

            return self::SUCCESS;
        }

        $this->info('Ботқа жазған пайдаланушылар:');
        $this->newLine();

        $seen = [];
        foreach ($updates as $update) {
            $message = $update['message'] ?? null;
            if (! $message) {
                continue;
            }

            $chat = $message['chat'] ?? null;
            if (! $chat) {
                continue;
            }

            $chatId = $chat['id'];
            if (isset($seen[$chatId])) {
                continue;
            }
            $seen[$chatId] = true;

            $firstName = $chat['first_name'] ?? '';
            $lastName = $chat['last_name'] ?? '';
            $username = $chat['username'] ?? '-';
            $text = $message['text'] ?? '';

            $this->line("  Chat ID:    <info>{$chatId}</info>");
            $this->line("  Аты:        {$firstName} {$lastName}");
            $this->line("  Username:   @{$username}");
            $this->line("  Хабарлама:  {$text}");
            $this->newLine();
        }

        $this->info('Осы Chat ID-ларды пайдаланушыларға тіркеңіз.');

        return self::SUCCESS;
    }
}
