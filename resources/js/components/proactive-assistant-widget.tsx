import { router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    CalendarClock,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AssistantPanel } from '@/components/assistant-panel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
    index as assistantNotificationsIndex,
    readAll as readAllAssistantNotifications,
} from '@/routes/assistant/notifications';
import { open as openNotification } from '@/routes/notifications';
import type { SharedData } from '@/types';

type AssistantNotification = {
    id: number;
    type: string;
    message: string;
    is_read: boolean;
    created_at: string;
    destination_url: string;
    action_label: string;
};

type NotificationCounts = {
    count: number;
    assistant_count: number;
};

type ProactiveAssistantWidgetProps = {
    isOpen: boolean;
    onBack: () => void;
    onClose: () => void;
    onCloseAutoFocus: (event: Event) => void;
};

export function ProactiveAssistantWidget({
    isOpen,
    onBack,
    onClose,
    onCloseAutoFocus,
}: ProactiveAssistantWidgetProps) {
    const page = usePage<SharedData>();
    const [isLoading, setIsLoading] = useState(false);
    const [notifications, setNotifications] = useState<AssistantNotification[]>(
        [],
    );

    useEffect(() => {
        if (!isOpen) return;

        const controller = new AbortController();
        let isRefreshing = false;

        const refreshNotifications = async () => {
            if (isRefreshing || controller.signal.aborted) return;

            isRefreshing = true;
            setIsLoading(true);

            try {
                const response = await fetch(
                    assistantNotificationsIndex.url(),
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        signal: controller.signal,
                    },
                );

                if (!response.ok) return;

                const data = (await response.json()) as {
                    notifications: AssistantNotification[];
                };

                if (controller.signal.aborted) return;

                setNotifications(data.notifications);

                const readResponse = await fetch(
                    readAllAssistantNotifications.url(),
                    {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': String(page.props.csrf_token ?? ''),
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        signal: controller.signal,
                    },
                );

                if (!readResponse.ok) return;

                const counts =
                    (await readResponse.json()) as NotificationCounts;

                if (controller.signal.aborted) return;

                setNotifications((current) =>
                    current.map((notification) => ({
                        ...notification,
                        is_read: true,
                    })),
                );
                window.dispatchEvent(
                    new CustomEvent('notification-counts-updated', {
                        detail: counts,
                    }),
                );
            } catch {
                // Preserve cached notifications; polling retries while open.
            } finally {
                isRefreshing = false;

                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        const handleCounts = (event: Event) => {
            const counts = (event as CustomEvent<NotificationCounts>).detail;

            if (counts.assistant_count > 0) {
                void refreshNotifications();
            }
        };

        window.addEventListener('notification-counts-updated', handleCounts);
        void refreshNotifications();

        return () => {
            controller.abort();
            window.removeEventListener(
                'notification-counts-updated',
                handleCounts,
            );
        };
    }, [isOpen, page.props.csrf_token]);

    const handleNotificationOpen = (notificationId: number) => {
        onClose();
        router.post(openNotification.url(notificationId));
    };

    if (!isOpen) return null;

    return (
        <AssistantPanel
            title="Іс-қимыл көмекшісі"
            description="Ұсыныстар мен мерзім ескертулері"
            icon={Sparkles}
            onBack={onBack}
            onCloseAutoFocus={onCloseAutoFocus}
            className="h-[min(560px,var(--assistant-panel-max-height))]"
        >
            <div className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                    <div className="space-y-3 p-4">
                        {isLoading && notifications.length === 0 ? (
                            <div className="space-y-3">
                                {[0, 1, 2].map((item) => (
                                    <div
                                        key={item}
                                        className="h-24 animate-pulse rounded-xl bg-slate-100"
                                    />
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                                <CheckCircle2 className="mb-3 h-11 w-11 text-emerald-500" />
                                <p className="font-semibold text-[#0f1b3d]">
                                    Әзірге жаңа ұсыныс жоқ
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Көмекші маңызды өзгеріс болғанда өзі
                                    хабарлайды.
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const isDeadline =
                                    notification.type.includes('due') ||
                                    notification.type === 'task_overdue';
                                const Icon = isDeadline
                                    ? CalendarClock
                                    : BellRing;

                                return (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() =>
                                            handleNotificationOpen(
                                                notification.id,
                                            )
                                        }
                                        className={cn(
                                            'group w-full rounded-xl border p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#c8a44e]/60 hover:shadow-md',
                                            notification.is_read
                                                ? 'border-slate-200 bg-white'
                                                : 'border-[#c8a44e]/40 bg-[#fffaf0]',
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={cn(
                                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                                    isDeadline
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-sky-100 text-sky-700',
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm leading-5 font-medium text-slate-800">
                                                    {notification.message}
                                                </span>
                                                <span className="mt-2 flex items-center justify-between gap-3 text-xs">
                                                    <span className="text-slate-400">
                                                        {new Date(
                                                            notification.created_at,
                                                        ).toLocaleString(
                                                            'kk-KZ',
                                                            {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            },
                                                        )}
                                                    </span>
                                                    <span className="flex items-center gap-1 font-semibold text-[#9a7624]">
                                                        {
                                                            notification.action_label
                                                        }
                                                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                                    </span>
                                                </span>
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>
        </AssistantPanel>
    );
}
