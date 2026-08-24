<?php

namespace App\Console\Commands;

use App\Models\InvestmentProject;
use App\Services\ProjectExecutorAssignmentService;
use App\Services\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class CheckWeeklyPhotos extends Command
{
    protected $signature = 'photos:check-weekly';

    protected $description = 'Аудан орындаушысының соңғы 7 күнде жобаға фото жүктегенін тексеру';

    public function handle(
        TelegramService $telegram,
        ProjectExecutorAssignmentService $assignments
    ): int {
        $projects = InvestmentProject::active()
            ->with('region')
            ->get();

        $cutoff = now()->subDays(7);
        $notifiedCount = 0;
        $failedCount = 0;
        $missingExecutorCount = 0;
        $missingPhotoProjectCount = 0;
        $notifications = collect();

        foreach ($projects as $project) {
            // This also repairs assignments for projects/users created before
            // automatic district assignment was introduced.
            $districtExecutors = $assignments->attachDistrictExecutors(
                $project
            );

            if ($districtExecutors->isEmpty()) {
                $missingExecutorCount++;
                $this->warn(
                    "Жоба #{$project->id} \"{$project->name}\" — "
                    .'осы ауданға тіркелген орындаушы жоқ.'
                );

                continue;
            }

            $hasExecutorPhoto = $project->photos()
                ->where('photo_type', 'gallery')
                ->whereIn('uploaded_by', $districtExecutors->modelKeys())
                ->where('created_at', '>=', $cutoff)
                ->exists();

            if ($hasExecutorPhoto) {
                continue;
            }

            $recipients = $this->telegramRecipients($districtExecutors);

            if ($recipients->isEmpty()) {
                $this->warn(
                    "Жоба #{$project->id} \"{$project->name}\" — "
                    .'аудан орындаушыларының Telegram ID-і жоқ.'
                );

                continue;
            }

            $missingPhotoProjectCount++;

            foreach ($recipients as $executor) {
                $recipientId = (string) $executor->id;

                if (! $notifications->has($recipientId)) {
                    $notifications->put($recipientId, [
                        'recipient' => $executor,
                        'projects' => collect(),
                    ]);
                }

                $bucket = $notifications->get($recipientId);
                $bucket['projects']->push([
                    'project' => $project,
                    'executors' => $districtExecutors,
                ]);
                $notifications->put($recipientId, $bucket);
            }
        }

        foreach ($notifications as $notification) {
            $executor = $notification['recipient'];
            $messages = $this->missingPhotoSummaryMessages(
                $notification['projects']
            );

            foreach ($messages as $message) {
                $formattedMessage = $telegram->formatNotification(
                    'photo_missing',
                    $message
                );

                if ($telegram->sendMessage(
                    $executor->telegram_chat_id,
                    $formattedMessage
                )) {
                    $notifiedCount++;
                    $this->info(
                        'Апталық фото қорытындысы жіберілді: '
                        ."{$executor->full_name}"
                    );
                } else {
                    $failedCount++;
                    $this->error(
                        'Апталық фото қорытындысы жіберілмеді: '
                        ."{$executor->full_name}"
                    );
                }
            }
        }

        $this->info(
            "Фото есебі жоқ жоба: {$missingPhotoProjectCount}; "
            ."жіберілген Telegram қорытындысы: {$notifiedCount}; "
            ."қате: {$failedCount}; "
            ."орындаушысы жоқ жоба: {$missingExecutorCount}"
        );

        return $failedCount === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function telegramRecipients(Collection $districtExecutors): Collection
    {
        return $districtExecutors
            ->filter(fn ($user) => filled($user->telegram_chat_id))
            ->unique('id')
            ->values();
    }

    /**
     * @return array<int, string>
     */
    private function missingPhotoSummaryMessages(Collection $projects): array
    {
        $lineChunks = [];
        $currentChunk = [];
        $currentLength = 0;

        foreach ($projects as $item) {
            $line = $this->missingProjectLine(
                $item['project'],
                $item['executors']
            );
            $lineLength = mb_strlen($line);

            if ($currentChunk !== []
                && $currentLength + $lineLength > 3000) {
                $lineChunks[] = $currentChunk;
                $currentChunk = [];
                $currentLength = 0;
            }

            $currentChunk[] = $line;
            $currentLength += $lineLength;
        }

        if ($currentChunk !== []) {
            $lineChunks[] = $currentChunk;
        }

        $partCount = count($lineChunks);
        $projectCount = $projects->count();

        return collect($lineChunks)
            ->map(function (array $lines, int $index) use (
                $partCount,
                $projectCount
            ): string {
                $partLabel = $partCount > 1
                    ? ' ('.($index + 1)."/{$partCount})"
                    : '';

                return "📸 <b>Апталық фото есебі жоқ{$partLabel}</b>\n\n"
                    .'Соңғы 7 күнде аудан/қала орындаушысы фото '
                    ."жүктемеген жобалар: {$projectCount}\n\n"
                    .implode("\n\n", $lines);
            })
            ->all();
    }

    private function missingProjectLine(
        InvestmentProject $project,
        Collection $districtExecutors
    ): string {
        $projectUrl = e(route('investment-projects.show', $project));
        $projectName = e($project->name);
        $regionName = e($project->region?->name ?? 'Белгісіз аудан');
        $executorNames = e(
            $districtExecutors->pluck('full_name')->implode(', ')
        );

        return "• <a href=\"{$projectUrl}\"><b>{$projectName}</b></a>\n"
            ."  Аудан/қала: {$regionName}\n"
            ."  Жауапты орындаушы: {$executorNames}";
    }
}
