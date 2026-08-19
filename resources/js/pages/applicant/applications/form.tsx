import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    BriefcaseBusiness,
    Building2,
    Download,
    FilePenLine,
    FileText,
    Files,
    Network,
    Save,
    Send,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';

import {
    ApplicantHero,
    ApplicantSectionCard,
} from '@/components/applicant/applicant-ui';
import InputError from '@/components/input-error';
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
    applicantDefaults: {
        full_name: string;
        email: string;
        phone?: string | null;
    };
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
    applicantDefaults,
}: Props) {
    const form = useForm({
        intent: 'draft',
        project_name: application?.project_name ?? '',
        project_description: application?.project_description ?? '',
        project_type_ids:
            application?.project_types?.map(({ id }) => id.toString()) ?? [],
        requested_area: String(application?.requested_area ?? ''),
        investment_amount: String(application?.investment_amount ?? ''),
        jobs_count: String(application?.jobs_count ?? ''),
        infrastructure_requirements: Object.fromEntries(
            infrastructureFields.map(({ key }) => [
                key,
                String(application?.infrastructure_requirements?.[key] ?? ''),
            ]),
        ) as Record<string, string>,
        company_legal_form: application?.company_legal_form ?? '',
        company_name: application?.company_name ?? '',
        company_bin: application?.company_bin ?? '',
        company_registration_date:
            application?.company_registration_date?.slice(0, 10) ?? '',
        company_region_id: String(application?.company_region_id ?? ''),
        director_full_name: application?.director_full_name ?? '',
        contact_person:
            application?.contact_person ?? applicantDefaults.full_name,
        contact_phone:
            application?.contact_phone ?? applicantDefaults.phone ?? '',
        contact_email: application?.contact_email ?? applicantDefaults.email,
        legal_address: application?.legal_address ?? '',
        documents: [] as File[],
    });

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
            <PageContainer width="form">
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
                        description="Жобаның мақсаты мен негізгі көрсеткіштері"
                        icon={BriefcaseBusiness}
                        tone="navy"
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                label="Жоба атауы"
                                error={form.errors.project_name}
                            >
                                <Input
                                    value={form.data.project_name}
                                    onChange={(e) =>
                                        form.setData(
                                            'project_name',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                label="Қызмет түрлері"
                                error={form.errors.project_type_ids}
                            >
                                <ProjectTypeMultiSelect
                                    id="project_type_ids"
                                    options={projectTypes}
                                    value={form.data.project_type_ids}
                                    placeholder="Қызмет түрлерін таңдаңыз"
                                    onChange={(value) =>
                                        form.setData('project_type_ids', value)
                                    }
                                    hasError={Boolean(
                                        form.errors.project_type_ids,
                                    )}
                                />
                            </Field>
                            <Field
                                label="Қажетті аумақ (га)"
                                error={form.errors.requested_area}
                            >
                                <Input
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
                                label="Инвестиция көлемі (₸)"
                                error={form.errors.investment_amount}
                            >
                                <Input
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
                                label="Жұмыс орындары"
                                error={form.errors.jobs_count}
                            >
                                <Input
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
                            <div className="sm:col-span-2">
                                <Field
                                    label="Жоба сипаттамасы"
                                    error={form.errors.project_description}
                                >
                                    <Textarea
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
                        description="Заңды тұлға мен байланыс деректері"
                        icon={Building2}
                        tone="sky"
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                label="Заңды нысаны"
                                error={form.errors.company_legal_form}
                            >
                                <Select
                                    value={form.data.company_legal_form}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'company_legal_form',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
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
                                label="Компания атауы"
                                error={form.errors.company_name}
                            >
                                <Input
                                    value={form.data.company_name}
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
                                label="БСН (12 сан)"
                                error={form.errors.company_bin}
                            >
                                <Input
                                    inputMode="numeric"
                                    maxLength={12}
                                    value={form.data.company_bin}
                                    onChange={(e) =>
                                        form.setData(
                                            'company_bin',
                                            e.target.value.replace(/\D/g, ''),
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                label="Тіркелген күні"
                                error={form.errors.company_registration_date}
                            >
                                <Input
                                    type="date"
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
                                label="Тіркелген аудан"
                                error={form.errors.company_region_id}
                            >
                                <Select
                                    value={form.data.company_region_id}
                                    onValueChange={(value) =>
                                        form.setData('company_region_id', value)
                                    }
                                >
                                    <SelectTrigger>
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
                                label="Басшының аты-жөні"
                                error={form.errors.director_full_name}
                            >
                                <Input
                                    value={form.data.director_full_name}
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
                                label="Байланыс тұлғасы"
                                error={form.errors.contact_person}
                            >
                                <Input
                                    value={form.data.contact_person}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_person',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field
                                label="Телефон"
                                error={form.errors.contact_phone}
                            >
                                <Input
                                    type="tel"
                                    value={form.data.contact_phone}
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
                                label="Email"
                                error={form.errors.contact_email}
                            >
                                <Input
                                    type="email"
                                    value={form.data.contact_email}
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
                                label="Заңды мекенжай"
                                error={form.errors.legal_address}
                            >
                                <Input
                                    value={form.data.legal_address}
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
                                    label={`${field.label} (${field.unit})`}
                                    error={
                                        form.errors[
                                            `infrastructure_requirements.${field.key}`
                                        ]
                                    }
                                >
                                    <Input
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

                    <ApplicantSectionCard
                        title="Құжаттар"
                        description="PDF, Word, Excel немесе сурет; әр файл 10 МБ-тан аспайды"
                        icon={Files}
                        tone="violet"
                    >
                        <Input
                            type="file"
                            multiple
                            onChange={(event) =>
                                form.setData(
                                    'documents',
                                    Array.from(event.target.files ?? []),
                                )
                            }
                        />
                        <InputError
                            message={form.errors.documents}
                            className="mt-2"
                        />
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
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}
