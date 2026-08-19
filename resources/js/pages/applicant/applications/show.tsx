import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Clock3, Edit3, Send, Undo2 } from 'lucide-react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import InvestmentApplicationDetails from '@/components/investment-application-details';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/ui/page';
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
            <PageContainer width="standard">
                <PageHeader
                    eyebrow={application.application_number}
                    title={application.project_name}
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
                            {application.is_editable && (
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
                                <Button
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
                                    variant="destructive"
                                    onClick={withdraw}
                                >
                                    <Undo2 /> Кері қайтару
                                </Button>
                            )}
                        </div>
                    }
                />

                {application.status === 'approved' &&
                    application.reserved_until && (
                        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                            <Clock3 className="mt-0.5 size-5 shrink-0" />
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
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                        <p className="font-semibold">
                            Өтінімді толықтыру қажет
                        </p>
                        <p className="mt-1 whitespace-pre-line">
                            {application.reviewer_comment}
                        </p>
                        <Link
                            href={applicationRoutes.edit.url(application.id)}
                            className="mt-3 inline-block"
                        >
                            <Button size="sm">
                                <Edit3 /> Толықтыру
                            </Button>
                        </Link>
                    </div>
                )}

                <InvestmentApplicationDetails application={application} />
            </PageContainer>
        </AppLayout>
    );
}
