<?php

namespace App\Observers;

use App\Models\TaskNotification;
use App\Services\TelegramNotificationDeliveryService;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

class TaskNotificationObserver implements ShouldHandleEventsAfterCommit
{
    public function created(TaskNotification $notification): void
    {
        app(TelegramNotificationDeliveryService::class)->enqueue($notification);
    }
}
