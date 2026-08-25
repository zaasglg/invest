import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    BriefcaseBusiness,
    CheckCircle2,
    Clock3,
    Database,
    Edit3,
    Eye,
    Gauge,
    LandPlot,
    MapPin,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    Users,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import FilterPanel from '@/components/filter-panel';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCanModify } from '@/hooks/use-can-modify';
import { cn, formatMoneyCompact } from '@/lib/utils';
import type { PaginatedData, SharedData } from '@/types';

export interface ZoneRegion {
    id: number;
    name: string;
}

interface ZoneAreaMetrics {
    total: number;
    occupied: number;
    reserved: number;
    available: number;
    overused: number;
    usage_rate: number;
}

export interface ZonePortfolioItem {
    id: number;
    name: string;
    region: ZoneRegion | null;
    status: 'active' | 'developing' | 'planned';
    total_area: string | null;
    updated_at: string | null;
    metrics: {
        projects_count: number;
        investment: number;
        jobs_count: number;
        area: ZoneAreaMetrics;
        active_issues_count: number;
        critical_issues_count: number;
        pending_applications_count: number;
        active_reservations_count: number;
        photos_count: number;
        data_completeness: number;
        overloaded_resources: string[];
        requires_attention: boolean;
        attention_reasons: string[];
    };
}

export interface ZonePortfolioSummary {
    total: number;
    active: number;
    developing: number;
    planned: number;
    total_area: number;
    occupied_area: number;
    reserved_area: number;
    available_area: number;
    projects_count: number;
    investment: number;
    jobs_count: number;
    active_issues: number;
    critical_issues: number;
    pending_applications: number;
    attention_count: number;
}

export interface ZoneFilters {
    search: string;
    region_id: string;
    status: string;
}

interface ZoneRoutes {
    index: string;
    create: string;
    deleted: string;
    show: (id: number) => string;
    edit: (id: number) => string;
    destroy: (id: number) => string;
}

interface ZonePageConfig {
    eyebrow: string;
    title: string;
    description: string;
    singular: string;
    createLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    icon: LucideIcon;
    supportsPlanned?: boolean;
}

interface Props {
    zones: PaginatedData<ZonePortfolioItem>;
    summary: ZonePortfolioSummary;
    regions: ZoneRegion[];
    filters: Partial<ZoneFilters>;
    routes: ZoneRoutes;
    config: ZonePageConfig;
}

const numberFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 1,
});

const resourceLabels: Record<string, string> = {
    electricity: 'Электр',
    water: 'Су',
    gas: 'Газ',
    roads: 'Жол',
    railway: 'Теміржол',
    internet: 'Интернет',
};

function statusMeta(status: ZonePortfolioItem['status']) {
    return {
        active: {
            label: 'Белсенді',
            className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        },
        developing: {
            label: 'Дамытылуда',
            className: 'bg-amber-50 text-amber-700 ring-amber-200',
        },
        planned: {
            label: 'Жоспарланған',
            className: 'bg-sky-50 text-sky-700 ring-sky-200',
        },
    }[status];
}

function SummaryCard({
    label,
    value,
    note,
    icon: Icon,
    tone = 'sky',
}: {
    label: string;
    value: string;
    note: string;
    icon: LucideIcon;
    tone?: 'sky' | 'emerald' | 'amber' | 'rose';
}) {
    const tones = {
        sky: 'bg-sky-50 text-sky-700 ring-sky-100',
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        amber: 'bg-amber-50 text-amber-700 ring-amber-100',
        rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    };

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                        {label}
                    </p>
                    <p className="mt-2 truncate text-2xl font-extrabold tracking-tight text-[#0f1b3d] tabular-nums">
                        {value}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        {note}
                    </p>
                </div>
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1',
                        tones[tone],
                    )}
                >
                    <Icon className="size-4.5" />
                </span>
            </div>
        </div>
    );
}

