import { router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    CalendarClock,
    CheckCircle2,
    Sparkles,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function ProactiveAssistantWidget() {
    const page = usePage<SharedData>();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notifications, setNotifications] = useState<AssistantNotification[]>(
        [],
    );
    const [unreadCount, setUnreadCount] = useState(
        page.props.unreadAssistantNotificationsCount,
    );

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await fetch(assistantNotificationsIndex.url(), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) return;

            const data = (await response.json()) as {
                notifications: AssistantNotification[];
            };
            setNotifications(data.notifications);
        } catch {
            // Keep the last loaded messages when the connection is unavailable.
        } finally {
            setIsLoading(false);
        }
    }, []);

    const markAssistantNotificationsAsRead = useCallback(async () => {
        try {
            const response = await fetch(readAllAssistantNotifications.url(), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': String(page.props.csrf_token ?? ''),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) return;

            const counts = (await response.json()) as NotificationCounts;
            setUnreadCount(counts.assistant_count);
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
            // The next polling cycle will try again.
        }
    }, [page.props.csrf_token]);

    useEffect(() => {
        setUnreadCount(page.props.unreadAssistantNotificationsCount);
    }, [page.props.unreadAssistantNotificationsCount]);

    useEffect(() => {
        const handleCounts = (event: Event) => {
            const counts = (event as CustomEvent<NotificationCounts>).detail;
            setUnreadCount(counts.assistant_count);

            if (isOpen && counts.assistant_count > 0) {
                void loadNotifications().then(() =>
                    markAssistantNotificationsAsRead(),
                );
            }
        };
        const closeForChat = () => setIsOpen(false);

        window.addEventListener('notification-counts-updated', handleCounts);
        window.addEventListener('chat-widget-opened', closeForChat);

        return () => {
            window.removeEventListener(
                'notification-counts-updated',
                handleCounts,
            );
            window.removeEventListener('chat-widget-opened', closeForChat);
        };
    }, [isOpen, loadNotifications, markAssistantNotificationsAsRead]);

    const handleOpen = () => {
        window.dispatchEvent(new CustomEvent('assistant-widget-opened'));
        setIsOpen(true);
        void loadNotifications().then(() => markAssistantNotificationsAsRead());
    };

    const handleNotificationOpen = (notificationId: number) => {
        setIsOpen(false);
        router.post(openNotification.url(notificationId));
    };

    return (
        <>
            {!isOpen && (
                <Button
                    type="button"
                    size="icon"
                    aria-label="Іс-қимыл көмекшісін ашу"
                    onClick={handleOpen}
                    className="group fixed bottom-20 left-4 z-[1000] h-14 w-14 rounded-full border border-sky-300/50 bg-white p-0 text-[#0f1b3d] shadow-[0_14px_35px_rgba(15,27,61,0.2)] transition-all hover:-translate-y-0.5 hover:border-[#c8a44e] hover:bg-[#fffdf7] sm:bottom-24 sm:left-6"
                >
                    <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f5e8bd] to-[#c8a44e] shadow-inner">
                        <Sparkles className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-500" />
                            </span>
                        )}
                    </span>
                </Button>
            )}

            {isOpen && (
                <Card className="fixed bottom-20 left-3 z-[1001] flex h-[min(560px,calc(100dvh-6rem))] w-[calc(100vw-1.5rem)] flex-col overflow-hidden border-[#c8a44e]/30 shadow-2xl sm:bottom-24 sm:left-6 sm:w-[390px]">
                    <CardHeader className="border-b bg-[#0f1b3d] px-5 py-4 text-white">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c8a44e]/20 text-[#e4c878]">
                                    <Sparkles className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <CardTitle className="text-base">
                                        Іс-қимыл көмекшісі
                                    </CardTitle>
                                    <p className="mt-0.5 text-xs text-white/60">
                                        Ұсыныстар мен мерзім ескертулері
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8 shrink-0 text-white/70 hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="min-h-0 flex-1 p-0">
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
                                            notification.type ===
                                                'task_overdue';
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
                                                            {
                                                                notification.message
                                                            }
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
                    </CardContent>
                </Card>
            )}
        </>
    );
}
