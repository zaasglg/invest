import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    BarChart3,
    Bot,
    BriefcaseBusiness,
    Building2,
    CheckCircle2,
    CircleAlert,
    CircleDollarSign,
    Clock3,
    Database,
    Factory,
    FileCheck2,
    Gauge,
    Landmark,
    Layers3,
    MapPin,
    RefreshCcw,
    Search,
    ShieldAlert,
    Sparkles,
    Target,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { baskarmaRating } from '@/routes';
import * as akim from '@/routes/akim';
import { send as sendChatMessage } from '@/routes/chat';
import * as industrialZones from '@/routes/industrial-zones';
import * as investmentProjects from '@/routes/investment-projects';
import * as promZones from '@/routes/prom-zones';
import * as sezs from '@/routes/sezs';
import * as subsoilUsers from '@/routes/subsoil-users';
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
    problem_projects: number;
    projects_with_active_issues: number;
    projects_with_overdue_tasks: number;
    all_tasks: number;
    total_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    tasks_without_deadline: number;
    pending_tasks: number;
    rejected_tasks: number;
}

interface QualityItem {
    id?: number;
    rank: number;
    name: string;
    project_count: number;
    investment?: number;
    jobs_count?: number;
    total_tasks: number;
    evaluated_tasks: number;
    completed_tasks: number;
    active_tasks?: number;
    overdue_tasks: number;
    active_issues?: number;
    critical_issues?: number;
    completion_rate: number | null;
    deadline_rate: number | null;
    issue_resolution_rate?: number | null;
    quality_rate?: number | null;
    data_coverage?: number | null;
    is_preliminary: boolean;
    score: number | null;
    members_count?: number;
    regions?: string[];
}

interface PriorityProject {
    id: number;
    rank: number;
    name: string;
    region_name: string | null;
    status: string;
    investment: number;
    risk_score: number;
    risk_level: 'critical' | 'high' | 'medium';
    active_issues: number;
    critical_issues: number;
    overdue_tasks: number;
    max_days_overdue: number;
    responsible: string | null;
    reasons: string[];
    recommended_action: string;
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
    score_type: 'portfolio_momentum';
}

interface ProductionSummary {
    applicable_projects: number;
    projects_with_any_plan: number;
    projects_with_plans: number;
    projects_with_complete_plans: number;
    projects_without_any_plan: number;
    complete_plans: number;
    projects_needing_plan_completion: number;
    incomplete_plans: number;
    reporting_projects: number;
    launched_without_reports: number;
    reported_periods: number;
    distinct_reported_periods: number;
    planned_amount_for_reported_periods: number;
    actual_amount: number;
    raw_amount_completion_rate: number | null;
    amount_completion_rate: number | null;
    average_volume_completion_rate: number | null;
    anomaly_projects: number;
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
    raw_amount_completion_rate: number | null;
    amount_completion_rate: number | null;
    volume_completion_rate: number | null;
    has_anomaly: boolean;
    anomalies: string[];
    data_status: 'anomaly' | 'reported' | 'no_report';
}

interface DataQuality {
    overall_score: number;
    status: 'good' | 'attention' | 'critical';
    components: {
        task_project_coverage: number;
        deadline_coverage: number;
        issue_project_coverage: number;
        production_plan_coverage: number;
        production_fact_coverage: number | null;
        jobs_coverage: number;
        dates_coverage: number;
        photo_coverage: number;
        document_coverage: number;
    };
    warnings: string[];
    job_outlier_share: number;
    freshness: {
        projects: string | null;
        tasks: string | null;
        issues: string | null;
        production_facts: string | null;
    };
}

interface AssetSummary {
    total: number;
    active: number;
    inactive: number;
    illegal: number;
    other: number;
}

interface ActivityTrendItem {
    period: string;
    activity: number;
    completions: number;
    issues: number;
}

interface ApplicationFunnel {
    total: number;
    investment: number;
    jobs: number;
    statuses: Record<string, number>;
}

interface Analytics {
    scope: {
        oblast_id: number;
        oblast_name: string;
        districts_count: number;
        description: string;
        generated_at: string;
    };
    summary: Summary;
    status_distribution: Array<{ name: string; value: number }>;
    data_quality: DataQuality;
    priority_projects: PriorityProject[];
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
            sezs: AssetSummary;
            industrial_zones: AssetSummary;
            prom_zones: AssetSummary;
            subsoil_users: AssetSummary;
        };
        insights: string[];
    };
    activity_trend: ActivityTrendItem[];
    application_funnel: ApplicationFunnel;
}

interface Props {
    analytics: Analytics;
}

interface ProductionStat {
    label: string;
    value: string | number;
    note: string;
    icon: LucideIcon;
}

interface FooterFreshness {
    label: string;
    value: string | null;
    icon: LucideIcon;
}

