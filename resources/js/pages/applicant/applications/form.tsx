import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    BadgeCheck,
    BriefcaseBusiness,
    Building2,
    Download,
    FilePenLine,
    FileText,
    Files,
    FolderKanban,
    Loader2,
    Network,
    Save,
    Search,
    Send,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import {
    ApplicantHero,
    ApplicantSectionCard,
} from '@/components/applicant/applicant-ui';
import InputError from '@/components/input-error';
import PlannedProductionForm from '@/components/investment-projects/planned-production-form';
import ProjectTypeMultiSelect from '@/components/investment-projects/project-type-multi-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/ui/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ZoneAreaSummary from '@/components/zone-area-summary';
import AppLayout from '@/layouts/app-layout';
import { normalizeProductionPlans } from '@/lib/production';
import type { ProductionPlanInput } from '@/lib/production';
import * as applicant from '@/routes/applicant';
import * as applicationRoutes from '@/routes/applicant/applications';
import * as applicationDocumentRoutes from '@/routes/applicant/applications/documents';
import * as downloadRoutes from '@/routes/investment-applications/documents';
import type {
    ApplicantZone,
    InvestmentApplication,
    ProjectTypeOption,
} from '@/types';

type Props = {
    application: InvestmentApplication | null;
    zone: ApplicantZone;
    regions: { id: number; name: string }[];
    legalForms: Record<string, string>;
    projectTypes: ProjectTypeOption[];
    applicationKinds: Record<string, string>;
    accountRole: 'applicant' | 'investor';
    company: CompanyFormData | null;
    existingProjects: ExistingProject[];
    applicantDefaults: {
        full_name: string;
        email: string;
        phone?: string | null;
    };
};

type CompanyFormData = {
    id: number;
    legal_form: string;
    name: string;
    bin: string;
    registration_date?: string | null;
    region_id?: number | null;
    region?: { id: number; name: string } | null;
    activity_type?: string | null;
    director_full_name?: string | null;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    legal_address?: string | null;
};

type ExistingProject = {
    id: number;
    name: string;
    description?: string | null;
    project_type_id?: number | null;
    project_types?: ProjectTypeOption[];
    jobs_count: number;
    total_investment: string | number;
    start_date?: string | null;
    end_date?: string | null;
    infrastructure?: Record<string, unknown> | null;
};

type CompanyLookupResult = {
    found: boolean;
    can_attach?: boolean;
    has_investor?: boolean;
    company?: CompanyFormData;
    message?: string;
};

const infrastructureFields = [
    { key: 'electricity', label: 'Электр', unit: 'кВт' },
    { key: 'water', label: 'Су', unit: 'м³/тәу' },
    { key: 'gas', label: 'Газ', unit: 'м³/сағ' },
    { key: 'roads', label: 'Автожол', unit: 'км' },
    { key: 'railway', label: 'Теміржол', unit: 'км' },
    { key: 'internet', label: 'Интернет', unit: 'Мбит/с' },
] as const;

