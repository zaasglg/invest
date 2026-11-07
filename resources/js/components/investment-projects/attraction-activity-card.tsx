import { useForm, usePage } from '@inertiajs/react';
import { Content as DialogPrimitiveContent } from '@radix-ui/react-dialog';
import {
    CheckCircle2,
    Edit,
    Eye,
    Flag,
    Plus,
    Search,
    Trash2,
    Upload,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps, FormEvent, ReactNode } from 'react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    ATTRACTION_ACTIVITY_STATUSES,
    attractionActivityStatusLabel,
    isAttractionActivityOverdue,
} from '@/lib/attraction-activity';
import type { AttractionActivityStatus } from '@/lib/attraction-activity';
import { cn } from '@/lib/utils';
import * as activityRoutes from '@/routes/investment-projects/attraction-activities';

export interface AttractionActivityEvent {
    id: string | number;
    type: string;
    label: string;
    actor_name: string;
    created_at: string;
    comment?: string | null;
}

export interface AttractionActivity {
    id: number;
    attraction_stage: string;
    event_name: string | null;
    event_date: string | null;
    result: string | null;
    next_action: string;
    description?: string | null;
    next_action_due_date: string;
    responsible_id: number | null;
    responsible?: {
        id: number;
        full_name: string;
        position?: string | null;
    } | null;
    creator?: { id: number; full_name: string } | null;
    created_at: string;
    status?: AttractionActivityStatus;
    report_result?: string | null;
    reported_at?: string | null;
    reviewed_at?: string | null;
    reviewer_comment?: string | null;
    reporter?: { id: number; full_name: string } | null;
    reviewer?: { id: number; full_name: string } | null;
    can_report?: boolean;
    can_review?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    can_mark_viewed?: boolean;
    viewed_at?: string | null;
    events?: AttractionActivityEvent[];
}

interface Props {
    projectId: number;
    activities: AttractionActivity[];
    canManage: boolean;
    historical?: boolean;
    users: { id: number; full_name: string; position?: string | null }[];
}

