<?php

namespace App\Console\Commands;

use App\Models\ProjectTask;
use App\Models\TaskNotification;
use Illuminate\Console\Command;

class NotifyOverdueTasks extends Command
{
    protected $signature = 'tasks:notify-overdue';

    protected $description = 'Отправка сообщений пользователям, назначенным по просроченным заданиям (сайт + Telegram)';

    public function handle(): int
    {
        $overdueTasks = ProjectTask::with(['project', 'assignee'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->startOfDay())
            ->whereNotIn('status', ['done'])
            ->get();

        if ($overdueTasks->isEmpty()) {
            $this->info('Просроченные задания отсутствуют.');

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

            $projectName = $task->project?->name ?? 'Неизвестный проект';
            $dueDate = $task->due_date->format('d.m.Y');
            $daysOverdue = (int) now()->startOfDay()->diffInDays($task->due_date);

            $message = "Срок выполнения задачи истек!\n"
                . "Проект: {$projectName}\n"
                . "Задача: {$task->title}\n"
                . "Срок: {$dueDate}\n"
                . "Просрочка: {$daysOverdue} дней";

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

        $this->info("Сообщения отправлены: {$notifiedCount} задач.");

        return self::SUCCESS;
    }
}
