import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BriefcaseBusiness,
    Building2,
    CheckCircle2,
    CircleDot,
    Clock3,
    ExternalLink,
    Factory,
    Filter,
    MapPin,
    Pickaxe,
    RotateCcw,
    UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { index as issuesIndex } from '@/routes/issues';
import { show as regionShow } from '@/routes/regions';
import type { BreadcrumbItem } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface Issue {
    id: number;
    type: string;
    type_label: string;
    title: string;
    description: string;
    category: string | null;
    severity: string;
    status: string;
    entity_id: number;
    entity_name: string;
    region_name: string | null;
    created_at: string;
    creator_full_name: string | null;
}

interface Filters {
    sector: string | null;
    region_id: number | null;
}

interface Props {
    issues: Issue[];
    regions: Region[];
    filters: Filters;
    sectorLabels: Record<string, string>;
}

interface TypeMeta {
    icon: LucideIcon;
    iconClassName: string;
    panelClassName: string;
}

const severityMap: Record<
    string,
    { label: string; badgeClassName: string; borderClassName: string }
> = {
    low: {
        label: 'Төмен',
        badgeClassName: 'bg-blue-50 text-blue-700 ring-blue-100',
        borderClassName: 'border-l-blue-400',
    },
    medium: {
        label: 'Орта',
        badgeClassName: 'bg-amber-50 text-amber-700 ring-amber-100',
        borderClassName: 'border-l-amber-400',
    },
    high: {
        label: 'Жоғары',
        badgeClassName: 'bg-rose-50 text-rose-700 ring-rose-100',
        borderClassName: 'border-l-rose-500',
    },
    critical: {
        label: 'Сыни жағдай',
        badgeClassName: 'bg-red-100 text-red-800 ring-red-200',
        borderClassName: 'border-l-red-600',
    },
};