const numberFormatter = new Intl.NumberFormat('kk-KZ');
const moneyFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 0,
});
const compactFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 1,
    notation: 'compact',
});
const dateFormatter = new Intl.DateTimeFormat('kk-KZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const formatNumber = (value: number) => numberFormatter.format(value);
const formatMoney = (value: number) => `${moneyFormatter.format(value)} ₸`;
const formatCompactMoney = (value: number) =>
    `${compactFormatter.format(value)} ₸`;
const formatPercent = (value: number | null) =>
    value === null ? '—' : `${numberFormatter.format(value)}%`;
const formatDate = (value: string | null) =>
    value ? dateFormatter.format(new Date(value)) : 'Дерек жоқ';

const projectStatusLabels: Record<string, string> = {
    plan: 'Жоспарлау',
    implementation: 'Іске асыру',
    launched: 'Іске қосылған',
    suspended: 'Тоқтатылған',
};

const applicationStatusLabels: Record<string, string> = {
    approved: 'Мақұлданған',
    converted_to_project: 'Жобаға айналған',
    draft: 'Жоба нұсқасы',
    rejected: 'Қабылданбаған',
    submitted: 'Жіберілген',
    withdrawn: 'Кері қайтарылған',
    under_review: 'Қаралуда',
    needs_clarification: 'Толықтыруда',
};

const monthLabels = [
    'Қаң',
    'Ақп',
    'Нау',
    'Сәу',
    'Мам',
    'Мау',
    'Шіл',
    'Там',
    'Қыр',
    'Қаз',
    'Қар',
    'Жел',
];

const qualityLabels: Record<keyof DataQuality['components'], string> = {
    task_project_coverage: 'Тапсырмасы бар жобалар',
    deadline_coverage: 'Мерзімі толтырылған тапсырмалар',
    issue_project_coverage: 'Мәселе мониторингі',
    production_plan_coverage: 'Толық өндіріс жоспары',
    production_fact_coverage: 'Іске қосылған жобалар фактісі',
    jobs_coverage: 'Жұмыс орны дерегі',
    dates_coverage: 'Жоба мерзімдері',
    photo_coverage: 'Фотоесеп',
    document_coverage: 'Құжат coverage',
};

const surfaceClass =
    'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50';

function projectsUrl(params: Record<string, string | number>) {
    const query = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
    );

    return `${investmentProjects.index.url()}?${query.toString()}`;
}

function ScorePill({ value }: { value: number | null }) {
    if (value === null) {
        return (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                Дерек жеткіліксіз
            </span>
        );
    }

    const classes =
        value >= 80
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : value >= 60
              ? 'border-sky-200 bg-sky-50 text-sky-700'
              : value >= 40
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-rose-200 bg-rose-50 text-rose-700';

    return (
        <span
            className={cn(
                'inline-flex min-w-16 justify-center rounded-full border px-2.5 py-1 text-xs font-extrabold tabular-nums',
                classes,
            )}
        >
            {formatPercent(value)}
        </span>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
    icon: Icon,
    action,
}: {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-start gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-[10px] font-extrabold tracking-[0.22em] text-sky-700 uppercase">
                        {eyebrow}
                    </p>
                    <h2 className="mt-1 text-lg font-bold tracking-tight text-[#0f1b3d] sm:text-xl">
                        {title}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

function ExecutiveMetric({
    label,
    value,
    description,
    icon: Icon,
    tone = 'cyan',
    href,
}: {
    label: string;
    value: string;
    description: string;
    icon: LucideIcon;
    tone?: 'cyan' | 'emerald' | 'amber' | 'red';
    href?: string;
}) {
    const tones = {
        cyan: 'border-sky-100 bg-sky-50 text-sky-700',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-100 bg-amber-50 text-amber-700',
        red: 'border-rose-100 bg-rose-50 text-rose-700',
    };
    const content = (
        <div
            className={cn(
                surfaceClass,
                'group relative h-full overflow-hidden p-5 transition duration-200',
                href &&
                    'hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md',
            )}
        >
            <div className="absolute -right-8 -bottom-10 size-28 rounded-full bg-sky-100/60 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                        {label}
                    </p>
                    <p className="mt-3 truncate text-2xl font-black tracking-tight text-[#0f1b3d] tabular-nums sm:text-3xl">
                        {value}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                </div>
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                        tones[tone],
                    )}
                >
                    <Icon className="size-4.5" />
                </span>
            </div>
        </div>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}

function RiskBadge({ level }: { level: PriorityProject['risk_level'] }) {
    const content = {
        critical: ['Критикалық', 'border-rose-200 bg-rose-50 text-rose-700'],
        high: ['Жоғары', 'border-orange-200 bg-orange-50 text-orange-700'],
        medium: ['Орта', 'border-sky-200 bg-sky-50 text-sky-700'],
    }[level];

    return (
        <span
            className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold',
                content[1],
            )}
        >
            {content[0]}
        </span>
    );
}