const STATUS_BADGE_CLASSES: Record<AttractionActivityStatus, string> = {
    planned: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-amber-100 text-amber-700',
    pending_review: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const TEXTAREA_CLASSES =
    'min-h-0 rounded-md border-gray-200 px-3 py-2 shadow-none focus-visible:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400';

function ActivityDialogContent({
    className,
    children,
    ...props
}: ComponentProps<typeof DialogPrimitiveContent>) {
    return (
        <DialogPortal>
            <DialogOverlay className="bg-black/50" />
            <DialogPrimitiveContent
                className={cn(
                    'fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-w-lg',
                    className,
                )}
                {...props}
            >
                {children}
                <DialogClose className="absolute top-4 right-6 rounded-sm text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Жабу</span>
                </DialogClose>
            </DialogPrimitiveContent>
        </DialogPortal>
    );
}

function dateLabel(value: string | null): string {
    if (!value) return 'Көрсетілмеген';
    if (value.includes('T')) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Көрсетілмеген';
        const parts = new Intl.DateTimeFormat('kk-KZ', {
            timeZone: 'Asia/Qyzylorda',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).formatToParts(date);
        const part = (type: string) =>
            parts.find((item) => item.type === type)?.value;
        return `${part('day')}.${part('month')}.${part('year')}`;
    }
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}.${month}.${year}`;
}

function ActivityDetailField({
    label,
    className,
    children,
}: {
    label: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('rounded-lg border border-gray-200 p-3', className)}>
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                {label}
            </p>
            <div className="mt-1 min-w-0 font-medium break-words wrap-anywhere whitespace-pre-wrap text-[#0f1b3d]">
                {children}
            </div>
        </div>
    );
}

function eventDateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Көрсетілмеген';
    const parts = new Intl.DateTimeFormat('kk-KZ', {
        timeZone: 'Asia/Qyzylorda',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const part = (type: string) =>
        parts.find((item) => item.type === type)?.value;
    return `${part('day')}.${part('month')}.${part('year')}, ${part('hour')}:${part('minute')}`;
}

function ActivityTimeline({ events }: { events: AttractionActivityEvent[] }) {
    const dotColors: Record<string, string> = {
        'attraction.created': 'bg-blue-500',
        'attraction.updated': 'bg-amber-500',
        'attraction.viewed': 'bg-cyan-500',
        'attraction.started': 'bg-cyan-500',
        'attraction.report_submitted': 'bg-indigo-500',
        'attraction.report_approved': 'bg-green-600',
        'attraction.report_rejected': 'bg-rose-600',
    };
    return (
        <div className="rounded-lg border border-gray-200">
            <p className="border-b border-gray-200 px-3 py-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Оқиғалар тарихы
            </p>
            <div className="max-h-64 overflow-y-auto p-3">
                {events.length === 0 ? (
                    <p className="text-sm text-gray-500">Оқиғалар жоқ</p>
                ) : (
                    <ol className="relative space-y-3 border-l border-gray-200 pl-4">
                        {events.map((event) => (
                            <li key={event.id} className="relative">
                                <span
                                    aria-hidden="true"
                                    className={`absolute top-1.5 -left-[21px] h-3 w-3 rounded-full ring-2 ring-white ${dotColors[event.type] || 'bg-gray-400'}`}
                                />
                                <p className="text-sm font-medium break-words text-[#0f1b3d]">
                                    {event.label}
                                </p>
                                <p className="text-xs break-words text-gray-500">
                                    {eventDateLabel(event.created_at)}
                                    {event.actor_name &&
                                        ` · ${event.actor_name}`}
                                </p>
                                {event.comment && (
                                    <p className="mt-1 text-xs break-words wrap-anywhere whitespace-pre-wrap text-gray-600">
                                        {event.comment}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </div>
    );
}

function ActivityActionContext({
    activity,
    variant,
}: {
    activity: AttractionActivity;
    variant: 'submission' | 'review';
}) {
    return (
        <div
            className={cn(
                'rounded-lg border border-gray-200 p-4',
                variant === 'submission' && 'bg-gray-50',
            )}
        >
            {variant === 'review' && (
                <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    Іс-шара
                </p>
            )}
            <p
                className={cn(
                    'min-w-0 font-semibold break-words wrap-anywhere text-[#0f1b3d]',
                    variant === 'submission' ? 'text-sm' : 'mt-1',
                )}
            >
                {activity.next_action}
            </p>
            {activity.description && (
                <p className="mt-1 text-sm break-words wrap-anywhere whitespace-pre-wrap text-gray-600">
                    {activity.description}
                </p>
            )}
        </div>
    );
}

export default function AttractionActivityCard({
    projectId,
    activities,
    canManage,
    historical = false,
    users,
}: Props) {
    const csrfToken = String(usePage().props.csrf_token ?? '');
    const canEdit = canManage && !historical;
    const [activityFilter, setActivityFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const lastOpenedId = useRef<number | null>(null);
    const lastEditedId = useRef<number | null>(null);
    const lastReportedId = useRef<number | null>(null);
    const lastReviewedId = useRef<number | null>(null);
    const viewingRequests = useRef(new Set<number>());
    const recordedViews = useRef(new Set<number>());
    const [viewEvents, setViewEvents] = useState<
        Record<number, AttractionActivityEvent>
    >({});
    const selectedActivity = activities.find(
        (activity) => activity.id === selectedId,
    );
    const displayedActivities = activities.filter((activity) => {
        if (activityFilter === 'all') return true;
        if (activityFilter === 'overdue') {
            return isAttractionActivityOverdue(
                activity.status ?? 'planned',
                activity.next_action_due_date,
            );
        }
        return (activity.status ?? 'planned') === activityFilter;
    });
    useEffect(() => {
        const focusLinkedActivity = () => {
            const match = window.location.hash.match(
                /^#attraction-activity-(\d+)$/,
            );
            if (
                match &&
                activities.some((activity) => activity.id === Number(match[1]))
            ) {
                const id = Number(match[1]);
                setActivityFilter('all');
                lastOpenedId.current = id;
                setSelectedId(id);
                requestAnimationFrame(() =>
                    document
                        .getElementById(`attraction-activity-${id}`)
                        ?.scrollIntoView({
                            block: 'start',
                            behavior: 'smooth',
                        }),
                );
            }
        };
        focusLinkedActivity();
        window.addEventListener('hashchange', focusLinkedActivity);
        return () =>
            window.removeEventListener('hashchange', focusLinkedActivity);
    }, [activities]);

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const emptyData = {
        next_action: '',
        description: '',
        next_action_due_date: '',
        responsible_id: '',
    };
    const form = useForm(emptyData);
    const filteredUsers = users.filter((user) =>
        `${user.full_name} ${user.position ?? ''}`
            .toLocaleLowerCase()
            .includes(userSearch.trim().toLocaleLowerCase()),
    );
    const selectedUser = users.find(
        (user) => user.id.toString() === form.data.responsible_id,
    );
    const deleteForm = useForm({});
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [reporting, setReporting] = useState<AttractionActivity | null>(null);
    const [reviewing, setReviewing] = useState<AttractionActivity | null>(null);
    const reportForm = useForm({
        status: 'pending_review' as const,
        report_result: '',
    });
    const reviewForm = useForm({
        decision: 'approved' as 'approved' | 'rejected',
        reviewer_comment: '',
    });
    const reviewCommentRef = useRef<HTMLTextAreaElement>(null);

    const markViewed = useCallback(
        async (activity: AttractionActivity) => {
            if (
                historical ||
                !activity.can_mark_viewed ||
                activity.viewed_at ||
                viewingRequests.current.has(activity.id) ||
                recordedViews.current.has(activity.id)
            )
                return;
            viewingRequests.current.add(activity.id);
            try {
                const response = await fetch(
                    activityRoutes.view.url({
                        investmentProject: projectId,
                        activity: activity.id,
                    }),
                    {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRF-TOKEN':
                                csrfToken ||
                                document.querySelector<HTMLMetaElement>(
                                    'meta[name="csrf-token"]',
                                )?.content ||
                                '',
                        },
                    },
                );
                if (!response.ok) return;
                const result = (await response.json()) as {
                    event?: AttractionActivityEvent;
                    viewed_at?: string;
                };
                if (
                    result.event?.type !== 'attraction.viewed' ||
                    !result.viewed_at
                )
                    return;
                const event = result.event;
                recordedViews.current.add(activity.id);
                setViewEvents((current) => ({
                    ...current,
                    [activity.id]: event,
                }));
            } catch {
                // A failed read receipt must not prevent opening or reporting work.
            } finally {
                viewingRequests.current.delete(activity.id);
            }
        },
        [csrfToken, historical, projectId],
    );

    useEffect(() => {
        if (selectedActivity) void markViewed(selectedActivity);
    }, [selectedActivity, markViewed]);

    const eventsFor = (
        activity: AttractionActivity,
    ): AttractionActivityEvent[] => {
        const events = [...(activity.events ?? [])];
        const viewed = viewEvents[activity.id];
        if (
            viewed &&
            !events.some((event) => String(event.id) === String(viewed.id))
        )
            events.push(viewed);
        return events.sort(
            (left, right) =>
                new Date(left.created_at).getTime() -
                new Date(right.created_at).getTime(),
        );
    };

    const closeDetails = () => {
        if (window.location.hash === `#attraction-activity-${selectedId}`) {
            window.history.replaceState(
                window.history.state,
                '',
                '#project-attraction',
            );
        }
        setSelectedId(null);
    };

    const openDetails = (activity: AttractionActivity) => {
        lastOpenedId.current = activity.id;
        setSelectedId(activity.id);
    };

    const startEdit = (activity?: AttractionActivity) => {
        lastEditedId.current = activity?.id ?? null;
        closeDetails();
        form.clearErrors();
        setUserSearch('');
        setEditing(activity?.id ?? null);
        form.setData(
            activity
                ? {
                      next_action: activity.next_action,
                      description: activity.description ?? '',
                      next_action_due_date: activity.next_action_due_date.slice(
                          0,
                          10,
                      ),
                      responsible_id: activity.responsible_id?.toString() ?? '',
                  }
                : emptyData,
        );
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        };
        if (editing) {
            form.put(
                activityRoutes.update.url({
                    investmentProject: projectId,
                    activity: editing,
                }),
                options,
            );
        } else {
            form.post(activityRoutes.store.url(projectId), options);
        }
    };

    const remove = (id: number) => {
        if (!window.confirm('Осы жазбаны жою керек пе?')) return;
        setDeletingId(id);
        deleteForm.delete(
            activityRoutes.destroy.url({
                investmentProject: projectId,
                activity: id,
            }),
            {
                preserveScroll: true,
                onFinish: () => setDeletingId(null),
            },
        );
    };

    const startReport = (activity: AttractionActivity) => {
        lastReportedId.current = activity.id;
        closeDetails();
        void markViewed(activity);
        reportForm.clearErrors();
        reportForm.setData({
            status: 'pending_review',
            report_result: activity.report_result ?? '',
        });
        setReporting(activity);
    };

    const submitReport = (event: FormEvent) => {
        event.preventDefault();
        if (!reporting) return;
        reportForm.post(
            activityRoutes.report.url({
                investmentProject: projectId,
                activity: reporting.id,
            }),
            {
                preserveScroll: true,
                onSuccess: () => setReporting(null),
            },
        );
    };

    const startReview = (activity: AttractionActivity) => {
        lastReviewedId.current = activity.id;
        closeDetails();
        reviewForm.clearErrors();
        reviewForm.setData({ decision: 'approved', reviewer_comment: '' });
        setReviewing(activity);
    };

    const restoreActionFocus = (
        action: 'report' | 'review',
        activityId: number | null,
    ) => {
        if (activityId === null) return;
        const target =
            document.getElementById(`attraction-${action}-${activityId}`) ??
            document.getElementById(`attraction-info-${activityId}`);
        target?.focus({ preventScroll: true });
    };

    const submitReview = (decision: 'approved' | 'rejected') => {
        if (!reviewing || reviewForm.processing) return;
        reviewForm.clearErrors();
        reviewForm.setData('decision', decision);
        if (
            decision === 'rejected' &&
            !reviewForm.data.reviewer_comment.trim()
        ) {
            reviewForm.setError(
                'reviewer_comment',
                'Нені түзету керегін жазыңыз.',
            );
            reviewCommentRef.current?.focus();
            return;
        }
        reviewForm.transform((data) => ({ ...data, decision }));
        reviewForm.put(
            activityRoutes.review.url({
                investmentProject: projectId,
                activity: reviewing.id,
            }),
            {
                preserveScroll: true,
                onSuccess: () => setReviewing(null),
            },
        );
    };

    return (
        <Card
            id="project-attraction"
            className="scroll-mt-24 overflow-hidden py-0 shadow-none"
        >
            <div className="bg-[#0f1b3d] px-6 py-4">
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="min-w-0 text-lg font-bold text-white">
                        <span className="flex items-center gap-2">
                            <Flag className="h-5 w-5 shrink-0" />
                            Іс-шаралар
                        </span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <Select
                            value={activityFilter}
                            onValueChange={setActivityFilter}
                        >
                            <SelectTrigger
                                aria-label="Іс-шараларды сүзу"
                                className="h-9 w-[160px] border-white/30 bg-white/20 text-sm text-white focus:ring-white/50 [&>svg]:text-white"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Барлық іс-шаралар
                                </SelectItem>
                                {ATTRACTION_ACTIVITY_STATUSES.map((status) => (
                                    <SelectItem
                                        key={status.value}
                                        value={status.value}
                                    >
                                        {status.label}
                                    </SelectItem>
                                ))}
                                <SelectItem value="overdue">
                                    Мерзімі өткен
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {canEdit && (
                            <Button
                                id={`attraction-add-${projectId}`}
                                type="button"
                                size="icon"
                                aria-label="Іс-шара қосу"
                                title="Іс-шара қосу"
                                className="h-9 w-9 border border-white/30 bg-white/20 text-white hover:bg-white/30"
                                onClick={() => startEdit()}
                                disabled={deleteForm.processing}
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <CardContent className="p-0">
                {Object.values(deleteForm.errors)
                    .filter(
                        (error): error is string => typeof error === 'string',
                    )
                    .map((error) => (
                        <div key={error} className="px-6 pt-4">
                            <InputError message={error} />
                        </div>
                    ))}
                {displayedActivities.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Flag className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                        <p className="text-gray-500">
                            {activities.length === 0
                                ? 'Іс-шаралар жоқ'
                                : 'Бұл сүзгіге сәйкес іс-шаралар жоқ.'}
                        </p>
                        {canEdit && activities.length === 0 && (
                            <p className="mt-1 text-sm text-gray-400">
                                Жаңа іс-шара қосу үшін + басыңыз
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {displayedActivities.map((activity) => {
                            const status = activity.status ?? 'planned';
                            const overdue = isAttractionActivityOverdue(
                                status,
                                activity.next_action_due_date,
                            );
                            const dotColor =
                                status === 'completed'
                                    ? 'bg-green-500'
                                    : status === 'cancelled'
                                      ? 'bg-gray-400'
                                      : overdue
                                        ? 'bg-red-500'
                                        : 'bg-amber-500';
                            return (
                                <div
                                    key={activity.id}
                                    id={`attraction-activity-${activity.id}`}
                                    className="flex scroll-mt-24 flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50 sm:flex-nowrap"
                                >
                                    <div
                                        aria-hidden="true"
                                        className={`h-3 w-3 shrink-0 rounded-full ${dotColor}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold break-words wrap-anywhere text-[#0f1b3d]">
                                            {activity.next_action}:
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {activity.next_action_due_date
                                                ? dateLabel(
                                                      activity.next_action_due_date,
                                                  )
                                                : 'Мерзімі көрсетілмеген'}
                                        </p>
                                        <p className="mt-1 text-sm break-words wrap-anywhere text-gray-500">
                                            Жауапты:{' '}
                                            {activity.responsible?.full_name ||
                                                'Жауапты адам көрсетілмеген'}
                                            {activity.responsible?.position &&
                                                ` — ${activity.responsible.position}`}
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {overdue && (
                                                <Badge className="border-0 bg-red-100 text-xs text-red-700">
                                                    Мерзімі өткен
                                                </Badge>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className={`border-0 text-xs ${STATUS_BADGE_CLASSES[status]}`}
                                            >
                                                {attractionActivityStatusLabel(
                                                    status,
                                                )}
                                            </Badge>
                                        </div>
                                        {activity.reviewer_comment &&
                                            activity.reviewed_at &&
                                            status !== 'completed' && (
                                                <p className="mt-1 text-xs break-words wrap-anywhere whitespace-pre-wrap text-red-600">
                                                    <span className="font-semibold">
                                                        Толықтыруға қайтарылды:
                                                    </span>{' '}
                                                    {activity.reviewer_comment}
                                                </p>
                                            )}
                                    </div>
                                    <div className="flex basis-full flex-wrap items-center justify-end gap-2 pl-7 sm:basis-auto sm:pl-0">
                                        <Button
                                            id={`attraction-info-${activity.id}`}
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-400 hover:bg-cyan-50 hover:text-cyan-600"
                                            aria-label={`Іс-шара ${activities.indexOf(activity) + 1}: толық ақпарат`}
                                            title="Толық ақпарат"
                                            onClick={() =>
                                                openDetails(activity)
                                            }
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {!historical && activity.can_report && (
                                            <Button
                                                id={`attraction-report-${activity.id}`}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                title="Орындалу есебін жіберу"
                                                className="h-8 border-cyan-300 text-xs text-cyan-700 hover:bg-cyan-50"
                                                onClick={() =>
                                                    startReport(activity)
                                                }
                                            >
                                                <Upload className="mr-1 h-3.5 w-3.5" />
                                                Жіберу
                                            </Button>
                                        )}
                                        {!historical && activity.can_review && (
                                            <Button
                                                id={`attraction-review-${activity.id}`}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 border-amber-300 text-xs text-amber-700 hover:bg-amber-50"
                                                onClick={() =>
                                                    startReview(activity)
                                                }
                                            >
                                                <Eye className="mr-1 h-3.5 w-3.5" />
                                                Тексеру
                                            </Button>
                                        )}
                                        {canEdit &&
                                            (activity.can_update ??
                                                ![
                                                    'pending_review',
                                                    'completed',
                                                ].includes(status)) && (
                                                <Button
                                                    id={`attraction-edit-${activity.id}`}
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Жазбаны өзгерту"
                                                    title="Жазбаны өзгерту"
                                                    className="h-8 w-8 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                                                    onClick={() =>
                                                        startEdit(activity)
                                                    }
                                                    disabled={
                                                        deleteForm.processing
                                                    }
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                        {canEdit &&
                                            (activity.can_delete ??
                                                ![
                                                    'pending_review',
                                                    'completed',
                                                ].includes(status)) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Жазбаны жою"
                                                    title="Жазбаны жою"
                                                    className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() =>
                                                        remove(activity.id)
                                                    }
                                                    disabled={
                                                        deleteForm.processing ||
                                                        deletingId ===
                                                            activity.id
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
            <Dialog
                open={Boolean(selectedActivity)}
                onOpenChange={(value) => {
                    if (!value) closeDetails();
                }}
            >
                <ActivityDialogContent
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        if (
                            !open &&
                            !reporting &&
                            !reviewing &&
                            lastOpenedId.current !== null
                        ) {
                            document
                                .getElementById(
                                    `attraction-info-${lastOpenedId.current}`,
                                )
                                ?.focus();
                        }
                    }}
                >
                    <DialogHeader className="shrink-0 bg-[#0f1b3d] px-6 py-4 pr-14 text-left">
                        <DialogTitle className="flex items-center gap-2 text-lg leading-7 font-bold text-white">
                            <Eye className="h-5 w-5 shrink-0" /> Іс-шара туралы
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {selectedActivity &&
                                `Іс-шара ${activities.indexOf(selectedActivity) + 1}`}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedActivity && (
                        <div className="max-h-[70vh] min-h-0 space-y-4 overflow-y-auto p-6">
                            <ActivityDetailField label="Іс-шараны берген">
                                <p>
                                    {selectedActivity.creator?.full_name ||
                                        'Көрсетілмеген'}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {dateLabel(selectedActivity.created_at)}
                                </p>
                            </ActivityDetailField>
                            <ActivityDetailField label="Тақырып">
                                <p>{selectedActivity.next_action}</p>
                                {selectedActivity.description && (
                                    <p className="mt-2 text-sm font-normal text-gray-700">
                                        {selectedActivity.description}
                                    </p>
                                )}
                            </ActivityDetailField>
                            <ActivityDetailField label="Мәртебе">
                                <Badge
                                    variant="outline"
                                    className={`border-0 text-xs ${STATUS_BADGE_CLASSES[selectedActivity.status ?? 'planned']}`}
                                >
                                    {attractionActivityStatusLabel(
                                        selectedActivity.status,
                                    )}
                                </Badge>
                                {isAttractionActivityOverdue(
                                    selectedActivity.status ?? 'planned',
                                    selectedActivity.next_action_due_date,
                                ) && (
                                    <Badge className="ml-1 border-0 bg-red-100 text-xs text-red-700">
                                        Мерзімі өткен
                                    </Badge>
                                )}
                            </ActivityDetailField>
                            <ActivityDetailField label="Орындалу мерзімі">
                                <p>
                                    {dateLabel(
                                        selectedActivity.next_action_due_date,
                                    )}
                                </p>
                            </ActivityDetailField>
                            <ActivityDetailField label="Жауапты адам">
                                <p>
                                    {selectedActivity.responsible?.full_name ??
                                        'Жауапты аккаунт жойылған'}
                                </p>
                                {selectedActivity.responsible?.position && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {selectedActivity.responsible.position}
                                    </p>
                                )}
                            </ActivityDetailField>
                            {selectedActivity.event_name && (
                                <ActivityDetailField label="Соңғы өткізілген іс-шара">
                                    <p>{selectedActivity.event_name}</p>
                                </ActivityDetailField>
                            )}
                            {(selectedActivity.event_date ||
                                selectedActivity.result) && (
                                <ActivityDetailField label="Күні және нәтижесі">
                                    {selectedActivity.event_date && (
                                        <p className="mb-1 text-xs text-gray-500">
                                            {dateLabel(
                                                selectedActivity.event_date,
                                            )}
                                        </p>
                                    )}
                                    {selectedActivity.result && (
                                        <p>{selectedActivity.result}</p>
                                    )}
                                </ActivityDetailField>
                            )}
                            {selectedActivity.report_result && (
                                <ActivityDetailField label="Орындалу есебі">
                                    <p>{selectedActivity.report_result}</p>
                                    <p className="mt-2 text-xs text-gray-500">
                                        {selectedActivity.reporter?.full_name}
                                        {selectedActivity.reported_at &&
                                            ` · ${dateLabel(selectedActivity.reported_at)}`}
                                    </p>
                                </ActivityDetailField>
                            )}
                            {(selectedActivity.reviewed_at ||
                                selectedActivity.reviewer_comment) && (
                                <ActivityDetailField label="Куратордың тексеруі">
                                    <p>
                                        {selectedActivity.reviewer_comment ??
                                            (selectedActivity.status ===
                                            'completed'
                                                ? 'Нәтиже қабылданды'
                                                : 'Толықтыруға қайтарылды')}
                                    </p>
                                    <p className="mt-2 text-xs text-gray-500">
                                        {selectedActivity.reviewer?.full_name}
                                        {selectedActivity.reviewed_at &&
                                            ` · ${dateLabel(selectedActivity.reviewed_at)}`}
                                    </p>
                                </ActivityDetailField>
                            )}
                            <ActivityTimeline
                                events={eventsFor(selectedActivity)}
                            />
                        </div>
                    )}
                    <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeDetails}
                        >
                            Жабу
                        </Button>
                    </div>
                </ActivityDialogContent>
            </Dialog>
            {canEdit && (
                <Dialog
                    open={open}
                    onOpenChange={(value) => {
                        if (!form.processing) setOpen(value);
                    }}
                >
                    <ActivityDialogContent
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            if (selectedActivity || reporting || reviewing)
                                return;
                            const activityId = lastEditedId.current;
                            const target =
                                activityId === null
                                    ? document.getElementById(
                                          `attraction-add-${projectId}`,
                                      )
                                    : (document.getElementById(
                                          `attraction-edit-${activityId}`,
                                      ) ??
                                      document.getElementById(
                                          `attraction-info-${activityId}`,
                                      ));
                            target?.focus({ preventScroll: true });
                        }}
                    >
                        <DialogHeader className="shrink-0 bg-[#0f1b3d] px-6 py-4 pr-14 text-left">
                            <DialogTitle className="flex items-center gap-2 text-lg leading-7 font-bold text-white">
                                <Flag className="h-5 w-5" />
                                {editing ? 'Іс-шараны өңдеу' : 'Іс-шара қосу'}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Іс-шара атауын, сипаттамасын, орындалу мерзімін
                                және жауапты адамын көрсетіңіз.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={submit}
                            className="max-h-[70vh] min-h-0 space-y-5 overflow-y-auto p-6"
                        >
                            {Object.keys(form.errors).length > 0 && (
                                <p
                                    role="alert"
                                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
                                >
                                    Жазба сақталмады. Белгіленген өрістерді
                                    тексеріңіз.
                                </p>
                            )}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="attraction-next"
                                    className="text-sm font-semibold text-[#0f1b3d]"
                                >
                                    Іс-шара атауы{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="attraction-next"
                                    placeholder="Тақырып"
                                    required
                                    maxLength={1000}
                                    value={form.data.next_action}
                                    onChange={(event) =>
                                        form.setData(
                                            'next_action',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.next_action} />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="attraction-description"
                                    className="text-sm font-semibold text-[#0f1b3d]"
                                >
                                    Сипаттама
                                </Label>
                                <Textarea
                                    id="attraction-description"
                                    placeholder="Сипаттама"
                                    className={TEXTAREA_CLASSES}
                                    rows={3}
                                    maxLength={10000}
                                    value={form.data.description}
                                    onChange={(event) =>
                                        form.setData(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.description} />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="attraction-due"
                                    className="text-sm font-semibold text-[#0f1b3d]"
                                >
                                    Орындалу мерзімі{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="date"
                                    id="attraction-due"
                                    required
                                    value={form.data.next_action_due_date}
                                    onChange={(event) =>
                                        form.setData(
                                            'next_action_due_date',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.next_action_due_date}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="attraction-responsible-search"
                                    className="text-sm font-semibold text-[#0f1b3d]"
                                >
                                    Жауаптыны тағайындау{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Search
                                        aria-hidden="true"
                                        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                                    />
                                    <Input
                                        id="attraction-responsible-search"
                                        value={userSearch}
                                        onChange={(event) =>
                                            setUserSearch(event.target.value)
                                        }
                                        placeholder="Іздеу"
                                        className="pl-9"
                                    />
                                </div>
                                <div className="mt-2 max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
                                    {filteredUsers.length === 0 ? (
                                        <p className="px-4 py-3 text-sm text-gray-400">
                                            Пайдаланушылар табылмады
                                        </p>
                                    ) : (
                                        filteredUsers.map((user, index) => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                aria-pressed={
                                                    form.data.responsible_id ===
                                                    user.id.toString()
                                                }
                                                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${form.data.responsible_id === user.id.toString() ? 'bg-cyan-50' : ''}`}
                                                onClick={() =>
                                                    form.setData(
                                                        'responsible_id',
                                                        user.id.toString(),
                                                    )
                                                }
                                            >
                                                <span className="min-w-0 break-words text-gray-700">
                                                    <span className="mr-2 text-gray-400">
                                                        {index + 1}
                                                    </span>
                                                    {user.full_name}
                                                    {user.position &&
                                                        ` — ${user.position}`}
                                                </span>
                                                {form.data.responsible_id ===
                                                    user.id.toString() && (
                                                    <span className="shrink-0 rounded-md bg-cyan-500 px-3 py-1 text-xs font-medium text-white">
                                                        Таңдалды
                                                    </span>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                                {selectedUser && (
                                    <p className="mt-2 text-sm text-cyan-600">
                                        Таңдалды:{' '}
                                        <span className="font-medium">
                                            {selectedUser.full_name}
                                        </span>
                                    </p>
                                )}
                                <InputError
                                    message={form.errors.responsible_id}
                                />
                            </div>
                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <Button
                                    type="submit"
                                    className="bg-emerald-500 hover:bg-emerald-600"
                                    disabled={
                                        form.processing ||
                                        !form.data.next_action.trim() ||
                                        !form.data.responsible_id
                                    }
                                >
                                    {form.processing ? 'Сақталуда…' : 'Сақтау'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-gray-600 bg-gray-600 text-white hover:bg-gray-700 hover:text-white"
                                    disabled={form.processing}
                                    onClick={() => setOpen(false)}
                                >
                                    Болдырмау
                                </Button>
                            </div>
                        </form>
                    </ActivityDialogContent>
                </Dialog>
            )}
            {!historical && (
                <Dialog
                    open={Boolean(reporting)}
                    onOpenChange={(value) => {
                        if (!value && !reportForm.processing)
                            setReporting(null);
                    }}
                >
                    <ActivityDialogContent
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            if (!open && !selectedActivity && !reviewing) {
                                restoreActionFocus(
                                    'report',
                                    lastReportedId.current,
                                );
                            }
                        }}
                    >
                        <DialogHeader className="shrink-0 bg-[#0f1b3d] px-6 py-4 pr-14 text-left">
                            <DialogTitle className="flex items-center gap-2 text-lg leading-7 font-bold text-white">
                                <Upload className="h-5 w-5 shrink-0" />{' '}
                                Іс-шараның орындалуын растаңыз!
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Атқарылған жұмыстың нәтижесін тексеруге
                                жіберіңіз.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            className="max-h-[70vh] min-h-0 space-y-5 overflow-y-auto p-6"
                            onSubmit={submitReport}
                        >
                            {reporting && (
                                <ActivityActionContext
                                    activity={reporting}
                                    variant="submission"
                                />
                            )}
                            {Object.keys(reportForm.errors).length > 0 && (
                                <p
                                    role="alert"
                                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                >
                                    Есеп сақталмады. Белгіленген өрістерді
                                    тексеріңіз.
                                </p>
                            )}
                            <InputError message={reportForm.errors.status} />
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="attraction-report-result"
                                    className="text-sm font-semibold text-[#0f1b3d]"
                                >
                                    Орындалу нәтижесі{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="attraction-report-result"
                                    className={TEXTAREA_CLASSES}
                                    rows={4}
                                    required
                                    value={reportForm.data.report_result}
                                    onChange={(event) =>
                                        reportForm.setData(
                                            'report_result',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Атқарылған жұмысты және қол жеткізілген нәтижені жазыңыз"
                                />
                                <InputError
                                    message={reportForm.errors.report_result}
                                />
                                <p className="text-xs text-slate-500">
                                    Тексеруге жіберілген есепті куратор немесе
                                    модератор қабылдайды.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={reportForm.processing}
                                    className="bg-emerald-500 px-8 hover:bg-emerald-600"
                                >
                                    {reportForm.processing
                                        ? 'Жіберілуде...'
                                        : 'Жіберу'}
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-red-500 px-8 hover:bg-red-600"
                                    disabled={reportForm.processing}
                                    onClick={() => setReporting(null)}
                                >
                                    Болдырмау
                                </Button>
                            </div>
                        </form>
                    </ActivityDialogContent>
                </Dialog>
            )}
            {!historical && (
                <Dialog
                    open={Boolean(reviewing)}
                    onOpenChange={(value) => {
                        if (!value && !reviewForm.processing)
                            setReviewing(null);
                    }}
                >
                    <ActivityDialogContent
                        className="sm:max-w-2xl"
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            if (!open && !selectedActivity && !reporting) {
                                restoreActionFocus(
                                    'review',
                                    lastReviewedId.current,
                                );
                            }
                        }}
                    >
                        <DialogHeader className="shrink-0 bg-[#0f1b3d] px-6 py-4 pr-14 text-left">
                            <DialogTitle className="flex items-center gap-2 text-lg leading-7 font-bold text-white">
                                <Eye className="h-5 w-5" /> Іс-шараны тексеру
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Нәтижені қабылдаңыз немесе толықтыруға
                                қайтарыңыз.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[70vh] min-h-0 space-y-5 overflow-y-auto p-6">
                            {reviewing && (
                                <ActivityActionContext
                                    activity={reviewing}
                                    variant="review"
                                />
                            )}
                            <ActivityDetailField
                                label="Есепті жіберген"
                                className="p-4"
                            >
                                <p>
                                    {reviewing?.reporter?.full_name ??
                                        'Көрсетілмеген'}
                                </p>
                                {reviewing?.reported_at && (
                                    <p className="text-xs font-normal text-gray-500">
                                        {eventDateLabel(reviewing.reported_at)}
                                    </p>
                                )}
                            </ActivityDetailField>
                            <ActivityDetailField
                                label="Орындалу нәтижесі"
                                className="p-4"
                            >
                                <p className="text-sm font-normal text-gray-700">
                                    {reviewing?.report_result ||
                                        'Нәтиже енгізілмеген'}
                                </p>
                            </ActivityDetailField>
                            <form
                                className="space-y-4 border-t border-gray-200 pt-4"
                                onSubmit={(event) => event.preventDefault()}
                            >
                                {Object.keys(reviewForm.errors).length > 0 && (
                                    <p
                                        role="alert"
                                        className="text-sm text-red-600"
                                    >
                                        Шешім сақталмады. Белгіленген өрістерді
                                        тексеріңіз.
                                    </p>
                                )}
                                <InputError
                                    message={reviewForm.errors.decision}
                                />
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="attraction-review-comment"
                                        className="font-semibold text-[#0f1b3d]"
                                    >
                                        Пікір{' '}
                                        {reviewForm.data.decision ===
                                            'rejected' && (
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        )}
                                    </Label>
                                    <Textarea
                                        ref={reviewCommentRef}
                                        id="attraction-review-comment"
                                        className={TEXTAREA_CLASSES}
                                        rows={3}
                                        value={reviewForm.data.reviewer_comment}
                                        onChange={(event) => {
                                            reviewForm.setData(
                                                'reviewer_comment',
                                                event.target.value,
                                            );
                                            reviewForm.clearErrors(
                                                'reviewer_comment',
                                            );
                                        }}
                                        aria-invalid={Boolean(
                                            reviewForm.errors.reviewer_comment,
                                        )}
                                        aria-describedby="attraction-review-comment-help attraction-review-comment-error"
                                        placeholder="Пікір жазыңыз..."
                                    />
                                    <InputError
                                        id="attraction-review-comment-error"
                                        message={
                                            reviewForm.errors.reviewer_comment
                                        }
                                    />
                                    <p
                                        id="attraction-review-comment-help"
                                        className="text-xs text-gray-500"
                                    >
                                        Толықтыруға қайтарғанда нені түзету
                                        керегін жазу міндетті.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-3">
                                    <Button
                                        type="button"
                                        className="bg-emerald-500 px-8 hover:bg-emerald-600"
                                        disabled={reviewForm.processing}
                                        onClick={() => submitReview('approved')}
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        {reviewForm.processing &&
                                        reviewForm.data.decision === 'approved'
                                            ? 'Сақталуда…'
                                            : 'Қабылдау'}
                                    </Button>
                                    <Button
                                        type="button"
                                        className="bg-red-500 px-8 hover:bg-red-600"
                                        disabled={reviewForm.processing}
                                        onClick={() => submitReview('rejected')}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        {reviewForm.processing &&
                                        reviewForm.data.decision === 'rejected'
                                            ? 'Сақталуда…'
                                            : 'Толықтыруға қайтару'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </ActivityDialogContent>
                </Dialog>
            )}
        </Card>
    );
}
