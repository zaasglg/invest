import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    FileText,
    Filter,
    ImageIcon,
    MessageCircle,
    RefreshCcw,
    Search,
    ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatProjectTypeNames } from '@/lib/project-types';
import type { PaginatedData } from '@/types';

interface ProjectType {
    id: number;
    name: string;
}

interface Region {
    id: number;
    name: string;
}

interface InvestmentProject {
    id: number;
    name: string;
    region?: Region;
    project_type?: ProjectType;
    project_types?: ProjectType[];
}

interface LogUser {
    id: number;
    full_name?: string;
    role_model?: {
        name?: string;
        display_name?: string;
    };
}

interface LogChange {
    label: string;
    old: unknown;
    new: unknown;
}

interface LogProperties {
    actor_name?: string | null;
    actor_role?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    project_name?: string;
    changes?: Record<string, LogChange>;
    details?: Record<string, unknown>;
    subject_ids?: number[];
}

interface KpiLog {
    id: number;
    user_id: number | null;
    action: string;
    event?: string | null;
    category?: string | null;
    subject_type?: string | null;
    subject_id?: number | null;
    properties?: LogProperties | null;
    score: number;
    created_at: string;
    user?: LogUser | null;
}

interface ActorOption {
    id: number;
    full_name?: string;
}

interface LogFilters {
    search: string;
    category: string;
    user_id: string;
    date_from: string;
    date_to: string;
}

interface CategoryConfig {
    label: string;
    icon: LucideIcon;
    badge: string;
    iconBox: string;
}

interface Props {
    project: InvestmentProject;
    logs: PaginatedData<KpiLog>;
    actors: ActorOption[];
    filters: LogFilters;
    categoryCounts: Record<string, number>;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    project: {
        label: 'Жоба',
        icon: Activity,
        badge: 'bg-blue-100 text-blue-700',
        iconBox: 'bg-blue-50 text-blue-600',
    },
    task: {
        label: 'Жол картасы',
        icon: CheckCircle2,
        badge: 'bg-emerald-100 text-emerald-700',
        iconBox: 'bg-emerald-50 text-emerald-600',
    },
    completion: {
        label: 'Орындалу нәтижесі',
        icon: CheckCircle2,
        badge: 'bg-teal-100 text-teal-700',
        iconBox: 'bg-teal-50 text-teal-600',
    },
    document: {
        label: 'Құжат',
        icon: FileText,
        badge: 'bg-violet-100 text-violet-700',
        iconBox: 'bg-violet-50 text-violet-600',
    },
    photo: {
        label: 'Фото',
        icon: ImageIcon,
        badge: 'bg-pink-100 text-pink-700',
        iconBox: 'bg-pink-50 text-pink-600',
    },
    issue: {
        label: 'Проблемалық мәселе',
        icon: ScrollText,
        badge: 'bg-amber-100 text-amber-700',
        iconBox: 'bg-amber-50 text-amber-600',
    },
    chat: {
        label: 'Чат',
        icon: MessageCircle,
        badge: 'bg-cyan-100 text-cyan-700',
        iconBox: 'bg-cyan-50 text-cyan-600',
    },
    download: {
        label: 'Жүктеу',
        icon: Download,
        badge: 'bg-slate-100 text-slate-700',
        iconBox: 'bg-slate-100 text-slate-600',
    },
    legacy: {
        label: 'Бұрынғы лог',
        icon: ScrollText,
        badge: 'bg-gray-100 text-gray-700',
        iconBox: 'bg-gray-100 text-gray-600',
    },
};

