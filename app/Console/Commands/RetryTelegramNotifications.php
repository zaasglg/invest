<?php

namespace App\Console\Commands;

use App\Models\TaskNotification;
use App\Services\TelegramNotificationDeliveryService;
use Illuminate\Console\Command;

class RetryTelegramNotifications extends Command
{
    protected $signature = 'notifications:retry-telegram';

    protected $description = 'Жеткізілмеген Telegram хабарламаларын қайта жіберу';

    public function handle(TelegramNotificationDeliveryService $delivery): int
    {
        TaskNotification::whereIn('telegram_status', ['pending', 'retry', 'sending'])
            ->where('telegram_next_attempt_at', '<=', now())->orderBy('id')->limit(50)
            ->pluck('id')->each(fn ($id) => $delivery->deliver($id));

        return self::SUCCESS;
    }
}
