<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected string $botToken;

    protected string $apiUrl;

    public function __construct()
    {
        $this->botToken = config('services.telegram.bot_token', '');
        $this->apiUrl = "https://api.telegram.org/bot{$this->botToken}";
    }

    /**
     * Send a text message to a Telegram chat.
     */
    public function sendMessage(string $chatId, string $text, ?string $parseMode = 'HTML'): bool
    {
        if (empty($this->botToken) || empty($chatId)) {
            return false;
        }

        try {
            $response = Http::withoutVerifying()
                ->timeout(10)
                ->retry(3, 1000)
                ->post("{$this->apiUrl}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $text,
                    'parse_mode' => $parseMode,
                    'disable_web_page_preview' => true,
                ]);

            if (! $response->successful()) {
                Log::warning('Telegram sendMessage failed', [
                    'chat_id' => $chatId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Telegram sendMessage exception', [
                'chat_id' => $chatId,
                'error' => str_replace(
                    $this->botToken,
                    '[telegram-token-redacted]',
                    $e->getMessage()
                ),
            ]);

            return false;
        }
    }

    /**
     * Format a notification message for Telegram.
     */
    public function formatNotification(string $type, string $message, ?int $projectId = null): string
    {
        // Named routes use the current request host for web notifications and
        // APP_URL for scheduled commands. This keeps Telegram links on the
        // same site and points project notifications to the exact project.
        $targetUrl = $projectId
            ? route('investment-projects.show', $projectId)
            : route('notifications.index');

        return $this->formatNotificationForTarget(
            $type,
            $message,
            $targetUrl
        );
    }

    /**
     * Format a Telegram notification with an explicit destination URL.
     */
    public function formatNotificationForTarget(
        string $type,
        string $message,
        string $targetUrl
    ): string {
        $emoji = match ($type) {
            'task_assigned' => '📋',
            'task_overdue' => '⏰',
            'completion_submitted' => '📩',
            'completion_approved' => '✅',
            'completion_rejected' => '❌',
            'photo_missing' => '📸',
            default => '🔔',
        };

        $linkPart = $targetUrl
            ? "🔗 <a href=\"{$targetUrl}\">Сайтқа өту</a>"
            : '🔗 Сайтқа өту';

        return "{$emoji} <b>Хабарлама</b>\n\n"
            .$message."\n\n"
            .$linkPart;
    }

    /**
     * Get bot updates (for fetching chat IDs).
     */
    public function getUpdates(int $offset = 0): array
    {
        if (empty($this->botToken)) {
            return [];
        }

        try {
            $response = Http::withoutVerifying()->get("{$this->apiUrl}/getUpdates", [
                'offset' => $offset,
                'limit' => 100,
            ]);

            if ($response->successful()) {
                return $response->json('result', []);
            }
        } catch (\Throwable $e) {
            Log::error('Telegram getUpdates exception', [
                'error' => $e->getMessage(),
            ]);
        }

        return [];
    }
}
