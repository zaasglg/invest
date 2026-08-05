import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    CheckCircle2,
    Download,
    ExternalLink,
    FileText,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Trash2,
    UserRound,
} from 'lucide-react';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatProjectTypeNames } from '@/lib/project-types';
import { formatMoneyCompact } from '@/lib/utils';
import * as companiesRoutes from '@/routes/companies';
import type { PaginatedData } from '@/types';

interface Company {
    id: number;
    name: string;
    display_name: string;
    legal_form_label: string;
    bin: string | null;
    registration_date: string | null;
    activity_type: string | null;
    director_full_name: string | null;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    legal_address: string | null;
    actual_address: string | null;
    licenses_and_regulatory_documents: string | null;
    documents: CompanyDocument[];
    status_label: string;
    notes: string | null;
    is_profile_complete: boolean;
    region?: { id: number; name: string } | null;
    creator?: { id: number; full_name: string } | null;
    investor?: {
        id: number;
        full_name: string;
        email: string;
        phone: string | null;
    } | null;
}

interface CompanyDocument {
    id: number;
    name: string;
    type: string | null;
    size: number | null;
    created_at: string;
}

interface Project {
    id: number;
    name: string;
    total_investment: number | string;
    status: string;
    region?: { id: number; name: string } | null;
    project_type?: { id: number; name: string } | null;
    project_types?: { id: number; name: string }[];
}

interface Props {
    company: Company;
    projects: PaginatedData<Project>;
    projectCount: number;
    canManage: boolean;
}

const projectStatuses: Record<string, string> = {
    plan: 'Жоспар',
    implementation: 'Іске асырылуда',
    launched: 'Іске қосылған',
    suspended: 'Тоқтатылған',
};

