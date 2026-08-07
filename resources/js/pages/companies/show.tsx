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
import DetailSectionNav from '@/components/detail-section-nav';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/page';
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
            <PageContainer width="standard">
                <section className="relative overflow-hidden rounded-[28px] bg-navy px-5 py-6 text-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.9)] sm:px-8 sm:py-8">
                    <div className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-gold/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-36 left-1/3 size-72 rounded-full bg-blue-400/10 blur-3xl" />

                    <div className="relative">
                        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                            <div className="min-w-0">
                                <Link
                                    href={companiesRoutes.index.url()}
                                    className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    Компаниялар тізімі
                                </Link>
                                <p className="text-xs font-bold tracking-[0.16em] text-gold uppercase">
                                    Инвестор профилі
                                </p>
                                <h1 className="mt-3 max-w-4xl text-2xl font-extrabold text-balance text-white sm:text-3xl">
                                    {company.display_name}
                                </h1>
                                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300">
                                    <span>{company.legal_form_label}</span>
                                    <span className="text-white/30">•</span>
                                    <span>{company.status_label}</span>
                                    {company.region?.name && (
                                        <>
                                            <span className="text-white/30">
                                                •
                                            </span>
                                            <span>{company.region.name}</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            {canManage && (
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button
                                        asChild
                                        className="bg-gold text-white shadow-none hover:bg-gold-dark"
                                    >
                                        <Link
                                            href={companiesRoutes.edit.url(
                                                company.id,
                                            )}
                                        >
                                            <Pencil className="mr-2 size-4" />
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
                                        className="border-white/15 bg-white/5 text-rose-200 hover:bg-rose-500/15 hover:text-white"
                                    >
                                        <Trash2 className="mr-2 size-4" />
                                        Жою
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-4">
                            {[
                                {
                                    label: 'Жобалар',
                                    value: projectCount,
                                },
                                {
                                    label: 'Профиль',
                                    value: company.is_profile_complete
                                        ? 'Толық'
                                        : 'Толық емес',
                                },
                                {
                                    label: 'Инвестор аккаунты',
                                    value: company.investor ? 'Ашылған' : 'Жоқ',
                                },
                                {
                                    label: 'Құжаттар',
                                    value: company.documents.length,
                                },
                            ].map((metric) => (
                                <div
                                    key={metric.label}
                                    className="bg-navy/75 px-4 py-4 sm:px-5"
                                >
                                    <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                                        {metric.label}
                                    </p>
                                    <p className="mt-2 text-lg font-extrabold text-white sm:text-xl">
                                        {metric.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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

                <DetailSectionNav
                    ariaLabel="Компания бөлімдері"
                    items={[
                        {
                            label: 'Реквизиттер',
                            href: '#company-legal',
                            icon: Building2,
                        },
                        ...(company.licenses_and_regulatory_documents ||
                        company.documents.length > 0
                            ? [
                                  {
                                      label: 'Құжаттар',
                                      href: '#company-documents',
                                      icon: FileText,
                                      count: company.documents.length,
                                  },
                              ]
                            : []),
                        {
                            label: 'Байланыс',
                            href: '#company-contacts',
                            icon: UserRound,
                        },
                        {
                            label: 'Мекенжайлар',
                            href: '#company-addresses',
                            icon: MapPin,
                        },
                        {
                            label: 'Жобалар',
                            href: '#company-projects',
                            icon: BriefcaseBusiness,
                            count: projectCount,
                        },
                    ]}
                />

                <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                    <div className="space-y-6">
                        <section
                            id="company-legal"
                            className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,27,61,0.55)]"
                        >
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
                            <section
                                id="company-documents"
                                className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,27,61,0.55)]"
                            >
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

                        <section
                            id="company-contacts"
                            className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,27,61,0.55)]"
                        >
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

                        <section
                            id="company-addresses"
                            className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,27,61,0.55)]"
                        >
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

                    <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
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

                <section
                    id="company-projects"
                    className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-42px_rgba(15,27,61,0.55)]"
                >
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
            </PageContainer>
        </AppLayout>
    );
}
