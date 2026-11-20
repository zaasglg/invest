import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    BriefcaseBusiness,
    Clock3,
    Edit3,
    FileCheck2,
    FolderKanban,
    LandPlot,
    MapPin,
    Send,
    Undo2,
    UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import InvestmentApplicationDetails from '@/components/investment-application-details';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page';
import AppLayout from '@/layouts/app-layout';
import * as applicationRoutes from '@/routes/applicant/applications';
import * as investmentProjectRoutes from '@/routes/investment-projects';
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
            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <PageHeader
                    eyebrow={application.application_number}
                    title={
                        application.project_name || 'Атауы енгізілмеген жоба'
                    }
                    icon={<FileCheck2 className="size-5" />}
                    badge={
                        <ApplicationStatusBadge
                            status={application.status}
                            label={application.status_label}
                        />
                    }
                    subtitle={`Өтінім ${new Date(application.created_at).toLocaleDateString('kk-KZ')} күні жасалды.`}
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Link href={applicationRoutes.index.url()}>
                                <Button variant="outline">
                                    <ArrowLeft /> Тізімге
                                </Button>
                            </Link>
                            {application.status === 'converted_to_project' &&
                                application.investment_project && (
                                    <Link
                                        href={investmentProjectRoutes.show.url(
                                            application.investment_project.id,
                                        )}
                                    >
                                        <Button className="bg-gold text-white hover:bg-gold-dark">
                                            <FolderKanban /> Жобаға өту
                                        </Button>
                                    </Link>
                                )}
                            {application.is_editable &&
                                application.status !== 'draft' && (
                                    <Link
                                        href={applicationRoutes.edit.url(
                                            application.id,
                                        )}
                                    >
                                        <Button variant="outline">
                                            <Edit3 /> Өңдеу
                                        </Button>
                                    </Link>
                                )}
                            {application.status === 'draft' && (
                                <Link
                                    href={applicationRoutes.edit.url(
                                        application.id,
                                    )}
                                >
                                    <Button className="bg-gold text-white hover:bg-gold-dark">
                                        <Send /> Толтырып жіберу
                                    </Button>
                                </Link>
                            )}
                            {application.is_withdrawable && (
                                <Button
                                    variant="outline"
                                    className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                    onClick={withdraw}
                                >
                                    <Undo2 /> Кері қайтару
                                </Button>
                            )}
                        </div>
                    }
                />

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricPanel
                        label="Сұралған аумақ"
                        value={
                            application.requested_area !== null
                                ? `${application.requested_area} га`
                                : '—'
                        }
                        description="Инвестициялық аймақтан"
                        icon={LandPlot}
                    />
                    <MetricPanel
                        label="Инвестиция"
                        value={`${amount} ₸`}
                        description="Жоспарланған инвестиция"
                        icon={Banknote}
                        accent
                    />
                    <MetricPanel
                        label="Жұмыс орны"
                        value={application.jobs_count ?? '—'}
                        description="Жоспарланған жаңа орын"
                        icon={UsersRound}
                    />
                    <MetricPanel
                        label="Таңдалған аймақ"
                        value={application.zone_type_label}
                        description={
                            application.zoneable?.name ?? 'Аймақ көрсетілмеген'
                        }
                        icon={MapPin}
                    />
                </section>

                {application.status === 'approved' &&
                    application.reserved_until && (
                        <div className="relative flex gap-4 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-emerald-900 shadow-sm">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
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
                    <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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

                <InvestmentApplicationDetails application={application} />
            </div>
        </AppLayout>
    );
}

function MetricPanel({
    label,
    value,
    description,
    icon: Icon,
    accent = false,
}: {
    label: string;
    value: ReactNode;
    description: string;
    icon: LucideIcon;
    accent?: boolean;
}) {
    return (
        <div className="metric-panel flex items-center justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
                <h2 className="text-xs font-bold text-slate-400 uppercase">
                    {label}
                </h2>
                <p
                    className={`mt-2 truncate text-2xl font-extrabold tabular-nums sm:text-3xl ${accent ? 'text-gold-dark' : 'text-navy'}`}
                >
                    {value}
                </p>
                <p className="mt-2 truncate text-xs text-slate-500">
                    {description}
                </p>
            </div>
            <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-md ${accent ? 'border border-gold/20 bg-gold/10 text-gold-dark' : 'bg-navy text-white shadow-lg shadow-navy/15'}`}
            >
                <Icon className="size-5" />
            </span>
        </div>
    );
}
