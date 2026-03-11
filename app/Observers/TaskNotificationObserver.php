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

            // Determine link: investment project or subsoil user
            $projectId = $notification->task?->project_id;
            $subsoilTaskId = $notification->subsoil_task_id;

            if ($subsoilTaskId) {
                $subsoilTask = $notification->subsoilTask;
                $subsoilUserId = $subsoilTask?->subsoil_user_id;
                $siteUrl = rtrim(config('app.url', ''), '/');
                $targetUrl = $siteUrl && $subsoilUserId
                    ? $siteUrl . '/subsoil-users/' . $subsoilUserId
                    : ($siteUrl ? $siteUrl . '/notifications' : '');
                $linkPart = $targetUrl
                    ? "🔗 <a href=\"{$targetUrl}\">Сайтқа өту</a>"
                    : '🔗 Сайтқа өту';

                $emoji = match ($notification->type) {
                    'task_assigned' => '📋',
                    'task_overdue' => '⏰',
                    default => '🔔',
                };

                $formattedMessage = "{$emoji} <b>Хабарлама</b>\n\n"
                    . $notification->message . "\n\n"
                    . $linkPart;
            } else {
                $formattedMessage = $telegram->formatNotification(
                    $notification->type,
                    $notification->message,
                    $projectId,
                );
            }

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