const FILTER_CATEGORIES = [
    'project',
    'task',
    'completion',
    'document',
    'photo',
    'issue',
    'chat',
    'download',
];

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('kk-KZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDay(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('kk-KZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function dayKey(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return 'Көрсетілмеген';
    }

    if (typeof value === 'boolean') {
        return value ? 'Иә' : 'Жоқ';
    }

    if (Array.isArray(value)) {
        return value.length > 0
            ? value.map((item) => formatValue(item)).join(', ')
            : 'Бос';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function actorInitial(log: KpiLog): string {
    const name =
        log.user?.full_name ||
        log.properties?.actor_name ||
        (log.user_id ? `ID ${log.user_id}` : 'Жүйе');

    return name.slice(0, 2).toUpperCase();
}

export default function Logs({
    project,
    logs,
    actors,
    filters,
    categoryCounts,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [category, setCategory] = useState(filters.category);
    const [userId, setUserId] = useState(filters.user_id);
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    const baseUrl = `/investment-projects/${project.id}/logs`;
    const totalActivities = Object.values(categoryCounts).reduce(
        (total, count) => total + Number(count),
        0,
    );
    const taskActivities =
        Number(categoryCounts.task || 0) +
        Number(categoryCounts.completion || 0);
    const contentActivities =
        Number(categoryCounts.document || 0) +
        Number(categoryCounts.photo || 0) +
        Number(categoryCounts.issue || 0) +
        Number(categoryCounts.chat || 0);

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const query: Record<string, string> = {};
        if (search.trim()) query.search = search.trim();
        if (category) query.category = category;
        if (userId) query.user_id = userId;
        if (dateFrom) query.date_from = dateFrom;
        if (dateTo) query.date_to = dateTo;

        router.get(baseUrl, query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearch('');
        setCategory('');
        setUserId('');
        setDateFrom('');
        setDateTo('');
        router.get(baseUrl, {}, { replace: true });
    };

    const hasActiveFilters =
        search !== '' ||
        category !== '' ||
        userId !== '' ||
        dateFrom !== '' ||
        dateTo !== '';

    return (
        <AppLayout>
            <Head title={`Әрекеттер тарихы — ${project.name}`} />

            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link
                        href={`/investment-projects/${project.id}`}
                        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-[#0f1b3d]"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Жобаға қайту
                    </Link>
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold text-[#0f1b3d]">
                                <ScrollText className="h-6 w-6 text-[#c8a44e]" />
                                Жоба әрекеттерінің тарихы
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {project.name}
                                {project.region?.name
                                    ? ` • ${project.region.name}`
                                    : ''}
                                {formatProjectTypeNames(project, '')
                                    ? ` • ${formatProjectTypeNames(project, '')}`
                                    : ''}
                            </p>
                        </div>
                        <p className="max-w-md text-sm text-gray-500">
                            Жоба бойынша кім, қашан және қандай өзгеріс жасағаны
                            осы жерде сақталады.
                        </p>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                        label="Барлық әрекет"
                        value={totalActivities}
                        icon={Activity}
                        color="text-blue-600"
                    />
                    <StatCard
                        label="Жоба өзгерістері"
                        value={Number(categoryCounts.project || 0)}
                        icon={RefreshCcw}
                        color="text-violet-600"
                    />
                    <StatCard
                        label="Тапсырмалар"
                        value={taskActivities}
                        icon={CheckCircle2}
                        color="text-emerald-600"
                    />
                    <StatCard
                        label="Материалдар мен байланыс"
                        value={contentActivities}
                        icon={FileText}
                        color="text-amber-600"
                    />
                </div>

                <Card className="mb-6 border-gray-200 shadow-none">
                    <CardContent className="p-5">
                        <form
                            onSubmit={applyFilters}
                            className="grid grid-cols-1 gap-3 lg:grid-cols-12"
                        >
                            <div className="relative lg:col-span-4">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Әрекеттен іздеу..."
                                    className="pl-9"
                                />
                            </div>
                            <select
                                value={category}
                                onChange={(event) =>
                                    setCategory(event.target.value)
                                }
                                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 lg:col-span-2"
                            >
                                <option value="">Барлық санат</option>
                                {FILTER_CATEGORIES.map((item) => (
                                    <option key={item} value={item}>
                                        {CATEGORY_CONFIG[item].label} (
                                        {categoryCounts[item] || 0})
                                    </option>
                                ))}
                            </select>
                            <select
                                value={userId}
                                onChange={(event) =>
                                    setUserId(event.target.value)
                                }
                                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 lg:col-span-2"
                            >
                                <option value="">Барлық пайдаланушы</option>
                                {actors.map((actor) => (
                                    <option key={actor.id} value={actor.id}>
                                        {actor.full_name || `ID ${actor.id}`}
                                    </option>
                                ))}
                            </select>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(event) =>
                                    setDateFrom(event.target.value)
                                }
                                aria-label="Басталу күні"
                                className="lg:col-span-2"
                            />
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(event) =>
                                    setDateTo(event.target.value)
                                }
                                aria-label="Аяқталу күні"
                                className="lg:col-span-2"
                            />
                            <div className="flex gap-2 lg:col-span-12 lg:justify-end">
                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetFilters}
                                    >
                                        Тазалау
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    className="bg-[#0f1b3d] hover:bg-[#1a2d5e]"
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    Сүзгіні қолдану
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-none">
                    <CardContent className="p-0">
                        {logs.data.length === 0 ? (
                            <div className="py-16 text-center">
                                <ScrollText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                                <p className="font-medium text-gray-600">
                                    Әрекеттер табылмады
                                </p>
                                <p className="mt-1 text-sm text-gray-400">
                                    {hasActiveFilters
                                        ? 'Сүзгіні өзгертіп көріңіз.'
                                        : 'Жоба бойынша алғашқы әрекет жасалғанда осы жерде пайда болады.'}
                                </p>
                            </div>
                        ) : (
                            <div className="px-5 py-4 sm:px-7">
                                {logs.data.map((log, index) => {
                                    const currentCategory =
                                        log.category || 'legacy';
                                    const config =
                                        CATEGORY_CONFIG[currentCategory] ||
                                        CATEGORY_CONFIG.legacy;
                                    const Icon = config.icon;
                                    const changes =
                                        log.properties?.changes || {};
                                    const details =
                                        log.properties?.details || {};
                                    const hasDetails =
                                        Object.keys(changes).length > 0 ||
                                        Object.keys(details).length > 0 ||
                                        Boolean(log.event);
                                    const showDay =
                                        index === 0 ||
                                        dayKey(
                                            logs.data[index - 1].created_at,
                                        ) !== dayKey(log.created_at);
                                    const actorName =
                                        log.user?.full_name ||
                                        log.properties?.actor_name ||
                                        (log.user_id
                                            ? `Пайдаланушы ID: ${log.user_id}`
                                            : 'Жойылған пайдаланушы');
                                    const actorRole =
                                        log.user?.role_model?.display_name ||
                                        log.user?.role_model?.name ||
                                        log.properties?.actor_role;

                                    return (
                                        <div key={log.id}>
                                            {showDay && (
                                                <div className="flex items-center gap-2 py-4 text-sm font-semibold text-gray-500">
                                                    <CalendarDays className="h-4 w-4" />
                                                    {formatDay(log.created_at)}
                                                    <div className="h-px flex-1 bg-gray-100" />
                                                </div>
                                            )}
                                            <div className="relative flex gap-4 pb-6">
                                                {index <
                                                    logs.data.length - 1 && (
                                                    <div className="absolute top-11 bottom-0 left-5 w-px bg-gray-200" />
                                                )}
                                                <div
                                                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconBox}`}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
                                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge
                                                                    className={`border-0 text-[11px] ${config.badge}`}
                                                                >
                                                                    {
                                                                        config.label
                                                                    }
                                                                </Badge>
                                                                <p className="font-semibold text-[#0f1b3d]">
                                                                    {log.action}
                                                                </p>
                                                            </div>
                                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-600">
                                                                        {actorInitial(
                                                                            log,
                                                                        )}
                                                                    </span>
                                                                    {actorName}
                                                                </span>
                                                                {actorRole && (
                                                                    <span>
                                                                        {
                                                                            actorRole
                                                                        }
                                                                    </span>
                                                                )}
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    {formatDateTime(
                                                                        log.created_at,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {hasDetails && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="shrink-0 text-xs text-gray-500"
                                                                onClick={() =>
                                                                    setExpandedLogId(
                                                                        expandedLogId ===
                                                                            log.id
                                                                            ? null
                                                                            : log.id,
                                                                    )
                                                                }
                                                            >
                                                                {expandedLogId ===
                                                                log.id ? (
                                                                    <>
                                                                        Жасыру
                                                                        <ChevronUp className="ml-1 h-4 w-4" />
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        Толық
                                                                        мәлімет
                                                                        <ChevronDown className="ml-1 h-4 w-4" />
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {expandedLogId ===
                                                        log.id && (
                                                        <LogDetails
                                                            log={log}
                                                            changes={changes}
                                                            details={details}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-4">
                    <Pagination paginator={logs} preserveScroll />
                </div>
            </div>
        </AppLayout>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
}) {
    return (
        <Card className="border-gray-200 shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-xl font-bold text-[#0f1b3d]">{value}</p>
                    <p className="truncate text-xs text-gray-500">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function LogDetails({
    log,
    changes,
    details,
}: {
    log: KpiLog;
    changes: Record<string, LogChange>;
    details: Record<string, unknown>;
}) {
    return (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
            {Object.keys(changes).length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        Өзгерген мәндер
                    </p>
                    <div className="space-y-2">
                        {Object.entries(changes).map(([field, change]) => (
                            <div
                                key={field}
                                className="grid gap-2 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-[160px_1fr_auto_1fr]"
                            >
                                <span className="font-medium text-gray-600">
                                    {change.label}
                                </span>
                                <span className="break-words text-red-600 line-through decoration-red-300">
                                    {formatValue(change.old)}
                                </span>
                                <span className="hidden text-gray-300 sm:block">
                                    →
                                </span>
                                <span className="font-medium break-words text-emerald-700">
                                    {formatValue(change.new)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {Object.keys(details).length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        Әрекет мәліметтері
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(details).map(([label, value]) => (
                            <div
                                key={label}
                                className="rounded-lg border border-gray-100 px-3 py-2"
                            >
                                <p className="text-[11px] text-gray-400">
                                    {label}
                                </p>
                                <p className="mt-0.5 text-sm break-words text-gray-700">
                                    {formatValue(value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                {log.event && <span>Оқиға: {log.event}</span>}
                {log.subject_type && (
                    <span>
                        Объект: {log.subject_type}
                        {log.subject_id ? ` #${log.subject_id}` : ''}
                    </span>
                )}
                {log.properties?.ip_address && (
                    <span>IP: {log.properties.ip_address}</span>
                )}
                {log.properties?.user_agent && (
                    <span
                        className="inline-block max-w-xs truncate align-bottom"
                        title={log.properties.user_agent}
                    >
                        Құрылғы: {log.properties.user_agent}
                    </span>
                )}
                <span>Лог ID: {log.id}</span>
            </div>
        </div>
    );
}
