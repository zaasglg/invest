<?php

namespace App\Observers;

use App\Models\TaskNotification;
use App\Models\User;
use App\Services\TelegramService;

class TaskNotificationObserver
{
    /**
     * Handle the TaskNotification "created" event.
     * Sends the notification to the user via Telegram if they have a chat_id.
     */
    public function created(TaskNotification $notification): void
    {
        $user = User::find($notification->user_id);

        if (! $user || empty($user->telegram_chat_id)) {
            return;
        }

        // Dispatch to queue or send immediately
        try {
            $telegram = app(TelegramService::class);
            $formattedMessage = $telegram->formatNotification(
                $notification->type,
                $notification->message,
            );
            $telegram->sendMessage($user->telegram_chat_id, $formattedMessage);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Telegram notification failed', [
                'notification_id' => $notification->id,
                'user_id' => $notification->user_id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
