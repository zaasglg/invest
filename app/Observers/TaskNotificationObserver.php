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

            $notification->loadMissing([
                'task:id,project_id',
                'completion:id,task_id',
                'completion.task:id,project_id',
                'subsoilTask:id,subsoil_user_id',
                'subsoilCompletion:id,task_id',
                'subsoilCompletion.task:id,subsoil_user_id',
            ]);

            // Resolve the destination from the task that actually owns this
            // notification. Completion relations cover older notifications
            // where only a completion ID was stored.
            $projectId = $notification->task?->project_id
                ?? $notification->completion?->task?->project_id;
            $subsoilUserId = $notification->subsoilTask?->subsoil_user_id
                ?? $notification->subsoilCompletion?->task?->subsoil_user_id;

            if ($subsoilUserId) {
                $targetUrl = route('subsoil-users.show', $subsoilUserId);
                $linkPart = $targetUrl
                    ? "🔗 <a href=\"{$targetUrl}\">Сайтқа өту</a>"
                    : '🔗 Сайтқа өту';

                $emoji = match ($notification->type) {
                    'task_assigned' => '📋',
                    'task_overdue' => '⏰',
                    default => '🔔',
                };

                $formattedMessage = "{$emoji} <b>Хабарлама</b>\n\n"
                    .$notification->message."\n\n"
                    .$linkPart;
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
