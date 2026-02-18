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
            $response = Http::withoutVerifying()->post("{$this->apiUrl}/sendMessage", [
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
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Format a notification message for Telegram.
     */
    public function formatNotification(string $type, string $message): string
    {
        $emoji = match ($type) {
            'task_assigned' => '📋',
            'completion_submitted' => '📩',
            'completion_approved' => '✅',
            'completion_rejected' => '❌',
            default => '🔔',
        };

        $siteUrl = config('app.url', '');
        $notificationsUrl = rtrim($siteUrl, '/') . '/notifications';

        return "{$emoji} <b>Сообщение</b>\n\n"
            . $message . "\n\n"
            . "🔗 <a href=\"{$notificationsUrl}\">Сайтқа өтіңіз</a>";
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
