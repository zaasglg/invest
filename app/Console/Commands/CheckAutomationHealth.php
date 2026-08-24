<?php

namespace App\Console\Commands;

use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\SubsoilTask;
use App\Models\TaskNotification;
use App\Models\User;
use App\Services\ProjectExecutorAssignmentService;
use App\Services\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Throwable;

class CheckAutomationHealth extends Command
{
    protected $signature = 'automation:check
        {--send-test-to= : Бір Telegram chat ID-ге тест хабарламасын жіберу}
        {--skip-telegram-api : Telegram API-ге сыртқы сұрау жібермеу}';

    protected $description = 'Scheduler, апталық фото және іс-қимыл көмекшісі автоматтандыруларын қауіпсіз тексеру';

    public function handle(
        ProjectExecutorAssignmentService $assignments,
        TelegramService $telegram,
        Schedule $schedule
    ): int {
        $failed = false;
        $databaseOk = true;

        $this->info('Автоматтандыруларды толық тексеру');
        $this->newLine();

        $this->table(
            ['Параметр', 'Мән'],
            [
                ['APP_ENV', app()->environment()],
                ['APP_URL', config('app.url')],
                ['Уақыт белдеуі', config('app.timezone')],
                ['Сервер уақыты', now()->format('Y-m-d H:i:s')],
            ]
        );

        if (! app()->isProduction()) {
            $this->warn(
                'APP_ENV production емес. Нақты серверде APP_ENV=production болуы керек.'
            );
        }

        if (str_contains((string) config('app.url'), '127.0.0.1')
            || str_contains((string) config('app.url'), 'localhost')) {
            $this->warn(
                'APP_URL localhost-ты көрсетіп тұр. Telegram сілтемелері ашылмайды.'
            );
        }

        try {
            DB::selectOne('select 1');
            $this->components->info('Дерекқорға қосылу: OK');
        } catch (Throwable $exception) {
            $failed = true;
            $databaseOk = false;
            $this->components->error(
                'Дерекқорға қосылу қатесі: '.$exception->getMessage()
            );
        }

        $failed = ! $this->checkSchedule($schedule) || $failed;
        $failed = ! $this->checkTelegram($telegram) || $failed;

        if ($databaseOk) {
            $this->showWeeklyPhotoStatus($assignments);
            $this->showAssistantStatus();
        }

        $this->showSchedulerLogs();

        $this->newLine();
        $this->warn(
            'Маңызды: бұл команда Laravel кестесін тексереді, бірақ операциялық '
            .'жүйедегі cron процесінің іске қосылғанын өзі дәлелдей алмайды.'
        );
        $this->line(
            "Linux cron тексеру: crontab -l | grep 'schedule:run'"
        );
        $this->line(
            "Процесс тексеру: ps aux | grep '[s]chedule:work'"
        );

        if ($failed) {
            $this->newLine();
            $this->components->error('Автоматтандыру тексеруінде қате табылды.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->components->info('Laravel ішіндегі тексерулер сәтті аяқталды.');

        return self::SUCCESS;
    }

    private function checkSchedule(Schedule $schedule): bool
    {
        $expected = [
            'assistant:notify' => 'әр сағат сайын',
            'photos:check-weekly' => 'дүйсенбі 09:00',
        ];
        $rows = [];
        $allRegistered = true;

        foreach ($expected as $command => $frequency) {
            $event = collect($schedule->events())->first(
                fn ($event) => str_contains(
                    (string) ($event->command ?? ''),
                    $command
                )
            );
            $registered = $event !== null;
            $allRegistered = $allRegistered && $registered;
            $rows[] = [
                $command,
                $frequency,
                $registered ? 'OK' : 'ТАБЫЛМАДЫ',
            ];
        }

        $this->newLine();
        $this->info('Laravel scheduler кестесі');
        $this->table(['Команда', 'Жоспар', 'Күй'], $rows);

        return $allRegistered;
    }

    private function checkTelegram(TelegramService $telegram): bool
    {
        $token = (string) config('services.telegram.bot_token', '');

        $this->newLine();
        $this->info('Telegram тексеруі');

        if ($token === '') {
            $this->components->error('TELEGRAM_BOT_TOKEN орнатылмаған.');

            return false;
        }

        $ok = true;

        if ($this->option('skip-telegram-api')) {
            $this->warn('Telegram API тексеруі өткізіліп жіберілді.');
        } else {
            try {
                $response = Http::timeout(12)
                    ->get("https://api.telegram.org/bot{$token}/getMe");
                $ok = $response->successful()
                    && $response->json('ok') === true;

                if ($ok) {
                    $this->components->info('Telegram ботпен байланыс: OK');
                } else {
                    $this->components->error(
                        "Telegram API қатесі: HTTP {$response->status()}"
                    );
                }
            } catch (Throwable $exception) {
                $ok = false;
                $message = str_replace(
                    $token,
                    '[telegram-token-redacted]',
                    $exception->getMessage()
                );
                $this->components->error(
                    'Telegram желілік қатесі: '.$message
                );
            }
        }

        $testChatId = $this->option('send-test-to');

        if ($testChatId === null) {
            return $ok;
        }

        if (! preg_match('/^-?\d+$/', (string) $testChatId)) {
            $this->components->error(
                '--send-test-to мәні Telegram-ның сандық chat ID-і болуы керек.'
            );

            return false;
        }

        $sent = $telegram->sendMessage(
            (string) $testChatId,
            '✅ <b>Turkistan Invest автоматтандыру тесті</b>'
            ."\n\nСервер уақыты: ".now()->format('Y-m-d H:i:s')
        );

        if ($sent) {
            $this->components->info(
                'Бір Telegram тест хабарламасы сәтті жіберілді.'
            );
        } else {
            $this->components->error(
                'Telegram тест хабарламасы жіберілмеді.'
            );
        }

        return $ok && $sent;
    }

    private function showWeeklyPhotoStatus(
        ProjectExecutorAssignmentService $assignments
    ): void {
        $districtExecutorQuery = User::query()
            ->where('baskarma_type', 'district')
            ->whereHas(
                'roleModel',
                fn ($query) => $query->where('name', 'ispolnitel')
            );
        $districtExecutorCount = (clone $districtExecutorQuery)->count();
        $districtExecutorsWithoutTelegram = (clone $districtExecutorQuery)
            ->where(function ($query) {
                $query->whereNull('telegram_chat_id')
                    ->orWhere('telegram_chat_id', '');
            })
            ->count();
        $stats = [
            'active_projects' => 0,
            'projects_without_executor' => 0,
            'projects_needing_assignment' => 0,
            'projects_without_recent_photo' => 0,
            'projects_without_telegram_recipient' => 0,
        ];
        $recipientIds = collect();
        $cutoff = now()->subDays(7);

        InvestmentProject::active()
            ->select(['id', 'region_id'])
            ->eachById(function (InvestmentProject $project) use (
                $assignments,
                $cutoff,
                &$stats,
                $recipientIds
            ): void {
                $stats['active_projects']++;
                $districtExecutors = $assignments
                    ->districtExecutorsForRegion($project->region_id);

                if ($districtExecutors->isEmpty()) {
                    $stats['projects_without_executor']++;

                    return;
                }

                $executorIds = $districtExecutors->modelKeys();
                $attachedCount = $project->executors()
                    ->whereKey($executorIds)
                    ->count();

                if ($attachedCount !== count($executorIds)) {
                    $stats['projects_needing_assignment']++;
                }

                $hasRecentPhoto = $project->photos()
                    ->where('photo_type', 'gallery')
                    ->whereIn('uploaded_by', $executorIds)
                    ->where('created_at', '>=', $cutoff)
                    ->exists();

                if ($hasRecentPhoto) {
                    return;
                }

                $stats['projects_without_recent_photo']++;
                $telegramRecipients = $districtExecutors
                    ->filter(fn (User $user) => filled(
                        $user->telegram_chat_id
                    ));

                if ($telegramRecipients->isEmpty()) {
                    $stats['projects_without_telegram_recipient']++;

                    return;
                }

                $recipientIds->push(...$telegramRecipients->modelKeys());
            });

        $this->newLine();
        $this->info('Апталық фото тексеруінің ағымдағы жағдайы');
        $this->table(
            ['Көрсеткіш', 'Саны'],
            [
                ['Аудан орындаушылары', $districtExecutorCount],
                [
                    'Telegram ID-і жоқ аудан орындаушылары',
                    $districtExecutorsWithoutTelegram,
                ],
                ['Белсенді жобалар', $stats['active_projects']],
                [
                    'Аудан орындаушысы жоқ жобалар',
                    $stats['projects_without_executor'],
                ],
                [
                    'Автоматты тіркеуді қажет ететін жобалар',
                    $stats['projects_needing_assignment'],
                ],
                [
                    'Соңғы 7 күнде фотосы жоқ жобалар',
                    $stats['projects_without_recent_photo'],
                ],
                [
                    'Telegram алушысы жоқ жобалар',
                    $stats['projects_without_telegram_recipient'],
                ],
                [
                    'Ескерту алатын аудан орындаушылары',
                    $recipientIds->unique()->count(),
                ],
            ]
        );
        $this->line(
            'Бұл тек есеп: орындаушылар тіркелмеді және Telegram хабарламасы жіберілмеді.'
        );
    }

    private function showAssistantStatus(): void
    {
        $supportedUsers = User::query()
            ->whereHas(
                'roleModel',
                fn ($query) => $query->whereIn('name', User::SUPPORTED_ROLES)
            )
            ->count();
        $todaySuggestions = TaskNotification::query()
            ->where('type', 'assistant_suggestion')
            ->whereDate('created_at', today())
            ->count();
        $latestSuggestion = TaskNotification::query()
            ->where('type', 'assistant_suggestion')
            ->latest()
            ->value('created_at');
        $deadline = today()->addDays(3);
        $projectTasksDueSoon = ProjectTask::query()
            ->where('approval_status', 'approved')
            ->whereNotIn('status', ['done'])
            ->whereBetween('due_date', [today(), $deadline])
            ->count();
        $subsoilTasksDueSoon = SubsoilTask::query()
            ->whereNotIn('status', ['done'])
            ->whereBetween('due_date', [today(), $deadline])
            ->count();

        $this->newLine();
        $this->info('Іс-қимыл көмекшісінің жағдайы');
        $this->table(
            ['Көрсеткіш', 'Мән'],
            [
                ['Қолдау көрсетілетін қолданушылар', $supportedUsers],
                ['Бүгін жасалған ұсыныстар', $todaySuggestions],
                [
                    'Соңғы ұсыныс',
                    $this->formatTimestamp($latestSuggestion),
                ],
                [
                    '3 күн ішінде мерзімі келетін жоба тапсырмалары',
                    $projectTasksDueSoon,
                ],
                [
                    '3 күн ішінде мерзімі келетін жер қойнауы тапсырмалары',
                    $subsoilTasksDueSoon,
                ],
            ]
        );

        if ($supportedUsers > 0 && $todaySuggestions === 0) {
            $this->warn(
                'Бүгін көмекші ұсынысы жасалмаған. Cron/scheduler процесін тексеріңіз.'
            );
        } else {
            $this->components->info(
                'Бүгінгі көмекші жазбалары дерекқордан табылды.'
            );
        }
    }

    private function showSchedulerLogs(): void
    {
        $this->newLine();
        $this->info('Scheduler журналдары');
        $this->table(
            ['Автоматтандыру', 'Журналдың соңғы өзгеруі'],
            [
                [
                    'Іс-қимыл көмекшісі',
                    $this->logLastModified('assistant-scheduler.log'),
                ],
                [
                    'Апталық фото',
                    $this->logLastModified('weekly-photo-scheduler.log'),
                ],
            ]
        );
    }

    private function logLastModified(string $fileName): string
    {
        $path = storage_path('logs/'.$fileName);

        if (! File::exists($path)) {
            return 'Әлі жасалмаған';
        }

        return Carbon::createFromTimestamp(File::lastModified($path))
            ->timezone(config('app.timezone'))
            ->format('Y-m-d H:i:s');
    }

    private function formatTimestamp(mixed $value): string
    {
        if ($value === null) {
            return 'Жоқ';
        }

        return Carbon::parse($value)
            ->timezone(config('app.timezone'))
            ->format('Y-m-d H:i:s');
    }
}
