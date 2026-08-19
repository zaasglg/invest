import { Download, FileText } from 'lucide-react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import { Button } from '@/components/ui/button';
import { FormCard } from '@/components/ui/page';
import * as documentRoutes from '@/routes/investment-applications/documents';
import type { InvestmentApplication } from '@/types';

const infrastructureLabels: Record<string, { label: string; unit: string }> = {
    electricity: { label: 'Электр', unit: 'кВт' },
    water: { label: 'Су', unit: 'м³/тәу' },
    gas: { label: 'Газ', unit: 'м³/сағ' },
    roads: { label: 'Автожол', unit: 'км' },
    railway: { label: 'Теміржол', unit: 'км' },
    internet: { label: 'Интернет', unit: 'Мбит/с' },
};

const legalFormLabels: Record<string, string> = {
    too: 'ЖШС (ТОО)',
    ao: 'АҚ (АО)',
    ip: 'ЖК (ИП)',
    cooperative: 'ӨК',
    public_foundation: 'Қоғамдық қор',
    state_enterprise: 'Мемлекеттік кәсіпорын',
    branch: 'Филиал',
    other: 'Басқа',
};

const statusLabels: Record<string, string> = {
    draft: 'Жоба нұсқасы',
    submitted: 'Жіберілді',
    under_review: 'Қаралуда',
    needs_clarification: 'Толықтыру қажет',
    approved: 'Қабылданды, резервте',
    converted_to_project: 'Инвестициялық жоба ашылды',
    rejected: 'Қабылданбады',
    withdrawn: 'Кері қайтарылды',
    expired: 'Резерв мерзімі аяқталды',
};

const money = (value: string | number) =>
    new Intl.NumberFormat('kk-KZ', { maximumFractionDigits: 2 }).format(
        Number(value),
    );

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {label}
            </dt>
            <dd className="mt-1 text-sm font-medium break-words text-navy">
                {value || '—'}
            </dd>
        </div>
    );
}

export default function InvestmentApplicationDetails({
    application,
    showApplicant = false,
}: {
    application: InvestmentApplication;
    showApplicant?: boolean;
}) {
    const requirements = Object.entries(
        application.infrastructure_requirements ?? {},
    ).filter(
        ([, value]) => value !== null && value !== '' && Number(value) > 0,
    );

    return (
        <div className="space-y-5">
            {showApplicant && (
                <FormCard title="Өтінім беруші">
                    <dl className="grid gap-5 sm:grid-cols-3">
                        <Detail
                            label="Аты-жөні"
                            value={application.applicant?.full_name}
                        />
                        <Detail
                            label="Email"
                            value={application.applicant?.email}
                        />
                        <Detail
                            label="Телефон"
                            value={application.applicant?.phone}
                        />
                    </dl>
                </FormCard>
            )}

            <FormCard title="Жоба және сұралған жер">
                <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail
                        label="Жоба атауы"
                        value={application.project_name}
                    />
                    <Detail
                        label="Қызмет түрлері"
                        value={
                            application.project_types?.length
                                ? application.project_types
                                      .map(({ name }) => name)
                                      .join(', ')
                                : application.activity_sector
                        }
                    />
                    <Detail
                        label="Сұралған аумақ"
                        value={`${application.requested_area} га`}
                    />
                    <Detail
                        label="Қабылданған аумақ"
                        value={
                            application.approved_area
                                ? `${application.approved_area} га`
                                : '—'
                        }
                    />
                    <Detail
                        label="Инвестиция"
                        value={`${money(application.investment_amount)} ₸`}
                    />
                    <Detail label="Жұмыс орны" value={application.jobs_count} />
                    <Detail
                        label="Аймақ"
                        value={`${application.zone_type_label} · ${application.zoneable?.name ?? '—'}`}
                    />
                    <Detail
                        label="Орналасуы"
                        value={application.zoneable?.region?.name}
                    />
                </dl>
                <div className="mt-5 border-t border-slate-100 pt-5">
                    <Detail
                        label="Жоба сипаттамасы"
                        value={application.project_description}
                    />
                </div>
            </FormCard>

            <FormCard title="Компания мәліметтері">
                <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail
                        label="Заңды нысаны"
                        value={
                            legalFormLabels[application.company_legal_form] ??
                            application.company_legal_form
                        }
                    />
                    <Detail
                        label="Компания атауы"
                        value={application.company_name}
                    />
                    <Detail label="БСН" value={application.company_bin} />
                    <Detail
                        label="Тіркелген күні"
                        value={application.company_registration_date?.slice(
                            0,
                            10,
                        )}
                    />
                    <Detail
                        label="Тіркелген аудан"
                        value={application.company_region?.name}
                    />
                    <Detail
                        label="Басшы"
                        value={application.director_full_name}
                    />
                    <Detail
                        label="Байланыс тұлғасы"
                        value={application.contact_person}
                    />
                    <Detail label="Телефон" value={application.contact_phone} />
                    <Detail label="Email" value={application.contact_email} />
                    <Detail
                        label="Заңды мекенжай"
                        value={application.legal_address}
                    />
                </dl>
            </FormCard>

            <FormCard title="Қажетті инфрақұрылым">
                {requirements.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        Қажетті қуат көрсетілмеген.
                    </p>
                ) : (
                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {requirements.map(([key, value]) => (
                            <Detail
                                key={key}
                                label={infrastructureLabels[key]?.label ?? key}
                                value={`${value} ${infrastructureLabels[key]?.unit ?? ''}`}
                            />
                        ))}
                    </dl>
                )}
            </FormCard>

            <FormCard title="Құжаттар">
                {application.documents?.length ? (
                    <div className="divide-y divide-slate-100">
                        {application.documents.map((document) => (
                            <div
                                key={document.id}
                                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <FileText className="size-5 shrink-0 text-slate-400" />
                                    <span className="truncate text-sm font-medium text-navy">
                                        {document.name}
                                    </span>
                                </div>
                                <a
                                    href={documentRoutes.download.url({
                                        investmentApplication: application.id,
                                        document: document.id,
                                    })}
                                >
                                    <Button size="sm" variant="outline">
                                        <Download /> Жүктеу
                                    </Button>
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">
                        Құжаттар тіркелмеген.
                    </p>
                )}
            </FormCard>

            {application.reviewer_comment && (
                <FormCard title="Соңғы сарапшы пікірі">
                    <p className="text-sm leading-6 whitespace-pre-line text-slate-700">
                        {application.reviewer_comment}
                    </p>
                </FormCard>
            )}

            <FormCard title="Өтінім тарихы">
                <ol className="space-y-4">
                    {application.status_histories?.map((history) => (
                        <li key={history.id} className="flex gap-3">
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
                            <div>
                                <ApplicationStatusBadge
                                    status={history.to_status}
                                    label={
                                        statusLabels[history.to_status] ??
                                        history.to_status
                                    }
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    {new Date(
                                        history.created_at,
                                    ).toLocaleString('kk-KZ')}
                                    {history.actor
                                        ? ` · ${history.actor.full_name}`
                                        : ''}
                                </p>
                                {history.comment && (
                                    <p className="mt-1 text-sm whitespace-pre-line text-slate-700">
                                        {history.comment}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            </FormCard>
        </div>
    );
}
