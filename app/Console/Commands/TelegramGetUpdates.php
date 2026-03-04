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
            $this->warn('Сообщений нет. Попросите пользователей отправить /start боту.');

            return self::SUCCESS;
        }

        $this->info('Пользователи, написавшие боту:');
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
            $this->line("  Имя:        {$firstName} {$lastName}");
            $this->line("  Username:   @{$username}");
            $this->line("  Сообщение:  {$text}");
            $this->newLine();
        }

        $this->info('Привяжите эти Chat ID к пользователям.');

        return self::SUCCESS;
    }
}