export default function ApplicationForm({
    application,
    zone,
    regions,
    legalForms,
    projectTypes,
    applicationKinds,
    accountRole,
    company,
    existingProjects,
    applicantDefaults,
}: Props) {
    const isInvestor = accountRole === 'investor';
    const currentYear = new Date().getFullYear();
    const form = useForm({
        intent: 'draft',
        application_kind: application?.application_kind ?? 'new_project',
        source_investment_project_id: String(
            application?.source_investment_project_id ?? '',
        ),
        project_name: application?.project_name ?? '',
        project_description: application?.project_description ?? '',
        project_type_ids:
            application?.project_types?.map(({ id }) => id.toString()) ?? [],
        requested_area: String(application?.requested_area ?? ''),
        investment_amount: String(application?.investment_amount ?? ''),
        jobs_count: String(application?.jobs_count ?? ''),
        planned_start_year: String(application?.planned_start_year ?? ''),
        planned_end_year: String(application?.planned_end_year ?? ''),
        infrastructure_requirements: Object.fromEntries(
            infrastructureFields.map(({ key }) => [
                key,
                String(application?.infrastructure_requirements?.[key] ?? ''),
            ]),
        ) as Record<string, string>,
        production_not_applicable:
            application?.production_not_applicable ?? false,
        planned_production: normalizeProductionPlans(
            application?.planned_production,
        ) as ProductionPlanInput[],
        company_legal_form:
            application?.company_legal_form ?? company?.legal_form ?? '',
        company_name: application?.company_name ?? company?.name ?? '',
        company_bin: application?.company_bin ?? company?.bin ?? '',
        company_activity_type:
            application?.company_activity_type ?? company?.activity_type ?? '',
        company_registration_date:
            application?.company_registration_date?.slice(0, 10) ??
            company?.registration_date?.slice(0, 10) ??
            '',
        company_region_id: String(
            application?.company_region_id ?? company?.region_id ?? '',
        ),
        director_full_name:
            application?.director_full_name ??
            company?.director_full_name ??
            '',
        contact_person:
            application?.contact_person ??
            company?.contact_person ??
            applicantDefaults.full_name,
        contact_phone:
            application?.contact_phone ??
            company?.phone ??
            applicantDefaults.phone ??
            '',
        contact_email:
            application?.contact_email ??
            company?.email ??
            applicantDefaults.email,
        legal_address:
            application?.legal_address ?? company?.legal_address ?? '',
        documents: [] as File[],
    });
    const [companyLocked, setCompanyLocked] = useState(isInvestor);
    const [companyActivityLocked, setCompanyActivityLocked] = useState(
        Boolean(company?.activity_type),
    );
    const [lookupState, setLookupState] = useState<{
        loading: boolean;
        tone: 'success' | 'warning' | 'neutral';
        message: string;
    }>({ loading: false, tone: 'neutral', message: '' });
    const isExpansion = form.data.application_kind === 'expansion';
    const selectedSource = existingProjects.find(
        (project) =>
            project.id.toString() === form.data.source_investment_project_id,
    );
    const documentError =
        form.errors.documents ??
        Object.entries(form.errors as Record<string, string | undefined>).find(
            ([key]) => key.startsWith('documents.'),
        )?.[1];

    const selectApplicationKind = (
        kind: InvestmentApplication['application_kind'],
    ) => {
        form.setData('application_kind', kind);

        if (kind === 'new_project') {
            form.setData('source_investment_project_id', '');

            if (
                Number(form.data.planned_start_year) > 0 &&
                Number(form.data.planned_start_year) < currentYear
            ) {
                form.setData('planned_start_year', String(currentYear));
            }
        }
    };

    const selectSourceProject = (projectId: string) => {
        form.setData('source_investment_project_id', projectId);
        const project = existingProjects.find(
            (item) => item.id.toString() === projectId,
        );

        if (!project) return;

        form.setData('project_name', project.name);
        form.setData(
            'planned_start_year',
            project.start_date?.slice(0, 4) ?? '',
        );
        form.setData('planned_end_year', project.end_date?.slice(0, 4) ?? '');
        form.setData(
            'project_type_ids',
            project.project_types?.length
                ? project.project_types.map(({ id }) => id.toString())
                : project.project_type_id
                  ? [project.project_type_id.toString()]
                  : [],
        );
    };

    const lookupCompany = async () => {
        if (form.data.company_bin.length !== 12) {
            setLookupState({
                loading: false,
                tone: 'warning',
                message: 'БСН дәл 12 саннан тұруы керек.',
            });
            return;
        }

        setLookupState({ loading: true, tone: 'neutral', message: '' });

        try {
            const response = await fetch(
                applicant.companyLookup.url({
                    query: { bin: form.data.company_bin },
                }),
                { headers: { Accept: 'application/json' } },
            );
            const result = (await response.json()) as CompanyLookupResult;

            if (!response.ok)
                throw new Error('Компанияны тексеру мүмкін болмады.');

            if (!result.found) {
                setCompanyLocked(false);
                setCompanyActivityLocked(false);
                setLookupState({
                    loading: false,
                    tone: 'neutral',
                    message:
                        'Компания базадан табылмады. Жаңа компания деректерін толтырыңыз.',
                });
                return;
            }

            if (!result.can_attach || !result.company) {
                setCompanyLocked(true);
                setCompanyActivityLocked(true);
                setLookupState({
                    loading: false,
                    tone: 'warning',
                    message:
                        result.message ??
                        'Бұл компанияға Investor аккаунты тіркелген.',
                });
                return;
            }

            const found = result.company;
            form.setData('company_legal_form', found.legal_form);
            form.setData('company_name', found.name);
            form.setData('company_bin', found.bin);
            form.setData('company_activity_type', found.activity_type ?? '');
            form.setData(
                'company_registration_date',
                found.registration_date?.slice(0, 10) ?? '',
            );
            form.setData('company_region_id', String(found.region_id ?? ''));
            form.setData('director_full_name', found.director_full_name ?? '');
            form.setData('legal_address', found.legal_address ?? '');
            setCompanyLocked(true);
            setCompanyActivityLocked(Boolean(found.activity_type));
            setLookupState({
                loading: false,
                tone: 'success',
                message: result.message ?? 'Компания CRM базасынан табылды.',
            });
        } catch (error) {
            setLookupState({
                loading: false,
                tone: 'warning',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Компанияны тексеру мүмкін болмады.',
            });
        }
    };

    const submit = (event: FormEvent, intent: 'draft' | 'submit') => {
        event.preventDefault();
        form.transform((data) => ({ ...data, intent }));
        const url = application
            ? applicationRoutes.update.url(application.id)
            : applicationRoutes.store.url({
                  zoneType: zone.type,
                  zone: zone.id,
              });
        form.post(url, { forceFormData: true, preserveScroll: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Аймақтар', href: applicant.portal.url() },
                {
                    title: zone.name,
                    href: `/portal/zones/${zone.type}/${zone.id}`,
                },
                {
                    title: application ? 'Өтінімді өңдеу' : 'Жаңа өтінім',
                    href: '',
                },
            ]}
        >
            <Head title={application ? 'Өтінімді өңдеу' : 'Жаңа өтінім'} />
            <PageContainer width="wide">
                <ApplicantHero
                    eyebrow={`${zone.type_label} · ${zone.name}`}
                    title={
                        application ? 'Өтінімді өңдеу' : 'Жер аумағына өтінім'
                    }
                    subtitle="Деректерді толық толтырыңыз. Өтінім қабылданғаннан кейін жер уақытша резервке қойылады."
                    icon={FilePenLine}
                    action={
                        <Link
                            href={
                                application
                                    ? applicationRoutes.show.url(application.id)
                                    : `/portal/zones/${zone.type}/${zone.id}`
                            }
                        >
                            <Button
                                variant="outline"
                                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                            >
                                <ArrowLeft /> Артқа
                            </Button>
                        </Link>
                    }
                />

                <ZoneAreaSummary area={zone.area} />

                <form className="space-y-5">
                    <ApplicantSectionCard
                        title="Жоба туралы"
                        description={
                            isExpansion
                                ? 'Бар жобаға қосылатын инвестиция, жұмыс орны және жер көлемі'
                                : 'Жобаның мақсаты мен негізгі көрсеткіштері'
                        }
                        icon={BriefcaseBusiness}
                        tone="navy"
                    >
                        {isInvestor && (
                            <div className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <div>
                                    <Label id="application-kind-label">
                                        Өтінім түрі
                                    </Label>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Жаңа жоба ашыңыз немесе осы аймақтағы
                                        жобаңызды кеңейтіңіз.
                                    </p>
                                </div>
                                <div
                                    className="grid gap-3 sm:grid-cols-2"
                                    role="group"
                                    aria-labelledby="application-kind-label"
                                >
                                    {Object.entries(applicationKinds).map(
                                        ([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() =>
                                                    selectApplicationKind(
                                                        value as InvestmentApplication['application_kind'],
                                                    )
                                                }
                                                className={`rounded-xl border p-4 text-left transition ${
                                                    form.data
                                                        .application_kind ===
                                                    value
                                                        ? 'border-gold bg-white shadow-sm ring-2 ring-gold/15'
                                                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                                                }`}
                                            >
                                                <span className="flex items-center gap-3">
                                                    {value === 'expansion' ? (
                                                        <FolderKanban className="size-5 text-sky-700" />
                                                    ) : (
                                                        <BriefcaseBusiness className="size-5 text-gold-dark" />
                                                    )}
                                                    <span className="font-bold text-navy">
                                                        {label}
                                                    </span>
                                                </span>
                                                <span className="mt-2 block text-xs leading-5 text-slate-500">
                                                    {value === 'expansion'
                                                        ? 'Бар жобаның қуатын, жерін және көрсеткіштерін ұлғайту'
                                                        : 'CRM жүйесінде бөлек инвестициялық жоба ашу'}
                                                </span>
                                            </button>
                                        ),
                                    )}
                                </div>
                                <InputError
                                    message={form.errors.application_kind}
                                />

                                {isExpansion && (
                                    <Field
                                        htmlFor="source_investment_project_id"
                                        label="Кеңейтілетін жоба"
                                        error={
                                            form.errors
                                                .source_investment_project_id
                                        }
                                    >
                                        {existingProjects.length ? (
                                            <Select
                                                value={
                                                    form.data
                                                        .source_investment_project_id
                                                }
                                                onValueChange={
                                                    selectSourceProject
                                                }
                                            >
                                                <SelectTrigger
                                                    id="source_investment_project_id"
                                                    className="bg-white"
                                                >
                                                    <SelectValue placeholder="Жобаны таңдаңыз" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {existingProjects.map(
                                                        (project) => (
                                                            <SelectItem
                                                                key={project.id}
                                                                value={String(
                                                                    project.id,
                                                                )}
                                                            >
                                                                {project.name}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                                Бұл аймақта компанияңызға
                                                тиесілі жоба жоқ. «Жаңа жоба»
                                                түрін таңдаңыз.
                                            </div>
                                        )}
                                    </Field>
                                )}

                                {selectedSource && isExpansion && (
                                    <div className="grid gap-3 rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-sm sm:grid-cols-3">
                                        <div>
                                            <p className="text-xs text-slate-500">
                                                Қазіргі инвестиция
                                            </p>
                                            <p className="font-bold text-navy">
                                                {new Intl.NumberFormat(
                                                    'kk-KZ',
                                                ).format(
                                                    Number(
                                                        selectedSource.total_investment,
                                                    ),
                                                )}{' '}
                                                ₸
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">
                                                Қазіргі жұмыс орны
                                            </p>
                                            <p className="font-bold text-navy">
                                                {selectedSource.jobs_count}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">
                                                Қазіргі жер
                                            </p>
                                            <p className="font-bold text-navy">
                                                {String(
                                                    (
                                                        selectedSource.infrastructure as Record<
                                                            string,
                                                            Record<
                                                                string,
                                                                unknown
                                                            >
                                                        > | null
                                                    )?.land?.used_capacity ?? 0,
                                                )}{' '}
                                                га
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                htmlFor="project_name"
                                label="Жоба атауы"
                                error={form.errors.project_name}
                            >
                                <Input
                                    id="project_name"
                                    name="project_name"
                                    value={form.data.project_name}
                                    onChange={(e) =>
                                        form.setData(
                                            'project_name',
                                            e.target.value,
                                        )
                                    }
                                    disabled={
                                        isExpansion &&
                                        Boolean(selectedSource?.start_date)
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="project_type_ids"
                                label="Жоба түрлері"
                                error={form.errors.project_type_ids}
                            >
                                <ProjectTypeMultiSelect
                                    id="project_type_ids"
                                    options={projectTypes}
                                    value={form.data.project_type_ids}
                                    placeholder="Жоба түрлерін таңдаңыз"
                                    onChange={(value) =>
                                        form.setData('project_type_ids', value)
                                    }
                                    hasError={Boolean(
                                        form.errors.project_type_ids,
                                    )}
                                    disabled={isExpansion}
                                />
                            </Field>
                            <Field
                                htmlFor="requested_area"
                                label={
                                    isExpansion
                                        ? 'Қосымша қажетті аумақ (га)'
                                        : 'Қажетті аумақ (га)'
                                }
                                error={form.errors.requested_area}
                            >
                                <Input
                                    id="requested_area"
                                    name="requested_area"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={zone.area.available}
                                    value={form.data.requested_area}
                                    onChange={(e) =>
                                        form.setData(
                                            'requested_area',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="investment_amount"
                                label={
                                    isExpansion
                                        ? 'Қосымша инвестиция (₸)'
                                        : 'Инвестиция көлемі (₸)'
                                }
                                error={form.errors.investment_amount}
                            >
                                <Input
                                    id="investment_amount"
                                    name="investment_amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.data.investment_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'investment_amount',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="jobs_count"
                                label={
                                    isExpansion
                                        ? 'Қосымша жұмыс орындары'
                                        : 'Жұмыс орындары'
                                }
                                error={form.errors.jobs_count}
                            >
                                <Input
                                    id="jobs_count"
                                    name="jobs_count"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.data.jobs_count}
                                    onChange={(e) =>
                                        form.setData(
                                            'jobs_count',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="planned_start_year"
                                label="Жоспарлы басталу жылы"
                                error={form.errors.planned_start_year}
                            >
                                <Input
                                    id="planned_start_year"
                                    name="planned_start_year"
                                    type="number"
                                    min={isExpansion ? 1990 : currentYear}
                                    max="2100"
                                    value={form.data.planned_start_year}
                                    disabled={isExpansion}
                                    onChange={(e) =>
                                        form.setData(
                                            'planned_start_year',
                                            e.target.value,
                                        )
                                    }
                                    placeholder={String(currentYear)}
                                    required
                                />
                                {isExpansion && selectedSource?.start_date && (
                                    <p className="text-xs text-slate-500">
                                        Кеңейту кезінде жобаның басталу жылы
                                        өзгермейді.
                                    </p>
                                )}
                            </Field>
                            <Field
                                htmlFor="planned_end_year"
                                label="Жоспарлы аяқталу жылы"
                                error={form.errors.planned_end_year}
                            >
                                <Input
                                    id="planned_end_year"
                                    name="planned_end_year"
                                    type="number"
                                    min={Math.max(
                                        currentYear,
                                        Number(
                                            form.data.planned_start_year || 0,
                                        ),
                                        Number(
                                            selectedSource?.end_date?.slice(
                                                0,
                                                4,
                                            ) ?? 0,
                                        ),
                                    )}
                                    max="2100"
                                    value={form.data.planned_end_year}
                                    onChange={(e) =>
                                        form.setData(
                                            'planned_end_year',
                                            e.target.value,
                                        )
                                    }
                                    placeholder={String(currentYear + 1)}
                                    required
                                />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field
                                    htmlFor="project_description"
                                    label={
                                        isExpansion
                                            ? 'Кеңейту сипаттамасы'
                                            : 'Жоба сипаттамасы'
                                    }
                                    error={form.errors.project_description}
                                >
                                    <Textarea
                                        id="project_description"
                                        name="project_description"
                                        rows={6}
                                        value={form.data.project_description}
                                        onChange={(e) =>
                                            form.setData(
                                                'project_description',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                </Field>
                            </div>
                        </div>
                    </ApplicantSectionCard>

                    <ApplicantSectionCard
                        title="Компания реквизиттері"
                        description={
                            isInvestor
                                ? 'CRM жүйесінде аккаунтыңызға байланыстырылған компания'
                                : 'БСН бойынша компанияны тексеріп, заңды тұлға деректерін толтырыңыз'
                        }
                        icon={Building2}
                        tone="sky"
                    >
                        {isInvestor && company && (
                            <div className="mb-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                                <div>
                                    <p className="font-bold">
                                        {company.name} · БСН {company.bin}
                                    </p>
                                    <p className="mt-1 text-emerald-800/80">
                                        Өтінім осы компания атынан беріледі.
                                        Ресми реквизиттерді бұл бетте өзгертуге
                                        болмайды.
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                htmlFor="company_legal_form"
                                label="Заңды нысаны"
                                error={form.errors.company_legal_form}
                            >
                                <Select
                                    value={form.data.company_legal_form}
                                    disabled={companyLocked}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'company_legal_form',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger id="company_legal_form">
                                        <SelectValue placeholder="Таңдаңыз" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(legalForms).map(
                                            ([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                htmlFor="company_name"
                                label="Компания атауы"
                                error={form.errors.company_name}
                            >
                                <Input
                                    id="company_name"
                                    name="company_name"
                                    value={form.data.company_name}
                                    disabled={companyLocked}
                                    onChange={(e) =>
                                        form.setData(
                                            'company_name',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="company_bin"
                                label="БСН (12 сан)"
                                error={form.errors.company_bin}
                            >
                                <div className="flex gap-2">
                                    <Input
                                        id="company_bin"
                                        name="company_bin"
                                        inputMode="numeric"
                                        maxLength={12}
                                        disabled={isInvestor}
                                        value={form.data.company_bin}
                                        onChange={(e) => {
                                            const nextBin =
                                                e.target.value.replace(
                                                    /\D/g,
                                                    '',
                                                );
                                            if (
                                                companyLocked &&
                                                nextBin !==
                                                    form.data.company_bin
                                            ) {
                                                form.setData(
                                                    'company_legal_form',
                                                    '',
                                                );
                                                form.setData(
                                                    'company_name',
                                                    '',
                                                );
                                                form.setData(
                                                    'company_activity_type',
                                                    '',
                                                );
                                                form.setData(
                                                    'company_registration_date',
                                                    '',
                                                );
                                                form.setData(
                                                    'company_region_id',
                                                    '',
                                                );
                                                form.setData(
                                                    'director_full_name',
                                                    '',
                                                );
                                                form.setData(
                                                    'legal_address',
                                                    '',
                                                );
                                            }
                                            form.setData(
                                                'company_bin',
                                                nextBin,
                                            );
                                            setCompanyLocked(false);
                                            setCompanyActivityLocked(false);
                                            setLookupState({
                                                loading: false,
                                                tone: 'neutral',
                                                message: '',
                                            });
                                        }}
                                        required
                                    />
                                    {!isInvestor && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="shrink-0"
                                            disabled={lookupState.loading}
                                            onClick={lookupCompany}
                                        >
                                            {lookupState.loading ? (
                                                <Loader2 className="animate-spin" />
                                            ) : (
                                                <Search />
                                            )}
                                            Тексеру
                                        </Button>
                                    )}
                                </div>
                                {lookupState.message && (
                                    <p
                                        className={`mt-2 flex gap-2 rounded-lg px-3 py-2 text-xs ${
                                            lookupState.tone === 'success'
                                                ? 'bg-emerald-50 text-emerald-800'
                                                : lookupState.tone === 'warning'
                                                  ? 'bg-amber-50 text-amber-900'
                                                  : 'bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        {lookupState.tone === 'success' ? (
                                            <BadgeCheck className="size-4 shrink-0" />
                                        ) : lookupState.tone === 'warning' ? (
                                            <AlertCircle className="size-4 shrink-0" />
                                        ) : null}
                                        {lookupState.message}
                                    </p>
                                )}
                            </Field>
                            <Field
                                htmlFor="company_activity_type"
                                label="Компанияның негізгі қызмет саласы"
                                error={form.errors.company_activity_type}
                            >
                                <Input
                                    id="company_activity_type"
                                    name="company_activity_type"
                                    value={form.data.company_activity_type}
                                    disabled={companyActivityLocked}
                                    maxLength={255}
                                    placeholder="Мысалы, тамақ өнімдерін өндіру"
                                    onChange={(e) =>
                                        form.setData(
                                            'company_activity_type',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="company_registration_date"
                                label="Тіркелген күні"
                                error={form.errors.company_registration_date}
                            >
                                <Input
                                    id="company_registration_date"
                                    name="company_registration_date"
                                    type="date"
                                    disabled={companyLocked}
                                    value={form.data.company_registration_date}
                                    onChange={(e) =>
                                        form.setData(
                                            'company_registration_date',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="company_region_id"
                                label="Тіркелген аудан"
                                error={form.errors.company_region_id}
                            >
                                <Select
                                    value={form.data.company_region_id}
                                    disabled={companyLocked}
                                    onValueChange={(value) =>
                                        form.setData('company_region_id', value)
                                    }
                                >
                                    <SelectTrigger id="company_region_id">
                                        <SelectValue placeholder="Таңдаңыз" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions.map((region) => (
                                            <SelectItem
                                                key={region.id}
                                                value={String(region.id)}
                                            >
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                htmlFor="director_full_name"
                                label="Басшының аты-жөні"
                                error={form.errors.director_full_name}
                            >
                                <Input
                                    id="director_full_name"
                                    name="director_full_name"
                                    value={form.data.director_full_name}
                                    disabled={companyLocked}
                                    onChange={(e) =>
                                        form.setData(
                                            'director_full_name',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="contact_person"
                                label="Байланыс тұлғасы"
                                error={form.errors.contact_person}
                            >
                                <Input
                                    id="contact_person"
                                    name="contact_person"
                                    value={form.data.contact_person}
                                    disabled={isInvestor}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_person',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field
                                htmlFor="contact_phone"
                                label="Телефон"
                                error={form.errors.contact_phone}
                            >
                                <Input
                                    id="contact_phone"
                                    name="contact_phone"
                                    type="tel"
                                    value={form.data.contact_phone}
                                    disabled={isInvestor}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_phone',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="contact_email"
                                label="Email"
                                error={form.errors.contact_email}
                            >
                                <Input
                                    id="contact_email"
                                    name="contact_email"
                                    type="email"
                                    value={form.data.contact_email}
                                    disabled={isInvestor}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_email',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                htmlFor="legal_address"
                                label="Заңды мекенжай"
                                error={form.errors.legal_address}
                            >
                                <Input
                                    id="legal_address"
                                    name="legal_address"
                                    value={form.data.legal_address}
                                    disabled={companyLocked}
                                    onChange={(e) =>
                                        form.setData(
                                            'legal_address',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                        </div>
                    </ApplicantSectionCard>

                    <ApplicantSectionCard
                        title="Қажетті инфрақұрылым"
                        description="Тек қажет ресурстардың шамасын көрсетіңіз"
                        icon={Network}
                        tone="emerald"
                    >
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {infrastructureFields.map((field) => (
                                <Field
                                    key={field.key}
                                    htmlFor={`infrastructure_requirements_${field.key}`}
                                    label={`${field.label} (${field.unit})`}
                                    error={
                                        form.errors[
                                            `infrastructure_requirements.${field.key}`
                                        ]
                                    }
                                >
                                    <Input
                                        id={`infrastructure_requirements_${field.key}`}
                                        name={`infrastructure_requirements[${field.key}]`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            form.data
                                                .infrastructure_requirements[
                                                field.key
                                            ]
                                        }
                                        onChange={(e) =>
                                            form.setData(
                                                'infrastructure_requirements',
                                                {
                                                    ...form.data
                                                        .infrastructure_requirements,
                                                    [field.key]: e.target.value,
                                                },
                                            )
                                        }
                                    />
                                </Field>
                            ))}
                        </div>
                    </ApplicantSectionCard>

                    <div data-form-field="planned_production">
                        <PlannedProductionForm
                            errors={form.errors}
                            notApplicable={form.data.production_not_applicable}
                            onChange={(plans) =>
                                form.setData('planned_production', plans)
                            }
                            onNotApplicableChange={(value) =>
                                form.setData('production_not_applicable', value)
                            }
                            value={form.data.planned_production}
                        />
                    </div>

                    <ApplicantSectionCard
                        title="Құжаттар"
                        description="PDF, Word, Excel немесе сурет; әр файл 10 МБ-тан аспайды"
                        icon={Files}
                        tone="violet"
                    >
                        <Label htmlFor="documents">Құжаттарды таңдаңыз</Label>
                        <Input
                            id="documents"
                            name="documents[]"
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.jpg,.jpeg,.png,.gif"
                            multiple
                            onChange={(event) =>
                                form.setData(
                                    'documents',
                                    Array.from(event.target.files ?? []),
                                )
                            }
                        />
                        <InputError message={documentError} className="mt-2" />
                        {application?.documents?.length ? (
                            <div className="mt-4 divide-y divide-slate-100">
                                {application.documents.map((document) => (
                                    <div
                                        key={document.id}
                                        className="flex items-center justify-between gap-3 py-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <FileText className="size-4 shrink-0" />
                                            <span className="truncate text-sm">
                                                {document.name}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={downloadRoutes.download.url(
                                                    {
                                                        investmentApplication:
                                                            application.id,
                                                        document: document.id,
                                                    },
                                                )}
                                            >
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Download />
                                                </Button>
                                            </a>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="text-rose-700"
                                                onClick={() =>
                                                    confirm(
                                                        'Құжатты жою керек пе?',
                                                    ) &&
                                                    router.delete(
                                                        applicationDocumentRoutes.destroy.url(
                                                            {
                                                                investmentApplication:
                                                                    application.id,
                                                                document:
                                                                    document.id,
                                                            },
                                                        ),
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </ApplicantSectionCard>

                    <div className="sticky bottom-4 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_24px_65px_-32px_rgba(15,27,61,0.45)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={form.processing}
                            onClick={(event) => submit(event, 'draft')}
                        >
                            <Save /> Жоба нұсқасын сақтау
                        </Button>
                        <Button
                            type="button"
                            className="bg-gold text-white shadow-[0_12px_28px_-14px_rgba(200,164,78,0.8)] hover:bg-gold-dark"
                            disabled={form.processing}
                            onClick={(event) => submit(event, 'submit')}
                        >
                            <Send /> Өтінімді жіберу
                        </Button>
                    </div>
                </form>
            </PageContainer>
        </AppLayout>
    );
}

function Field({
    htmlFor,
    label,
    error,
    children,
}: {
    htmlFor: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}
