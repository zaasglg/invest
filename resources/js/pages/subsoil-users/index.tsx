import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertOctagon,
    AlertTriangle,
    ArrowUpRight,
    Camera,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    Database,
    Edit3,
    Eye,
    FileText,
    Gem,
    MapPin,
    Plus,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
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
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import * as subsoilUsersRoutes from '@/routes/subsoil-users';
import type { PaginatedData, SharedData } from '@/types';

interface Region {
    id: number;
    name: string;
}

type LicenseStatus = 'active' | 'expired' | 'suspended' | 'illegal';
type RiskLevel = 'critical' | 'high' | 'medium' | 'normal';

interface SubsoilUser {
    id: number;
    name: string;
    bin: string;
    region: Region | null;
    mineral_type: string;
    total_area: string | null;
    license_status: LicenseStatus;
    license_start: string | null;
    license_end: string | null;
    updated_at: string | null;
    metrics: {
        active_issues_count: number;
        critical_issues_count: number;
        tasks_count: number;
        overdue_tasks_count: number;
        photos_count: number;
        documents_count: number;
        projects_count: number;
        responsible: string[];
        data_completeness: number;
        risk_level: RiskLevel;
        recommended_action: string;
    };
}

interface Summary {
    total: number;
    active: number;
    illegal: number;
    expired: number;
    suspended: number;
    expiring_soon: number;
    active_issues: number;
    critical_issues: number;
    overdue_tasks: number;
    without_evidence: number;
}

interface Filters {
    search: string;
    region_id: string;
    license_status: string;
    mineral_type: string;
}

interface Props {
    subsoilUsers: PaginatedData<SubsoilUser>;
    summary: Summary;
    regions: Region[];
    mineralTypes: string[];
    filters: Partial<Filters>;
}

const numberFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 1,
});

const licenseMeta: Record<LicenseStatus, { label: string; className: string }> =
    {
        active: {
            label: 'Белсенді лицензия',
            className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        },
        expired: {
            label: 'Мерзімі өткен',
            className: 'bg-slate-100 text-slate-700 ring-slate-200',
        },
        suspended: {
            label: 'Тоқтатылған',
            className: 'bg-amber-50 text-amber-700 ring-amber-200',
        },
        illegal: {
            label: 'Заңсыз',
            className: 'bg-rose-50 text-rose-700 ring-rose-200',
        },
    };

const riskMeta: Record<
    RiskLevel,
    { label: string; className: string; icon: LucideIcon }
> = {
    critical: {
        label: 'Жедел әрекет',
        className: 'bg-rose-100 text-rose-800',
        icon: AlertOctagon,
    },
    high: {
        label: 'Жоғары тәуекел',
        className: 'bg-orange-100 text-orange-800',
        icon: AlertTriangle,
    },
    medium: {
        label: 'Бақылауда',
        className: 'bg-amber-100 text-amber-800',
        icon: Clock3,
    },
    normal: {
        label: 'Қалыпты',
        className: 'bg-emerald-100 text-emerald-800',
        icon: CheckCircle2,
    },
};

