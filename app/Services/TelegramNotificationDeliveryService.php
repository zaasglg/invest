<?php

namespace App\Services;

use App\Models\TaskNotification;
use Illuminate\Support\Facades\DB;

class TelegramNotificationDeliveryService
{
    public function enqueue(TaskNotification $notification): void
    {
        if (in_array($notification->type, TaskNotification::ASSISTANT_TYPES, true)) {
            return;
        }
        $notification->forceFill(['telegram_status' => 'pending', 'telegram_next_attempt_at' => now()])->saveQuietly();
        $this->deliver($notification->id);
    }

    public function deliver(int $id): void
    {
        $notification = DB::transaction(function () use ($id) {
            $notification = TaskNotification::query()->lockForUpdate()->find($id);
            if (! $notification || ! in_array($notification->telegram_status, ['pending', 'retry', 'sending'], true)
                || $notification->telegram_next_attempt_at?->isFuture()) {
                return null;
            }
            $user = $notification->user;
            if (! $user || ! $user->telegram_chat_id
                || ! TaskNotification::visibleTo($user)->whereKey($id)->exists()) {
                $notification->forceFill(['telegram_status' => 'skipped', 'telegram_next_attempt_at' => null])->saveQuietly();

                return null;
            }
            if ($notification->telegram_attempts >= 5) {
                $notification->forceFill(['telegram_status' => 'failed', 'telegram_next_attempt_at' => null])->saveQuietly();

                return null;
            }
            $notification->forceFill([
                'telegram_status' => 'sending',
                'telegram_attempts' => $notification->telegram_attempts + 1,
                'telegram_next_attempt_at' => now()->addMinutes(2),
            ])->saveQuietly();

            return $notification;
        });
        if (! $notification) {
            return;
        }

        $telegram = app(TelegramService::class);
        $text = htmlspecialchars(mb_substr($notification->message, 0, 3000), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $message = $telegram->formatNotificationForTarget($notification->type, $text, url($notification->destination_url));
        $sent = $telegram->sendMessage($notification->user->telegram_chat_id, $message, 'HTML', 1);
        $failed = $notification->telegram_attempts >= 5;
        TaskNotification::whereKey($id)->where('telegram_attempts', $notification->telegram_attempts)
            ->where('telegram_status', 'sending')->update([
                'telegram_status' => $sent ? 'sent' : ($failed ? 'failed' : 'retry'),
                'telegram_sent_at' => $sent ? now() : null,
                'telegram_next_attempt_at' => $sent || $failed ? null : now()->addMinutes(2 ** $notification->telegram_attempts),
                'telegram_last_error' => $sent ? null : 'Telegram хабарламаны қабылдамады. Байланыс пен бот баптауын тексеріңіз.',
            ]);
    }
}
