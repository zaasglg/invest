import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    BriefcaseBusiness,
    Clock3,
    Edit3,
    FileCheck2,
    LandPlot,
    MapPin,
    Send,
    Undo2,
    UsersRound,
} from 'lucide-react';

import {
    ApplicantHero,
    ApplicantMetricCard,
} from '@/components/applicant/applicant-ui';
import ApplicationStatusBadge from '@/components/application-status-badge';
import InvestmentApplicationDetails from '@/components/investment-application-details';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/page';
import AppLayout from '@/layouts/app-layout';
import * as applicationRoutes from '@/routes/applicant/applications';
import type { InvestmentApplication } from '@/types';

export default function ApplicationShow({
    application,
}: {
    application: InvestmentApplication;
}) {
    const withdraw = () => {
        if (
            confirm(
                'Өтінімді кері қайтару керек пе? Белсенді резерв босатылады.',
            )
        ) {
            router.post(applicationRoutes.withdraw.url(application.id));
        }
    };
    const amount = new Intl.NumberFormat('kk-KZ', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(application.investment_amount));

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Менің өтінімдерім',
                    href: applicationRoutes.index.url(),
                },
                {
                    title: application.application_number,
                    href: applicationRoutes.show.url(application.id),
                },
            ]}
        >
            <Head title={application.application_number} />
            <PageContainer width="wide">
                <ApplicantHero
                    eyebrow={application.application_number}
                    title={application.project_name}
                    icon={FileCheck2}
                    badge={
                        <ApplicationStatusBadge
                            status={application.status}
                            label={application.status_label}
                            className="border-white/15 shadow-sm"
                        />
                    }
                    subtitle={`Өтінім ${new Date(application.created_at).toLocaleDateString('kk-KZ')} күні жасалды.`}
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Link href={applicationRoutes.index.url()}>
                                <Button
                                    variant="outline"
                                    className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                                >
                                    <ArrowLeft /> Тізімге
                                </Button>
                            </Link>
                            {application.is_editable && (
                                <Link
                                    href={applicationRoutes.edit.url(
                                        application.id,
                                    )}
                                >
                                    <Button
                                        variant="outline"
                                        className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                                    >
                                        <Edit3 /> Өңдеу
                                    </Button>
                                </Link>
                            )}
                            {application.status === 'draft' && (
                                <Button
                                    className="bg-gold text-white hover:bg-gold-dark"
                                    onClick={() =>
                                        router.post(
                                            applicationRoutes.submit.url(
                                                application.id,
                                            ),
                                        )
                                    }
                                >
                                    <Send /> Жіберу
                                </Button>
                            )}
                            {application.is_withdrawable && (
                                <Button
                                    variant="outline"
                                    className="border-rose-300/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25 hover:text-white"
                                    onClick={withdraw}
                                >
                                    <Undo2 /> Кері қайтару
                                </Button>
                            )}
                        </div>
                    }
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <ApplicantMetricCard
                        label="Сұралған аумақ"
                        value={`${application.requested_area} га`}
                        description="Инвестициялық аймақтан"
                        icon={LandPlot}
                        tone="emerald"
                    />
                    <ApplicantMetricCard
                        label="Инвестиция"
                        value={`${amount} ₸`}
                        description="Жоспарланған инвестиция"
                        icon={Banknote}
                        tone="amber"
                    />
                    <ApplicantMetricCard
                        label="Жұмыс орны"
                        value={application.jobs_count}
                        description="Жоспарланған жаңа орын"
                        icon={UsersRound}
                        tone="sky"
                    />
                    <ApplicantMetricCard
                        label="Таңдалған аймақ"
                        value={application.zone_type_label}
                        description={
                            application.zoneable?.name ?? 'Аймақ көрсетілмеген'
                        }
                        icon={MapPin}
                        tone="violet"
                    />
                </div>

                {application.status === 'approved' &&
                    application.reserved_until && (
                        <div className="relative flex gap-4 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 p-5 text-emerald-900 shadow-sm">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                                <Clock3 className="size-5" />
                            </span>
                            <div>
                                <p className="font-semibold">
                                    {application.approved_area} га жер уақытша
                                    резервке қойылды
                                </p>
                                <p className="mt-1 text-sm">
                                    Резерв мерзімі:{' '}
                                    {new Date(
                                        application.reserved_until,
                                    ).toLocaleString('kk-KZ')}{' '}
                                    дейін. Осы мерзімде сарапшы өтінімді
                                    инвестициялық жобаға айналдырады.
                                </p>
                            </div>
                        </div>
                    )}

                {application.status === 'needs_clarification' && (
                    <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50/50 p-5 text-sm text-amber-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                                <BriefcaseBusiness className="size-[18px]" />
                            </span>
                            <div>
                                <p className="font-bold">
                                    Өтінімді толықтыру қажет
                                </p>
                                <p className="mt-1 whitespace-pre-line">
                                    {application.reviewer_comment}
                                </p>
                            </div>
                        </div>
                        <Link
                            href={applicationRoutes.edit.url(application.id)}
                            className="shrink-0"
                        >
                            <Button size="sm">
                                <Edit3 /> Толықтыру
                            </Button>
                        </Link>
                    </div>
                )}

                <InvestmentApplicationDetails
                    application={application}
                    applicantStyle
                />
            </PageContainer>
        </AppLayout>
    );
}
