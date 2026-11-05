import { Link, useForm } from '@inertiajs/react';
import {
    CalendarClock,
    ChevronDown,
    Edit,
    Plus,
    Trash2,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import InputError from '@/components/input-error';
import AttractionStageSelect from '@/components/investment-projects/attraction-stage-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
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
    ACTIVITY_STATUS_STYLES,
    ATTRACTION_ACTIVITY_STATUSES,
    attractionActivityStatusLabel,
    isAttractionActivityOverdue,
} from '@/lib/attraction-activity';
import type { AttractionActivityStatus } from '@/lib/attraction-activity';
import { attractionStageLabel } from '@/lib/project-attraction';
import * as investmentProjects from '@/routes/investment-projects';
import * as activityRoutes from '@/routes/investment-projects/attraction-activities';

export interface AttractionActivity {
    id: number;
    attraction_stage: string;
    event_name: string | null;
    event_date: string | null;
    result: string | null;
    next_action: string;
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
}

interface Props {
    projectId: number;
    stage?: string | null;
    activities: AttractionActivity[];
    canManage: boolean;
    historical?: boolean;
    users: { id: number; full_name: string; position?: string | null }[];
}

function dateLabel(value: string | null): string {
    if (!value) return 'Көрсетілмеген';
    if (value.includes('T')) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Көрсетілмеген';
        return new Intl.DateTimeFormat('kk-KZ', {
            timeZone: 'Asia/Qyzylorda',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    }
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}.${month}.${year}`;
}

export default function AttractionActivityCard({
    projectId,
    stage,
    activities,
    canManage,
    historical = false,
    users,
}: Props) {
    const canEdit = canManage && !historical;
    const displayedStage = historical
        ? activities.at(-1)?.attraction_stage
        : stage;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);
    const emptyData = {
        status: 'planned' as AttractionActivityStatus,
        attraction_stage: stage ?? 'potential',
        event_name: '',
        event_date: '',
        result: '',
        next_action: '',
        next_action_due_date: '',
        responsible_id: '',
    };
    const form = useForm(emptyData);
    const deleteForm = useForm({});
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [reporting, setReporting] = useState<AttractionActivity | null>(null);
    const [reviewing, setReviewing] = useState<AttractionActivity | null>(null);
    const reportForm = useForm({
        status: 'pending_review' as 'in_progress' | 'pending_review',
        report_result: '',
    });
    const reviewForm = useForm({
        decision: 'approved' as 'approved' | 'rejected',
        reviewer_comment: '',
    });

    const startEdit = (activity?: AttractionActivity) => {
        form.clearErrors();
        setEditing(activity?.id ?? null);
        form.setData(
            activity
                ? {
                      status: activity.status ?? 'planned',
                      attraction_stage: activity.attraction_stage,
                      event_name: activity.event_name ?? '',
                      event_date: activity.event_date?.slice(0, 10) ?? '',
                      result: activity.result ?? '',
                      next_action: activity.next_action,
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
        form.transform(({ status, ...fields }) =>
            ['pending_review', 'completed'].includes(status)
                ? fields
                : { status, ...fields },
        );
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
        reportForm.clearErrors();
        reportForm.setData({
            status:
                activity.status === 'planned'
                    ? 'in_progress'
                    : 'pending_review',
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
        reviewForm.clearErrors();
        reviewForm.setData({ decision: 'approved', reviewer_comment: '' });
        setReviewing(activity);
    };

    const submitReview = (event: FormEvent) => {
        event.preventDefault();
        if (!reviewing) return;
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
        <Collapsible defaultOpen={!historical} asChild>
            <Card
                id="project-attraction"
                className="scroll-mt-24 gap-0 overflow-hidden py-0 shadow-none"
            >
                <CardHeader className="bg-slate-50 px-4 py-3 sm:px-5">
                    <div className="flex items-center justify-between gap-3">
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className="group min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                            >
                                <span className="flex items-center justify-between gap-3">
                                    <span className="min-w-0">
                                        <span className="block text-lg font-semibold text-[#0f1b3d]">
                                            {historical
                                                ? 'Инвестор тарту тарихы'
                                                : 'Инвестор тарту жұмыстары'}
                                        </span>
                                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <span>
                                                {activities.length} іс-шара
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className="max-w-full text-left whitespace-normal"
                                            >
                                                {attractionStageLabel(
                                                    displayedStage,
                                                )}
                                            </Badge>
                                        </span>
                                    </span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="size-5 shrink-0 text-slate-500 transition-transform group-data-[state=open]:rotate-180"
                                    />
                                </span>
                            </button>
                        </CollapsibleTrigger>
                        {canEdit && (
                            <Button
                                onClick={() => startEdit()}
                                disabled={deleteForm.processing}
                            >
                                <Plus className="mr-2 size-4" />
                                Жазба қосу
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CollapsibleContent className="border-t border-slate-200">
                    <CardContent className="space-y-3 p-4 sm:p-5">
                        {Object.values(deleteForm.errors)
                            .filter(
                                (error): error is string =>
                                    typeof error === 'string',
                            )
                            .map((error) => (
                                <InputError key={error} message={error} />
                            ))}
                        {activities.length === 0 && (
                            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                                Инвестор тарту бойынша іс-шаралар әлі
                                енгізілмеген.
                            </p>
                        )}
                        {activities.map((activity, index) => (
                            <Collapsible
                                key={activity.id}
                                className="overflow-hidden rounded-xl border border-slate-200"
                            >
                                <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
                                    <CollapsibleTrigger asChild>
                                        <button
                                            type="button"
                                            className="group flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                                        >
                                            <span className="min-w-0">
                                                <span className="line-clamp-2 text-sm font-semibold break-words text-[#0f1b3d]">
                                                    {activity.event_name ??
                                                        activity.next_action}
                                                </span>
                                                <span className="mt-2 flex flex-wrap gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            ACTIVITY_STATUS_STYLES[
                                                                activity.status ??
                                                                    'planned'
                                                            ]
                                                        }
                                                    >
                                                        {attractionActivityStatusLabel(
                                                            activity.status,
                                                        )}
                                                    </Badge>
                                                    {isAttractionActivityOverdue(
                                                        activity.status ??
                                                            'planned',
                                                        activity.next_action_due_date,
                                                    ) && (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-red-200 bg-red-50 text-red-700"
                                                        >
                                                            Мерзімі өткен
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                    <span>
                                                        {index === 0
                                                            ? historical
                                                                ? 'Соңғы жазба'
                                                                : 'Ағымдағы жұмыс'
                                                            : 'Алдыңғы жазба'}
                                                    </span>
                                                    <span>
                                                        {attractionStageLabel(
                                                            activity.attraction_stage,
                                                        )}
                                                    </span>
                                                    <span>
                                                        {dateLabel(
                                                            activity.event_date ??
                                                                activity.next_action_due_date,
                                                        )}
                                                    </span>
                                                </span>
                                            </span>
                                            <ChevronDown
                                                aria-hidden="true"
                                                className="size-4 shrink-0 text-slate-500 transition-transform group-data-[state=open]:rotate-180"
                                            />
                                        </button>
                                    </CollapsibleTrigger>
                                    {canEdit && (
                                        <div className="flex gap-1">
                                            {(activity.can_update ??
                                                ![
                                                    'pending_review',
                                                    'completed',
                                                ].includes(
                                                    activity.status ??
                                                        'planned',
                                                )) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Жазбаны өзгерту"
                                                    onClick={() =>
                                                        startEdit(activity)
                                                    }
                                                    disabled={
                                                        deleteForm.processing
                                                    }
                                                >
                                                    <Edit className="size-4" />
                                                </Button>
                                            )}
                                            {(activity.can_delete ??
                                                ![
                                                    'pending_review',
                                                    'completed',
                                                ].includes(
                                                    activity.status ??
                                                        'planned',
                                                )) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Жазбаны жою"
                                                    onClick={() =>
                                                        remove(activity.id)
                                                    }
                                                    disabled={
                                                        deleteForm.processing ||
                                                        deletingId ===
                                                            activity.id
                                                    }
                                                >
                                                    <Trash2 className="size-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <CollapsibleContent>
                                    <dl className="divide-y divide-slate-100 border-t border-slate-200 text-sm">
                                        <div className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
                                            <dt className="font-medium text-slate-500">
                                                Соңғы өткізілген іс-шара
                                            </dt>
                                            <dd className="break-words whitespace-pre-wrap">
                                                {activity.event_name ??
                                                    'Әлі өткізілмеген'}
                                            </dd>
                                        </div>
                                        <div className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
                                            <dt className="font-medium text-slate-500">
                                                Күні және нәтижесі
                                            </dt>
                                            <dd className="break-words whitespace-pre-wrap">
                                                {activity.event_date && (
                                                    <p className="mb-1 text-xs text-slate-500">
                                                        {dateLabel(
                                                            activity.event_date,
                                                        )}
                                                    </p>
                                                )}
                                                {activity.result ??
                                                    'Нәтиже әлі енгізілмеген'}
                                            </dd>
                                        </div>
                                        <div className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
                                            <dt className="font-medium text-slate-500">
                                                Келесі іс-шара
                                            </dt>
                                            <dd className="break-words whitespace-pre-wrap">
                                                {activity.next_action}
                                            </dd>
                                        </div>
                                        <div className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
                                            <dt className="flex items-center gap-2 font-medium text-slate-500">
                                                <CalendarClock className="size-4" />
                                                Орындалу мерзімі
                                            </dt>
                                            <dd>
                                                {dateLabel(
                                                    activity.next_action_due_date,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
                                            <dt className="flex items-center gap-2 font-medium text-slate-500">
                                                <Users className="size-4" />
                                                Жауапты адам
                                            </dt>
                                            <dd>
                                                {activity.responsible
                                                    ?.full_name ??
                                                    'Жауапты аккаунт жойылған'}
                                                {activity.responsible
                                                    ?.position && (
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {
                                                            activity.responsible
                                                                .position
                                                        }
                                                    </p>
                                                )}
                                            </dd>
                                        </div>
                                        {activity.report_result && (
                                            <div className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
                                                <dt className="font-medium text-slate-500">
                                                    Орындалу есебі
                                                </dt>
                                                <dd className="break-words whitespace-pre-wrap">
                                                    {activity.report_result}
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        {
                                                            activity.reporter
                                                                ?.full_name
                                                        }
                                                        {activity.reported_at
                                                            ? ` · ${dateLabel(activity.reported_at)}`
                                                            : ''}
                                                    </p>
                                                </dd>
                                            </div>
                                        )}
                                        {(activity.reviewed_at ||
                                            activity.reviewer_comment) && (
                                            <div className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
                                                <dt className="font-medium text-slate-500">
                                                    Куратордың тексеруі
                                                </dt>
                                                <dd className="break-words whitespace-pre-wrap">
                                                    {activity.reviewer_comment ??
                                                        (activity.status ===
                                                        'completed'
                                                            ? 'Нәтиже қабылданды'
                                                            : 'Толықтыруға қайтарылды')}
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        {
                                                            activity.reviewer
                                                                ?.full_name
                                                        }
                                                        {activity.reviewed_at
                                                            ? ` · ${dateLabel(activity.reviewed_at)}`
                                                            : ''}
                                                    </p>
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                    {!historical &&
                                        (activity.can_report ||
                                            activity.can_review) && (
                                            <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50/50 p-4">
                                                {activity.can_report && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            startReport(
                                                                activity,
                                                            )
                                                        }
                                                    >
                                                        {activity.status ===
                                                        'planned'
                                                            ? 'Жұмысты бастау'
                                                            : 'Нәтиже енгізу'}
                                                    </Button>
                                                )}
                                                {activity.can_review && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() =>
                                                            startReview(
                                                                activity,
                                                            )
                                                        }
                                                    >
                                                        Нәтижені тексеру
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </CardContent>
                </CollapsibleContent>
                {canEdit && (
                    <Dialog
                        open={open}
                        onOpenChange={(value) => {
                            if (!form.processing) setOpen(value);
                        }}
                    >
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                    {editing
                                        ? 'Жазбаны өзгерту'
                                        : 'Инвестор тарту жұмысын қосу'}
                                </DialogTitle>
                                <DialogDescription>
                                    Өткен іс-шара болса, күнін және нәтижесін
                                    енгізіңіз. Келесі іс-шараның мерзімі мен
                                    жауапты адамын белгілеңіз.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submit} className="space-y-4">
                                {Object.keys(form.errors).length > 0 && (
                                    <p
                                        role="alert"
                                        className="text-sm text-red-600"
                                    >
                                        Жазба сақталмады. Белгіленген өрістерді
                                        тексеріңіз.
                                    </p>
                                )}
                                <AttractionStageSelect
                                    value={form.data.attraction_stage}
                                    onChange={(value) =>
                                        form.setData('attraction_stage', value)
                                    }
                                    error={form.errors.attraction_stage}
                                />
                                {['handover', 'paused', 'declined'].includes(
                                    form.data.attraction_stage,
                                ) && (
                                    <p className="text-xs leading-relaxed text-slate-500">
                                        Сүйемелдеуге беру, уақытша тоқтату
                                        немесе бас тарту деректері{' '}
                                        <Link
                                            className="font-medium text-[#a9842f] underline underline-offset-2"
                                            href={investmentProjects.edit.url(
                                                projectId,
                                            )}
                                        >
                                            жобаны өзгерту бетінде
                                        </Link>{' '}
                                        толтырылады.
                                    </p>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-activity-status">
                                        Іс-шара мәртебесі
                                    </Label>
                                    <Select
                                        value={form.data.status}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'status',
                                                value as AttractionActivityStatus,
                                            )
                                        }
                                        disabled={[
                                            'pending_review',
                                            'completed',
                                        ].includes(form.data.status)}
                                    >
                                        <SelectTrigger id="attraction-activity-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ATTRACTION_ACTIVITY_STATUSES.filter(
                                                (status) =>
                                                    [
                                                        'planned',
                                                        'in_progress',
                                                        'cancelled',
                                                        form.data.status,
                                                    ].includes(status.value),
                                            ).map((status) => (
                                                <SelectItem
                                                    key={status.value}
                                                    value={status.value}
                                                >
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.status} />
                                    <p className="text-xs text-slate-500">
                                        Орындалған мәртебесі жауаптының есебі
                                        қабылданғаннан кейін қойылады.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-event">
                                        Соңғы өткізілген іс-шара
                                    </Label>
                                    <Input
                                        id="attraction-event"
                                        value={form.data.event_name}
                                        onChange={(event) =>
                                            form.setData(
                                                'event_name',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.event_name}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-date">
                                        Іс-шара күні
                                    </Label>
                                    <Input
                                        type="date"
                                        id="attraction-date"
                                        value={form.data.event_date}
                                        onChange={(event) =>
                                            form.setData(
                                                'event_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.event_date}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-result">
                                        Іс-шара нәтижесі
                                    </Label>
                                    <Textarea
                                        id="attraction-result"
                                        value={form.data.result}
                                        onChange={(event) =>
                                            form.setData(
                                                'result',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.result} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-next">
                                        Келесі іс-шара *
                                    </Label>
                                    <Textarea
                                        id="attraction-next"
                                        value={form.data.next_action}
                                        onChange={(event) =>
                                            form.setData(
                                                'next_action',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.next_action}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-due">
                                        Орындалу мерзімі *
                                    </Label>
                                    <Input
                                        type="date"
                                        id="attraction-due"
                                        value={form.data.next_action_due_date}
                                        onChange={(event) =>
                                            form.setData(
                                                'next_action_due_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={
                                            form.errors.next_action_due_date
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-responsible">
                                        Жауапты адам *
                                    </Label>
                                    <Select
                                        value={form.data.responsible_id}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'responsible_id',
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="attraction-responsible">
                                            <SelectValue placeholder="Жауаптыны таңдаңыз" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem
                                                    key={user.id}
                                                    value={user.id.toString()}
                                                >
                                                    {user.full_name}
                                                    {user.position
                                                        ? ` · ${user.position}`
                                                        : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={form.errors.responsible_id}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={form.processing}
                                        onClick={() => setOpen(false)}
                                    >
                                        Бас тарту
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                    >
                                        {form.processing
                                            ? 'Сақталуда…'
                                            : 'Сақтау'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
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
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Орындалу есебі</DialogTitle>
                                <DialogDescription>
                                    {reporting?.next_action}
                                </DialogDescription>
                            </DialogHeader>
                            <form className="space-y-4" onSubmit={submitReport}>
                                {Object.keys(reportForm.errors).length > 0 && (
                                    <p
                                        role="alert"
                                        className="text-sm text-red-600"
                                    >
                                        Есеп сақталмады. Белгіленген өрістерді
                                        тексеріңіз.
                                    </p>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-report-status">
                                        Жұмыстың жағдайы
                                    </Label>
                                    <Select
                                        value={reportForm.data.status}
                                        onValueChange={(value) =>
                                            reportForm.setData(
                                                'status',
                                                value as
                                                    | 'in_progress'
                                                    | 'pending_review',
                                            )
                                        }
                                    >
                                        <SelectTrigger id="attraction-report-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="in_progress">
                                                Орындалуда
                                            </SelectItem>
                                            <SelectItem value="pending_review">
                                                Нәтижені тексеруге жіберу
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={reportForm.errors.status}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-report-result">
                                        Орындалу нәтижесі{' '}
                                        {reportForm.data.status ===
                                        'pending_review'
                                            ? '*'
                                            : ''}
                                    </Label>
                                    <Textarea
                                        id="attraction-report-result"
                                        className="min-h-32"
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
                                        message={
                                            reportForm.errors.report_result
                                        }
                                    />
                                    <p className="text-xs text-slate-500">
                                        Тексеруге жіберілген есепті куратор
                                        немесе модератор қабылдайды.
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={reportForm.processing}
                                        onClick={() => setReporting(null)}
                                    >
                                        Бас тарту
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={reportForm.processing}
                                    >
                                        {reportForm.processing
                                            ? 'Сақталуда…'
                                            : reportForm.data.status ===
                                                'pending_review'
                                              ? 'Тексеруге жіберу'
                                              : 'Сақтау'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
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
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Нәтижені тексеру</DialogTitle>
                                <DialogDescription>
                                    {reviewing?.next_action}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                                <p className="font-medium text-[#0f1b3d]">
                                    Жауапты адамның есебі
                                </p>
                                <p className="mt-2 break-words whitespace-pre-wrap text-slate-600">
                                    {reviewing?.report_result}
                                </p>
                                <p className="mt-2 text-xs text-slate-500">
                                    {reviewing?.reporter?.full_name}
                                    {reviewing?.reported_at
                                        ? ` · ${dateLabel(reviewing.reported_at)}`
                                        : ''}
                                </p>
                            </div>
                            <form className="space-y-4" onSubmit={submitReview}>
                                {Object.keys(reviewForm.errors).length > 0 && (
                                    <p
                                        role="alert"
                                        className="text-sm text-red-600"
                                    >
                                        Шешім сақталмады. Белгіленген өрістерді
                                        тексеріңіз.
                                    </p>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-review-decision">
                                        Шешім
                                    </Label>
                                    <Select
                                        value={reviewForm.data.decision}
                                        onValueChange={(value) =>
                                            reviewForm.setData(
                                                'decision',
                                                value as
                                                    | 'approved'
                                                    | 'rejected',
                                            )
                                        }
                                    >
                                        <SelectTrigger id="attraction-review-decision">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="approved">
                                                Нәтижені қабылдау
                                            </SelectItem>
                                            <SelectItem value="rejected">
                                                Толықтыруға қайтару
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={reviewForm.errors.decision}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="attraction-review-comment">
                                        Түсініктеме{' '}
                                        {reviewForm.data.decision === 'rejected'
                                            ? '*'
                                            : ''}
                                    </Label>
                                    <Textarea
                                        id="attraction-review-comment"
                                        className="min-h-28"
                                        value={reviewForm.data.reviewer_comment}
                                        onChange={(event) =>
                                            reviewForm.setData(
                                                'reviewer_comment',
                                                event.target.value,
                                            )
                                        }
                                        placeholder={
                                            reviewForm.data.decision ===
                                            'rejected'
                                                ? 'Нені толықтыру қажет екенін жазыңыз'
                                                : 'Қажет болса, түсініктеме қалдырыңыз'
                                        }
                                    />
                                    <InputError
                                        message={
                                            reviewForm.errors.reviewer_comment
                                        }
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={reviewForm.processing}
                                        onClick={() => setReviewing(null)}
                                    >
                                        Бас тарту
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={reviewForm.processing}
                                    >
                                        {reviewForm.processing
                                            ? 'Сақталуда…'
                                            : reviewForm.data.decision ===
                                                'approved'
                                              ? 'Қабылдау'
                                              : 'Қайтару'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </Card>
        </Collapsible>
    );
}
