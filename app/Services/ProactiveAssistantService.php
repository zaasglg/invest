<?php

namespace App\Services;

use App\Models\ProjectTask;
use App\Models\SubsoilTask;
use App\Models\TaskNotification;
use App\Models\User;

class ProactiveAssistantService
{
    private const DUE_SOON_DAYS = 3;

    /**
     * @return array{suggestions: int, deadlines: int}
     */
    public function sendNotifications(): array
    {
        $counts = ['suggestions' => 0, 'deadlines' => 0];

        User::query()
            ->with('roleModel:id,name')
            ->whereHas(
                'roleModel',
                fn ($query) => $query->whereIn('name', User::SUPPORTED_ROLES)
            )
            ->chunkById(100, function ($users) use (&$counts): void {
                foreach ($users as $user) {
                    $counts['suggestions'] += $this->sendDailySuggestion($user);

                    if ($user->roleModel?->name === 'ispolnitel') {
                        $counts['deadlines'] += $this->sendDeadlineReminders(
                            $user
                        );
                    }
                }
            });

        return $counts;
    }

    private function sendDailySuggestion(User $user): int
    {
        if (TaskNotification::query()
            ->where('user_id', $user->id)
            ->where('type', 'assistant_suggestion')
            ->whereDate('created_at', today())
            ->exists()) {
            return 0;
        }

        $suggestion = $this->suggestionFor($user->roleModel?->name ?? '');

        TaskNotification::create([
            'user_id' => $user->id,
            'type' => 'assistant_suggestion',
            'message' => $suggestion['message'],
            'action_url' => $suggestion['url'],
            'action_label' => $suggestion['label'],
        ]);

        return 1;
    }

    private function sendDeadlineReminders(User $user): int
    {
        $count = 0;
        $deadline = today()->addDays(self::DUE_SOON_DAYS);

        $projectTasks = ProjectTask::query()
            ->with('project:id,name')
            ->where('assigned_to', $user->id)
            ->where('approval_status', 'approved')
            ->whereNotIn('status', ['done'])
            ->whereBetween('due_date', [today(), $deadline])
            ->get();

        foreach ($projectTasks as $task) {
            if ($this->wasDeadlineReminderSent(
                $user,
                'task_due_soon',
                taskId: $task->id
            )) {
                continue;
            }

            $daysLeft = today()->diffInDays($task->due_date);
            $projectName = $task->project?->name ?? 'Белгісіз жоба';

            TaskNotification::create([
                'user_id' => $user->id,
                'task_id' => $task->id,
                'type' => 'task_due_soon',
                'message' => "«{$task->title}» тапсырмасының мерзімі жақындап қалды. {$daysLeft} күн қалды. Жоба: {$projectName}.",
                'action_label' => 'Тапсырмаға өту',
            ]);

            $count++;
        }

        $subsoilTasks = SubsoilTask::query()
            ->with('subsoilUser:id,name')
            ->where('assigned_to', $user->id)
            ->whereNotIn('status', ['done'])
            ->whereBetween('due_date', [today(), $deadline])
            ->get();

        foreach ($subsoilTasks as $task) {
            if ($this->wasDeadlineReminderSent(
                $user,
                'subsoil_task_due_soon',
                subsoilTaskId: $task->id
            )) {
                continue;
            }

            $daysLeft = today()->diffInDays($task->due_date);
            $recordName = $task->subsoilUser?->name
                ?? 'Белгісіз жер қойнауын пайдаланушы';

            TaskNotification::create([
                'user_id' => $user->id,
                'subsoil_task_id' => $task->id,
                'type' => 'subsoil_task_due_soon',
                'message' => "«{$task->title}» тапсырмасының мерзімі жақындап қалды. {$daysLeft} күн қалды. Нысан: {$recordName}.",
                'action_label' => 'Тапсырмаға өту',
            ]);

            $count++;
        }

        return $count;
    }

    private function wasDeadlineReminderSent(
        User $user,
        string $type,
        ?int $taskId = null,
        ?int $subsoilTaskId = null,
    ): bool {
        return TaskNotification::query()
            ->where('user_id', $user->id)
            ->where('type', $type)
            ->when(
                $taskId,
                fn ($query) => $query->where('task_id', $taskId)
            )
            ->when(
                $subsoilTaskId,
                fn ($query) => $query->where(
                    'subsoil_task_id',
                    $subsoilTaskId
                )
            )
            ->whereDate('created_at', today())
            ->exists();
    }

    /**
     * @return array{message: string, url: string, label: string}
     */
    private function suggestionFor(string $role): array
    {
        return match ($role) {
            'superadmin' => [
                'message' => 'Бүгін жүйедегі негізгі көрсеткіштер мен назар аударуды қажет ететін жобаларды шолуды ұсынамын.',
                'url' => route('dashboard', absolute: false),
                'label' => 'Басқару тақтасын ашу',
            ],
            'invest' => [
                'message' => 'Кураторлық жобалардағы жаңа тапсырмалар мен белсенді мәселелерді тексеріп шығыңыз.',
                'url' => route('investment-projects.index', absolute: false),
                'label' => 'Жобаларды ашу',
            ],
            'akim', 'zamakim' => [
                'message' => 'Өңір жобаларының ағымдағы жағдайын және мерзімі жақындаған жұмыстарды шолуды ұсынамын.',
                'url' => route('dashboard', absolute: false),
                'label' => 'Өңір шолуын ашу',
            ],
            'ispolnitel' => [
                'message' => 'Бүгін өзіңізге бекітілген жобалар мен орындалмаған тапсырмаларды тексеріп шығыңыз.',
                'url' => route('investment-projects.index', absolute: false),
                'label' => 'Менің жобаларымды ашу',
            ],
            'moderator' => [
                'message' => 'Растауды немесе тексеруді күтіп тұрған жоба тапсырмаларын қарап шығуды ұсынамын.',
                'url' => route('investment-projects.index', absolute: false),
                'label' => 'Тексеруге өту',
            ],
            'prokuror' => [
                'message' => 'Жобалар мен белсенді мәселелер бойынша күнделікті шолуды қарап шығыңыз.',
                'url' => route('dashboard', absolute: false),
                'label' => 'Шолуды ашу',
            ],
            'investor' => [
                'message' => 'Жобаңыздың ағымдағы күйін, құжаттарын және соңғы тапсырмаларын тексеріп шығыңыз.',
                'url' => route('investment-projects.index', absolute: false),
                'label' => 'Менің жобамды ашу',
            ],
            default => [
                'message' => 'Бүгінгі жұмыс бойынша жаңа хабарламаларды қарап шығыңыз.',
                'url' => route('notifications.index', absolute: false),
                'label' => 'Хабарламаларды ашу',
            ],
        };
    }
}
