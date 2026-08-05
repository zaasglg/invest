import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Bell,
    BellRing,
    CalendarClock,
    CheckCircle2,
    Clock3,
    Inbox,
    ListChecks,
    Sparkles,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import {
    index as notificationsIndex,
    open as openNotification,
    readAll as readAllNotifications,
} from '@/routes/notifications';
import type { PaginatedData } from '@/types/pagination';

type RelatedTask = {
    id: number;
    title: string;
    project?: {
        id: number;
        name: string;
    };
};

type RelatedSubsoilTask = {
    id: number;
    title: string;
    subsoil_user?: {
        id: number;
        name: string;
    };
};

type NotificationItem = {
    id: number;
    type: string;
    message: string;
    is_read: boolean;
    is_assistant: boolean;
    created_at: string;
    action_label?: string | null;
    destination_url: string;
    task?: RelatedTask;
    subsoil_task?: RelatedSubsoilTask;
    completion?: { task?: RelatedTask };
    subsoil_completion?: { task?: RelatedSubsoilTask };
};

type NotificationSummary = {
    total: number;
    unread: number;
    assistant: number;
};

type Props = {
    notifications: PaginatedData<NotificationItem>;
    notificationSummary: NotificationSummary;
    filter: 'all' | 'unread' | 'assistant' | 'tasks';
};

type TypeConfig = {
    label: string;
    icon: LucideIcon;
    iconClassName: string;
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
    assistant_suggestion: {
        label: 'Көмекші ұсынысы',
        icon: Sparkles,
        iconClassName: 'bg-violet-100 text-violet-700',
    },
    task_due_soon: {
        label: 'Мерзімі жақындады',
        icon: CalendarClock,
        iconClassName: 'bg-amber-100 text-amber-700',
    },
    subsoil_task_due_soon: {
        label: 'Мерзімі жақындады',
        icon: CalendarClock,
        iconClassName: 'bg-amber-100 text-amber-700',
    },
    task_overdue: {
        label: 'Мерзімі өтті',
        icon: CalendarClock,
        iconClassName: 'bg-rose-100 text-rose-700',
    },
    task_assigned: {
        label: 'Жаңа тапсырма',
        icon: ListChecks,
        iconClassName: 'bg-sky-100 text-sky-700',
    },
    completion_submitted: {
        label: 'Орындау жіберілді',
        icon: Clock3,
        iconClassName: 'bg-amber-100 text-amber-700',
    },
    completion_approved: {
        label: 'Қабылданды',
        icon: CheckCircle2,
        iconClassName: 'bg-emerald-100 text-emerald-700',
    },
    completion_rejected: {
        label: 'Қабылданбады',
        icon: XCircle,
        iconClassName: 'bg-rose-100 text-rose-700',
    },
    task_pending_approval: {
        label: 'Растауды күтуде',
        icon: Clock3,
        iconClassName: 'bg-amber-100 text-amber-700',
    },
    task_approved: {
        label: 'Тапсырма расталды',
        icon: CheckCircle2,
        iconClassName: 'bg-emerald-100 text-emerald-700',
    },
    task_rejected: {
        label: 'Тапсырма қабылданбады',
        icon: XCircle,
        iconClassName: 'bg-rose-100 text-rose-700',
    },
};

const DEFAULT_TYPE_CONFIG: TypeConfig = {
    label: 'Хабарлама',
    icon: BellRing,
    iconClassName: 'bg-slate-100 text-slate-700',
};

const FILTERS = [
    { value: 'all', label: 'Барлығы' },
    { value: 'unread', label: 'Оқылмаған' },
    { value: 'assistant', label: 'Көмекші' },
    { value: 'tasks', label: 'Тапсырмалар' },
] as const;

function contextLabel(notification: NotificationItem): string | null {
    const project =
        notification.task?.project ?? notification.completion?.task?.project;
    if (project) return `Жоба: ${project.name}`;

    const subsoilUser =
        notification.subsoil_task?.subsoil_user ??
        notification.subsoil_completion?.task?.subsoil_user;
    if (subsoilUser) {
        return `Жер қойнауын пайдаланушы: ${subsoilUser.name}`;
    }

    return null;
}