const statusMap: Record<string, { label: string; badgeClassName: string }> = {
    open: {
        label: 'Ашық',
        badgeClassName: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
    in_progress: {
        label: 'Орындалуда',
        badgeClassName: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    resolved: {
        label: 'Шешілді',
        badgeClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
};

const typeMetaMap: Record<string, TypeMeta> = {
    all_projects: {
        icon: BriefcaseBusiness,
        iconClassName: 'text-blue-700',
        panelClassName: 'border-blue-100 bg-blue-50/60',
    },
    invest: {
        icon: BriefcaseBusiness,
        iconClassName: 'text-indigo-700',
        panelClassName: 'border-indigo-100 bg-indigo-50/60',
    },
    sez: {
        icon: Building2,
        iconClassName: 'text-violet-700',
        panelClassName: 'border-violet-100 bg-violet-50/60',
    },
    iz: {
        icon: Factory,
        iconClassName: 'text-cyan-700',
        panelClassName: 'border-cyan-100 bg-cyan-50/60',
    },
    prom: {
        icon: Factory,
        iconClassName: 'text-teal-700',
        panelClassName: 'border-teal-100 bg-teal-50/60',
    },
    nedro: {
        icon: Pickaxe,
        iconClassName: 'text-orange-700',
        panelClassName: 'border-orange-100 bg-orange-50/60',
    },
};

const defaultTypeMeta: TypeMeta = {
    icon: AlertTriangle,
    iconClassName: 'text-slate-700',
    panelClassName: 'border-slate-200 bg-slate-50',
};

function getEntityLink(type: string, entityId: number): string {
    switch (type) {
        case 'all_projects':
        case 'invest':
            return `/investment-projects/${entityId}/issues`;
        case 'sez':
            return `/sezs/${entityId}/issues`;
        case 'iz':
            return `/industrial-zones/${entityId}/issues`;
        case 'prom':
            return `/prom-zones/${entityId}/issues`;
        case 'nedro':
            return `/subsoil-users/${entityId}/issues`;
        default:
            return '#';
    }
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('kk-KZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

export default function IssuesIndex({
    issues,
    regions,
    filters,
    sectorLabels,
}: Props) {
    const selectedRegion = filters.region_id
        ? regions.find((region) => region.id === filters.region_id)
        : null;
    const backUrl = selectedRegion
        ? regionShow(selectedRegion.id).url
        : dashboard().url;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Басқару тақтасы',
            href: dashboard().url,
        },
        ...(selectedRegion
            ? [
                  {
                      title: selectedRegion.name,
                      href: regionShow(selectedRegion.id).url,
                  },
              ]
            : []),
        {
            title: 'Проблемалық мәселелер',
            href: issuesIndex({
                query: selectedRegion
                    ? { region_id: selectedRegion.id }
                    : undefined,
            }).url,
        },
    ];

    const openCount = issues.filter((issue) => issue.status === 'open').length;
    const inProgressCount = issues.filter(
        (issue) => issue.status === 'in_progress',
    ).length;
    const resolvedCount = issues.filter(
        (issue) => issue.status === 'resolved',
    ).length;
    const groupedIssues = issues.reduce<Record<string, Issue[]>>(
        (groups, issue) => {
            const regionName = issue.region_name || 'Аймағы көрсетілмеген';
            (groups[regionName] ??= []).push(issue);

            return groups;
        },
        {},
    );
    const hasActiveFilters = Boolean(filters.sector || filters.region_id);

    const handleFilterChange = (key: string, value: string | null) => {
        const params: Record<string, string | null> = {
            sector: filters.sector,
            region_id: filters.region_id?.toString() ?? null,
        };
        params[key] = value;

        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, item]) => item && item !== 'all'),
        ) as Record<string, string>;

        router.get(issuesIndex().url, cleanParams, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const resetFilters = () => {
        router.get(issuesIndex().url, {}, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head
                title={
                    selectedRegion
                        ? `${selectedRegion.name} — проблемалық мәселелер`
                        : 'Түркістан облысы — проблемалық мәселелер'
                }
            />

            <PageContainer width="wide" className="space-y-6">
                <section className="relative overflow-hidden rounded-3xl bg-[#0f1b3d] px-5 py-6 text-white shadow-[0_22px_55px_-36px_rgba(15,27,61,0.9)] sm:px-7 sm:py-8">
                    <div className="absolute -top-20 -right-16 h-52 w-52 rounded-full bg-[#c8a44e]/20 blur-3xl" />
                    <div className="absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4">
                            <Link
                                href={backUrl}
                                aria-label="Артқа қайту"
                                className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                            >
                                <ArrowLeft className="size-5" />
                            </Link>
                            <div>
                                <p className="text-xs font-bold tracking-[0.16em] text-[#e4c973] uppercase">
                                    Бақылау орталығы
                                </p>
                                <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl text-white">
                                    Проблемалық мәселелер
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                                    {selectedRegion
                                        ? `${selectedRegion.name} бойынша жобалар мен секторлардағы мәселелер`
                                        : 'Түркістан облысының барлық аудандары, жобалары және секторлары бойынша жиынтық тізім'}
                                </p>
                            </div>
                        </div>

                        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100">
                            <MapPin className="size-4 text-[#e4c973]" />
                            {selectedRegion?.name || 'Түркістан облысы'}
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        {
                            label: 'Барлық мәселе',
                            value: issues.length,
                            icon: AlertTriangle,
                            iconClassName: 'bg-slate-100 text-slate-700',
                        },
                        {
                            label: 'Ашық',
                            value: openCount,
                            icon: CircleDot,
                            iconClassName: 'bg-rose-50 text-rose-700',
                        },
                        {
                            label: 'Орындалуда',
                            value: inProgressCount,
                            icon: Clock3,
                            iconClassName: 'bg-amber-50 text-amber-700',
                        },
                        {
                            label: 'Шешілген',
                            value: resolvedCount,
                            icon: CheckCircle2,
                            iconClassName: 'bg-emerald-50 text-emerald-700',
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="metric-panel p-4 sm:p-5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                        {stat.label}
                                    </p>
                                    <p className="mt-2 text-2xl font-extrabold text-navy sm:text-3xl">
                                        {stat.value}
                                    </p>
                                </div>
                                <span
                                    className={`flex size-10 items-center justify-center rounded-xl ${stat.iconClassName}`}
                                >
                                    <stat.icon className="size-5" />
                                </span>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,27,61,0.7)] sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-extrabold text-navy">
                                <Filter className="size-4 text-gold-dark" />
                                Мәселелерді нақтылау
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Аудан/қала немесе сектор бойынша сүзуге болады
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-end">
                            <div className="space-y-1.5 xl:w-60">
                                <label className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                                    Аудан немесе қала
                                </label>
                                <Select
                                    value={
                                        filters.region_id?.toString() ?? 'all'
                                    }
                                    onValueChange={(value) =>
                                        handleFilterChange(
                                            'region_id',
                                            value === 'all' ? null : value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full bg-white">
                                        <SelectValue placeholder="Аймақты таңдаңыз" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Бүкіл облыс
                                        </SelectItem>
                                        {regions.map((region) => (
                                            <SelectItem
                                                key={region.id}
                                                value={region.id.toString()}
                                            >
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5 xl:w-60">
                                <label className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                                    Сектор
                                </label>
                                <Select
                                    value={filters.sector ?? 'all'}
                                    onValueChange={(value) =>
                                        handleFilterChange(
                                            'sector',
                                            value === 'all' ? null : value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full bg-white">
                                        <SelectValue placeholder="Секторды таңдаңыз" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Барлық секторлар
                                        </SelectItem>
                                        {Object.entries(sectorLabels).map(
                                            ([key, label]) => (
                                                <SelectItem
                                                    key={key}
                                                    value={key}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetFilters}
                                    className="sm:col-span-2 xl:mb-0"
                                >
                                    <RotateCcw className="size-4" />
                                    Тазарту
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="space-y-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-extrabold text-navy">
                                Мәселелер тізімі
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Әр мәселенің аймағы, секторы және нақты
                                объектісі көрсетілген
                            </p>
                        </div>
                        <Badge
                            variant="secondary"
                            className="w-fit rounded-full px-3 py-1.5 text-xs"
                        >
                            {issues.length} нәтиже
                        </Badge>
                    </div>

                    {issues.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="size-7" />
                            </span>
                            <p className="mt-4 font-bold text-slate-700">
                                Проблемалық мәселелер табылмады
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Таңдалған сүзгі бойынша ашық жазба жоқ
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedIssues).map(
                            ([regionName, regionIssues]) => (
                                <div
                                    key={regionName}
                                    className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/60"
                                >
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3 sm:px-5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sand-light text-gold-dark">
                                                <MapPin className="size-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                                    Аудан / қала
                                                </p>
                                                <h3 className="truncate font-extrabold text-navy">
                                                    {regionName}
                                                </h3>
                                            </div>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                            {regionIssues.length} мәселе
                                        </span>
                                    </div>

                                    <div className="space-y-3 p-3 sm:p-4">
                                        {regionIssues.map((issue) => {
                                            const severity =
                                                severityMap[issue.severity] ??
                                                severityMap.medium;
                                            const status = statusMap[
                                                issue.status
                                            ] ?? {
                                                label: issue.status,
                                                badgeClassName:
                                                    'bg-slate-100 text-slate-700 ring-slate-200',
                                            };
                                            const typeMeta =
                                                typeMetaMap[issue.type] ??
                                                defaultTypeMeta;
                                            const TypeIcon = typeMeta.icon;

                                            return (
                                                <article
                                                    key={`${issue.type}-${issue.id}`}
                                                    className={`overflow-hidden rounded-2xl border border-l-4 border-slate-200 bg-white shadow-[0_14px_35px_-32px_rgba(15,27,61,0.8)] ${severity.borderClassName}`}
                                                >
                                                    <div className="p-4 sm:p-5">
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge
                                                                    className={`border-0 ring-1 ${severity.badgeClassName}`}
                                                                >
                                                                    Маңыздылығы:{' '}
                                                                    {
                                                                        severity.label
                                                                    }
                                                                </Badge>
                                                                <Badge
                                                                    className={`border-0 ring-1 ${status.badgeClassName}`}
                                                                >
                                                                    Күйі:{' '}
                                                                    {
                                                                        status.label
                                                                    }
                                                                </Badge>
                                                            </div>
                                                            <time className="shrink-0 text-xs font-medium text-slate-400">
                                                                {formatDate(
                                                                    issue.created_at,
                                                                )}
                                                            </time>
                                                        </div>

                                                        <h4 className="mt-4 text-base leading-6 font-extrabold text-navy sm:text-lg">
                                                            {issue.title ||
                                                                issue.description}
                                                        </h4>
                                                        {issue.description &&
                                                            issue.description !==
                                                                issue.title && (
                                                                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-600">
                                                                    {
                                                                        issue.description
                                                                    }
                                                                </p>
                                                            )}

                                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                            <div
                                                                className={`rounded-xl border p-3 ${typeMeta.panelClassName}`}
                                                            >
                                                                <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                                                    Мәселе
                                                                    қайдан
                                                                </p>
                                                                <div className="mt-2 flex items-start gap-2.5">
                                                                    <TypeIcon
                                                                        className={`mt-0.5 size-4 shrink-0 ${typeMeta.iconClassName}`}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-slate-500">
                                                                            {
                                                                                issue.type_label
                                                                            }
                                                                        </p>
                                                                        <p className="mt-0.5 text-sm font-extrabold text-navy">
                                                                            {
                                                                                issue.entity_name
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                                <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                                                    Орналасқан
                                                                    аймағы
                                                                </p>
                                                                <div className="mt-2 flex items-center gap-2.5">
                                                                    <MapPin className="size-4 shrink-0 text-gold-dark" />
                                                                    <p className="text-sm font-extrabold text-navy">
                                                                        {issue.region_name ||
                                                                            'Көрсетілмеген'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                                                                {issue.category && (
                                                                    <span>
                                                                        Санат:{' '}
                                                                        <strong className="text-slate-700">
                                                                            {
                                                                                issue.category
                                                                            }
                                                                        </strong>
                                                                    </span>
                                                                )}
                                                                {issue.creator_full_name && (
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <UserRound className="size-3.5" />
                                                                        Қосқан:{' '}
                                                                        <strong className="text-slate-700">
                                                                            {
                                                                                issue.creator_full_name
                                                                            }
                                                                        </strong>
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <Link
                                                                href={getEntityLink(
                                                                    issue.type,
                                                                    issue.entity_id,
                                                                )}
                                                                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-navy transition hover:border-gold/50 hover:bg-sand-light"
                                                            >
                                                                Объект
                                                                мәселелерін ашу
                                                                <ExternalLink className="size-4" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </div>
                            ),
                        )
                    )}
                </section>
            </PageContainer>
        </AppLayout>
    );
}
