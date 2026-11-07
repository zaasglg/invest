import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CalendarClock,
    Check,
    ChevronDown,
    ClipboardCopy,
    Download,
    Edit3,
    FileCheck2,
    Flag,
    ListChecks,
    MapPin,
    MoreHorizontal,
    Printer,
    ShieldAlert,
    Users,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { attractionStageLabel } from '@/lib/project-attraction';
import * as projectRoutes from '@/routes/investment-projects';

export interface ProjectPassportSummary {
    workflow?: 'attraction' | 'roadmap';
    attraction?: {
        total: number;
        open: number;
        completed: number;
        pending_review: number;
        overdue: number;
    };
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
        kind?: 'attraction' | 'task' | 'resume';
        responsible_id?: number | null;
        responsible_name?: string | null;
        status?: string | null;
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
        curatorName?: string;
    };
    summary: ProjectPassportSummary;
    canEdit: boolean;
    canDownload: boolean;
    canSeeOperationalDetails: boolean;
    isPlanned?: boolean;
    isLaunched?: boolean;
    isArchived?: boolean;
    attractionStage?: string | null;
    onOpenNextAction?: () => void;
}

function dateLabel(value: string | null): string {
    if (!value) return 'Мерзімі белгіленбеген';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Мерзімі белгіленбеген';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Qyzylorda',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).formatToParts(date);
    const part = (type: string) =>
        parts.find((item) => item.type === type)?.value;
    return `${part('day')}.${part('month')}.${part('year')}`;
}

