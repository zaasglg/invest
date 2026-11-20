import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    CheckCircle2,
    CircleDollarSign,
    ClipboardCheck,
    Clock3,
    FileText,
    FolderPlus,
    LandPlot,
    MessageSquareWarning,
    SearchCheck,
    Send,
    Sprout,
    UserCheck,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import InvestmentApplicationDetails from '@/components/investment-application-details';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import * as routes from '@/routes/investment-applications';
import type { InvestmentApplication, ZoneArea } from '@/types';

type Props = {
    application: InvestmentApplication;
    zoneCapacity: ZoneArea;
    actions: {
        can_start_review: boolean;
        can_request_clarification: boolean;
        can_approve: boolean;
        can_reject: boolean;
        can_set_schedule: boolean;
        can_convert: boolean;
        can_assign: boolean;
        can_request_sector_review: boolean;
        can_sector_approve: boolean;
        can_sector_reject: boolean;
    };
    attractionManagers?: {
        id: number;
        full_name: string;
        region_id?: number;
    }[];
    currentUserRole?: string | null;
    currentInvestSubRole?: string | null;
};

const sectorReviewLabels: Record<string, string> = {
    not_requested: 'Техникалық тексеруге жіберілмеген',
    pending: 'Техникалық қорытынды күтілуде',
    approved: 'Техникалық келісім берілді',
    rejected: 'Техникалық тексеруден қайтарылды',
};