function QualityTable({
    items,
    management,
}: {
    items: QualityItem[];
    management?: boolean;
}) {
    if (items.length === 0) {
        return (
            <div className="px-6 py-14 text-center text-sm text-slate-400">
                Бағалауға жеткілікті дерек жоқ
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
                <thead className="bg-slate-50 text-[10px] tracking-[0.14em] text-slate-500 uppercase">
                    <tr>
                        <th className="px-5 py-3.5">Орын</th>
                        <th className="px-4 py-3.5">
                            {management ? 'Басқарма' : 'Аудан / қала'}
                        </th>
                        <th className="px-4 py-3.5 text-center">Жоба</th>
                        <th className="px-4 py-3.5">Бағаланған тапсырма</th>
                        <th className="px-4 py-3.5 text-center">Кешіккен</th>
                        <th className="px-4 py-3.5">Компоненттер</th>
                        <th className="px-5 py-3.5 text-right">Балл</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                        const href =
                            !management && item.id
                                ? projectsUrl({ region_id: item.id })
                                : null;

                        return (
                            <tr
                                key={`${item.rank}-${item.name}`}
                                className="group transition hover:bg-sky-50/60"
                            >
                                <td className="px-5 py-4">
                                    <span
                                        className={cn(
                                            'flex size-8 items-center justify-center rounded-full border text-xs font-black tabular-nums',
                                            item.score !== null &&
                                                item.rank <= 3
                                                ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                : 'border-slate-200 bg-slate-50 text-slate-500',
                                        )}
                                    >
                                        {item.score === null ? '—' : item.rank}
                                    </span>
                                </td>
                                <td className="max-w-xs px-4 py-4">
                                    {href ? (
                                        <Link
                                            href={href}
                                            className="inline-flex items-center gap-1.5 font-semibold text-[#0f1b3d] transition hover:text-sky-700"
                                        >
                                            {item.name}
                                            <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                                        </Link>
                                    ) : (
                                        <p className="font-semibold text-[#0f1b3d]">
                                            {item.name}
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-500">
                                        {management
                                            ? `${item.members_count ?? 0} орындаушы`
                                            : `Дерек coverage: ${formatPercent(item.data_coverage ?? null)}`}
                                    </p>
                                </td>
                                <td className="px-4 py-4 text-center font-bold text-[#0f1b3d] tabular-nums">
                                    {item.project_count}
                                </td>
                                <td className="px-4 py-4">
                                    <span className="font-bold text-emerald-700 tabular-nums">
                                        {item.completed_tasks}
                                    </span>
                                    <span className="text-slate-500">
                                        {' '}
                                        / {item.evaluated_tasks}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span
                                        className={cn(
                                            'inline-flex min-w-8 justify-center rounded-md px-2 py-1 text-xs font-bold tabular-nums',
                                            item.overdue_tasks > 0
                                                ? 'bg-rose-50 text-rose-700'
                                                : 'bg-slate-100 text-slate-500',
                                        )}
                                    >
                                        {item.overdue_tasks}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-xs leading-5 text-slate-500">
                                    <span>
                                        Орындалу{' '}
                                        {formatPercent(item.completion_rate)}
                                    </span>
                                    <span className="mx-2 text-slate-300">
                                        •
                                    </span>
                                    <span>
                                        Мерзім{' '}
                                        {formatPercent(item.deadline_rate)}
                                    </span>
                                    <br />
                                    <span>
                                        {management
                                            ? `Сапа ${formatPercent(item.quality_rate ?? null)}`
                                            : `Мәселе шешімі ${formatPercent(item.issue_resolution_rate ?? null)}`}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <ScorePill value={item.score} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function AkimAnalytics({ analytics }: Props) {
    const [search, setSearch] = useState('');
    const [qualityView, setQualityView] = useState<'districts' | 'managements'>(
        'districts',
    );
    const [trendMonths, setTrendMonths] = useState<3 | 6>(6);
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiMeta, setAiMeta] = useState<{
        provider: 'gemini' | 'local';
        generatedAt: string;
    } | null>(null);
    const {
        summary,
        data_quality: dataQuality,
        production_summary: production,
        regional_potential: potential,
    } = analytics;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Облыс аналитикасы',
            href: akim.analytics.url(),
        },
    ];
    const trend = useMemo(
        () => analytics.activity_trend.slice(-trendMonths),
        [analytics.activity_trend, trendMonths],
    );
    const trendMax = Math.max(
        1,
        ...trend.flatMap((item) => [
            item.activity,
            item.completions,
            item.issues,
        ]),
    );
    const applicationMax = Math.max(
        1,
        ...Object.values(analytics.application_funnel.statuses),
    );
    const productionStats: ProductionStat[] = [
        {
            label: 'Өндіріс қолданылатын',
            value: production.applicable_projects,
            note: 'жоба',
            icon: Layers3,
        },
        {
            label: 'Толық жоспар',
            value: production.projects_with_complete_plans,
            note: `${production.projects_with_any_plan} жобада жоспар жолы бар`,
            icon: FileCheck2,
        },
        {
            label: 'Толықтыру қажет',
            value: production.projects_needing_plan_completion,
            note: `${production.projects_without_any_plan} жобада жоспар мүлде жоқ`,
            icon: CircleAlert,
        },
        {
            label: 'Нақты есеп берген',
            value: production.reporting_projects,
            note: `${production.reported_periods} есеп жазбасы`,
            icon: CheckCircle2,
        },
        {
            label: 'Сома орындалуы',
            value:
                production.amount_completion_rate === null
                    ? 'Тексеру'
                    : formatPercent(production.amount_completion_rate),
            note:
                production.raw_amount_completion_rate !== null &&
                production.amount_completion_rate === null
                    ? `Шикі мән: ${formatPercent(production.raw_amount_completion_rate)}`
                    : `Нақты: ${formatCompactMoney(production.actual_amount)}`,
            icon: Gauge,
        },
    ];
    const freshnessItems: FooterFreshness[] = [
        {
            label: 'Жобалар',
            value: dataQuality.freshness.projects,
            icon: BriefcaseBusiness,
        },
        {
            label: 'Тапсырмалар',
            value: dataQuality.freshness.tasks,
            icon: Clock3,
        },
        {
            label: 'Мәселелер',
            value: dataQuality.freshness.issues,
            icon: ShieldAlert,
        },
        {
            label: 'Өндіріс фактісі',
            value: dataQuality.freshness.production_facts,
            icon: Factory,
        },
    ];
    const qualityTabs: Array<{
        value: 'districts' | 'managements';
        label: string;
    }> = [
        {
            value: 'districts',
            label: `Аудандар (${analytics.district_quality.length})`,
        },
        {
            value: 'managements',
            label: `Басқармалар (${analytics.management_quality.length})`,
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
        if (!message.trim() || aiLoading) return;

        setAiLoading(true);
        setAiError('');
        setAiMeta(null);

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
                body: JSON.stringify({
                    message: message.trim(),
                    context_scope: 'oblast_analytics',
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = (await response.json()) as {
                message: string;
                provider: 'gemini' | 'local';
                generated_at: string;
            };
            setAiResponse(data.message);
            setAiMeta({
                provider: data.provider,
                generatedAt: data.generated_at,
            });
            setAiQuestion('');
        } catch {
            setAiError('AI жауабын алу мүмкін болмады. Қайта көріңіз.');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Облыс аналитикасы" />

            <div className="min-h-full bg-slate-50/50 text-slate-700">
                <div className="pointer-events-none fixed inset-x-0 top-16 h-[34rem] bg-[radial-gradient(circle_at_20%_0%,rgba(186,230,253,0.45),transparent_38%),radial-gradient(circle_at_90%_20%,rgba(207,250,254,0.35),transparent_32%)]" />

                <div className="page-surface relative flex max-w-[100rem] flex-col gap-5 sm:gap-6">
                    <header
                        id="overview"
                        className="relative order-1 overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-5 py-6 shadow-sm sm:px-7 sm:py-8"
                    >
                        <div className="pointer-events-none absolute -top-32 right-0 size-80 rounded-full bg-sky-200/40 blur-3xl" />
                        <div className="relative grid gap-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)] xl:items-end">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-sky-700 uppercase">
                                        Облысты басқару орталығы
                                    </span>
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                                        Live snapshot
                                    </span>
                                </div>
                                <h1 className="mt-5 max-w-4xl text-3xl leading-tight font-black tracking-[-0.035em] text-[#0f1b3d] sm:text-4xl lg:text-5xl">
                                    {analytics.scope.oblast_name}
                                    <span className="block text-sky-700">
                                        инвестициялық ахуал
                                    </span>
                                </h1>
                                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                                    Жоба портфелі, орындаушылық тәртіп, өндіріс
                                    plan/fact және әкімнің жедел шешімін қажет
                                    ететін тәуекелдер бір басқарушылық
                                    көріністе.
                                </p>
                                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <MapPin className="size-4 text-sky-600" />
                                        {analytics.scope.districts_count} аудан
                                        / қала
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <RefreshCcw className="size-4 text-sky-600" />
                                        Есеп:{' '}
                                        {formatDate(
                                            analytics.scope.generated_at,
                                        )}
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <Database className="size-4 text-sky-600" />
                                        Сенімділік{' '}
                                        {formatPercent(
                                            dataQuality.overall_score,
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-sm backdrop-blur-xl">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold text-[#0f1b3d]">
                                        Жобаны жедел іздеу
                                    </p>
                                    <span className="text-[10px] text-slate-500">
                                        Атауы · компания · БСН
                                    </span>
                                </div>
                                <form
                                    onSubmit={submitSearch}
                                    className="mt-3 flex gap-2"
                                >
                                    <div className="relative min-w-0 flex-1">
                                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
                                        <Input
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Жоба немесе компания"
                                            className="h-11 border-sky-100 bg-slate-50/70 pl-9 text-[#0f1b3d] placeholder:text-slate-400 focus-visible:border-sky-300 focus-visible:ring-sky-100"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="h-11 bg-[#0f1b3d] px-4 font-bold text-white hover:bg-[#17284f]"
                                    >
                                        Іздеу
                                    </Button>
                                </form>
                                <Link
                                    href={investmentProjects.index.url()}
                                    className="mt-3 flex items-center justify-between rounded-xl border border-sky-100 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                                >
                                    Барлық жобалар реестрі
                                    <ArrowRight className="size-4" />
                                </Link>
                            </div>
                        </div>
                    </header>

                    <nav className="sticky top-16 z-30 order-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-xl">
                        <div className="flex min-w-max gap-1">
                            {[
                                ['Шолу', '#overview'],
                                ['Басым тәуекел', '#priority'],
                                ['Динамика', '#performance'],
                                ['Өндіріс', '#production'],
                                ['Аудандар', '#quality'],
                                ['Әлеует', '#potential'],
                                ['AI briefing', '#ai'],
                            ].map(([label, href]) => (
                                <a
                                    key={href}
                                    href={href}
                                    className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                    </nav>

                    <section className="order-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <ExecutiveMetric
                            label="Белсенді жоба"
                            value={formatNumber(summary.total_projects)}
                            description={`${summary.implementation_projects} іске асырылуда · ${summary.launched_projects} іске қосылған`}
                            icon={BriefcaseBusiness}
                            href={investmentProjects.index.url()}
                        />
                        <ExecutiveMetric
                            label="Жалпы инвестиция"
                            value={formatCompactMoney(summary.total_investment)}
                            description="Жобаларға енгізілген жоспарлық жалпы сома"
                            icon={CircleDollarSign}
                            tone="emerald"
                        />
                        <ExecutiveMetric
                            label="Жоспарланған жұмыс орны"
                            value={formatNumber(summary.jobs_count)}
                            description={`Бір жоба үлесі ${formatPercent(dataQuality.job_outlier_share)}`}
                            icon={Users}
                            tone="amber"
                        />
                        <ExecutiveMetric
                            label="Проблемалы жоба"
                            value={formatNumber(summary.problem_projects)}
                            description={`${summary.critical_issues} критикалық мәселе · ${summary.overdue_tasks} кешіккен тапсырма`}
                            icon={ShieldAlert}
                            tone="red"
                            href="#priority"
                        />
                        <ExecutiveMetric
                            label="Дерек сенімділігі"
                            value={formatPercent(dataQuality.overall_score)}
                            description={`${dataQuality.warnings.length} сапа ескертуі анықталды`}
                            icon={Database}
                            tone={
                                dataQuality.status === 'good'
                                    ? 'emerald'
                                    : dataQuality.status === 'attention'
                                      ? 'amber'
                                      : 'red'
                            }
                            href="#data-quality"
                        />
                    </section>

                    <section
                        id="quality"
                        className={cn(surfaceClass, 'order-7 scroll-mt-36')}
                    >
                        <SectionHeading
                            eyebrow="Орындаушылық тәртіп"
                            title="Аудан және басқарма сапасы"
                            description="Тек бекітілген тапсырмалар есептеледі. 3-тен аз бағаланған тапсырма болса, балл берілмейді."
                            icon={Landmark}
                            action={
                                <Button
                                    asChild
                                    variant="outline"
                                    className="border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
                                >
                                    <Link href={baskarmaRating.url()}>
                                        Толық рейтинг
                                        <ArrowUpRight className="size-4" />
                                    </Link>
                                </Button>
                            }
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 sm:px-6">
                            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                                {qualityTabs.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setQualityView(value)}
                                        className={cn(
                                            'rounded-lg px-3.5 py-2 text-xs font-bold transition',
                                            qualityView === value
                                                ? 'bg-[#0f1b3d] text-white shadow-sm'
                                                : 'text-slate-500 hover:bg-white hover:text-sky-700',
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Формула:{' '}
                                {qualityView === 'districts'
                                    ? '40% орындалу · 35% мерзім · 25% мәселе шешімі'
                                    : '40% орындалу · 35% мерзім · 25% бірінші қабылдау сапасы'}
                            </p>
                        </div>
                        <QualityTable
                            items={
                                qualityView === 'districts'
                                    ? analytics.district_quality
                                    : analytics.management_quality
                            }
                            management={qualityView === 'managements'}
                        />
                    </section>

                    <section
                        id="potential"
                        className="order-8 grid scroll-mt-36 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"
                    >
                        <div className={surfaceClass}>
                            <SectionHeading
                                eyebrow="Portfolio momentum"
                                title="Салалық портфель қарқыны"
                                description="Бұл нарық болжамы емес: инвестиция, жұмыс орны, жоба сатысы және ашық мәселелер бойынша ішкі салыстыру. Бір жоба бірнеше нишада есептелуі мүмкін."
                                icon={Target}
                            />
                            <div className="divide-y divide-slate-100">
                                {analytics.niche_analytics
                                    .slice(0, 7)
                                    .map((niche) => (
                                        <Link
                                            key={niche.id ?? 'none'}
                                            href={
                                                niche.id
                                                    ? projectsUrl({
                                                          project_type_id:
                                                              niche.id,
                                                      })
                                                    : investmentProjects.index.url()
                                            }
                                            className="group grid gap-3 px-5 py-4 transition hover:bg-sky-50/60 sm:grid-cols-[minmax(0,1fr)_110px_110px_110px] sm:items-center sm:px-6"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-xs font-black text-sky-700">
                                                    {niche.rank}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-[#0f1b3d] transition group-hover:text-sky-700">
                                                        {niche.name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {niche.active_issues}{' '}
                                                        ашық мәселе
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-500 tabular-nums">
                                                <strong className="text-[#0f1b3d]">
                                                    {niche.project_count}
                                                </strong>{' '}
                                                жоба
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {formatCompactMoney(
                                                    niche.investment,
                                                )}
                                            </div>
                                            <div className="sm:text-right">
                                                <ScorePill
                                                    value={
                                                        niche.potential_score
                                                    }
                                                />
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>

                        <div className="grid gap-5">
                            <div className={surfaceClass}>
                                <SectionHeading
                                    eyebrow="Өңір активтері"
                                    title="Инфрақұрылым статусы"
                                    description="Белсенді және проблемалы нысандар араластырылмайды."
                                    icon={Building2}
                                />
                                <div className="grid grid-cols-2 gap-3 p-5 sm:p-6">
                                    {[
                                        {
                                            label: 'АЭА',
                                            asset: potential.assets.sezs,
                                            href: sezs.index.url(),
                                        },
                                        {
                                            label: 'Индустриялық аймақ',
                                            asset: potential.assets
                                                .industrial_zones,
                                            href: industrialZones.index.url(),
                                        },
                                        {
                                            label: 'Пром аймақ',
                                            asset: potential.assets.prom_zones,
                                            href: promZones.index.url(),
                                        },
                                        {
                                            label: 'Жер қойнауы',
                                            asset: potential.assets
                                                .subsoil_users,
                                            href: subsoilUsers.index.url(),
                                        },
                                    ].map(({ label, asset, href }) => {
                                        return (
                                            <Link
                                                key={label}
                                                href={href}
                                                className="group rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-sky-200 hover:bg-sky-50"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-[11px] leading-4 font-bold text-slate-400">
                                                        {String(label)}
                                                    </p>
                                                    <span className="text-xl font-black text-[#0f1b3d] tabular-nums">
                                                        {asset.total}
                                                    </span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                                                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                                                        {asset.active} белсенді
                                                    </span>
                                                    {asset.illegal > 0 && (
                                                        <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">
                                                            {asset.illegal}{' '}
                                                            заңсыз
                                                        </span>
                                                    )}
                                                    {asset.other > 0 && (
                                                        <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-600">
                                                            {asset.other} басқа
                                                        </span>
                                                    )}
                                                    <ArrowUpRight className="ml-auto size-3.5 text-sky-600 opacity-0 transition group-hover:opacity-100" />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={surfaceClass}>
                                <SectionHeading
                                    eyebrow="Investment funnel"
                                    title="Инвестициялық өтінімдер"
                                    description={`${analytics.application_funnel.total} өтінім · ${formatCompactMoney(analytics.application_funnel.investment)} · ${formatNumber(analytics.application_funnel.jobs)} жұмыс орны`}
                                    icon={BriefcaseBusiness}
                                />
                                <div className="space-y-3 p-5 sm:p-6">
                                    {Object.entries(
                                        analytics.application_funnel.statuses,
                                    ).map(([status, count]) => (
                                        <div key={status}>
                                            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                                                <span className="text-slate-400">
                                                    {applicationStatusLabels[
                                                        status
                                                    ] ?? status}
                                                </span>
                                                <span className="font-bold text-[#0f1b3d] tabular-nums">
                                                    {count}
                                                </span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-sky-500"
                                                    style={{
                                                        width: `${(count / applicationMax) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section
                        id="ai"
                        className={cn(
                            surfaceClass,
                            'order-9 scroll-mt-36 overflow-hidden border-sky-200',
                        )}
                    >
                        <div className="relative border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-5 py-6 sm:px-6">
                            <div className="pointer-events-none absolute -top-20 right-10 size-48 rounded-full bg-sky-200/40 blur-3xl" />
                            <div className="relative flex items-start gap-4">
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f1b3d] text-sky-200 shadow-lg shadow-slate-300/50">
                                    <Bot className="size-5" />
                                </span>
                                <div>
                                    <p className="text-[10px] font-extrabold tracking-[0.2em] text-sky-700 uppercase">
                                        Executive AI briefing
                                    </p>
                                    <h2 className="mt-1 text-xl font-bold text-[#0f1b3d]">
                                        Әкімнің AI аналитигі
                                    </h2>
                                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                                        AI енді дерек сенімділігі мен басым
                                        тәуекелдерді де контекстке алады.
                                        Қорытындыны шешім алдында бастапқы жоба
                                        дерегімен салыстырыңыз.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 sm:p-6">
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                                {[
                                    'Облыс бойынша 1 минуттық әкім брифингін жаса: ең үлкен тәуекел, жауапты және келесі әрекетті көрсет',
                                    'Басым 5 проблемалы жобаны талдап, әкім шешімін қажет ететін тармақтарды жаз',
                                    'Аудан мен басқарма сапасын дерек coverage-ін ескеріп салыстыр',
                                    'Өндіріс plan/fact аномалияларын және тексерілетін жобаларды түсіндір',
                                ].map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        disabled={aiLoading}
                                        onClick={() => void askAi(prompt)}
                                        className="flex min-h-24 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-left text-xs leading-5 text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-50"
                                    >
                                        <Sparkles className="mt-0.5 size-4 shrink-0 text-sky-600" />
                                        {prompt}
                                    </button>
                                ))}
                            </div>

                            <form
                                className="mt-4 flex flex-col gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3 sm:flex-row"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void askAi(aiQuestion);
                                }}
                            >
                                <Input
                                    value={aiQuestion}
                                    onChange={(event) =>
                                        setAiQuestion(event.target.value)
                                    }
                                    placeholder="Облыстық деректер бойынша өз сұрағыңызды жазыңыз"
                                    disabled={aiLoading}
                                    className="h-11 flex-1 border-sky-200 bg-white text-[#0f1b3d] placeholder:text-slate-400 focus-visible:border-sky-400 focus-visible:ring-sky-100"
                                />
                                <Button
                                    type="submit"
                                    disabled={aiLoading || !aiQuestion.trim()}
                                    className="h-11 bg-[#0f1b3d] px-5 text-white hover:bg-[#17284f]"
                                >
                                    <Sparkles className="size-4" />
                                    Талдау
                                </Button>
                            </form>

                            {aiLoading && (
                                <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                                    <span className="size-2 animate-pulse rounded-full bg-sky-500" />
                                    AI облыстық деректерді талдап жатыр...
                                </div>
                            )}
                            {aiError && (
                                <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    <AlertTriangle className="size-4" />
                                    {aiError}
                                </div>
                            )}
                            {aiResponse && !aiLoading && (
                                <div className="mt-4 overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 bg-sky-50/70 px-4 py-2.5 text-[11px]">
                                        <span className="font-bold text-sky-800">
                                            Басқарушылық қорытынды
                                        </span>
                                        {aiMeta && (
                                            <span className="text-slate-500">
                                                {aiMeta.provider === 'gemini'
                                                    ? 'Gemini AI'
                                                    : 'Жергілікті резервтік талдау'}{' '}
                                                ·{' '}
                                                {formatDate(aiMeta.generatedAt)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-5 text-sm leading-7 whitespace-pre-wrap text-slate-700">
                                        {aiResponse.replaceAll('**', '')}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section
                        id="performance"
                        className="order-5 grid scroll-mt-36 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"
                    >
                        <div className={surfaceClass}>
                            <SectionHeading
                                eyebrow="6 айлық мониторинг"
                                title="Операциялық белсенділік динамикасы"
                                description="Жоба журналдары, қабылданған есептер және жаңа мәселелер. Баған биіктігі салыстырмалы лог шкалада."
                                icon={Activity}
                                action={
                                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                                        {([3, 6] as const).map((months) => (
                                            <button
                                                key={months}
                                                type="button"
                                                onClick={() =>
                                                    setTrendMonths(months)
                                                }
                                                className={cn(
                                                    'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                                                    trendMonths === months
                                                        ? 'bg-[#0f1b3d] text-white shadow-sm'
                                                        : 'text-slate-500 hover:bg-white hover:text-sky-700',
                                                )}
                                            >
                                                {months} ай
                                            </button>
                                        ))}
                                    </div>
                                }
                            />
                            <div className="p-5 sm:p-6">
                                <div className="flex h-64 items-end gap-3 sm:gap-5">
                                    {trend.map((item) => {
                                        const scale = (value: number) =>
                                            value === 0
                                                ? 0
                                                : Math.max(
                                                      8,
                                                      (Math.log1p(value) /
                                                          Math.log1p(
                                                              trendMax,
                                                          )) *
                                                          100,
                                                  );
                                        const month = Number(
                                            item.period.split('-')[1],
                                        );
                                        const bars = [
                                            {
                                                value: item.activity,
                                                color: 'bg-cyan-300',
                                                label: 'Журнал оқиғасы',
                                            },
                                            {
                                                value: item.completions,
                                                color: 'bg-emerald-400',
                                                label: 'Есеп',
                                            },
                                            {
                                                value: item.issues,
                                                color: 'bg-red-400',
                                                label: 'Мәселе',
                                            },
                                        ];

                                        return (
                                            <div
                                                key={item.period}
                                                className="flex min-w-0 flex-1 flex-col items-center"
                                            >
                                                <div className="flex h-48 w-full items-end justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 px-2 pt-4">
                                                    {bars.map((bar) => (
                                                        <div
                                                            key={bar.label}
                                                            title={`${bar.label}: ${bar.value}`}
                                                            className={cn(
                                                                'w-2.5 rounded-t-sm opacity-85 transition hover:opacity-100 sm:w-3.5',
                                                                bar.color,
                                                            )}
                                                            style={{
                                                                height: `${scale(bar.value)}%`,
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="mt-2 text-xs font-bold text-slate-400">
                                                    {monthLabels[month - 1]}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-slate-600 tabular-nums">
                                                    {item.activity} оқиға
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-slate-500">
                                    <span className="inline-flex items-center gap-2">
                                        <i className="size-2 rounded-full bg-cyan-300" />
                                        Журнал оқиғасы
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <i className="size-2 rounded-full bg-emerald-400" />
                                        Тапсырма есебі
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <i className="size-2 rounded-full bg-red-400" />
                                        Жаңа мәселе
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={surfaceClass}>
                            <SectionHeading
                                eyebrow="Portfolio mix"
                                title="Жобалар мәртебесі"
                                description="Үлес жалпы белсенді портфельден есептеледі."
                                icon={BarChart3}
                            />
                            <div className="space-y-5 p-5 sm:p-6">
                                {analytics.status_distribution.map(
                                    (item, index) => {
                                        const percentage =
                                            summary.total_projects > 0
                                                ? (item.value /
                                                      summary.total_projects) *
                                                  100
                                                : 0;
                                        const colors = [
                                            'bg-cyan-400',
                                            'bg-amber-300',
                                            'bg-emerald-400',
                                            'bg-red-400',
                                        ];
                                        const status =
                                            Object.keys(projectStatusLabels)[
                                                index
                                            ];

                                        return (
                                            <Link
                                                key={item.name}
                                                href={projectsUrl({ status })}
                                                className="block rounded-xl transition hover:bg-white/[0.025]"
                                            >
                                                <div className="mb-2 flex items-end justify-between gap-4">
                                                    <span className="text-sm font-semibold text-slate-600">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-sm font-black text-[#0f1b3d] tabular-nums">
                                                        {item.value}{' '}
                                                        <small className="font-medium text-slate-500">
                                                            /{' '}
                                                            {percentage.toFixed(
                                                                1,
                                                            )}
                                                            %
                                                        </small>
                                                    </span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full',
                                                            colors[index],
                                                        )}
                                                        style={{
                                                            width: `${percentage}%`,
                                                        }}
                                                    />
                                                </div>
                                            </Link>
                                        );
                                    },
                                )}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase">
                                            Портфель инвестициясы
                                        </p>
                                        <p className="mt-2 font-black text-[#0f1b3d]">
                                            {formatCompactMoney(
                                                potential.pipeline_investment,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase">
                                            Портфельдегі жоба
                                        </p>
                                        <p className="mt-2 font-black text-[#0f1b3d] tabular-nums">
                                            {potential.pipeline_projects}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section
                        id="production"
                        className={cn(surfaceClass, 'order-6 scroll-mt-36')}
                    >
                        <SectionHeading
                            eyebrow="Plan / fact"
                            title="Өндірістік орындау"
                            description="Толық жоспар, нақты есеп және аномалиялар бөлек көрсетіледі. 200%-дан жоғары қатынас сенімді KPI-дан алынып тасталады."
                            icon={Factory}
                            action={
                                production.anomaly_projects > 0 ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                                        <AlertTriangle className="size-3.5" />
                                        {production.anomaly_projects} аномалия
                                    </span>
                                ) : null
                            }
                        />

                        <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-5">
                            {productionStats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                                            {stat.label}
                                        </p>
                                        <stat.icon className="size-4 text-cyan-300" />
                                    </div>
                                    <p className="mt-3 text-2xl font-black text-[#0f1b3d] tabular-nums">
                                        {stat.value}
                                    </p>
                                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                        {stat.note}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {analytics.production_performance.length === 0 ? (
                            <div className="px-6 py-14 text-center text-sm text-slate-500">
                                Толық өндіріс жоспары бар жоба жоқ
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[960px] text-left">
                                    <thead className="bg-slate-50 text-[10px] tracking-[0.14em] text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-3.5">
                                                Жоба
                                            </th>
                                            <th className="px-4 py-3.5">
                                                Өнім
                                            </th>
                                            <th className="px-4 py-3.5 text-right">
                                                Жоспар
                                            </th>
                                            <th className="px-4 py-3.5 text-right">
                                                Нақты
                                            </th>
                                            <th className="px-4 py-3.5 text-center">
                                                Орындалу
                                            </th>
                                            <th className="px-6 py-3.5 text-right">
                                                Сапа
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {analytics.production_performance.map(
                                            (item) => (
                                                <tr
                                                    key={item.id}
                                                    className="transition hover:bg-sky-50/60"
                                                >
                                                    <td className="max-w-sm px-6 py-4">
                                                        <Link
                                                            href={investmentProjects.show.url(
                                                                item.id,
                                                            )}
                                                            className="font-semibold text-[#0f1b3d] transition hover:text-sky-700"
                                                        >
                                                            {item.name}
                                                        </Link>
                                                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                                            <MapPin className="size-3" />
                                                            {item.region_name ??
                                                                'Өңір көрсетілмеген'}
                                                        </p>
                                                    </td>
                                                    <td className="max-w-xs px-4 py-4 text-sm text-slate-600">
                                                        <p className="truncate">
                                                            {item.products.join(
                                                                ', ',
                                                            )}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-600">
                                                            {
                                                                item.reported_periods
                                                            }{' '}
                                                            есеп жазбасы
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-sm text-slate-400 tabular-nums">
                                                        {formatMoney(
                                                            item.planned_amount_for_reported_periods,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-sm font-bold text-[#0f1b3d] tabular-nums">
                                                        {formatMoney(
                                                            item.actual_amount,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <ScorePill
                                                            value={
                                                                item.amount_completion_rate
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {item.has_anomaly ? (
                                                            <span
                                                                title={item.anomalies.join(
                                                                    '\n',
                                                                )}
                                                                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"
                                                            >
                                                                <AlertTriangle className="size-3.5" />
                                                                Тексеру
                                                            </span>
                                                        ) : item.reported_periods >
                                                          0 ? (
                                                            <span className="text-xs font-bold text-emerald-700">
                                                                Расталған
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">
                                                                Есеп жоқ
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section
                        id="priority"
                        className="order-4 grid scroll-mt-36 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.45fr)]"
                    >
                        <div className={surfaceClass}>
                            <SectionHeading
                                eyebrow="Әкім назары"
                                title="Басым тәуекелдер және нақты әрекет"
                                description="Мәселе ауырлығы, кешігу ұзақтығы және өндіріс дерегінің сапасы бойынша автоматты басымдық."
                                icon={ShieldAlert}
                                action={
                                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                                        {analytics.priority_projects.length}{' '}
                                        бақылауда
                                    </span>
                                }
                            />
                            {analytics.priority_projects.length === 0 ? (
                                <div className="flex flex-col items-center px-6 py-14 text-center">
                                    <CheckCircle2 className="size-8 text-emerald-600" />
                                    <p className="mt-3 font-semibold text-[#0f1b3d]">
                                        Критикалық тәуекел анықталмады
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {analytics.priority_projects
                                        .slice(0, 6)
                                        .map((project) => (
                                            <Link
                                                key={project.id}
                                                href={investmentProjects.show.url(
                                                    project.id,
                                                )}
                                                className="group grid gap-4 px-5 py-4 transition hover:bg-sky-50/60 sm:grid-cols-[minmax(0,1fr)_160px_180px] sm:items-center sm:px-6"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <RiskBadge
                                                            level={
                                                                project.risk_level
                                                            }
                                                        />
                                                        <span className="text-[11px] text-slate-500">
                                                            #{project.rank} ·{' '}
                                                            {
                                                                project.region_name
                                                            }
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 truncate font-bold text-[#0f1b3d] transition group-hover:text-sky-700">
                                                        {project.name}
                                                    </p>
                                                    <p className="mt-1 truncate text-xs text-slate-500">
                                                        {project.reasons.join(
                                                            ' · ',
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                                                        Жауапты
                                                    </p>
                                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                                                        {project.responsible ??
                                                            'Жауапты бекітілмеген'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between gap-3 sm:block">
                                                    <div>
                                                        <p className="text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                                                            Келесі әрекет
                                                        </p>
                                                        <p className="mt-1 text-xs leading-5 font-semibold text-amber-700">
                                                            {
                                                                project.recommended_action
                                                            }
                                                        </p>
                                                    </div>
                                                    <ArrowUpRight className="size-4 shrink-0 text-sky-600 opacity-60 sm:hidden" />
                                                </div>
                                            </Link>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div id="data-quality" className={surfaceClass}>
                            <SectionHeading
                                eyebrow="Trust layer"
                                title="Дерек сапасы"
                                description="Көрсеткішке сенуге болатын деңгей."
                                icon={Database}
                            />
                            <div className="p-5 sm:p-6">
                                <div className="flex items-center gap-5">
                                    <div
                                        className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            background: `conic-gradient(#67e8f9 ${dataQuality.overall_score * 3.6}deg, rgba(148,163,184,.12) 0deg)`,
                                        }}
                                    >
                                        <div className="flex size-[78px] flex-col items-center justify-center rounded-full bg-white shadow-inner">
                                            <span className="text-xl font-black text-[#0f1b3d] tabular-nums">
                                                {dataQuality.overall_score}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">
                                                trust
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#0f1b3d]">
                                            {dataQuality.status === 'good'
                                                ? 'Дерек сапасы жақсы'
                                                : dataQuality.status ===
                                                    'attention'
                                                  ? 'Назар аудару керек'
                                                  : 'Сенімділік төмен'}
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            Рейтинг пен AI қорытындысы осы
                                            coverage-ке тәуелді.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3.5">
                                    {(
                                        Object.entries(
                                            dataQuality.components,
                                        ) as Array<
                                            [
                                                keyof DataQuality['components'],
                                                number | null,
                                            ]
                                        >
                                    )
                                        .filter(([key]) =>
                                            [
                                                'task_project_coverage',
                                                'deadline_coverage',
                                                'production_plan_coverage',
                                                'photo_coverage',
                                            ].includes(key),
                                        )
                                        .map(([key, value]) => (
                                            <div key={key}>
                                                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                                                    <span className="text-slate-400">
                                                        {qualityLabels[key]}
                                                    </span>
                                                    <span className="font-bold text-[#0f1b3d] tabular-nums">
                                                        {formatPercent(value)}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full',
                                                            (value ?? 0) >= 80
                                                                ? 'bg-emerald-400'
                                                                : (value ??
                                                                        0) >= 50
                                                                  ? 'bg-amber-300'
                                                                  : 'bg-red-400',
                                                        )}
                                                        style={{
                                                            width: `${Math.min(100, value ?? 0)}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                                    <p className="flex items-center gap-2 text-xs font-bold text-amber-700">
                                        <CircleAlert className="size-4" />
                                        Негізгі ескерту
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-slate-600">
                                        {dataQuality.warnings[0] ??
                                            'Критикалық ескерту жоқ'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <footer className="order-10 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                        {freshnessItems.map((item) => (
                            <div
                                key={item.label}
                                className="flex items-center gap-3 rounded-xl px-2 py-1"
                            >
                                <item.icon className="size-4 shrink-0 text-sky-600" />
                                <div>
                                    <p className="font-semibold text-slate-400">
                                        {item.label}
                                    </p>
                                    <p className="mt-0.5">
                                        Соңғы жаңарту: {formatDate(item.value)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </footer>
                </div>
            </div>
        </AppLayout>
    );
}
