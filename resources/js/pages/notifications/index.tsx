import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Bell,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    ImageIcon,
    ArrowLeft,
    Eye,
    Download,
    Flag,
    X,
} from 'lucide-react';

import type { PaginatedData } from '@/types/pagination';

interface CompletionFile {
    id: number;
    file_path: string;
    file_name: string;
    type: 'document' | 'photo';
}

interface Completion {
    id: number;
    task_id: number;
    submitted_by: number;
    comment?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewer_comment?: string;
    reviewed_by?: number;
    reviewed_at?: string;
    created_at: string;
    submitter?: { id: number; full_name?: string };
    reviewer?: { id: number; full_name?: string };
    files: CompletionFile[];
}

interface Task {
    id: number;
    title: string;
    description?: string;
    status: string;
    project?: {
        id: number;
        name: string;
    };
    assignee?: {
        id: number;
        full_name?: string;
    };
}

interface NotificationItem {
    id: number;
    user_id: number;
    task_id: number;
    completion_id?: number;
    type: string;
    message: string;
    is_read: boolean;
    created_at: string;
    task?: Task;
    completion?: Completion;
}

interface Props {
    notifications: PaginatedData<NotificationItem>;
}

export default function NotificationsIndex({ notifications }: Props) {
    const [viewCompletion, setViewCompletion] =
        useState<Completion | null>(null);
    const [viewTask, setViewTask] = useState<Task | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);

    const typeConfig: Record<
        string,
        { label: string; icon: React.ElementType; color: string }
    > = {
        task_assigned: {
            label: 'Жаңа тапсырма',
            icon: Flag,
            color: 'bg-blue-100 text-blue-700',
        },
        completion_submitted: {
            label: 'Орындалғаны жіберілді',
            icon: Clock,
            color: 'bg-amber-100 text-amber-700',
        },
        completion_approved: {
            label: 'Қабылданды',
            icon: CheckCircle2,
            color: 'bg-green-100 text-green-700',
        },
        completion_rejected: {
            label: 'Қабылданбады',
            icon: XCircle,
            color: 'bg-red-100 text-red-700',
        },
    };

    const handleMarkAsRead = (id: number) => {
        router.put(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };

    const handleMarkAllRead = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    const handleViewCompletion = (
        notification: NotificationItem,
    ) => {
        if (!notification.is_read) {
            handleMarkAsRead(notification.id);
        }
        if (notification.completion) {
            setViewCompletion(notification.completion);
            setViewTask(notification.task || null);
            setReviewComment('');
        }
    };

    const handleReview = (
        status: 'approved' | 'rejected',
    ) => {
        if (!viewCompletion || !viewTask) return;
        setIsReviewing(true);
        router.put(
            `/investment-projects/${viewTask.project?.id}/tasks/${viewTask.id}/completions/${viewCompletion.id}/review`,
            {
                status,
                reviewer_comment: reviewComment || null,
            },
            {
                onSuccess: () => {
                    setViewCompletion(null);
                    setViewTask(null);
                    setReviewComment('');
                    setIsReviewing(false);
                },
                onError: () => setIsReviewing(false),
            },
        );
    };

    const unreadCount = notifications.data.filter(
        (n) => !n.is_read,
    ).length;

    return (
        <AppLayout
            breadcrumbs={[{ title: 'Уведомления', href: '/notifications' }]}
        >
            <Head title="Уведомления" />

            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="h-6 w-6 text-gray-700" />
                        <h1 className="text-2xl font-bold text-gray-900">
                            Уведомления
                        </h1>
                        {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white">
                                {unreadCount} жаңа
                            </Badge>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllRead}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Барлығын оқылды деп белгілеу
                        </Button>
                    )}
                </div>

                {notifications.data.length === 0 ? (
                    <Card className="shadow-none">
                        <CardContent className="py-16 text-center">
                            <Bell className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                            <p className="text-gray-500">
                                Уведомления жоқ
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {notifications.data.map((notification) => {
                            const config =
                                typeConfig[notification.type] ||
                                typeConfig.task_assigned;
                            const IconComponent = config.icon;

                            return (
                                <Card
                                    key={notification.id}
                                    className={`cursor-pointer shadow-none transition-colors hover:bg-gray-50 ${
                                        !notification.is_read
                                            ? 'border-l-4 border-l-blue-500 bg-blue-50/30'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        if (
                                            notification.type ===
                                                'completion_submitted' ||
                                            notification.type ===
                                                'completion_approved' ||
                                            notification.type ===
                                                'completion_rejected'
                                        ) {
                                            handleViewCompletion(notification);
                                        } else if (
                                            notification.type ===
                                            'task_assigned'
                                        ) {
                                            if (!notification.is_read) {
                                                handleMarkAsRead(
                                                    notification.id,
                                                );
                                            }
                                            if (notification.task?.project) {
                                                router.visit(
                                                    `/investment-projects/${notification.task.project.id}`,
                                                );
                                            }
                                        }
                                    }}
                                >
                                    <CardContent className="flex items-start gap-4 p-4">
                                        <div
                                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.color}`}
                                        >
                                            <IconComponent className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center gap-2">
                                                <Badge
                                                    className={`${config.color} border-0 text-xs`}
                                                >
                                                    {config.label}
                                                </Badge>
                                                {!notification.is_read && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {notification.message}
                                            </p>
                                            {notification.task?.project && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Жоба:{' '}
                                                    {
                                                        notification.task
                                                            .project.name
                                                    }
                                                </p>
                                            )}
                                            <p className="mt-1 text-xs text-gray-400">
                                                {new Date(
                                                    notification.created_at,
                                                ).toLocaleString('kk-KZ')}
                                            </p>
                                        </div>
                                        {notification.completion &&
                                            notification.type ===
                                                'completion_submitted' && (
                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <Eye className="h-4 w-4" />
                                                    Тексеру
                                                </div>
                                            )}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {/* Pagination */}
                        {notifications.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                {notifications.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={
                                            link.active
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() =>
                                            link.url &&
                                            router.visit(link.url)
                                        }
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Review Completion Modal */}
                {viewCompletion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="mx-4 w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
                            <div className="flex items-center justify-between bg-gray-900 px-6 py-4">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                    <Eye className="h-5 w-5" />
                                    Тапсырманы тексеру
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setViewCompletion(null);
                                        setViewTask(null);
                                    }}
                                    className="text-white/80 transition-colors hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
                                {/* Task info */}
                                {viewTask && (
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Тапсырма
                                        </p>
                                        <p className="mt-1 font-semibold text-gray-900">
                                            {viewTask.title}
                                        </p>
                                        {viewTask.description && (
                                            <p className="mt-1 text-sm text-gray-600">
                                                {viewTask.description}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Who submitted */}
                                <div className="rounded-lg border border-gray-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                        Жіберген
                                    </p>
                                    <p className="mt-1 font-medium text-gray-900">
                                        {viewCompletion.submitter
                                            ?.full_name || '—'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(
                                            viewCompletion.created_at,
                                        ).toLocaleString('kk-KZ')}
                                    </p>
                                </div>

                                {/* Comment */}
                                {viewCompletion.comment && (
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Комментарий
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                                            {viewCompletion.comment}
                                        </p>
                                    </div>
                                )}

                                {/* Files */}
                                {viewCompletion.files &&
                                    viewCompletion.files.length > 0 && (
                                        <div>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                Файлдар
                                            </p>
                                            <div className="space-y-2">
                                                {viewCompletion.files.map(
                                                    (file) => (
                                                        <div
                                                            key={file.id}
                                                            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                                                        >
                                                            {file.type ===
                                                            'photo' ? (
                                                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                                                                    <img
                                                                        src={`/storage/${file.file_path}`}
                                                                        alt={
                                                                            file.file_name
                                                                        }
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                                                    <FileText className="h-5 w-5 text-gray-500" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-medium text-gray-900">
                                                                    {
                                                                        file.file_name
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-gray-400">
                                                                    {file.type ===
                                                                    'photo'
                                                                        ? 'Сурет'
                                                                        : 'Құжат'}
                                                                </p>
                                                            </div>
                                                            <a
                                                                href={`/storage/${file.file_path}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-blue-600 hover:text-blue-800"
                                                                onClick={(
                                                                    e,
                                                                ) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Status badge if already reviewed */}
                                {viewCompletion.status !== 'pending' && (
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Нәтиже
                                        </p>
                                        <Badge
                                            className={`mt-1 ${
                                                viewCompletion.status ===
                                                'approved'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                            } border-0`}
                                        >
                                            {viewCompletion.status ===
                                            'approved'
                                                ? 'Қабылданды'
                                                : 'Қабылданбады'}
                                        </Badge>
                                        {viewCompletion.reviewer_comment && (
                                            <p className="mt-2 text-sm text-gray-600">
                                                {
                                                    viewCompletion.reviewer_comment
                                                }
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Navigate to project to resubmit (for baskarma seeing rejection) */}
                                {viewCompletion.status !== 'pending' && viewTask?.project && (
                                    <div className="flex justify-center border-t border-gray-200 pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setViewCompletion(null);
                                                setViewTask(null);
                                                router.visit(`/investment-projects/${viewTask.project!.id}`);
                                            }}
                                        >
                                            <Flag className="mr-2 h-4 w-4" />
                                            Жобаға өту
                                        </Button>
                                    </div>
                                )}

                                {/* Review form (only for pending) */}
                                {viewCompletion.status === 'pending' && (
                                    <div className="space-y-4 border-t border-gray-200 pt-4">
                                        <div>
                                            <label className="text-sm font-semibold text-gray-900">
                                                Комментарий
                                            </label>
                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) =>
                                                    setReviewComment(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Комментарий жазыңыз..."
                                                className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            <Button
                                                onClick={() =>
                                                    handleReview(
                                                        'approved',
                                                    )
                                                }
                                                className="bg-emerald-500 hover:bg-emerald-600"
                                                disabled={isReviewing}
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Иә
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    handleReview(
                                                        'rejected',
                                                    )
                                                }
                                                className="bg-red-500 hover:bg-red-600"
                                                disabled={isReviewing}
                                            >
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Нет
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
