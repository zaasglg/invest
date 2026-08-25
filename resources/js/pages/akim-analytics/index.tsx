import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Award,
    BarChart3,
    Bot,
    BriefcaseBusiness,
    Building2,
    CircleDollarSign,
    Factory,
    Lightbulb,
    ListChecks,
    MapPin,
    Search,
    Sparkles,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

import DetailSectionNav from '@/components/detail-section-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { baskarmaRating } from '@/routes';
import * as akim from '@/routes/akim';
import { send as sendChatMessage } from '@/routes/chat';
import * as investmentProjects from '@/routes/investment-projects';
import type { BreadcrumbItem } from '@/types';

interface Summary {
    total_projects: number;
    total_investment: number;
    jobs_count: number;
    implementation_projects: number;
    launched_projects: number;
    suspended_projects: number;
    active_issues: number;
    critical_issues: number;
    total_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
}

interface QualityItem {
    rank: number;
    name: string;
    project_count: number;
    total_tasks: number;
    completed_tasks: number;
    active_tasks?: number;
    overdue_tasks: number;
    active_issues?: number;
    critical_issues?: number;
    completion_rate: number;
    deadline_rate: number;
    score: number | null;
    members_count?: number;
    regions?: string[];
}

interface NicheItem {
    id: number | null;
    rank: number;
    name: string;
    project_count: number;
    investment: number;
    jobs_count: number;
    plan_projects: number;
    implementation_projects: number;
    launched_projects: number;
    suspended_projects: number;
    active_issues: number;
    potential_score: number;
}

interface ProductionSummary {
    projects_with_plans: number;
    complete_plans: number;
    projects_needing_plan_completion: number;
    incomplete_plans: number;
    reporting_projects: number;
    launched_without_reports: number;
    reported_periods: number;
    planned_amount_for_reported_periods: number;
    actual_amount: number;
    amount_completion_rate: number | null;
    average_volume_completion_rate: number | null;
}

interface ProductionPerformanceItem {
    id: number;
    name: string;
    region_name: string | null;
    status: string;
    products: string[];
    products_count: number;
    reported_periods: number;
    planned_amount_for_reported_periods: number;
    actual_amount: number;
    amount_completion_rate: number | null;
    volume_completion_rate: number | null;
}

interface Analytics {
    scope: {
        oblast_id: number;
        oblast_name: string;
        districts_count: number;
        description: string;
    };
    summary: Summary;
    status_distribution: Array<{ name: string; value: number }>;
    district_quality: QualityItem[];
    management_quality: QualityItem[];
    production_summary: ProductionSummary;
    production_performance: ProductionPerformanceItem[];
    niche_analytics: NicheItem[];
    regional_potential: {
        pipeline_projects: number;
        pipeline_investment: number;
        pipeline_jobs: number;
        assets: {
            sezs: number;
            industrial_zones: number;
            prom_zones: number;
            subsoil_users: number;
        };
        insights: string[];
    };
}

interface Props {
    analytics: Analytics;
}

const numberFormatter = new Intl.NumberFormat('kk-KZ');
const moneyFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 0,
});

const formatNumber = (value: number) => numberFormatter.format(value);
const formatMoney = (value: number) => `${moneyFormatter.format(value)} ₸`;

const projectStatusLabels: Record<string, string> = {
    plan: 'Жоспарлау',
    implementation: 'Іске асыру',
    launched: 'Іске қосылған',
    suspended: 'Тоқтатылған',
};

const projectStatusStyles: Record<string, string> = {
    plan: 'bg-blue-50 text-blue-700 ring-blue-600/10',
    implementation: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    launched: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    suspended: 'bg-red-50 text-red-700 ring-red-600/10',
};

const statusBarStyles = [
    'bg-blue-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-red-500',
];

