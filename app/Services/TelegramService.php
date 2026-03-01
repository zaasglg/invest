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
            'task_overdue' => '⏰',
            'completion_submitted' => '📩',
            'completion_approved' => '✅',
            'completion_rejected' => '❌',
            default => '🔔',
        };

        // Get the base URL from config (set via APP_URL in .env)
        $siteUrl = rtrim(config('app.url', ''), '/');

        // Fallback: read APP_URL directly from env if config is empty
        if (empty($siteUrl)) {
            $siteUrl = rtrim(env('APP_URL', ''), '/');
        }

        // Ensure the URL has a scheme (Telegram needs absolute URLs in href).
        if ($siteUrl !== '' && !preg_match('#^https?://#i', $siteUrl)) {
            $siteUrl = 'https://' . ltrim($siteUrl, '/');
        }

        // Build notifications URL only if we have a valid site URL.
        $notificationsUrl = $siteUrl !== '' ? $siteUrl . '/notifications' : '';

        $linkPart = $notificationsUrl
            ? "🔗 <a href=\"{$notificationsUrl}\">Перейти на сайт</a>"
            : '🔗 Перейти на сайт';

        return "{$emoji} <b>Сообщение</b>\n\n"
            . $message . "\n\n"
            . $linkPart;
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