function Value({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
                {label}
            </p>
            <p className="mt-1.5 text-sm font-medium whitespace-pre-wrap text-[#0f1b3d]">
                {value || 'Көрсетілмеген'}
            </p>
        </div>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} Б`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} КБ`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function Show({
    company,
    projects,
    projectCount,
    canManage,
}: Props) {
    const removeCompany = () => {
        if (projectCount > 0) {
            window.alert(
                `Бұл компанияға ${projectCount} жоба тіркелген. Компанияны өшіруге тыйым салынады.`,
            );

            return;
        }

        if (!window.confirm('Компанияны жоюды растайсыз ба?')) {
            return;
        }

        router.delete(companiesRoutes.destroy.url(company.id));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Компаниялар', href: companiesRoutes.index.url() },
                { title: company.display_name, href: '' },
            ]}
        >
            <Head title={company.display_name} />
            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Button asChild size="icon" variant="outline">
                            <Link
                                href={companiesRoutes.index.url()}
                                aria-label="Артқа"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-[#0f1b3d]">
                                {company.display_name}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {company.legal_form_label} ·{' '}
                                {company.status_label} · {projectCount} жоба
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <div className="flex gap-2">
                            <Button asChild variant="outline">
                                <Link
                                    href={companiesRoutes.edit.url(company.id)}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Өңдеу
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={removeCompany}
                                title={
                                    projectCount > 0
                                        ? `Компанияға ${projectCount} жоба тіркелген — жоюға болмайды`
                                        : undefined
                                }
                                className="text-red-600 hover:text-red-700"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Жою
                            </Button>
                        </div>
                    )}
                </div>

                {(!company.is_profile_complete || !company.investor) && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-semibold">
                                Компанияны толықтыру қажет
                            </p>
                            <p className="mt-1">
                                Жаңа жобаға таңдау үшін міндетті реквизиттерін
                                толықтырып, инвестор аккаунтын ашыңыз.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                    <div className="space-y-6">
                        <section className="rounded-xl border border-gray-200 bg-white p-6">
                            <h2 className="mb-5 flex items-center gap-2 font-semibold text-[#0f1b3d]">
                                <Building2 className="h-5 w-5 text-[#b18b35]" />
                                Заңды реквизиттер
                            </h2>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                <Value
                                    label="Ресми атауы"
                                    value={company.name}
                                />
                                <Value
                                    label="Заңды нысаны"
                                    value={company.legal_form_label}
                                />
                                <Value label="БСН/БИН" value={company.bin} />
                                <Value
                                    label="Тіркелген күні"
                                    value={
                                        company.registration_date
                                            ? new Date(
                                                  company.registration_date,
                                              ).toLocaleDateString('kk-KZ')
                                            : null
                                    }
                                />
                                <Value
                                    label="Тіркелген өңірі"
                                    value={company.region?.name}
                                />
                                <Value
                                    label="Негізгі қызметі"
                                    value={company.activity_type}
                                />
                            </div>
                        </section>

                        {(company.licenses_and_regulatory_documents ||
                            company.documents.length > 0) && (
                            <section className="rounded-xl border border-gray-200 bg-white p-6">
                                <h2 className="mb-5 flex items-center gap-2 font-semibold text-[#0f1b3d]">
                                    <FileText className="h-5 w-5 text-[#b18b35]" />
                                    Лицензии и нормативные документы
                                </h2>
                                {company.licenses_and_regulatory_documents && (
                                    <Value
                                        label="Құжаттар туралы мәлімет"
                                        value={
                                            company.licenses_and_regulatory_documents
                                        }
                                    />
                                )}
                                {company.documents.length > 0 && (
                                    <div
                                        className={
                                            company.licenses_and_regulatory_documents
                                                ? 'mt-6 border-t border-gray-100 pt-5'
                                                : ''
                                        }
                                    >
                                        <p className="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
                                            Жүктелген құжаттар
                                        </p>
                                        <div className="space-y-2">
                                            {company.documents.map(
                                                (document) => (
                                                    <a
                                                        key={document.id}
                                                        href={`/companies/${company.id}/documents/${document.id}/download`}
                                                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 transition hover:border-[#c8a44e]/60 hover:bg-amber-50/40"
                                                    >
                                                        <FileText className="h-5 w-5 shrink-0 text-[#b18b35]" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium text-[#0f1b3d]">
                                                                {document.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {(
                                                                    document.type ||
                                                                    'file'
                                                                ).toUpperCase()}
                                                                {document.size
                                                                    ? ` · ${formatFileSize(document.size)}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                        <Download className="h-4 w-4 shrink-0 text-gray-500" />
                                                    </a>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        <section className="rounded-xl border border-gray-200 bg-white p-6">
                            <h2 className="mb-5 flex items-center gap-2 font-semibold text-[#0f1b3d]">
                                <UserRound className="h-5 w-5 text-[#b18b35]" />
                                Басшылық және байланыс
                            </h2>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <Value
                                    label="Басшы"
                                    value={company.director_full_name}
                                />
                                <Value
                                    label="Байланыс тұлғасы"
                                    value={company.contact_person}
                                />
                                <Value label="Телефон" value={company.phone} />
                                <Value label="Email" value={company.email} />
                            </div>
                            {company.website && (
                                <a
                                    href={company.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#a9842f] hover:underline"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    {company.website}
                                </a>
                            )}
                        </section>

                        <section className="rounded-xl border border-gray-200 bg-white p-6">
                            <h2 className="mb-5 flex items-center gap-2 font-semibold text-[#0f1b3d]">
                                <MapPin className="h-5 w-5 text-[#b18b35]" />
                                Мекенжайлар
                            </h2>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <Value
                                    label="Заңды мекенжай"
                                    value={company.legal_address}
                                />
                                <Value
                                    label="Нақты мекенжай"
                                    value={company.actual_address}
                                />
                            </div>
                            {company.notes && (
                                <div className="mt-6 border-t border-gray-100 pt-5">
                                    <Value
                                        label="Ескертпе"
                                        value={company.notes}
                                    />
                                </div>
                            )}
                        </section>
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                            <p className="flex items-center gap-2 font-semibold text-[#0f1b3d]">
                                <UserRound className="h-5 w-5 text-amber-700" />
                                Инвестор аккаунты
                            </p>
                            {company.investor ? (
                                <div className="mt-3 space-y-1 text-sm">
                                    <p className="font-medium text-[#0f1b3d]">
                                        {company.investor.full_name}
                                    </p>
                                    <a
                                        href={`mailto:${company.investor.email}`}
                                        className="text-amber-800 hover:underline"
                                    >
                                        {company.investor.email}
                                    </a>
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-amber-800">
                                    Аккаунт ашылмаған. Компанияны өңдеп,
                                    міндетті аккаунтты толтырыңыз.
                                </p>
                            )}
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <div className="flex items-center gap-3">
                                {company.is_profile_complete ? (
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                ) : (
                                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                                )}
                                <div>
                                    <p className="font-semibold text-[#0f1b3d]">
                                        Карточка күйі
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {company.is_profile_complete
                                            ? 'Мәліметтер толық'
                                            : 'Толықтыру қажет'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {company.phone && (
                            <a
                                href={`tel:${company.phone}`}
                                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm hover:border-[#d9c48a]"
                            >
                                <Phone className="h-4 w-4 text-[#b18b35]" />
                                {company.phone}
                            </a>
                        )}
                        {company.email && (
                            <a
                                href={`mailto:${company.email}`}
                                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm hover:border-[#d9c48a]"
                            >
                                <Mail className="h-4 w-4 text-[#b18b35]" />
                                {company.email}
                            </a>
                        )}
                        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
                            <p className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                Жүйеге енгізген:{' '}
                                {company.creator?.full_name || 'Белгісіз'}
                            </p>
                        </div>
                    </aside>
                </div>

                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                        <h2 className="flex items-center gap-2 font-semibold text-[#0f1b3d]">
                            <BriefcaseBusiness className="h-5 w-5 text-[#b18b35]" />
                            Компания жобалары
                        </h2>
                        <span className="text-sm text-gray-500">
                            {projects.total}
                        </span>
                    </div>
                    {projects.data.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {projects.data.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/investment-projects/${project.id}`}
                                    className="grid gap-3 px-6 py-4 hover:bg-gray-50 sm:grid-cols-[minmax(0,1fr)_180px_150px]"
                                >
                                    <div>
                                        <p className="font-semibold text-[#0f1b3d]">
                                            {project.name}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {project.region?.name || '—'} ·{' '}
                                            {formatProjectTypeNames(project)}
                                        </p>
                                    </div>
                                    <p className="text-sm font-medium">
                                        {formatMoneyCompact(
                                            Number(
                                                project.total_investment || 0,
                                            ),
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {projectStatuses[project.status] ||
                                            project.status}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center text-sm text-gray-500">
                            Бұл компанияға әзірге жоба тіркелмеген.
                        </div>
                    )}
                </section>
                <Pagination paginator={projects} preserveScroll />
            </div>
        </AppLayout>
    );
}
