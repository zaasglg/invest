import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    FolderPlus,
    MessageSquareWarning,
    SearchCheck,
    XCircle,
} from 'lucide-react';
import type { FormEvent } from 'react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import InvestmentApplicationDetails from '@/components/investment-application-details';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormCard, PageContainer, PageHeader } from '@/components/ui/page';
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
                { title: 'Инвестор өтінімдері', href: routes.index.url() },
                {
                    title: application.application_number,
                    href: routes.show.url(application.id),
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
                    subtitle={`${application.zone_type_label} · ${application.zoneable?.name ?? 'Аймақ'}`}
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Link href={routes.index.url()}>
                                <Button variant="outline">
                                    <ArrowLeft /> Тізімге
                                </Button>
                            </Link>
                            {actions.can_start_review && (
                                <Button
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
                                    onClick={() =>
                                        confirm(
                                            'Компания мен инвестициялық жоба құрыла ма?',
                                        ) &&
                                        router.post(
                                            routes.convert.url(application.id),
                                        )
                                    }
                                >
                                    <FolderPlus /> Жобаға айналдыру
                                </Button>
                            )}
                        </div>
                    }
                />

                <ZoneAreaSummary area={zoneCapacity} />

                {application.status === 'approved' &&
                    application.reserved_until && (
                        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                            <Clock3 className="size-5 shrink-0" />
                            {application.approved_area} га жер{' '}
                            {new Date(
                                application.reserved_until,
                            ).toLocaleString('kk-KZ')}{' '}
                            дейін резервте.
                        </div>
                    )}

                {(actions.can_approve ||
                    actions.can_request_clarification ||
                    actions.can_reject) && (
                    <FormCard
                        title="Сарапшы шешімі"
                        description="Қабылдағанда көрсетілген гектар резервке қойылады."
                    >
                        <form className="space-y-4">
                            {actions.can_approve && (
                                <div className="max-w-sm space-y-1.5">
                                    <Label htmlFor="approved-area">
                                        Қабылданатын аумақ (га)
                                    </Label>
                                    <Input
                                        id="approved-area"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        max={Math.min(
                                            Number(application.requested_area),
                                            zoneCapacity.available,
                                        )}
                                        value={decision.data.approved_area}
                                        onChange={(e) =>
                                            decision.setData(
                                                'approved_area',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {decision.errors.approved_area && (
                                        <p className="text-sm text-rose-600">
                                            {decision.errors.approved_area}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-500">
                                        Қазір бос: {zoneCapacity.available} га;
                                        сұралғаны: {application.requested_area}{' '}
                                        га.
                                    </p>
                                </div>
                            )}
                            {actions.can_approve &&
                                zoneCapacity.available <= 0 && (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                        Аймақта бос жер қалмаған. Бұл өтінімді
                                        қазір резервтеу мүмкін емес.
                                    </p>
                                )}
                            <div className="space-y-1.5">
                                <Label htmlFor="decision-comment">
                                    Түсініктеме
                                </Label>
                                <Textarea
                                    id="decision-comment"
                                    rows={4}
                                    value={decision.data.comment}
                                    onChange={(e) =>
                                        decision.setData(
                                            'comment',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Толықтыру немесе бас тарту себебі міндетті"
                                />
                                {decision.errors.comment && (
                                    <p className="text-sm text-rose-600">
                                        {decision.errors.comment}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {actions.can_approve && (
                                    <Button
                                        type="button"
                                        disabled={
                                            decision.processing ||
                                            zoneCapacity.available <= 0
                                        }
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
                    </FormCard>
                )}

                <InvestmentApplicationDetails
                    application={application}
                    showApplicant
                />
            </PageContainer>
        </AppLayout>
    );
}
