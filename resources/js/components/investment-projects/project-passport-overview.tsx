import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarClock,
    Check,
    CheckCircle2,
    ClipboardCopy,
    Clock3,
    Download,
    Edit3,
    FileCheck2,
    Flag,
    ListChecks,
    MapPin,
    Printer,
    ShieldAlert,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ProjectPassportSummary {
    health: {
        level: 'critical' | 'warning' | 'healthy';
        label: string;
        reasons: string[];
    };
    progress_percent: number;
    timeline: {
        elapsed_percent: number;
        days_remaining: number | null;
        is_overdue: boolean;
        has_dates: boolean;
    };
    tasks: {
        total: number;
        completed: number;
        in_progress: number;
        overdue: number;
        pending_approval: number;
    };
    issues: {
        total: number;
        open: number;
        critical: number;
        resolved: number;
    };
    documents_count: number;
    photos_count: number;
    completeness: {
        percent: number;
        completed: number;
        total: number;
        missing: string[];
    };
    next_milestone: {
        id: number;
        title: string;
        due_date: string | null;
        is_overdue: boolean;
    } | null;
    last_updated_at: string | null;
}

interface ProjectPassportOverviewProps {
    project: {
        id: number;
        name: string;
        statusLabel: string;
        statusClassName: string;
        regionName: string;
        projectTypeName: string;
    };
    summary: ProjectPassportSummary;
    canEdit: boolean;
    canDownload: boolean;
    canSeeOperationalDetails: boolean;
}

const healthStyles = {
    critical: {
        panel: 'border-red-200 bg-red-50',
        icon: 'bg-red-100 text-red-700',
        badge: 'bg-red-100 text-red-700',
        progress: 'bg-red-500',
    },
    warning: {
        panel: 'border-amber-200 bg-amber-50',
        icon: 'bg-amber-100 text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
        progress: 'bg-amber-500',
    },
    healthy: {
        panel: 'border-emerald-200 bg-emerald-50',
        icon: 'bg-emerald-100 text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-700',
        progress: 'bg-emerald-500',
    },
};