function ReviewSectionCard({
    title,
    description,
    icon: Icon,
    action,
    children,
}: {
    title: string;
    description?: string;
    icon: LucideIcon;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-sand-light text-gold-dark">
                        <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="font-semibold text-navy">{title}</h2>
                        {description && (
                            <p className="mt-0.5 text-sm leading-5 text-slate-500">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="border-t border-slate-100 p-5 sm:p-6">
                {children}
            </div>
        </section>
    );
}

export default function ReviewShow({
    application,
    zoneCapacity,
    actions,
    attractionManagers = [],
    currentUserRole,
}: Props) {
    const currentYear = new Date().getFullYear();
    const sourceStartYear = Number(
        application.source_investment_project?.start_date?.slice(0, 4) || 0,
    );
    const sourceEndYear = Number(
        application.source_investment_project?.end_date?.slice(0, 4) || 0,
    );
    const decision = useForm({
        approved_area: String(
            application.approved_area ?? application.requested_area,
        ),
        planned_start_year: String(
            application.planned_start_year || sourceStartYear || currentYear,
        ),
        planned_end_year: String(
            application.planned_end_year ||
                Math.max(sourceEndYear, currentYear + 1),
        ),
        comment: '',
    });
    const assignment = useForm({
        manager_id: '',
    });
    const sectorDecision = useForm({
        approved_area: String(
            application.sector_approved_area ??
                application.requested_area ??
                '',
        ),
        comment: '',
    });
    const sectorReviewStatus =
        application.sector_review_status ?? 'not_requested';
    const isSuperadmin = currentUserRole === 'superadmin';
    const isUnassigned =
        application.assigned_to === null ||
        application.assigned_to === undefined;

    const postDecision = (
        event: FormEvent,
        action: 'approve' | 'set-schedule' | 'request-clarification' | 'reject',
    ) => {
        event.preventDefault();
        const yearsChanged =
            (application.planned_start_year !== null &&
                application.planned_start_year !== undefined &&
                Number(decision.data.planned_start_year) !==
                    application.planned_start_year) ||
            (application.planned_end_year !== null &&
                application.planned_end_year !== undefined &&
                Number(decision.data.planned_end_year) !==
                    application.planned_end_year);

        if (action !== 'approve' && decision.data.comment.trim().length === 0) {
            decision.setError(
                'comment',
                action === 'reject'
                    ? 'Өтінімді қабылдамау себебін жазыңыз.'
                    : action === 'set-schedule'
                      ? 'Мерзімді бекіту туралы түсініктеме жазыңыз.'
                      : 'Қандай мәліметті толықтыру керегін жазыңыз.',
            );
            document.getElementById('decision-comment')?.focus();

            return;
        }

        if (
            action === 'approve' &&
            yearsChanged &&
            decision.data.comment.trim().length === 0
        ) {
            decision.setError(
                'comment',
                'Өтінім беруші көрсеткен мерзімді өзгерту себебін жазыңыз.',
            );
            document.getElementById('decision-comment')?.focus();

            return;
        }

        decision.clearErrors();
        const url =
            action === 'approve'
                ? routes.approve.url(application.id)
                : action === 'set-schedule'
                  ? routes.setSchedule.url(application.id)
                  : action === 'reject'
                    ? routes.reject.url(application.id)
                    : routes.requestClarification.url(application.id);

        decision.post(url, { preserveScroll: true });
    };

    const assignApplication = () => {
        if (isSuperadmin && !assignment.data.manager_id) {
            assignment.setError('manager_id', 'Жауапты менеджерді таңдаңыз.');

            return;
        }

        assignment.clearErrors();
        assignment.post(routes.assignToMe.url(application.id), {
            preserveScroll: true,
        });
    };

    const postSectorDecision = (
        event: FormEvent,
        action: 'approve' | 'reject',
    ) => {
        event.preventDefault();

        if (
            action === 'approve' &&
            (!sectorDecision.data.approved_area ||
                Number(sectorDecision.data.approved_area) <= 0)
        ) {
            sectorDecision.setError(
                'approved_area',
                'Келісілген жер көлемін енгізіңіз.',
            );
            document.getElementById('sector-approved-area')?.focus();

            return;
        }

        if (
            action === 'reject' &&
            sectorDecision.data.comment.trim().length === 0
        ) {
            sectorDecision.setError(
                'comment',
                'Техникалық тексеруден қайтару себебін жазыңыз.',
            );
            document.getElementById('sector-review-comment')?.focus();

            return;
        }

        sectorDecision.clearErrors();
        sectorDecision.post(
            action === 'approve'
                ? routes.sectorApprove.url(application.id)
                : routes.sectorReject.url(application.id),
            { preserveScroll: true },
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Инвестор өтінімдері',
                    href: routes.index.url(),
                },
                {
                    title: application.application_number,
                    href: routes.show.url(application.id),
                },
            ]}
        >
            <Head title={application.application_number} />

            <div className="page-surface flex min-w-0 flex-col gap-5 sm:gap-6">
                <PageHeader
                    eyebrow={application.application_number}
                    title={
                        application.project_name || 'Атауы енгізілмеген жоба'
                    }
                    subtitle={`${application.zone_type_label} · ${application.zoneable?.name ?? 'Аймақ'} · ${application.application_kind_label}`}
                    icon={<FileText className="size-5" />}
                    badge={
                        <ApplicationStatusBadge
                            status={application.status}
                            label={application.status_label}
                        />
                    }
                    action={
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Link href={routes.index.url()}>
                                <Button variant="outline">
                                    <ArrowLeft /> Тізімге
                                </Button>
                            </Link>

                            {actions.can_assign &&
                                !isSuperadmin &&
                                isUnassigned && (
                                    <Button
                                        disabled={assignment.processing}
                                        className="bg-navy text-white hover:bg-navy-light"
                                        onClick={assignApplication}
                                    >
                                        <UserCheck /> Өзіме қабылдау
                                    </Button>
                                )}

                            {actions.can_start_review && (
                                <Button
                                    className="bg-gold text-white shadow-[0_10px_24px_-12px_rgba(154,125,53,0.9)] hover:bg-gold-dark"
                                    onClick={() =>
                                        router.post(
                                            routes.startReview.url(
                                                application.id,
                                            ),
                                        )
                                    }
                                >
                                    <SearchCheck /> Қарауға алу
                                </Button>
                            )}

                            {actions.can_convert && (
                                <Button
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    onClick={() =>
                                        confirm(
                                            application.application_kind ===
                                                'expansion'
                                                ? 'Өтінімдегі көрсеткіштер бар жобаға қосыла ма?'
                                                : 'Компания байланыстырылып, инвестициялық жоба құрыла ма?',
                                        ) &&
                                        router.post(
                                            routes.convert.url(application.id),
                                        )
                                    }
                                >
                                    <FolderPlus />{' '}
                                    {application.application_kind ===
                                    'expansion'
                                        ? 'Жобаны кеңейту'
                                        : 'Жобаға айналдыру'}
                                </Button>
                            )}
                        </div>
                    }
                />

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        {
                            label: 'Жалпы аумақ',
                            value: zoneCapacity.total,
                            icon: LandPlot,
                            valueClass: 'text-navy',
                            iconClass: 'bg-navy text-white',
                        },
                        {
                            label: 'Бос аумақ',
                            value: zoneCapacity.available,
                            icon: Sprout,
                            valueClass: 'text-emerald-700',
                            iconClass:
                                'border border-emerald-200 bg-emerald-50 text-emerald-700',
                        },
                        {
                            label: 'Резервте',
                            value: zoneCapacity.reserved,
                            icon: Clock3,
                            valueClass: 'text-amber-700',
                            iconClass:
                                'border border-amber-200 bg-amber-50 text-amber-700',
                        },
                        {
                            label: 'Бос емес',
                            value: zoneCapacity.occupied,
                            icon: Building2,
                            valueClass: 'text-slate-700',
                            iconClass: 'bg-slate-700 text-white',
                        },
                    ].map((metric) => (
                        <div
                            key={metric.label}
                            className="metric-panel flex min-w-0 items-center justify-between gap-4 p-5 sm:p-6"
                        >
                            <div className="min-w-0">
                                <h2 className="text-xs font-bold text-slate-400 uppercase">
                                    {metric.label}
                                </h2>
                                <p
                                    className={`mt-2 text-2xl font-extrabold tabular-nums ${metric.valueClass}`}
                                >
                                    {new Intl.NumberFormat('kk-KZ', {
                                        maximumFractionDigits: 2,
                                    }).format(metric.value)}{' '}
                                    га
                                </p>
                            </div>
                            <span
                                className={`flex size-11 shrink-0 items-center justify-center rounded-md ${metric.iconClass}`}
                            >
                                <metric.icon className="size-5" />
                            </span>
                        </div>
                    ))}
                </section>

                <ReviewSectionCard
                    title="Өтінім паспорты"
                    description="Жоба бойынша негізгі көрсеткіштер"
                    icon={ClipboardCheck}
                >
                    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 p-4">
                            <dt className="text-xs font-medium text-slate-500">
                                Компания
                            </dt>
                            <dd className="mt-2 font-bold break-words text-navy">
                                {application.company_name || 'Көрсетілмеген'}
                            </dd>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4">
                            <dt className="text-xs font-medium text-slate-500">
                                Аймақ
                            </dt>
                            <dd className="mt-2 font-bold break-words text-navy">
                                {application.zone_type_label} ·{' '}
                                {application.zoneable?.name ?? 'Көрсетілмеген'}
                            </dd>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4">
                            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                <LandPlot className="size-3.5" /> Сұралған аумақ
                            </dt>
                            <dd className="mt-2 font-bold text-navy tabular-nums">
                                {application.requested_area ?? '—'} га
                            </dd>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4">
                            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                <CircleDollarSign className="size-3.5" />
                                Инвестиция
                            </dt>
                            <dd className="mt-2 font-bold text-navy tabular-nums">
                                {application.investment_amount !== null &&
                                application.investment_amount !== undefined
                                    ? `${new Intl.NumberFormat('kk-KZ', {
                                          maximumFractionDigits: 2,
                                      }).format(
                                          Number(application.investment_amount),
                                      )} ₸`
                                    : '—'}
                            </dd>
                        </div>
                    </dl>
                </ReviewSectionCard>

                {(application.assigned_manager ||
                    sectorReviewStatus !== 'not_requested' ||
                    actions.can_assign ||
                    actions.can_request_sector_review ||
                    actions.can_sector_approve ||
                    actions.can_sector_reject) && (
                    <ReviewSectionCard
                        title="Өтінімді бөлу және техникалық келісім"
                        description="Жауапты менеджер мен салалық бөлімнің техникалық қорытындысы осы жерде көрсетіледі."
                        icon={UserCheck}
                        action={
                            actions.can_request_sector_review ? (
                                <Button
                                    className="bg-sky-600 text-white hover:bg-sky-700"
                                    onClick={() =>
                                        confirm(
                                            'Өтінімді салалық бөлімнің техникалық тексеруіне жібересіз бе?',
                                        ) &&
                                        router.post(
                                            routes.requestSectorReview.url(
                                                application.id,
                                            ),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <Send /> Техникалық тексеруге жіберу
                                </Button>
                            ) : undefined
                        }
                    >
                        {actions.can_assign && isSuperadmin && (
                            <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50/60 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <Label htmlFor="assignment-manager">
                                            Жауапты менеджер
                                        </Label>
                                        <Select
                                            value={assignment.data.manager_id}
                                            onValueChange={(value) =>
                                                assignment.setData(
                                                    'manager_id',
                                                    value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="assignment-manager"
                                                className="h-11 bg-white"
                                            >
                                                <SelectValue placeholder="Менеджерді таңдаңыз" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {attractionManagers.map(
                                                    (manager) => (
                                                        <SelectItem
                                                            key={manager.id}
                                                            value={String(
                                                                manager.id,
                                                            )}
                                                        >
                                                            {manager.full_name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {assignment.errors.manager_id && (
                                            <p className="text-sm text-rose-600">
                                                {assignment.errors.manager_id}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        disabled={assignment.processing}
                                        className="bg-sky-600 text-white hover:bg-sky-700"
                                        onClick={assignApplication}
                                    >
                                        <UserCheck /> Менеджерге бекіту
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                    Жауапты менеджер
                                </p>
                                <p className="mt-2 font-bold text-navy">
                                    {application.assigned_manager?.full_name ??
                                        'Әлі бекітілмеген'}
                                </p>
                                {application.assigned_at && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        {new Date(
                                            application.assigned_at,
                                        ).toLocaleString('kk-KZ')}
                                    </p>
                                )}
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                    Техникалық келісім
                                </p>
                                <ApplicationStatusBadge
                                    status={sectorReviewStatus}
                                    label={
                                        application.sector_review_status_label ??
                                        sectorReviewLabels[
                                            sectorReviewStatus
                                        ] ??
                                        sectorReviewStatus
                                    }
                                    className="mt-2"
                                />
                                {application.sector_review_requester && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        Жіберген:{' '}
                                        {
                                            application.sector_review_requester
                                                .full_name
                                        }
                                    </p>
                                )}
                                {application.sector_reviewer && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        Сарапшы:{' '}
                                        {application.sector_reviewer.full_name}
                                    </p>
                                )}
                            </div>
                        </div>

                        {(application.sector_approved_area ||
                            application.sector_review_comment) && (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {application.sector_approved_area && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                                        <p className="text-xs font-semibold text-emerald-700">
                                            Техникалық келісілген аумақ
                                        </p>
                                        <p className="mt-1 text-lg font-extrabold text-emerald-950">
                                            {application.sector_approved_area}{' '}
                                            га
                                        </p>
                                    </div>
                                )}
                                {application.sector_review_comment && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-semibold text-slate-500">
                                            Салалық бөлімнің түсініктемесі
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-navy">
                                            {application.sector_review_comment}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {(actions.can_sector_approve ||
                            actions.can_sector_reject) && (
                            <form className="mt-5 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-3">
                                {actions.can_sector_approve && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sector-approved-area">
                                            Келісілетін аумақ (га)
                                        </Label>
                                        <Input
                                            id="sector-approved-area"
                                            className="h-11 bg-slate-50/70"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            max={
                                                application.requested_area ??
                                                undefined
                                            }
                                            value={
                                                sectorDecision.data
                                                    .approved_area
                                            }
                                            onChange={(event) =>
                                                sectorDecision.setData(
                                                    'approved_area',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        {sectorDecision.errors
                                            .approved_area && (
                                            <p className="text-sm text-rose-600">
                                                {
                                                    sectorDecision.errors
                                                        .approved_area
                                                }
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div
                                    className={
                                        actions.can_sector_approve
                                            ? 'space-y-1.5 lg:col-span-2'
                                            : 'space-y-1.5 lg:col-span-3'
                                    }
                                >
                                    <Label htmlFor="sector-review-comment">
                                        Техникалық қорытынды
                                        {actions.can_sector_reject && (
                                            <span className="font-normal text-slate-400">
                                                {' '}
                                                (қайтару кезінде міндетті)
                                            </span>
                                        )}
                                    </Label>
                                    <Textarea
                                        id="sector-review-comment"
                                        className="min-h-24 resize-y bg-slate-50/70"
                                        value={sectorDecision.data.comment}
                                        onChange={(event) =>
                                            sectorDecision.setData(
                                                'comment',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Техникалық қорытындыны немесе қайтару себебін жазыңыз"
                                    />
                                    {sectorDecision.errors.comment && (
                                        <p className="text-sm text-rose-600">
                                            {sectorDecision.errors.comment}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 lg:col-span-3">
                                    {actions.can_sector_approve && (
                                        <Button
                                            type="button"
                                            disabled={sectorDecision.processing}
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                            onClick={(event) =>
                                                postSectorDecision(
                                                    event,
                                                    'approve',
                                                )
                                            }
                                        >
                                            <CheckCircle2 /> Техникалық келісім
                                            беру
                                        </Button>
                                    )}
                                    {actions.can_sector_reject && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            disabled={sectorDecision.processing}
                                            onClick={(event) =>
                                                postSectorDecision(
                                                    event,
                                                    'reject',
                                                )
                                            }
                                        >
                                            <XCircle /> Қайтару
                                        </Button>
                                    )}
                                </div>
                            </form>
                        )}
                    </ReviewSectionCard>
                )}

                {application.status === 'approved' &&
                    application.reserved_until && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                            <div className="flex items-start gap-4">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                    <Clock3 className="size-5" />
                                </span>
                                <div>
                                    <p className="font-bold text-emerald-950">
                                        Жер резервке қойылды
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                                        {application.approved_area} га жер{' '}
                                        {new Date(
                                            application.reserved_until,
                                        ).toLocaleString('kk-KZ')}{' '}
                                        дейін осы өтінімге бекітілген.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                {(actions.can_approve ||
                    actions.can_set_schedule ||
                    actions.can_request_clarification ||
                    actions.can_reject) && (
                    <ReviewSectionCard
                        title="Сарапшы шешімі"
                        description={
                            actions.can_set_schedule
                                ? 'Бұрын қабылданған өтінімнің мерзімін бекіткеннен кейін оны жобаға айналдыруға болады.'
                                : 'Мақұлданған гектар резервке қойылады. Толықтыру немесе бас тарту кезінде түсініктеме міндетті.'
                        }
                        icon={ClipboardCheck}
                    >
                        <form className="grid gap-5 lg:grid-cols-3">
                            {(actions.can_approve ||
                                actions.can_set_schedule) && (
                                <div className="space-y-4 rounded-lg border border-amber-200/80 bg-amber-50/60 p-4 lg:row-span-2">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white">
                                            <CheckCircle2 className="size-4" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold text-navy">
                                                {actions.can_set_schedule
                                                    ? 'Жобаның мерзімі'
                                                    : 'Бекітілетін жер'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {actions.can_set_schedule
                                                    ? 'Бұрын қабылданған өтінім үшін мерзімді бекітіңіз'
                                                    : 'Сұралған көлемнен аспауы керек'}
                                            </p>
                                        </div>
                                    </div>

                                    {actions.can_approve && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="approved-area">
                                                Қабылданатын аумақ (га)
                                            </Label>
                                            <Input
                                                id="approved-area"
                                                className="h-11 bg-white"
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                max={Math.min(
                                                    Number(
                                                        application.requested_area,
                                                    ),
                                                    zoneCapacity.available,
                                                )}
                                                value={
                                                    decision.data.approved_area
                                                }
                                                onChange={(event) =>
                                                    decision.setData(
                                                        'approved_area',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            {decision.errors.approved_area && (
                                                <p className="text-sm text-rose-600">
                                                    {
                                                        decision.errors
                                                            .approved_area
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="planned-start-year">
                                                Басталу жылы
                                            </Label>
                                            <Input
                                                id="planned-start-year"
                                                className="h-11 bg-white"
                                                type="number"
                                                min={Math.min(
                                                    currentYear,
                                                    application.planned_start_year ??
                                                        currentYear,
                                                )}
                                                max="2100"
                                                disabled={
                                                    application.application_kind ===
                                                        'expansion' &&
                                                    Boolean(
                                                        application
                                                            .source_investment_project
                                                            ?.start_date,
                                                    )
                                                }
                                                value={
                                                    decision.data
                                                        .planned_start_year
                                                }
                                                onChange={(event) =>
                                                    decision.setData(
                                                        'planned_start_year',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            {decision.errors
                                                .planned_start_year && (
                                                <p className="text-sm text-rose-600">
                                                    {
                                                        decision.errors
                                                            .planned_start_year
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="planned-end-year">
                                                Аяқталу жылы
                                            </Label>
                                            <Input
                                                id="planned-end-year"
                                                className="h-11 bg-white"
                                                type="number"
                                                min={Math.max(
                                                    currentYear,
                                                    Number(
                                                        decision.data
                                                            .planned_start_year ||
                                                            0,
                                                    ),
                                                )}
                                                max="2100"
                                                value={
                                                    decision.data
                                                        .planned_end_year
                                                }
                                                onChange={(event) =>
                                                    decision.setData(
                                                        'planned_end_year',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            {decision.errors
                                                .planned_end_year && (
                                                <p className="text-sm text-rose-600">
                                                    {
                                                        decision.errors
                                                            .planned_end_year
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {actions.can_approve && (
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-amber-200/70">
                                                <p className="text-slate-400">
                                                    Қазір бос
                                                </p>
                                                <p className="mt-1 font-extrabold text-emerald-700">
                                                    {zoneCapacity.available} га
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-amber-200/70">
                                                <p className="text-slate-400">
                                                    Сұралғаны
                                                </p>
                                                <p className="mt-1 font-extrabold text-navy">
                                                    {application.requested_area}{' '}
                                                    га
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {actions.can_approve &&
                                        zoneCapacity.available <= 0 && (
                                            <p className="rounded-xl border border-amber-200 bg-white p-3 text-sm leading-5 text-amber-900">
                                                Аймақта бос жер қалмаған. Бұл
                                                өтінімді қазір резервтеу мүмкін
                                                емес.
                                            </p>
                                        )}
                                </div>
                            )}

                            <div
                                className={
                                    actions.can_approve ||
                                    actions.can_set_schedule
                                        ? 'space-y-1.5 lg:col-span-2'
                                        : 'space-y-1.5 lg:col-span-3'
                                }
                            >
                                <Label htmlFor="decision-comment">
                                    Түсініктеме
                                    {(actions.can_set_schedule ||
                                        actions.can_reject ||
                                        actions.can_request_clarification) && (
                                        <span className="text-rose-600">
                                            {' '}
                                            *
                                        </span>
                                    )}
                                </Label>
                                <Textarea
                                    id="decision-comment"
                                    className="min-h-32 resize-y bg-slate-50/70"
                                    rows={5}
                                    value={decision.data.comment}
                                    onChange={(event) =>
                                        decision.setData(
                                            'comment',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Сараптама қорытындысын немесе толықтыру қажет тармақтарды жазыңыз"
                                />
                                {decision.errors.comment && (
                                    <p className="text-sm text-rose-600">
                                        {decision.errors.comment}
                                    </p>
                                )}
                            </div>

                            <div
                                className={
                                    actions.can_approve ||
                                    actions.can_set_schedule
                                        ? 'flex flex-wrap gap-2 lg:col-span-2'
                                        : 'flex flex-wrap gap-2 lg:col-span-3'
                                }
                            >
                                {actions.can_approve && (
                                    <Button
                                        type="button"
                                        disabled={
                                            decision.processing ||
                                            zoneCapacity.available <= 0
                                        }
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        onClick={(event) =>
                                            postDecision(event, 'approve')
                                        }
                                    >
                                        <CheckCircle2 /> Қабылдау және резервтеу
                                    </Button>
                                )}

                                {actions.can_set_schedule && (
                                    <Button
                                        type="button"
                                        disabled={decision.processing}
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        onClick={(event) =>
                                            postDecision(event, 'set-schedule')
                                        }
                                    >
                                        <CheckCircle2 /> Мерзімді бекіту
                                    </Button>
                                )}

                                {actions.can_request_clarification && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={decision.processing}
                                        className="border-amber-300 text-amber-800 hover:bg-amber-50"
                                        onClick={(event) =>
                                            postDecision(
                                                event,
                                                'request-clarification',
                                            )
                                        }
                                    >
                                        <MessageSquareWarning /> Толықтыруға
                                        қайтару
                                    </Button>
                                )}

                                {actions.can_reject && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={decision.processing}
                                        onClick={(event) =>
                                            postDecision(event, 'reject')
                                        }
                                    >
                                        <XCircle /> Қабылдамау
                                    </Button>
                                )}
                            </div>
                        </form>
                    </ReviewSectionCard>
                )}

                <InvestmentApplicationDetails
                    application={application}
                    showApplicant
                />
            </div>
        </AppLayout>
    );
}