export default function ProjectPassportOverview({
    project,
    summary,
    canEdit,
    canDownload,
    canSeeOperationalDetails,
    isPlanned = false,
    isLaunched = false,
    isArchived = false,
    attractionStage,
    onOpenNextAction,
}: ProjectPassportOverviewProps) {
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
        'idle',
    );
    const next = canSeeOperationalDetails ? summary.next_milestone : null;
    const overdue = isPlanned
        ? Math.max(summary.attraction?.overdue ?? 0, next?.is_overdue ? 1 : 0)
        : summary.tasks.overdue;
    const risks = summary.issues.open + overdue;
    const closedLead = isPlanned && attractionStage === 'declined';
    const workTarget = isPlanned ? '#project-attraction' : '#project-roadmap';
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopyState('copied');
        } catch {
            setCopyState('error');
        }
        window.setTimeout(() => setCopyState('idle'), 2500);
    };
    const timelineLabel = isLaunched
        ? 'Жоба іске қосылған'
        : summary.timeline.is_overdue
          ? `${Math.abs(summary.timeline.days_remaining ?? 0)} күнге кешікті`
          : (summary.timeline.days_remaining ?? 0) <= 0
            ? 'Жоспарланған мерзім аяқталды'
            : `${summary.timeline.days_remaining} күн қалды`;

    return (
        <section
            id="passport-overview"
            className="min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none"
        >
            <div className="bg-gradient-to-br from-[#0b1735] via-[#122752] to-[#1b3b73] p-5 text-white sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <Link
                        href={projectRoutes.index.url()}
                        className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white"
                    >
                        <ArrowLeft className="size-4" /> Жобаларға қайту
                    </Link>
                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <Button
                                asChild
                                size="sm"
                                className="bg-[#c8a44e] text-white hover:bg-[#b8943e]"
                            >
                                <Link
                                    href={projectRoutes.edit.url(project.id, {
                                        query: {
                                            return_to: projectRoutes.show.url(
                                                project.id,
                                            ),
                                        },
                                    })}
                                >
                                    <Edit3 className="mr-2 size-4" />
                                    Өңдеу
                                </Link>
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                                >
                                    <MoreHorizontal className="mr-2 size-4" />
                                    Қосымша
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60">
                                <DropdownMenuItem onSelect={copyLink}>
                                    {copyState === 'copied' ? (
                                        <Check />
                                    ) : (
                                        <ClipboardCopy />
                                    )}
                                    {copyState === 'copied'
                                        ? 'Сілтеме көшірілді'
                                        : copyState === 'error'
                                          ? 'Көшіру мүмкін болмады'
                                          : 'Сілтемені көшіру'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => window.print()}
                                >
                                    <Printer />
                                    Басып шығару
                                </DropdownMenuItem>
                                {canDownload && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <a
                                                href={projectRoutes.passport.url(
                                                    project.id,
                                                )}
                                            >
                                                <Download />
                                                Паспортты жүктеу
                                            </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <a
                                                href={projectRoutes.presentation.url(
                                                    project.id,
                                                )}
                                            >
                                                <Download />
                                                Презентацияны жүктеу
                                            </a>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-white/60">
                        Жоба №{project.id}
                    </span>
                    <Badge
                        className={`${project.statusClassName} border-0 whitespace-normal`}
                    >
                        {project.statusLabel}
                    </Badge>
                    {isArchived && (
                        <Badge className="border-white/20 bg-white/10 text-white">
                            Архив · тек көру
                        </Badge>
                    )}
                </div>
                <h1 className="text-2xl leading-tight font-bold [overflow-wrap:anywhere] break-words text-white sm:text-3xl">
                    {project.name}
                </h1>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
                    <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4 shrink-0 text-[#dec36e]" />
                        {project.regionName}
                    </span>
                    {project.curatorName && (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Users className="size-4 shrink-0 text-[#dec36e]" />
                            <span className="break-words">
                                Куратор: {project.curatorName}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            {canSeeOperationalDetails && (
                <div className="border-b border-slate-200 bg-[#c8a44e]/5 p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#9b782c] uppercase">
                                <Flag className="size-4" />
                                {isArchived
                                    ? 'Сақталған жұмыс тарихы'
                                    : closedLead
                                      ? 'Инвестормен жұмыс аяқталды'
                                      : 'Қазір не істеу керек?'}
                            </p>
                            <p className="mt-2 text-base font-semibold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                {isArchived
                                    ? 'Жоба архивте. Өзгерту үшін алдымен архивтен шығарыңыз.'
                                    : closedLead
                                      ? 'Инвестордың бас тартуы тіркелген.'
                                      : (next?.title ??
                                        (isPlanned
                                            ? 'Келесі іс-шараны белгілеңіз'
                                            : 'Белсенді тапсырма жоқ'))}
                            </p>
                            {next && !isArchived && !closedLead && (
                                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Users className="size-4 shrink-0" />
                                        {next.responsible_name ||
                                            'Жауапты адам көрсетілмеген'}
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1.5 ${next.is_overdue ? 'font-medium text-red-600' : ''}`}
                                    >
                                        <CalendarClock className="size-4 shrink-0" />
                                        {dateLabel(next.due_date)}
                                        {next.is_overdue
                                            ? ' · мерзімі өткен'
                                            : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            className="shrink-0 border-[#c8a44e]/40 bg-white text-[#0f1b3d] hover:bg-[#c8a44e]/10"
                        >
                            <a
                                href={workTarget}
                                onClick={
                                    next && onOpenNextAction
                                        ? (event) => {
                                              event.preventDefault();
                                              onOpenNextAction();
                                          }
                                        : undefined
                                }
                            >
                                {isArchived || closedLead
                                    ? 'Тарихты қарау'
                                    : next
                                      ? 'Жұмысты ашу'
                                      : 'Жұмыстарға өту'}
                                <ArrowRight className="ml-2 size-4" />
                            </a>
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="p-5">
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <ListChecks className="size-4" />
                        {isPlanned
                            ? 'Инвестор тарту сатысы'
                            : 'Жол картасының орындалуы'}
                    </p>
                    <p
                        className={`mt-2 font-semibold text-[#0f1b3d] ${isPlanned ? 'text-sm' : 'text-2xl'}`}
                    >
                        {isPlanned
                            ? attractionStageLabel(attractionStage)
                            : canSeeOperationalDetails
                              ? `${summary.progress_percent}%`
                              : '—'}
                    </p>
                    {canSeeOperationalDetails && (
                        <p className="mt-2 text-xs text-slate-500">
                            {isPlanned
                                ? `Орындалды: ${summary.attraction?.completed ?? 0} · Тексеруде: ${summary.attraction?.pending_review ?? 0}`
                                : `${summary.tasks.completed}/${summary.tasks.total} тапсырма орындалды`}
                        </p>
                    )}
                </div>
                <div className="p-5">
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <ShieldAlert className="size-4" />
                        Ашық тәуекелдер
                    </p>
                    <p
                        className={`mt-2 text-2xl font-semibold ${risks > 0 ? 'text-amber-700' : 'text-[#0f1b3d]'}`}
                    >
                        {canSeeOperationalDetails ? risks : '—'}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        {canSeeOperationalDetails
                            ? `${summary.issues.open} ашық мәселе · ${overdue} кешіккен жұмыс`
                            : 'Жұмыс мәліметтері шектеулі'}
                    </p>
                </div>
                <div className="p-5">
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <FileCheck2 className="size-4" />
                        {isPlanned
                            ? 'Осы кезеңге қажетті деректер'
                            : 'Паспорт деректері'}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f1b3d]">
                        {summary.completeness.percent}%
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        {summary.completeness.completed}/
                        {summary.completeness.total} дерек толтырылған
                    </p>
                </div>
            </div>
            {(summary.completeness.missing.length > 0 ||
                (canSeeOperationalDetails && risks > 0) ||
                (!isPlanned && summary.timeline.has_dates)) && (
                <details className="group border-t border-slate-100 px-5 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-slate-600">
                        Толықтық пен мерзім туралы
                        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 py-3 text-sm text-slate-600">
                        {canSeeOperationalDetails && risks > 0 && (
                            <p>{summary.health.reasons.join(' · ')}</p>
                        )}
                        {summary.completeness.missing.length > 0 && (
                            <p>
                                Толтыру қажет:{' '}
                                {summary.completeness.missing.join(', ')}.
                            </p>
                        )}
                        {!isPlanned && summary.timeline.has_dates && (
                            <p>{timelineLabel}</p>
                        )}
                        <p className="text-xs text-slate-400">
                            Соңғы жаңарту: {dateLabel(summary.last_updated_at)}
                        </p>
                    </div>
                </details>
            )}
        </section>
    );
}
