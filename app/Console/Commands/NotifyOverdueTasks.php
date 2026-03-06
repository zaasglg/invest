<?php

namespace App\Console\Commands;

use App\Models\ProjectTask;
use App\Models\TaskNotification;
use Illuminate\Console\Command;

class NotifyOverdueTasks extends Command
{
    protected $signature = 'tasks:notify-overdue';

    protected $description = 'Мерзімі өткен тапсырмаларға тағайындалған пайдаланушыларға хабарлама жіберу (сайт + Telegram)';

    public function handle(): int
    {
        $overdueTasks = ProjectTask::with(['project', 'assignee'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->startOfDay())
            ->whereNotIn('status', ['done'])
            ->get();

        if ($overdueTasks->isEmpty()) {
            $this->info('Мерзімі өткен тапсырмалар жоқ.');

            return self::SUCCESS;
        }

        $notifiedCount = 0;

        foreach ($overdueTasks as $task) {
            if (! $task->assigned_to) {
                continue;
            }

            // Check if we already sent an overdue notification today for this task
            $alreadyNotifiedToday = TaskNotification::where('task_id', $task->id)
                ->where('user_id', $task->assigned_to)
                ->where('type', 'task_overdue')
                ->whereDate('created_at', now()->toDateString())
                ->exists();

            if ($alreadyNotifiedToday) {
                continue;
            }

            $projectName = $task->project?->name ?? 'Белгісіз жоба';
            $dueDate = $task->due_date->format('d.m.Y');
            $daysOverdue = (int) now()->startOfDay()->diffInDays($task->due_date);

            $message = "Тапсырманың орындалу мерзімі өтті!\n"
                . "Жоба: {$projectName}\n"
                . "Тапсырма: {$task->title}\n"
                . "Мерзім: {$dueDate}\n"
                . "Кешігу: {$daysOverdue} күн";

            // Creating the notification triggers the TaskNotificationObserver
            // which also sends a Telegram message automatically
            TaskNotification::create([
                'user_id' => $task->assigned_to,
                'task_id' => $task->id,
                'type' => 'task_overdue',
                'message' => $message,
            ]);

            $notifiedCount++;
        }

        $this->info("Хабарламалар жіберілді: {$notifiedCount} тапсырма.");

        return self::SUCCESS;
    }
}