function formatDate(value: string | null): string {
    if (!value) return 'Жаңарту уақыты белгісіз';

    return new Intl.DateTimeFormat('kk-KZ', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatShortDate(value: string | null): string {
    if (!value) return 'Мерзімі көрсетілмеген';

    return new Intl.DateTimeFormat('kk-KZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

export default function ProjectPassportOverview({
    project,
    summary,
    canEdit,
    canDownload,
    canSeeOperationalDetails,
}: ProjectPassportOverviewProps) {
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
        'idle',
    );
    const healthStyle = healthStyles[summary.health.level];

    const copyProjectLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopyState('copied');
        } catch {
            setCopyState('error');
        }

        window.setTimeout(() => setCopyState('idle'), 2500);
    };

    const timelineLabel = !summary.timeline.has_dates
        ? 'Мерзім жоқ'
        : summary.timeline.is_overdue
          ? `${Math.abs(summary.timeline.days_remaining ?? 0)} күнге кешікті`
          : summary.timeline.days_remaining === 0
            ? 'Соңғы күн'
            : `${summary.timeline.days_remaining} күн қалды`;

    return (
        <section
            id="passport-overview"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none"
        >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1735] via-[#122752] to-[#1b3b73] px-5 py-6 text-white sm:px-7 sm:py-7">
                <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[#c8a44e]/15 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />

                <div className="relative">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
                        <Link
                            href="/investment-projects"
                            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Жобалар тізіміне қайту
                        </Link>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                                onClick={copyProjectLink}
                            >
                                {copyState === 'copied' ? (
                                    <Check className="mr-2 h-4 w-4" />
                                ) : (
                                    <ClipboardCopy className="mr-2 h-4 w-4" />
                                )}
                                {copyState === 'copied'
                                    ? 'Көшірілді'
                                    : copyState === 'error'
                                      ? 'Көшіру мүмкін болмады'
                                      : 'Сілтемені көшіру'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                                onClick={() => window.print()}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Басып шығару
                            </Button>
                            {canEdit && (
                                <Link
                                    href={`/investment-projects/${project.id}/edit?return_to=${encodeURIComponent(`/investment-projects/${project.id}`)}`}
                                >
                                    <Button
                                        size="sm"
                                        className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]"
                                    >
                                        <Edit3 className="mr-2 h-4 w-4" />
                                        Өңдеу
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                        <div className="max-w-4xl">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-white/80 uppercase">
                                    Жоба паспорты № {project.id}
                                </span>
                                <Badge
                                    className={`${project.statusClassName} border-0 px-2.5 py-1`}
                                >
                                    {project.statusLabel}
                                </Badge>
                            </div>
                            <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
                                {project.name}
                            </h1>
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-[#dec36e]" />
                                    {project.regionName}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4 text-[#dec36e]" />
                                    {project.projectTypeName}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-4 w-4 text-[#dec36e]" />
                                    Соңғы жаңарту:{' '}
                                    {formatDate(summary.last_updated_at)}
                                </span>
                            </div>
                        </div>

                        {canDownload && (
                            <a
                                href={`/investment-projects/${project.id}/passport`}
                                className="print:hidden"
                            >
                                <Button className="w-full bg-white text-[#0f1b3d] shadow-none hover:bg-slate-100 lg:w-auto">
                                    <Download className="mr-2 h-4 w-4" />
                                    Паспортты жүктеу
                                </Button>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Жол картасы
                        </span>
                        <ListChecks className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                        <p className="text-2xl font-bold text-slate-900">
                            {summary.progress_percent}%
                        </p>
                        <p className="text-xs text-slate-500">
                            {summary.tasks.completed}/{summary.tasks.total}{' '}
                            орындалды
                        </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{
                                width: `${summary.progress_percent}%`,
                            }}
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Күнтізбелік мерзім
                        </span>
                        <CalendarClock className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                        <p className="text-2xl font-bold text-slate-900">
                            {summary.timeline.elapsed_percent}%
                        </p>
                        <p
                            className={`text-right text-xs ${
                                summary.timeline.is_overdue
                                    ? 'font-semibold text-red-600'
                                    : 'text-slate-500'
                            }`}
                        >
                            {timelineLabel}
                        </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full rounded-full transition-all ${
                                summary.timeline.is_overdue
                                    ? 'bg-red-500'
                                    : 'bg-violet-500'
                            }`}
                            style={{
                                width: `${summary.timeline.elapsed_percent}%`,
                            }}
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Тәуекелдер
                        </span>
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                        <p className="text-2xl font-bold text-slate-900">
                            {canSeeOperationalDetails
                                ? summary.issues.open
                                : '—'}
                        </p>
                        <p className="text-right text-xs text-slate-500">
                            {canSeeOperationalDetails
                                ? `${summary.issues.critical} жоғары/сыни, ${summary.tasks.overdue} кешіккен іс`
                                : 'Қолжетімділік шектелген'}
                        </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                        {canSeeOperationalDetails &&
                        summary.issues.open === 0 &&
                        summary.tasks.overdue === 0 ? (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-emerald-700">
                                    Ашық тәуекел жоқ
                                </span>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <span className="text-slate-600">
                                    Бақылауды қажет етеді
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Паспорт толықтығы
                        </span>
                        <FileCheck2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                        <p className="text-2xl font-bold text-slate-900">
                            {summary.completeness.percent}%
                        </p>
                        <p className="text-xs text-slate-500">
                            {summary.completeness.completed}/
                            {summary.completeness.total} бөлім
                        </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                                width: `${summary.completeness.percent}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:p-6">
                <div className={`rounded-xl border p-4 ${healthStyle.panel}`}>
                    <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${healthStyle.icon}`}>
                            {summary.health.level === 'healthy' ? (
                                <Sparkles className="h-5 w-5" />
                            ) : (
                                <AlertTriangle className="h-5 w-5" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">
                                    Жобаның жалпы жағдайы
                                </p>
                                <Badge
                                    className={`${healthStyle.badge} border-0`}
                                >
                                    {summary.health.label}
                                </Badge>
                            </div>
                            <ul className="mt-2 space-y-1 text-sm text-slate-600">
                                {summary.health.reasons
                                    .slice(0, 3)
                                    .map((reason) => (
                                        <li
                                            key={reason}
                                            className="flex items-start gap-2"
                                        >
                                            <span
                                                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${healthStyle.progress}`}
                                            />
                                            {reason}
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Flag className="h-4 w-4 text-[#a9842f]" />
                        Келесі бақылау нүктесі
                    </div>
                    {summary.next_milestone ? (
                        <div className="mt-3">
                            <p className="line-clamp-2 text-sm font-medium text-slate-800">
                                {summary.next_milestone.title}
                            </p>
                            <p
                                className={`mt-1 text-xs ${
                                    summary.next_milestone.is_overdue
                                        ? 'font-semibold text-red-600'
                                        : 'text-slate-500'
                                }`}
                            >
                                {formatShortDate(
                                    summary.next_milestone.due_date,
                                )}
                            </p>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-slate-500">
                            Белсенді бақылау нүктесі белгіленбеген.
                        </p>
                    )}
                </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto border-t border-slate-200 px-4 py-2 print:hidden">
                {[
                    ['#project-details', 'Жалпы мәлімет'],
                    ['#project-description', 'Сипаттама'],
                    ['#project-roadmap', 'Жол картасы'],
                    ['#project-team', 'Команда'],
                    ['#project-actions', 'Құжаттар мен әрекеттер'],
                ].map(([href, label]) => (
                    <a
                        key={href}
                        href={href}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0f1b3d]"
                    >
                        {label}
                    </a>
                ))}
            </nav>
        </section>
    );
}
