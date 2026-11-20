import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    Eye,
    FileSearch,
    LandPlot,
    MessageSquareWarning,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import FilterPanel from '@/components/filter-panel';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, PageHeader } from '@/components/ui/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import * as routes from '@/routes/investment-applications';
import type { InvestmentApplication, PaginatedData } from '@/types';

type Props = {
    applications: PaginatedData<InvestmentApplication>;
    statuses: Record<string, string>;
    filters: { search: string; status: string; type: string };
    stats: {
        submitted: number;
        under_review: number;
        approved: number;
        needs_clarification: number;
    };
};

const sectorReviewLabels: Record<string, string> = {
    not_requested: 'Техникалық тексеруге жіберілмеген',
    pending: 'Техникалық қорытынды күтілуде',
    approved: 'Техникалық келісім берілді',
    rejected: 'Техникалық тексеруден қайтарылды',
};

export default function ReviewIndex({
    applications,
    statuses,
    filters,
    stats,
}: Props) {
    const { data, setData, get } = useForm(filters);
    const [filtersOpen, setFiltersOpen] = useState(
        Boolean(filters.search || filters.status || filters.type),
    );
    const activeFilterCount = [data.search, data.status, data.type].filter(
        Boolean,
    ).length;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        get(routes.index.url(), { preserveState: true, replace: true });
    };

    const selectStatus = (status: string) => {
        setData('status', status);
        router.get(
            routes.index.url(),
            { ...data, status },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const clearFilters = () => router.get(routes.index.url());

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Инвестор өтінімдері',
                    href: routes.index.url(),
                },
            ]}
        >
            <Head title="Инвестор өтінімдері" />

            <div className="page-surface flex min-w-0 flex-col gap-5 sm:gap-6">
                <PageHeader
                    eyebrow="Инвестор тарту портфелі"
                    title="Инвестор өтінімдері"
                    subtitle="Инвестордан түскен өтінімдерді жауапты менеджерге бекітіп, техникалық қорытындыдан өткізіп, жобаға айналдыру процесін басқарыңыз."
                    icon={<BriefcaseBusiness className="size-5" />}
                    badge={
                        <span className="rounded-md bg-navy/5 px-2.5 py-1 text-xs font-bold text-navy ring-1 ring-navy/10">
                            {applications.total} өтінім
                        </span>
                    }
                    action={
                        <Button
                            variant="outline"
                            onClick={() => setFiltersOpen(true)}
                        >
                            <SlidersHorizontal data-icon="inline-start" />
                            Сүзгі
                            {activeFilterCount > 0 && (
                                <span className="flex size-5 items-center justify-center rounded-md bg-navy text-[11px] font-bold text-white tabular-nums">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    }
                />

                <div
                    className="flex flex-wrap gap-2"
                    aria-label="Өтінімдерді жылдам сүзу"
                >
                    {[
                        { value: '', label: 'Барлық өтінімдер' },
                        { value: 'submitted', label: 'Жаңа' },
                        { value: 'under_review', label: 'Қаралуда' },
                        {
                            value: 'needs_clarification',
                            label: 'Толықтыруда',
                        },
                        { value: 'approved', label: 'Резервте' },
                    ].map((item) => (
                        <Button
                            key={item.value}
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-pressed={data.status === item.value}
                            onClick={() => selectStatus(item.value)}
                            className={
                                data.status === item.value
                                    ? 'border-navy bg-navy text-white hover:bg-navy/90 hover:text-white'
                                    : 'bg-white text-slate-600'
                            }
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>

                <FilterPanel
                    open={filtersOpen}
                    onToggle={() => setFiltersOpen((open) => !open)}
                    onSubmit={submit}
                    onClear={clearFilters}
                    activeCount={activeFilterCount}
                    showTrigger={false}
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="review-search">Іздеу</Label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                id="review-search"
                                className="pl-10"
                                value={data.search}
                                onChange={(event) =>
                                    setData('search', event.target.value)
                                }
                                placeholder="Нөмірі, жоба, компания немесе өтінім беруші"
                            />
                        </div>
                        <p className="text-xs leading-5 text-slate-400">
                            Өтінім нөмірі, жоба, компания немесе өтінім беруші
                            бойынша іздеңіз.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Күйі</Label>
                        <Select
                            value={data.status || 'all'}
                            onValueChange={(value) =>
                                setData('status', value === 'all' ? '' : value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Барлығы</SelectItem>
                                {Object.entries(statuses).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Аймақ түрі</Label>
                        <Select
                            value={data.type || 'all'}
                            onValueChange={(value) =>
                                setData('type', value === 'all' ? '' : value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Барлығы</SelectItem>
                                <SelectItem value="sez">АЭА</SelectItem>
                                <SelectItem value="industrial-zone">
                                    ИА
                                </SelectItem>
                                <SelectItem value="prom-zone">
                                    Пром зона
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </FilterPanel>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        {
                            label: 'Жаңа өтінімдер',
                            value: stats.submitted,
                            description: 'Менеджер қабылдауын күтіп тұр',
                            icon: FileSearch,
                            iconClass: 'bg-navy text-white',
                        },
                        {
                            label: 'Қаралуда',
                            value: stats.under_review,
                            description: 'Қазір жұмыс жүргізілуде',
                            icon: Clock3,
                            iconClass: 'bg-sky-600 text-white',
                        },
                        {
                            label: 'Толықтыруда',
                            value: stats.needs_clarification,
                            description: 'Инвестордың жауабы күтілуде',
                            icon: MessageSquareWarning,
                            iconClass: 'bg-amber-500 text-white',
                        },
                        {
                            label: 'Резервте',
                            value: stats.approved,
                            description: 'Жер уақытша бекітілген',
                            icon: CheckCircle2,
                            iconClass:
                                'border border-emerald-200 bg-emerald-50 text-emerald-700',
                        },
                    ].map((metric) => (
                        <div
                            key={metric.label}
                            className="metric-panel flex min-w-0 items-center justify-between gap-4 p-5 sm:p-6"
                        >
                            <div className="min-w-0">
                                <h2 className="text-xs font-bold text-slate-400 uppercase">
                                    {metric.label}
                                </h2>
                                <p className="mt-2 text-3xl font-extrabold text-navy tabular-nums">
                                    {metric.value}
                                </p>
                                <p className="mt-1 truncate text-xs text-slate-400">
                                    {metric.description}
                                </p>
                            </div>
                            <span
                                className={`flex size-11 shrink-0 items-center justify-center rounded-md shadow-sm ${metric.iconClass}`}
                            >
                                <metric.icon className="size-5" />
                            </span>
                        </div>
                    ))}
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                    {applications.data.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardCheck className="size-7" />}
                            title="Өтінімдер табылмады"
                            description="Сүзгі параметрлерін өзгертіп көріңіз."
                        />
                    ) : (
                        <>
                            <div className="hidden lg:block">
                                <Table>
                                    <TableHeader className="bg-slate-50/90">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6">
                                                Нөмірі
                                            </TableHead>
                                            <TableHead>
                                                Жоба / компания
                                            </TableHead>
                                            <TableHead>Өтінім беруші</TableHead>
                                            <TableHead>Аймақ</TableHead>
                                            <TableHead>Гектар</TableHead>
                                            <TableHead>Күйі</TableHead>
                                            <TableHead className="pr-6 text-right">
                                                Әрекет
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {applications.data.map(
                                            (application) => (
                                                <TableRow
                                                    key={application.id}
                                                    className="group hover:bg-sand-light/35"
                                                >
                                                    <TableCell className="pl-6">
                                                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                                            {
                                                                application.application_number
                                                            }
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy/5 text-navy transition-colors group-hover:bg-navy group-hover:text-white">
                                                                <LandPlot className="size-[18px]" />
                                                            </span>
                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={routes.show.url(
                                                                        application.id,
                                                                    )}
                                                                    className="block max-w-72 truncate font-semibold text-navy hover:text-gold-dark hover:underline"
                                                                >
                                                                    {application.project_name ||
                                                                        'Атауы енгізілмеген жоба'}
                                                                </Link>
                                                                <p className="max-w-72 truncate text-xs text-slate-500">
                                                                    {application.company_name ||
                                                                        'Компания көрсетілмеген'}
                                                                </p>
                                                                <p className="mt-1 text-[11px] font-semibold text-sky-700">
                                                                    {
                                                                        application.application_kind_label
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium text-navy">
                                                            {
                                                                application
                                                                    .applicant
                                                                    ?.full_name
                                                            }
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {
                                                                application
                                                                    .applicant
                                                                    ?.phone
                                                            }
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium text-navy">
                                                            {
                                                                application.zone_type_label
                                                            }
                                                        </p>
                                                        <p className="max-w-52 truncate text-xs text-slate-500">
                                                            {
                                                                application
                                                                    .zoneable
                                                                    ?.name
                                                            }
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-navy tabular-nums">
                                                        {application.requested_area !==
                                                        null
                                                            ? `${application.requested_area} га`
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-2">
                                                            <ApplicationStatusBadge
                                                                status={
                                                                    application.status
                                                                }
                                                                label={
                                                                    application.status_label
                                                                }
                                                            />
                                                            {application.sector_review_status &&
                                                                application.sector_review_status !==
                                                                    'not_requested' && (
                                                                    <ApplicationStatusBadge
                                                                        status={
                                                                            application.sector_review_status
                                                                        }
                                                                        label={
                                                                            application.sector_review_status_label ??
                                                                            sectorReviewLabels[
                                                                                application
                                                                                    .sector_review_status
                                                                            ]
                                                                        }
                                                                        className="block w-fit"
                                                                    />
                                                                )}
                                                            {application.assigned_manager && (
                                                                <p className="max-w-48 truncate text-[11px] text-slate-500">
                                                                    Жауапты:{' '}
                                                                    {
                                                                        application
                                                                            .assigned_manager
                                                                            .full_name
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                            className="h-8 w-8 hover:bg-navy/5 hover:text-navy"
                                                            title="Қарау"
                                                        >
                                                            <Link
                                                                href={routes.show.url(
                                                                    application.id,
                                                                )}
                                                            >
                                                                <Eye className="size-4" />
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="divide-y divide-slate-100 lg:hidden">
                                {applications.data.map((application) => (
                                    <article
                                        key={application.id}
                                        className="space-y-4 p-5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                                    {
                                                        application.application_number
                                                    }
                                                </span>
                                                <h3 className="mt-3 font-bold text-navy">
                                                    {application.project_name ||
                                                        'Атауы енгізілмеген жоба'}
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    {application.company_name ||
                                                        'Компания көрсетілмеген'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <ApplicationStatusBadge
                                                    status={application.status}
                                                    label={
                                                        application.status_label
                                                    }
                                                />
                                                {application.sector_review_status &&
                                                    application.sector_review_status !==
                                                        'not_requested' && (
                                                        <ApplicationStatusBadge
                                                            status={
                                                                application.sector_review_status
                                                            }
                                                            label={
                                                                application.sector_review_status_label ??
                                                                sectorReviewLabels[
                                                                    application
                                                                        .sector_review_status
                                                                ]
                                                            }
                                                            className="max-w-40 text-right whitespace-normal"
                                                        />
                                                    )}
                                            </div>
                                        </div>

                                        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                                            <div>
                                                <dt className="text-xs text-slate-400">
                                                    Аймақ
                                                </dt>
                                                <dd className="mt-1 font-medium text-navy">
                                                    {
                                                        application.zone_type_label
                                                    }{' '}
                                                    ·{' '}
                                                    {application.zoneable?.name}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-slate-400">
                                                    Сұралған жер
                                                </dt>
                                                <dd className="mt-1 font-bold text-navy">
                                                    {application.requested_area !==
                                                    null
                                                        ? `${application.requested_area} га`
                                                        : '—'}
                                                </dd>
                                            </div>
                                        </dl>

                                        {application.assigned_manager && (
                                            <p className="text-xs text-slate-500">
                                                Жауапты менеджер:{' '}
                                                <span className="font-semibold text-navy">
                                                    {
                                                        application
                                                            .assigned_manager
                                                            .full_name
                                                    }
                                                </span>
                                            </p>
                                        )}

                                        <Link
                                            href={routes.show.url(
                                                application.id,
                                            )}
                                            className="block"
                                        >
                                            <Button
                                                variant="outline"
                                                className="w-full border-navy/15 text-navy"
                                            >
                                                <Eye /> Өтінімді ашу
                                            </Button>
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </section>

                <Pagination paginator={applications} />
            </div>
        </AppLayout>
    );
}