function UsageBar({ area }: { area: ZoneAreaMetrics }) {
    return (
        <div className="min-w-44">
            <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-[#0f1b3d]">
                    {numberFormatter.format(area.occupied)} га бос емес
                </span>
                <span className="font-bold text-sky-700 tabular-nums">
                    {numberFormatter.format(area.usage_rate)}%
                </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={cn(
                        'h-full rounded-full',
                        area.overused > 0
                            ? 'bg-rose-500'
                            : area.usage_rate >= 85
                              ? 'bg-amber-500'
                              : 'bg-sky-500',
                    )}
                    style={{ width: `${Math.min(100, area.usage_rate)}%` }}
                />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
                {numberFormatter.format(area.reserved)} га резерв ·{' '}
                {numberFormatter.format(area.available)} га қолжетімді
            </p>
        </div>
    );
}

export default function ZonePortfolioIndex({
    zones,
    summary,
    regions,
    filters,
    routes,
    config,
}: Props) {
    const {
        url,
        props: { auth },
    } = usePage<SharedData>();
    const canModify = useCanModify();
    const isSuperadmin = auth.user?.role_model?.name === 'superadmin';
    const [filtersOpen, setFiltersOpen] = useState(
        !!(filters.search || filters.region_id || filters.status),
    );
    const { data, setData, get } = useForm<ZoneFilters>({
        search: filters.search ?? '',
        region_id: filters.region_id ?? '',
        status: filters.status ?? '',
    });
    const Icon = config.icon;
    const activeFilterCount = Object.values(data).filter(Boolean).length;

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(routes.index, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => router.get(routes.index);

    const handleDelete = (zone: ZonePortfolioItem) => {
        if (confirm(`${zone.name} нысанын жоюға сенімдісіз бе?`)) {
            router.delete(routes.destroy(zone.id));
        }
    };

    return (
        <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
            <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-5 py-6 shadow-sm sm:px-7 sm:py-7">
                <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-sky-200/35 blur-3xl" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex items-start gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f1b3d] text-sky-200 shadow-lg shadow-slate-300/60">
                            <Icon className="size-5.5" />
                        </span>
                        <div>
                            <p className="text-[11px] font-extrabold tracking-[0.18em] text-sky-700 uppercase">
                                {config.eyebrow}
                            </p>
                            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0f1b3d] sm:text-3xl">
                                {config.title}
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                {config.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setFiltersOpen((current) => !current)
                            }
                            className="border-sky-200 bg-white text-sky-800 hover:bg-sky-50"
                        >
                            <SlidersHorizontal data-icon="inline-start" />
                            Сүзгі
                            {activeFilterCount > 0 && (
                                <span className="ml-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                        {isSuperadmin && (
                            <Button asChild variant="outline">
                                <Link href={routes.deleted}>
                                    <Trash2 data-icon="inline-start" />
                                    Өшірілгендер
                                </Link>
                            </Button>
                        )}
                        {canModify && (
                            <Button
                                asChild
                                className="bg-[#0f1b3d] text-white hover:bg-[#17284f]"
                            >
                                <Link href={routes.create}>
                                    <Plus data-icon="inline-start" />
                                    {config.createLabel}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <SummaryCard
                    label="Нысандар"
                    value={numberFormatter.format(summary.total)}
                    note={`${summary.active} белсенді · ${summary.developing + summary.planned} даму сатысында`}
                    icon={config.icon}
                />
                <SummaryCard
                    label="Жалпы аумақ"
                    value={`${numberFormatter.format(summary.total_area)} га`}
                    note={`${numberFormatter.format(summary.available_area)} га қолжетімді`}
                    icon={LandPlot}
                    tone="emerald"
                />
                <SummaryCard
                    label="Бос емес және резерв"
                    value={`${numberFormatter.format(summary.occupied_area + summary.reserved_area)} га`}
                    note={`${numberFormatter.format(summary.reserved_area)} га резервте`}
                    icon={Gauge}
                    tone="amber"
                />
                <SummaryCard
                    label="Жобалар"
                    value={numberFormatter.format(summary.projects_count)}
                    note={`${numberFormatter.format(summary.jobs_count)} жұмыс орны`}
                    icon={BriefcaseBusiness}
                />
                <SummaryCard
                    label="Инвестиция"
                    value={formatMoneyCompact(summary.investment)}
                    note={`${summary.pending_applications} өтінім қаралуда`}
                    icon={WalletCards}
                    tone="emerald"
                />
                <SummaryCard
                    label="Назарда"
                    value={numberFormatter.format(summary.attention_count)}
                    note={`${summary.active_issues} ашық · ${summary.critical_issues} критикалық мәселе`}
                    icon={AlertTriangle}
                    tone={summary.attention_count > 0 ? 'rose' : 'emerald'}
                />
            </section>

            {summary.attention_count > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                            <AlertTriangle className="size-4" />
                        </span>
                        <div>
                            <p className="text-sm font-bold text-amber-950">
                                {summary.attention_count} нысан бойынша әрекет
                                қажет
                            </p>
                            <p className="mt-0.5 text-xs text-amber-800/75">
                                Ашық мәселелер, инфрақұрылым жүктемесі, бос
                                портфель және қаралатын өтінімдер есептелді.
                            </p>
                        </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-800">
                        Тәуекелді нысандар тізімде белгіленген
                    </span>
                </div>
            )}

            <FilterPanel
                open={filtersOpen}
                onToggle={() => setFiltersOpen((current) => !current)}
                onSubmit={submitFilters}
                onClear={clearFilters}
                activeCount={activeFilterCount}
                showTrigger={false}
            >
                <div className="space-y-1.5">
                    <Label htmlFor="zone-search">Іздеу</Label>
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            id="zone-search"
                            value={data.search}
                            onChange={(event) =>
                                setData('search', event.target.value)
                            }
                            placeholder={`${config.singular} атауы`}
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label>Аймақ</Label>
                    <Select
                        value={data.region_id}
                        onValueChange={(value) => setData('region_id', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Барлық аймақтар" />
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
                </div>
                <div className="space-y-1.5">
                    <Label>Күйі</Label>
                    <Select
                        value={data.status}
                        onValueChange={(value) => setData('status', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Барлық күйлер" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Белсенді</SelectItem>
                            <SelectItem value="developing">
                                Дамытылуда
                            </SelectItem>
                            {config.supportsPlanned && (
                                <SelectItem value="planned">
                                    Жоспарланған
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </FilterPanel>

            {zones.data.length === 0 ? (
                <section className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-gradient-to-b from-white to-sky-50/50 px-6 text-center">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                        <Icon className="size-6" />
                    </span>
                    <h2 className="mt-4 text-lg font-bold text-[#0f1b3d]">
                        {config.emptyTitle}
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                        {config.emptyDescription}
                    </p>
                    {canModify && (
                        <Button
                            asChild
                            className="mt-5 bg-[#0f1b3d] text-white hover:bg-[#17284f]"
                        >
                            <Link href={routes.create}>
                                <Plus data-icon="inline-start" />
                                {config.createLabel}
                            </Link>
                        </Button>
                    )}
                </section>
            ) : (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-bold text-[#0f1b3d]">
                                Нысандар портфелі
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {zones.total} жазба · тәуекел мен жүктеме бір
                                жолда
                            </p>
                        </div>
                        <p className="text-xs text-slate-400">
                            Соңғы жаңартылғаны жоғарыда
                        </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {zones.data.map((zone) => {
                            const status = statusMeta(zone.status);

                            return (
                                <article
                                    key={zone.id}
                                    className="group grid gap-4 px-5 py-5 transition hover:bg-sky-50/40 xl:grid-cols-[minmax(230px,1.15fr)_minmax(220px,0.9fr)_minmax(180px,0.7fr)_minmax(190px,0.75fr)_auto] xl:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                className={cn(
                                                    'border-0 text-[10px] ring-1 ring-inset',
                                                    status.className,
                                                )}
                                            >
                                                {status.label}
                                            </Badge>
                                            {zone.metrics.requires_attention ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                                    <AlertTriangle className="size-3" />
                                                    Назар қажет
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                    <CheckCircle2 className="size-3" />
                                                    Қалыпты
                                                </span>
                                            )}
                                        </div>
                                        <Link
                                            href={routes.show(zone.id)}
                                            className="mt-2 inline-flex max-w-full items-center gap-1.5 font-bold text-[#0f1b3d] transition hover:text-sky-700"
                                        >
                                            <span className="truncate">
                                                {zone.name}
                                            </span>
                                            <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                                        </Link>
                                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                            <MapPin className="size-3.5 text-sky-500" />
                                            {zone.region?.name ??
                                                'Аймақ көрсетілмеген'}
                                        </p>
                                        {zone.metrics.attention_reasons.length >
                                            0 && (
                                            <p className="mt-2 line-clamp-1 text-[11px] text-rose-600">
                                                {zone.metrics.attention_reasons.join(
                                                    ' · ',
                                                )}
                                            </p>
                                        )}
                                    </div>

                                    <UsageBar area={zone.metrics.area} />

                                    <div className="grid grid-cols-2 gap-3 text-xs xl:block xl:space-y-1.5">
                                        <p className="text-slate-500">
                                            <strong className="text-[#0f1b3d]">
                                                {zone.metrics.projects_count}
                                            </strong>{' '}
                                            жоба
                                        </p>
                                        <p className="text-slate-500">
                                            <strong className="text-[#0f1b3d]">
                                                {formatMoneyCompact(
                                                    zone.metrics.investment,
                                                )}
                                            </strong>
                                        </p>
                                        <p className="inline-flex items-center gap-1 text-slate-500">
                                            <Users className="size-3.5 text-sky-500" />
                                            {zone.metrics.jobs_count} жұмыс орны
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs xl:block xl:space-y-1.5">
                                        <p
                                            className={cn(
                                                zone.metrics
                                                    .active_issues_count > 0
                                                    ? 'font-semibold text-rose-600'
                                                    : 'text-slate-500',
                                            )}
                                        >
                                            {zone.metrics.active_issues_count}{' '}
                                            ашық мәселе
                                        </p>
                                        <p className="inline-flex items-center gap-1.5 text-slate-500">
                                            <Clock3 className="size-3.5 text-amber-500" />
                                            {
                                                zone.metrics
                                                    .pending_applications_count
                                            }{' '}
                                            өтінім
                                        </p>
                                        <p className="inline-flex items-center gap-1.5 text-slate-500">
                                            <Database className="size-3.5 text-sky-500" />
                                            Дерек{' '}
                                            {numberFormatter.format(
                                                zone.metrics.data_completeness,
                                            )}
                                            %
                                        </p>
                                        {zone.metrics.overloaded_resources
                                            .length > 0 && (
                                            <p className="text-[11px] text-amber-700">
                                                Артық жүктеме:{' '}
                                                {zone.metrics.overloaded_resources
                                                    .map(
                                                        (resource) =>
                                                            resourceLabels[
                                                                resource
                                                            ] ?? resource,
                                                    )
                                                    .join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                            title="Қарау"
                                            className="text-slate-500 hover:bg-sky-50 hover:text-sky-700"
                                        >
                                            <Link href={routes.show(zone.id)}>
                                                <Eye className="size-4" />
                                            </Link>
                                        </Button>
                                        {canModify && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Өңдеу"
                                                    className="text-slate-500 hover:bg-sky-50 hover:text-sky-700"
                                                >
                                                    <Link
                                                        href={`${routes.edit(zone.id)}?return_to=${encodeURIComponent(url)}`}
                                                    >
                                                        <Edit3 className="size-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Жою"
                                                    onClick={() =>
                                                        handleDelete(zone)
                                                    }
                                                    className="text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            {zones.data.length > 0 && <Pagination paginator={zones} />}
        </div>
    );
}