function SummaryCard({
    label,
    value,
    note,
    icon: Icon,
    tone = 'sky',
}: {
    label: string;
    value: number;
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
                <div>
                    <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f1b3d] tabular-nums">
                        {numberFormatter.format(value)}
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

function formatDate(value: string | null): string {
    if (!value) return '—';

    return new Intl.DateTimeFormat('kk-KZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

export default function Index({
    subsoilUsers,
    summary,
    regions,
    mineralTypes,
    filters,
}: Props) {
    const {
        url,
        props: { auth },
    } = usePage<SharedData>();
    const canModify = useCanModify();
    const isSuperadmin = auth.user?.role_model?.name === 'superadmin';
    const { data, setData, get } = useForm<Filters>({
        search: filters.search ?? '',
        region_id: filters.region_id ?? '',
        license_status: filters.license_status ?? '',
        mineral_type: filters.mineral_type ?? '',
    });
    const [filtersOpen, setFiltersOpen] = useState(
        !!(
            filters.search ||
            filters.region_id ||
            filters.license_status ||
            filters.mineral_type
        ),
    );
    const activeFilterCount = Object.values(data).filter(Boolean).length;

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(subsoilUsersRoutes.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => router.get(subsoilUsersRoutes.index.url());

    const handleDelete = (item: SubsoilUser) => {
        if (confirm(`${item.name} жазбасын жоюға сенімдісіз бе?`)) {
            router.delete(subsoilUsersRoutes.destroy.url(item.id));
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Жер қойнауын пайдалану',
                    href: subsoilUsersRoutes.index.url(),
                },
            ]}
        >
            <Head title="Жер қойнауын пайдалану" />

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-5 py-6 shadow-sm sm:px-7 sm:py-7">
                    <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-sky-200/35 blur-3xl" />
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f1b3d] text-sky-200 shadow-lg shadow-slate-300/60">
                                <Gem className="size-5.5" />
                            </span>
                            <div>
                                <p className="text-[11px] font-extrabold tracking-[0.18em] text-sky-700 uppercase">
                                    Лицензиялық және заңдылық бақылауы
                                </p>
                                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0f1b3d] sm:text-3xl">
                                    Жер қойнауын пайдалану
                                </h1>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                    Заңсыз пайдалану, лицензия мерзімі,
                                    тапсырмалар, дәлел-құжаттар және жауапты
                                    орындаушылар бір бақылау тізімінде.
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
                                    <Link
                                        href={subsoilUsersRoutes.deleted.url()}
                                    >
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
                                    <Link
                                        href={subsoilUsersRoutes.create.url()}
                                    >
                                        <Plus data-icon="inline-start" />
                                        Нысан қосу
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <SummaryCard
                        label="Барлық нысан"
                        value={summary.total}
                        note={`${regions.length} аймақ қамтылған`}
                        icon={Gem}
                    />
                    <SummaryCard
                        label="Заңсыз"
                        value={summary.illegal}
                        note="Жедел құқықтық бақылау"
                        icon={AlertOctagon}
                        tone="rose"
                    />
                    <SummaryCard
                        label="Белсенді лицензия"
                        value={summary.active}
                        note={`${summary.expiring_soon} лицензия 180 күнде аяқталады`}
                        icon={ShieldCheck}
                        tone="emerald"
                    />
                    <SummaryCard
                        label="Кешіккен тапсырма"
                        value={summary.overdue_tasks}
                        note="Мерзімі өтіп кеткен бақылау"
                        icon={Clock3}
                        tone="amber"
                    />
                    <SummaryCard
                        label="Ашық мәселе"
                        value={summary.active_issues}
                        note={`${summary.critical_issues} критикалық`}
                        icon={AlertTriangle}
                        tone={summary.active_issues > 0 ? 'rose' : 'emerald'}
                    />
                    <SummaryCard
                        label="Дәлелі жоқ"
                        value={summary.without_evidence}
                        note="Фото да, құжат та тіркелмеген"
                        icon={Database}
                        tone="amber"
                    />
                </section>

                {(summary.illegal > 0 || summary.overdue_tasks > 0) && (
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3.5">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                                <AlertOctagon className="size-4.5" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-rose-950">
                                    {summary.illegal} заңсыз нысан бақылауда
                                </p>
                                <p className="mt-1 text-xs leading-5 text-rose-800/75">
                                    Әр нысанға жауапты, мерзім және фото/құжат
                                    дәлелі бекітілуі керек.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3.5">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                <ClipboardCheck className="size-4.5" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-amber-950">
                                    {summary.overdue_tasks} тапсырма мерзімінен
                                    кешіккен
                                </p>
                                <p className="mt-1 text-xs leading-5 text-amber-800/75">
                                    Тізім тәуекел бойынша сұрыпталды: жедел
                                    әрекет қажет нысандар бірінші көрсетіледі.
                                </p>
                            </div>
                        </div>
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
                        <Label htmlFor="subsoil-search">Іздеу</Label>
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                id="subsoil-search"
                                value={data.search}
                                onChange={(event) =>
                                    setData('search', event.target.value)
                                }
                                placeholder="Атауы немесе БСН"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Аймақ</Label>
                        <Select
                            value={data.region_id}
                            onValueChange={(value) =>
                                setData('region_id', value)
                            }
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
                        <Label>Лицензия күйі</Label>
                        <Select
                            value={data.license_status}
                            onValueChange={(value) =>
                                setData('license_status', value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Барлық күйлер" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Белсенді</SelectItem>
                                <SelectItem value="expired">
                                    Мерзімі өткен
                                </SelectItem>
                                <SelectItem value="suspended">
                                    Тоқтатылған
                                </SelectItem>
                                <SelectItem value="illegal">Заңсыз</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Пайдалы қазба</Label>
                        <Select
                            value={data.mineral_type}
                            onValueChange={(value) =>
                                setData('mineral_type', value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Барлық түрлер" />
                            </SelectTrigger>
                            <SelectContent>
                                {mineralTypes.map((mineral) => (
                                    <SelectItem key={mineral} value={mineral}>
                                        {mineral}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </FilterPanel>

                {subsoilUsers.data.length === 0 ? (
                    <section className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-gradient-to-b from-white to-sky-50/50 px-6 text-center">
                        <span className="flex size-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                            <Gem className="size-6" />
                        </span>
                        <h2 className="mt-4 text-lg font-bold text-[#0f1b3d]">
                            Нысандар табылмады
                        </h2>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                            Сүзгіні өзгертіңіз немесе жаңа жер қойнауын
                            пайдаланушы нысанын қосыңыз.
                        </p>
                    </section>
                ) : (
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="font-bold text-[#0f1b3d]">
                                    Бақылау реестрі
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {subsoilUsers.total} нысан · тәуекелі жоғары
                                    жазбалар бірінші
                                </p>
                            </div>
                            <p className="text-xs text-slate-400">
                                Лицензия · тапсырма · дәлел · жауапты
                            </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {subsoilUsers.data.map((item) => {
                                const license =
                                    licenseMeta[item.license_status];
                                const risk = riskMeta[item.metrics.risk_level];
                                const RiskIcon = risk.icon;

                                return (
                                    <article
                                        key={item.id}
                                        className="group grid gap-4 px-5 py-5 transition hover:bg-sky-50/40 xl:grid-cols-[minmax(260px,1.2fr)_minmax(190px,0.75fr)_minmax(170px,0.65fr)_minmax(210px,0.8fr)_auto] xl:items-center"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    className={cn(
                                                        'border-0 text-[10px] ring-1 ring-inset',
                                                        license.className,
                                                    )}
                                                >
                                                    {license.label}
                                                </Badge>
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold',
                                                        risk.className,
                                                    )}
                                                >
                                                    <RiskIcon className="size-3" />
                                                    {risk.label}
                                                </span>
                                            </div>
                                            <Link
                                                href={subsoilUsersRoutes.show.url(
                                                    item.id,
                                                )}
                                                className="mt-2 inline-flex max-w-full items-center gap-1.5 font-bold text-[#0f1b3d] transition hover:text-sky-700"
                                            >
                                                <span className="truncate">
                                                    {item.name}
                                                </span>
                                                <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                                            </Link>
                                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <MapPin className="size-3.5 text-sky-500" />
                                                    {item.region?.name ?? '—'}
                                                </span>
                                                <span>БСН {item.bin}</span>
                                            </p>
                                            <p className="mt-2 text-[11px] font-medium text-slate-500">
                                                {
                                                    item.metrics
                                                        .recommended_action
                                                }
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                                                Пайдалы қазба
                                            </p>
                                            <p className="mt-1.5 text-sm font-semibold text-[#0f1b3d]">
                                                {item.mineral_type}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.total_area
                                                    ? `${numberFormatter.format(Number(item.total_area))} га`
                                                    : 'Аумақ көрсетілмеген'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                                                Лицензия мерзімі
                                            </p>
                                            <p className="mt-1.5 text-xs font-semibold text-[#0f1b3d]">
                                                {item.license_status ===
                                                'illegal'
                                                    ? 'Лицензия жоқ'
                                                    : `${formatDate(item.license_start)} — ${formatDate(item.license_end)}`}
                                            </p>
                                            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                                                <Database className="size-3.5 text-sky-500" />
                                                Дерек{' '}
                                                {numberFormatter.format(
                                                    item.metrics
                                                        .data_completeness,
                                                )}
                                                %
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                            <p
                                                className={cn(
                                                    'inline-flex items-center gap-1.5',
                                                    item.metrics
                                                        .overdue_tasks_count > 0
                                                        ? 'font-bold text-rose-600'
                                                        : 'text-slate-500',
                                                )}
                                            >
                                                <Clock3 className="size-3.5" />
                                                {
                                                    item.metrics
                                                        .overdue_tasks_count
                                                }{' '}
                                                кешіккен
                                            </p>
                                            <p
                                                className={cn(
                                                    'inline-flex items-center gap-1.5',
                                                    item.metrics
                                                        .active_issues_count > 0
                                                        ? 'font-bold text-rose-600'
                                                        : 'text-slate-500',
                                                )}
                                            >
                                                <AlertTriangle className="size-3.5" />
                                                {
                                                    item.metrics
                                                        .active_issues_count
                                                }{' '}
                                                мәселе
                                            </p>
                                            <p className="inline-flex items-center gap-1.5 text-slate-500">
                                                <Camera className="size-3.5 text-sky-500" />
                                                {item.metrics.photos_count} фото
                                            </p>
                                            <p className="inline-flex items-center gap-1.5 text-slate-500">
                                                <FileText className="size-3.5 text-sky-500" />
                                                {item.metrics.documents_count}{' '}
                                                құжат
                                            </p>
                                            <p className="col-span-2 line-clamp-1 text-[11px] text-slate-400">
                                                Жауапты:{' '}
                                                {item.metrics.responsible.join(
                                                    ', ',
                                                ) || 'бекітілмеген'}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                                title="Қарау"
                                                className="text-slate-500 hover:bg-sky-50 hover:text-sky-700"
                                            >
                                                <Link
                                                    href={subsoilUsersRoutes.show.url(
                                                        item.id,
                                                    )}
                                                >
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
                                                            href={`${subsoilUsersRoutes.edit.url(item.id)}?return_to=${encodeURIComponent(url)}`}
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
                                                            handleDelete(item)
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

                {subsoilUsers.data.length > 0 && (
                    <Pagination paginator={subsoilUsers} />
                )}
            </div>
        </AppLayout>
    );
}