const metricStyles = {
    navy: {
        value: 'text-navy',
        icon: 'bg-navy text-white shadow-lg shadow-navy/15',
    },
    gold: {
        value: 'text-gold-dark',
        icon: 'border border-gold/20 bg-gold/10 text-gold-dark',
    },
    emerald: {
        value: 'text-emerald-700',
        icon: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    danger: {
        value: 'text-red-700',
        icon: 'border border-red-200 bg-red-50 text-red-700',
    },
};

function Score({ value }: { value: number | null }) {
    if (value === null) {
        return <span className="text-sm text-slate-400">Дерек жоқ</span>;
    }

    const scoreStyle =
        value >= 80
            ? {
                  bar: 'bg-emerald-500',
                  badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
              }
            : value >= 60
              ? {
                    bar: 'bg-gold',
                    badge: 'bg-amber-50 text-amber-700 ring-amber-600/10',
                }
              : value >= 40
                ? {
                      bar: 'bg-orange-500',
                      badge: 'bg-orange-50 text-orange-700 ring-orange-600/10',
                  }
                : {
                      bar: 'bg-red-500',
                      badge: 'bg-red-50 text-red-700 ring-red-600/10',
                  };

    return (
        <div className="flex min-w-40 items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={cn(
                        'h-full rounded-full transition-all',
                        scoreStyle.bar,
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
            </div>
            <span
                className={cn(
                    'inline-flex min-w-14 justify-center rounded-full px-2 py-1 text-xs font-bold tabular-nums ring-1 ring-inset',
                    scoreStyle.badge,
                )}
            >
                {value}%
            </span>
        </div>
    );
}

function MetricCard({
    label,
    value,
    description,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    description: string;
    icon: LucideIcon;
    accent: keyof typeof metricStyles;
}) {
    const style = metricStyles[accent];

    return (
        <div className="metric-panel flex items-center justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                    {label}
                </p>
                <p
                    className={cn(
                        'mt-2 truncate text-3xl font-extrabold tabular-nums',
                        style.value,
                    )}
                >
                    {value}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    {description}
                </p>
            </div>
            <div
                className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-md',
                    style.icon,
                )}
            >
                <Icon className="size-5" />
            </div>
        </div>
    );
}

