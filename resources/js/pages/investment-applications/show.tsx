import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FolderPlus,
    MessageSquareWarning,
    SearchCheck,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import type { FormEvent } from 'react';

import {
    ApplicantHero,
    ApplicantSectionCard,
} from '@/components/applicant/applicant-ui';
import ApplicationStatusBadge from '@/components/application-status-badge';
import InvestmentApplicationDetails from '@/components/investment-application-details';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/ui/page';
import { Textarea } from '@/components/ui/textarea';
import ZoneAreaSummary from '@/components/zone-area-summary';
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
        can_convert: boolean;
    };
};

export default function ReviewShow({
    application,
    zoneCapacity,
    actions,
}: Props) {
    const decision = useForm({
        approved_area: String(
            application.approved_area ?? application.requested_area,
        ),
        comment: '',
    });

    const postDecision = (
        event: FormEvent,
        action: 'approve' | 'request-clarification' | 'reject',
    ) => {
        event.preventDefault();
        const url =
            action === 'approve'
                ? routes.approve.url(application.id)
                : action === 'reject'
                  ? routes.reject.url(application.id)
                  : routes.requestClarification.url(application.id);

        decision.post(url, { preserveScroll: true });
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

            <PageContainer width="wide">
                <ApplicantHero
                    eyebrow={application.application_number}
                    title={application.project_name}
                    subtitle={`${application.zone_type_label} · ${application.zoneable?.name ?? 'Аймақ'} · ${application.application_kind_label}`}
                    icon={ShieldCheck}
                    badge={
                        <ApplicationStatusBadge
                            status={application.status}
                            label={application.status_label}
                        />
                    }
                    action={
                        <>
                            <Link href={routes.index.url()}>
                                <Button className="border border-white/15 bg-white/10 text-white shadow-none backdrop-blur-sm hover:bg-white/20 hover:text-white">
                                    <ArrowLeft /> Тізімге
                                </Button>
                            </Link>

                            {actions.can_start_review && (
                                <Button
                                    className="bg-gold text-white shadow-[0_12px_28px_-14px_rgba(200,164,78,0.8)] hover:bg-gold-dark"
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
                                    className="bg-emerald-600 text-white shadow-[0_12px_28px_-14px_rgba(5,150,105,0.8)] hover:bg-emerald-700"
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
                        </>
                    }
                />

                <ZoneAreaSummary area={zoneCapacity} />

                {application.status === 'approved' &&
                    application.reserved_until && (
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 p-5 shadow-[0_18px_45px_-40px_rgba(5,150,105,0.65)]">
                            <div className="pointer-events-none absolute -right-8 -bottom-12 size-32 rounded-full bg-emerald-500/10" />
                            <div className="relative flex items-start gap-4">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
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
                    actions.can_request_clarification ||
                    actions.can_reject) && (
                    <ApplicantSectionCard
                        title="Сарапшы шешімі"
                        description="Мақұлданған гектар резервке қойылады. Толықтыру немесе бас тарту кезінде түсініктеме міндетті."
                        icon={ClipboardCheck}
                        tone="amber"
                    >
                        <form className="grid gap-5 lg:grid-cols-3">
                            {actions.can_approve && (
                                <div className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 lg:row-span-2">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white">
                                            <CheckCircle2 className="size-4" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold text-navy">
                                                Бекітілетін жер
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Сұралған көлемнен аспауы керек
                                            </p>
                                        </div>
                                    </div>

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
                                            value={decision.data.approved_area}
                                            onChange={(event) =>
                                                decision.setData(
                                                    'approved_area',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        {decision.errors.approved_area && (
                                            <p className="text-sm text-rose-600">
                                                {decision.errors.approved_area}
                                            </p>
                                        )}
                                    </div>

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
                                                {application.requested_area} га
                                            </p>
                                        </div>
                                    </div>

                                    {zoneCapacity.available <= 0 && (
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
                                    actions.can_approve
                                        ? 'space-y-1.5 lg:col-span-2'
                                        : 'space-y-1.5 lg:col-span-3'
                                }
                            >
                                <Label htmlFor="decision-comment">
                                    Түсініктеме
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
                                    actions.can_approve
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
                    </ApplicantSectionCard>
                )}

                <InvestmentApplicationDetails
                    application={application}
                    showApplicant
                    applicantStyle
                />
            </PageContainer>
        </AppLayout>
    );
}