export default function NotificationsIndex({
    notifications,
    notificationSummary,
    filter,
}: Props) {
    const lastUnreadCount = useRef(notificationSummary.unread);

    useEffect(() => {
        lastUnreadCount.current = notificationSummary.unread;
    }, [notificationSummary.unread]);

    useEffect(() => {
        const handleCounts = (event: Event) => {
            const counts = (
                event as CustomEvent<{
                    count: number;
                    assistant_count: number;
                }>
            ).detail;

            if (counts.count === lastUnreadCount.current) return;

            lastUnreadCount.current = counts.count;
            router.reload({
                only: [
                    'notifications',
                    'notificationSummary',
                    'unreadNotificationsCount',
                    'unreadAssistantNotificationsCount',
                ],
            });
        };

        window.addEventListener('notification-counts-updated', handleCounts);

        return () =>
            window.removeEventListener(
                'notification-counts-updated',
                handleCounts,
            );
    }, []);

    const handleMarkAllRead = () => {
        router.post(readAllNotifications.url(), {}, { preserveScroll: true });
    };

    const handleOpen = (notification: NotificationItem) => {
        router.post(openNotification.url(notification.id));
    };

    return (
        <AppLayout
            breadcrumbs={[{ title: 'Хабарламалар', href: '/notifications' }]}
        >
            <Head title="Хабарламалар" />

            <div className="page-surface flex max-w-6xl flex-1 flex-col gap-6">
                <section className="relative overflow-hidden rounded-2xl bg-[#0f1b3d] px-5 py-6 text-white shadow-lg sm:px-7 sm:py-7">
                    <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[#c8a44e]/15 blur-2xl" />
                    <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-sky-400/10 blur-2xl" />

                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#e4c878] ring-1 ring-white/10">
                                <Bell className="h-6 w-6" />
                            </span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-2xl font-extrabold sm:text-3xl">
                                        Хабарламалар
                                    </h1>
                                    {notificationSummary.unread > 0 && (
                                        <Badge className="border-0 bg-rose-500 text-white">
                                            {notificationSummary.unread} жаңа
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-white/60">
                                    Тапсырмалар, тексерулер және көмекші
                                    ұсыныстары бір жерде
                                </p>
                            </div>
                        </div>

                        {notificationSummary.unread > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="border-white/20 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white"
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Барлығын оқу
                            </Button>
                        )}
                    </div>

                    <div className="relative mt-6 grid grid-cols-3 gap-2.5 sm:max-w-xl sm:gap-3">
                        {[
                            {
                                label: 'Барлығы',
                                value: notificationSummary.total,
                            },
                            {
                                label: 'Оқылмаған',
                                value: notificationSummary.unread,
                            },
                            {
                                label: 'Көмекші',
                                value: notificationSummary.assistant,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm sm:px-4"
                            >
                                <p className="text-xl font-bold text-[#e4c878]">
                                    {item.value}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-white/55 sm:text-xs">
                                    {item.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                    {FILTERS.map((item) => (
                        <Link
                            key={item.value}
                            href={
                                notificationsIndex({
                                    query:
                                        item.value === 'all'
                                            ? {}
                                            : { filter: item.value },
                                }).url
                            }
                            preserveScroll
                            className={cn(
                                'shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                                filter === item.value
                                    ? 'bg-[#0f1b3d] text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {notifications.data.length === 0 ? (
                    <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
                        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Inbox className="h-7 w-7" />
                        </span>
                        <p className="font-semibold text-[#0f1b3d]">
                            Бұл санатта хабарлама жоқ
                        </p>
                        <p className="mt-1 max-w-sm text-sm text-slate-500">
                            Жаңа хабарлама түскенде ол refresh жасамай-ақ осы
                            бетте пайда болады.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.data.map((notification) => {
                            const config =
                                TYPE_CONFIG[notification.type] ??
                                DEFAULT_TYPE_CONFIG;
                            const Icon = config.icon;
                            const context = contextLabel(notification);

                            return (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => handleOpen(notification)}
                                    className={cn(
                                        'group relative w-full overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#c8a44e]/50 hover:shadow-md sm:p-5',
                                        notification.is_read
                                            ? 'border-slate-200'
                                            : 'border-[#c8a44e]/40 bg-[#fffdf8]',
                                    )}
                                >
                                    {!notification.is_read && (
                                        <span className="absolute inset-y-0 left-0 w-1 bg-[#c8a44e]" />
                                    )}
                                    <span className="flex items-start gap-3.5 sm:gap-4">
                                        <span
                                            className={cn(
                                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                                                config.iconClassName,
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className="border-0 bg-slate-100 text-[11px] text-slate-600"
                                                >
                                                    {config.label}
                                                </Badge>
                                                {notification.is_assistant && (
                                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-600">
                                                        <Sparkles className="h-3 w-3" />
                                                        Іс-қимыл көмекшісі
                                                    </span>
                                                )}
                                                {!notification.is_read && (
                                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                                )}
                                            </span>

                                            <span className="mt-2 block text-sm leading-6 font-medium whitespace-pre-line text-[#0f1b3d] sm:text-[15px]">
                                                {notification.message}
                                            </span>

                                            <span className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
                                                    {context && (
                                                        <span className="font-medium text-slate-500">
                                                            {context}
                                                        </span>
                                                    )}
                                                    <time>
                                                        {new Date(
                                                            notification.created_at,
                                                        ).toLocaleString(
                                                            'kk-KZ',
                                                            {
                                                                day: '2-digit',
                                                                month: 'long',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            },
                                                        )}
                                                    </time>
                                                </span>
                                                <span className="flex items-center gap-1.5 self-end font-semibold text-[#9a7624] sm:self-auto">
                                                    {notification.action_label ??
                                                        'Толығырақ ашу'}
                                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                </span>
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            );
                        })}

                        <Pagination paginator={notifications} preserveScroll />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