function SectionHeader({
    title,
    description,
    icon: Icon,
    action,
}: {
    title: string;
    description: string;
    icon: LucideIcon;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sand-light/80 via-white to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-white text-gold-dark shadow-sm">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <h2 className="font-bold text-navy sm:text-lg">{title}</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

function QualityTable({
    items,
    emptyText,
    management = false,
}: {
    items: QualityItem[];
    emptyText: string;
    management?: boolean;
}) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <ListChecks className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                    {emptyText}
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table className="min-w-[880px]">
                <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="w-16 text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Орын
                        </TableHead>
                        <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                            {management ? 'Басқарма' : 'Аудан/қала'}
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Жоба
                        </TableHead>
                        <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Тапсырма
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Кешіккен
                        </TableHead>
                        {!management && (
                            <TableHead className="text-center text-xs font-bold tracking-wide text-slate-500 uppercase">
                                Мәселе
                            </TableHead>
                        )}
                        <TableHead className="min-w-56 text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Сапа бағасы
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow
                            key={`${item.rank}-${item.name}`}
                            className="group hover:bg-sand-light/40"
                        >
                            <TableCell>
                                <span
                                    className={cn(
                                        'inline-flex size-8 items-center justify-center rounded-full text-xs font-extrabold ring-1 ring-inset',
                                        item.rank <= 3
                                            ? 'bg-navy text-white ring-navy'
                                            : 'bg-slate-50 text-slate-600 ring-slate-200',
                                    )}
                                >
                                    {item.rank}
                                </span>
                            </TableCell>
                            <TableCell>
                                <p className="font-semibold text-navy">
                                    {item.name}
                                </p>
                                {management &&
                                    item.members_count !== undefined && (
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            {item.members_count} орындаушы
                                        </p>
                                    )}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-slate-700 tabular-nums">
                                {item.project_count}
                            </TableCell>
                            <TableCell>
                                <span className="font-bold text-emerald-700 tabular-nums">
                                    {item.completed_tasks}
                                </span>
                                <span className="text-slate-400">
                                    {' '}
                                    / {item.total_tasks}
                                </span>
                            </TableCell>
                            <TableCell className="text-center">
                                <span
                                    className={cn(
                                        'inline-flex min-w-8 justify-center rounded-md px-2 py-1 text-xs font-bold tabular-nums',
                                        item.overdue_tasks > 0
                                            ? 'bg-red-50 text-red-700'
                                            : 'bg-slate-50 text-slate-400',
                                    )}
                                >
                                    {item.overdue_tasks}
                                </span>
                            </TableCell>
                            {!management && (
                                <TableCell className="text-center font-medium text-slate-600 tabular-nums">
                                    {item.active_issues ?? 0}
                                </TableCell>
                            )}
                            <TableCell>
                                <Score value={item.score} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function EmptyState({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center">
            <Factory className="mb-3 size-6 text-slate-300" />
            <p className="text-sm text-slate-500">{children}</p>
        </div>
    );
}

export default function AkimAnalytics({ analytics }: Props) {
    const [search, setSearch] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const {
        summary,
        production_summary: production,
        regional_potential: potential,
    } = analytics;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Облыс аналитикасы',
            href: akim.analytics.url(),
        },
    ];

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!search.trim()) return;

        router.get(investmentProjects.index.url(), {
            search: search.trim(),
        });
    };

    const askAi = async (message: string) => {
        setAiLoading(true);
        setAiError('');

        try {
            const response = await fetch(sendChatMessage.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = (await response.json()) as { message: string };
            setAiResponse(data.message);
        } catch {
            setAiError('ИИ жауабын алу мүмкін болмады. Қайта көріңіз.');
        } finally {
            setAiLoading(false);
        }
    };

    const statusMax = Math.max(
        1,
        ...analytics.status_distribution.map((item) => item.value),
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Облыс аналитикасы" />

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <section
                    id="analytics-overview"
                    className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-navy/10 bg-gradient-to-br from-[#0b1735] via-[#122752] to-[#1b3b73] px-5 py-6 text-white shadow-[0_24px_55px_-34px_rgba(15,27,61,0.9)] sm:px-7 sm:py-7"
                >
                    <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-gold/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-blue-400/10 blur-3xl" />

                    <div className="relative grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] xl:items-end">
                        <div className="min-w-0">
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <span className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-white/80 uppercase">
                                    Облыстық басқару панелі
                                </span>
                                <span className="rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-white">
                                    {analytics.scope.districts_count} аудан/қала
                                </span>
                            </div>
                            <h1 className="max-w-4xl text-2xl leading-tight font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                                {analytics.scope.oblast_name} аналитикасы
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
                                {analytics.scope.description}. Жоба портфелі,
                                өндіріс, орындаушылық тәртіп және инвестициялық
                                әлеует бір басқарушылық көріністе.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
                                <span className="inline-flex items-center gap-2">
                                    <BriefcaseBusiness className="size-4 text-gold-light" />
                                    {summary.total_projects} белсенді жоба
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <TrendingUp className="size-4 text-gold-light" />
                                    {potential.pipeline_projects} портфельдегі
                                    жоба
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-gold-light" />
                                    {summary.active_issues +
                                        summary.overdue_tasks}{' '}
                                    бақылауда
                                </span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                            <p className="text-xs font-bold tracking-wide text-white/60 uppercase">
                                Жобаны жедел іздеу
                            </p>
                            <form
                                onSubmit={submitSearch}
                                className="mt-3 flex flex-col gap-2 sm:flex-row"
                            >
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50" />
                                    <Input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Жоба, ТОО атауы немесе БИН"
                                        className="h-10 border-white/20 bg-white/10 pl-9 text-white shadow-none placeholder:text-white/45 focus-visible:border-gold-light focus-visible:ring-gold/20"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="bg-gold text-white shadow-none hover:bg-gold-dark"
                                >
                                    Іздеу
                                </Button>
                            </form>
                            <Button
                                asChild
                                variant="ghost"
                                className="mt-2 w-full justify-between text-white/70 hover:bg-white/10 hover:text-white"
                            >
                                <Link href={investmentProjects.index.url()}>
                                    Барлық жобалар тізімі
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <DetailSectionNav
                    ariaLabel="Облыс аналитикасы бөлімдері"
                    items={[
                        {
                            label: 'Шолу',
                            href: '#analytics-overview',
                            icon: BarChart3,
                            count: summary.total_projects,
                        },
                        {
                            label: 'Өндіріс',
                            href: '#production-performance',
                            icon: Factory,
                            count: production.projects_with_plans,
                        },
                        {
                            label: 'Аудандар',
                            href: '#district-quality',
                            icon: Award,
                            count: analytics.district_quality.length,
                        },
                        {
                            label: 'Басқармалар',
                            href: '#management-quality',
                            icon: Building2,
                            count: analytics.management_quality.length,
                        },
                        {
                            label: 'Нишалар',
                            href: '#niche-analytics',
                            icon: Target,
                            count: analytics.niche_analytics.length,
                        },
                        {
                            label: 'ИИ аналитик',
                            href: '#ai-analytics',
                            icon: Bot,
                        },
                    ]}
                />

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Барлық жоба"
                        value={formatNumber(summary.total_projects)}
                        description={`${summary.implementation_projects} іске асырылуда · ${summary.launched_projects} іске қосылған`}
                        icon={BriefcaseBusiness}
                        accent="navy"
                    />
                    <MetricCard
                        label="Инвестиция көлемі"
                        value={formatMoney(summary.total_investment)}
                        description={`${analytics.scope.districts_count} аудан/қала дерегі қамтылды`}
                        icon={CircleDollarSign}
                        accent="gold"
                    />
                    <MetricCard
                        label="Жұмыс орындары"
                        value={formatNumber(summary.jobs_count)}
                        description={`${formatNumber(potential.pipeline_jobs)} орын портфельде жоспарланған`}
                        icon={Users}
                        accent="emerald"
                    />
                    <MetricCard
                        label="Бақылауды қажет етеді"
                        value={formatNumber(
                            summary.active_issues + summary.overdue_tasks,
                        )}
                        description={`${summary.active_issues} мәселе · ${summary.overdue_tasks} кешіккен тапсырма`}
                        icon={AlertTriangle}
                        accent={
                            summary.active_issues + summary.overdue_tasks > 0
                                ? 'danger'
                                : 'emerald'
                        }
                    />
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                    <Card className="overflow-hidden py-0">
                        <SectionHeader
                            title="Жобалар портфелінің құрылымы"
                            description="Белсенді жобалардың іске асыру мәртебелері бойынша бөлінісі."
                            icon={BarChart3}
                        />
                        <CardContent className="space-y-5 p-5 sm:p-6">
                            {analytics.status_distribution.map(
                                (item, index) => (
                                    <div key={item.name}>
                                        <div className="mb-2 flex items-center justify-between gap-4">
                                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <span
                                                    className={cn(
                                                        'size-2.5 rounded-sm',
                                                        statusBarStyles[
                                                            index %
                                                                statusBarStyles.length
                                                        ],
                                                    )}
                                                />
                                                {item.name}
                                            </span>
                                            <span className="text-sm font-extrabold text-navy tabular-nums">
                                                {item.value}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={cn(
                                                    'h-full rounded-full transition-all',
                                                    statusBarStyles[
                                                        index %
                                                            statusBarStyles.length
                                                    ],
                                                )}
                                                style={{
                                                    width: `${(item.value / statusMax) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ),
                            )}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden py-0">
                        <SectionHeader
                            title="Инвестициялық портфель"
                            description="Жоспарлау және іске асыру сатысындағы өңір әлеуеті."
                            icon={TrendingUp}
                        />
                        <CardContent className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-1 2xl:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                    Портфельдегі жоба
                                </p>
                                <p className="mt-2 text-2xl font-extrabold text-navy tabular-nums">
                                    {potential.pipeline_projects}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gold/20 bg-sand-light p-4">
                                <p className="text-xs font-bold tracking-wide text-gold-dark uppercase">
                                    Әлеуетті инвестиция
                                </p>
                                <p className="mt-2 text-lg font-extrabold text-navy tabular-nums">
                                    {formatMoney(potential.pipeline_investment)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                            Жоспарланған жұмыс орны
                                        </p>
                                        <p className="mt-2 text-2xl font-extrabold text-emerald-700 tabular-nums">
                                            {formatNumber(
                                                potential.pipeline_jobs,
                                            )}
                                        </p>
                                    </div>
                                    <Users className="size-6 text-emerald-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <Card
                    id="production-performance"
                    className="scroll-mt-24 overflow-hidden py-0"
                >
                    <SectionHeader
                        title="Өндіріс жоспарының орындалуы"
                        description="Нақты есеп берілген әр кезең сол кезеңнің жоспарымен салыстырылады. Әртүрлі өнім өлшемдері бір-біріне қосылмайды."
                        icon={Factory}
                    />
                    <CardContent className="space-y-5 p-5 sm:p-6">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                    Жоспары бар жоба
                                </p>
                                <p className="mt-2 text-2xl font-extrabold text-navy tabular-nums">
                                    {production.projects_with_plans}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {production.complete_plans} өнім/нәтиже
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                    Есеп берген жоба
                                </p>
                                <p className="mt-2 text-2xl font-extrabold text-navy tabular-nums">
                                    {production.reporting_projects}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {production.reported_periods} есеп кезеңі
                                </p>
                            </div>
                            <div className="rounded-xl border border-gold/20 bg-sand-light p-4">
                                <p className="text-xs font-bold tracking-wide text-gold-dark uppercase">
                                    Нақты өндіріс сомасы
                                </p>
                                <p className="mt-2 text-lg font-extrabold text-navy tabular-nums">
                                    {formatMoney(production.actual_amount)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Жоспар:{' '}
                                    {formatMoney(
                                        production.planned_amount_for_reported_periods,
                                    )}
                                </p>
                            </div>
                            <div
                                className={cn(
                                    'rounded-xl border p-4',
                                    production.launched_without_reports > 0
                                        ? 'border-red-200 bg-red-50'
                                        : 'border-emerald-200 bg-emerald-50',
                                )}
                            >
                                <p
                                    className={cn(
                                        'text-xs font-bold tracking-wide uppercase',
                                        production.launched_without_reports > 0
                                            ? 'text-red-600'
                                            : 'text-emerald-600',
                                    )}
                                >
                                    Есебі жоқ іске қосылған жоба
                                </p>
                                <p
                                    className={cn(
                                        'mt-2 text-2xl font-extrabold tabular-nums',
                                        production.launched_without_reports > 0
                                            ? 'text-red-700'
                                            : 'text-emerald-700',
                                    )}
                                >
                                    {production.launched_without_reports}
                                </p>
                            </div>
                        </div>

                        {production.projects_needing_plan_completion > 0 && (
                            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                                <AlertTriangle className="mt-1 size-4 shrink-0 text-amber-600" />
                                <p>
                                    <strong>
                                        {
                                            production.projects_needing_plan_completion
                                        }{' '}
                                        жобадағы {production.incomplete_plans}{' '}
                                        жазбаны толықтыру қажет.
                                    </strong>{' '}
                                    Өнім атауы, көлем, өлшем, сома және кезеңі
                                    толық көрсетілмеген жоспарлар орындалу
                                    есебіне қосылмайды.
                                </p>
                            </div>
                        )}

                        {analytics.production_performance.length === 0 ? (
                            <EmptyState>
                                Толық жоспарлы өндіріс дерегі жоқ
                            </EmptyState>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <Table className="min-w-[1080px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                            <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                                Жоба және өнім
                                            </TableHead>
                                            <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                                Мәртебе
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-bold tracking-wide text-slate-500 uppercase">
                                                Есеп кезеңі
                                            </TableHead>
                                            <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                                Кезеңдер жоспары
                                            </TableHead>
                                            <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                                Нақты сома
                                            </TableHead>
                                            <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                                Көлем
                                            </TableHead>
                                            <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                                Сома
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analytics.production_performance.map(
                                            (item) => (
                                                <TableRow
                                                    key={item.id}
                                                    className="group hover:bg-sand-light/40"
                                                >
                                                    <TableCell>
                                                        <Link
                                                            className="font-semibold text-navy transition-colors hover:text-gold-dark hover:underline"
                                                            href={investmentProjects.show.url(
                                                                item.id,
                                                            )}
                                                        >
                                                            {item.name}
                                                        </Link>
                                                        <p className="mt-1 flex max-w-96 items-center gap-1.5 truncate text-xs text-slate-400">
                                                            <MapPin className="size-3 shrink-0" />
                                                            {item.region_name ??
                                                                'Өңір көрсетілмеген'}
                                                            <span>·</span>
                                                            {item.products.join(
                                                                ', ',
                                                            )}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                                                                projectStatusStyles[
                                                                    item.status
                                                                ] ??
                                                                    'bg-slate-50 text-slate-700 ring-slate-600/10',
                                                            )}
                                                        >
                                                            {projectStatusLabels[
                                                                item.status
                                                            ] ?? item.status}
                                                        </span>
                                                        {item.status ===
                                                            'launched' &&
                                                            item.reported_periods ===
                                                                0 && (
                                                                <p className="mt-1 text-xs font-medium text-red-600">
                                                                    Нақты есеп
                                                                    жоқ
                                                                </p>
                                                            )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-navy tabular-nums">
                                                        {item.reported_periods}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-700 tabular-nums">
                                                        {item.reported_periods >
                                                        0
                                                            ? formatMoney(
                                                                  item.planned_amount_for_reported_periods,
                                                              )
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-700 tabular-nums">
                                                        {item.reported_periods >
                                                        0
                                                            ? formatMoney(
                                                                  item.actual_amount,
                                                              )
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Score
                                                            value={
                                                                item.volume_completion_rate
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Score
                                                            value={
                                                                item.amount_completion_rate
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {production.reporting_projects > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                            Ақшалай жоспардың орындалуы
                                        </p>
                                        <CircleDollarSign className="size-4 text-gold-dark" />
                                    </div>
                                    <Score
                                        value={
                                            production.amount_completion_rate
                                        }
                                    />
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                            Өнім көлемінің орташа орындалуы
                                        </p>
                                        <Factory className="size-4 text-gold-dark" />
                                    </div>
                                    <Score
                                        value={
                                            production.average_volume_completion_rate
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card
                    id="district-quality"
                    className="scroll-mt-24 overflow-hidden py-0"
                >
                    <SectionHeader
                        title="Аудан әкімдіктерінің жұмыс сапасы"
                        description="Тапсырма орындалуы, мерзім тәртібі, мәселелердің шешілуі және жоба тұрақтылығы бойынша есептеледі."
                        icon={Award}
                    />
                    <QualityTable
                        items={analytics.district_quality}
                        emptyText="Аудандар бойынша дерек жоқ"
                    />
                </Card>

                <Card
                    id="management-quality"
                    className="scroll-mt-24 overflow-hidden py-0"
                >
                    <SectionHeader
                        title="Басқармалар жұмысының сапасы"
                        description="Облыстық және қосымша басқармаларға бекітілген орындаушылардың нақты тапсырмалары бойынша."
                        icon={Building2}
                        action={
                            <Button
                                asChild
                                variant="outline"
                                className="border-slate-200 text-navy hover:border-gold/40 hover:bg-sand-light"
                            >
                                <Link href={baskarmaRating.url()}>
                                    Толық рейтинг
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        }
                    />
                    <QualityTable
                        items={analytics.management_quality}
                        emptyText="Басқармалар бойынша тапсырма дерегі жоқ"
                        management
                    />
                </Card>

                <section
                    id="niche-analytics"
                    className="grid scroll-mt-24 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"
                >
                    <Card className="overflow-hidden py-0">
                        <SectionHeader
                            title="Нишалық аналитика"
                            description="Инвестиция, жұмыс орны, жоба портфелі және тұрақтылық негізіндегі салыстырмалы әлеует."
                            icon={Target}
                        />
                        <div className="overflow-x-auto">
                            <Table className="min-w-[780px]">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                        <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                            Ниша
                                        </TableHead>
                                        <TableHead className="text-center text-xs font-bold tracking-wide text-slate-500 uppercase">
                                            Жоба
                                        </TableHead>
                                        <TableHead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                            Инвестиция
                                        </TableHead>
                                        <TableHead className="text-center text-xs font-bold tracking-wide text-slate-500 uppercase">
                                            Жұмыс орны
                                        </TableHead>
                                        <TableHead className="min-w-52 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                            Әлеует
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analytics.niche_analytics.map((niche) => (
                                        <TableRow
                                            key={niche.id ?? 'none'}
                                            className="group hover:bg-sand-light/40"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ring-1 ring-inset',
                                                            niche.rank <= 3
                                                                ? 'bg-navy text-white ring-navy'
                                                                : 'bg-slate-50 text-slate-600 ring-slate-200',
                                                        )}
                                                    >
                                                        {niche.rank}
                                                    </span>
                                                    <div>
                                                        <p className="font-semibold text-navy">
                                                            {niche.name}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            {
                                                                niche.implementation_projects
                                                            }{' '}
                                                            іске асырылуда ·{' '}
                                                            {
                                                                niche.launched_projects
                                                            }{' '}
                                                            іске қосылған
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-navy tabular-nums">
                                                {niche.project_count}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700 tabular-nums">
                                                {formatMoney(niche.investment)}
                                            </TableCell>
                                            <TableCell className="text-center font-medium text-slate-700 tabular-nums">
                                                {formatNumber(niche.jobs_count)}
                                            </TableCell>
                                            <TableCell>
                                                <Score
                                                    value={
                                                        niche.potential_score
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>

                    <div className="grid gap-6">
                        <Card className="overflow-hidden py-0">
                            <SectionHeader
                                title="Өңір активтері"
                                description="Облыс пен аудандардағы инвестициялық инфрақұрылым."
                                icon={Factory}
                            />
                            <CardContent className="grid grid-cols-2 gap-3 p-5 sm:p-6">
                                {[
                                    ['АЭА', potential.assets.sezs],
                                    [
                                        'Индустриялық аймақ',
                                        potential.assets.industrial_zones,
                                    ],
                                    ['Пром аймақ', potential.assets.prom_zones],
                                    [
                                        'Жер қойнауын пайдаланушы',
                                        potential.assets.subsoil_users,
                                    ],
                                ].map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-gold/30 hover:bg-sand-light"
                                    >
                                        <p className="text-2xl font-extrabold text-navy tabular-nums">
                                            {value}
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {label}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden py-0">
                            <SectionHeader
                                title="Басқарушылық назар"
                                description="Ағымдағы деректерден автоматты түрде анықталған басымдықтар."
                                icon={Lightbulb}
                            />
                            <CardContent className="space-y-3 p-5 sm:p-6">
                                {potential.insights.map((insight, index) => (
                                    <div
                                        key={insight}
                                        className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm leading-6 text-slate-700"
                                    >
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                                            {index + 1}
                                        </span>
                                        <span>{insight}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Card
                    id="ai-analytics"
                    className="scroll-mt-24 overflow-hidden border-gold/30 py-0"
                >
                    <div className="relative overflow-hidden border-b border-gold/20 bg-gradient-to-r from-sand-light via-white to-white px-5 py-5 sm:px-6">
                        <div className="pointer-events-none absolute -top-16 right-10 size-40 rounded-full bg-gold/10 blur-3xl" />
                        <div className="relative flex items-start gap-3">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white shadow-lg shadow-navy/15">
                                <Bot className="size-5" />
                            </span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-bold text-navy sm:text-lg">
                                        Әкімнің ИИ аналитигі
                                    </h2>
                                    <Badge className="border-0 bg-gold text-white hover:bg-gold">
                                        AI briefing
                                    </Badge>
                                </div>
                                <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
                                    ИИ тек облысқа қолжетімді нақты жоба,
                                    тапсырма, мәселе, рейтинг және нишалық
                                    әлеует деректеріне сүйеніп есеп пен ұсыныс
                                    жасайды.
                                </p>
                            </div>
                        </div>
                    </div>
                    <CardContent className="space-y-4 p-5 sm:p-6">
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                            {[
                                'Облыс бойынша қысқаша басқарушылық есеп жаса',
                                'Аудандар мен басқармалардың жұмыс сапасын талдап, кеңес бер',
                                'Өндіріс жоспары мен нақты көрсеткіштердің орындалуын талда',
                                'Нишалық аналитика мен өңір әлеуеті бойынша ұсыныс жаса',
                            ].map((prompt) => (
                                <Button
                                    key={prompt}
                                    type="button"
                                    variant="outline"
                                    disabled={aiLoading}
                                    onClick={() => void askAi(prompt)}
                                    className="h-auto min-h-12 justify-start border-slate-200 px-3 py-2.5 text-left leading-5 whitespace-normal text-navy hover:border-gold/40 hover:bg-sand-light"
                                >
                                    <Sparkles className="size-4 shrink-0 text-gold-dark" />
                                    {prompt}
                                </Button>
                            ))}
                        </div>

                        {aiLoading && (
                            <div className="flex items-center gap-3 rounded-xl border border-gold/20 bg-sand-light px-4 py-3 text-sm text-navy">
                                <span className="size-2 animate-pulse rounded-full bg-gold" />
                                ИИ облыстық деректерді талдап жатыр...
                            </div>
                        )}
                        {aiError && (
                            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                <AlertTriangle className="size-4 shrink-0" />
                                {aiError}
                            </div>
                        )}
                        {aiResponse && !aiLoading && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-sm leading-7 whitespace-pre-wrap text-slate-700">
                                {aiResponse}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden py-0 shadow-none">
                    <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-sand-light text-gold-dark">
                                <Building2 className="size-5" />
                            </div>
                            <div>
                                <p className="font-bold text-navy">
                                    Барлық жобалар тізімі
                                </p>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Атауы, ТОО атауы немесе БИН арқылы толық
                                    іздеу
                                </p>
                            </div>
                        </div>
                        <Button
                            asChild
                            className="bg-navy text-white hover:bg-navy-light"
                        >
                            <Link href={investmentProjects.index.url()}>
                                Жобаларға өту
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
