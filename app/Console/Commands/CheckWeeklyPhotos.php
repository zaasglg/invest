<?php

namespace App\Console\Commands;

use App\Models\InvestmentProject;
use App\Models\ProjectPhoto;
use App\Models\User;
use App\Services\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckWeeklyPhotos extends Command
{
    protected $signature = 'photos:check-weekly';

    protected $description = 'Апта сайын исполнитель суреттер салғанын тексеру, салмаса кураторға Telegram хабарлама жіберу';

    public function handle(): int
    {
        $telegram = new TelegramService;

        // Get all active projects that have ispolnitel executors
        $projects = InvestmentProject::active()
            ->with(['executors.roleModel', 'creator', 'region'])
            ->get();

        $notifiedCount = 0;

        foreach ($projects as $project) {
            // Find ispolnitel executors for this project
            $ispolnitelExecutors = $project->executors->filter(function ($user) {
                return $user->roleModel?->name === 'ispolnitel';
            });

            if ($ispolnitelExecutors->isEmpty()) {
                continue;
            }

            // Check if any gallery photo was uploaded in the last 7 days for this project
            $hasRecentPhotos = ProjectPhoto::where('project_id', $project->id)
                ->where('photo_type', 'gallery')
                ->where('created_at', '>=', now()->subWeek())
                ->exists();

            if ($hasRecentPhotos) {
                continue;
            }

            // No photos uploaded this week — notify the curator
            $curator = $project->creator;

            if (! $curator || ! $curator->telegram_chat_id) {
                $this->warn("Жоба #{$project->id} \"{$project->name}\" — куратордың Telegram ID жоқ.");

                continue;
            }

            $ispolnitelNames = $ispolnitelExecutors->pluck('full_name')->implode(', ');
            $regionName = $project->region?->name ?? 'Белгісіз аудан';

            $message = "📸 <b>Апталық фото есебі жоқ!</b>\n\n"
                . "Жоба: <b>{$project->name}</b>\n"
                . "Аудан: {$regionName}\n"
                . "Исполнитель: {$ispolnitelNames}\n\n"
                . "Соңғы 7 күнде галереяға сурет салынбады.";

            $formattedMessage = $telegram->formatNotification(
                'photo_missing',
                $message,
                $project->id
            );

            $sent = $telegram->sendMessage($curator->telegram_chat_id, $formattedMessage);

            if ($sent) {
                $notifiedCount++;
                $this->info("Хабарлама жіберілді: Жоба #{$project->id} → Куратор: {$curator->full_name}");
            } else {
                $this->error("Хабарлама жіберілмеді: Жоба #{$project->id}");
            }
        }

        $this->info("Барлық хабарламалар: {$notifiedCount}");

        return self::SUCCESS;
    }
}
