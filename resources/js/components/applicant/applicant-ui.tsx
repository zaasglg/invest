import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Tone = 'navy' | 'sky' | 'amber' | 'emerald' | 'violet';

const metricTones: Record<
    Tone,
    { icon: string; line: string; glow: string; value: string }
> = {
    navy: {
        icon: 'bg-navy text-white shadow-navy/20',
        line: 'from-navy via-navy-light to-gold',
        glow: 'bg-navy/5',
        value: 'text-navy',
    },
    sky: {
        icon: 'bg-sky-600 text-white shadow-sky-600/20',
        line: 'from-sky-500 via-cyan-500 to-sky-300',
        glow: 'bg-sky-500/8',
        value: 'text-sky-800',
    },
    amber: {
        icon: 'bg-amber-500 text-white shadow-amber-500/20',
        line: 'from-amber-500 via-gold to-amber-300',
        glow: 'bg-amber-500/10',
        value: 'text-amber-800',
    },
    emerald: {
        icon: 'bg-emerald-600 text-white shadow-emerald-600/20',
        line: 'from-emerald-600 via-teal-500 to-emerald-300',
        glow: 'bg-emerald-500/8',
        value: 'text-emerald-800',
    },
    violet: {
        icon: 'bg-violet-600 text-white shadow-violet-600/20',
        line: 'from-violet-600 via-indigo-500 to-violet-300',
        glow: 'bg-violet-500/8',
        value: 'text-violet-800',
    },
};

const sectionTones: Record<Tone, { icon: string; wash: string; line: string }> =
    {
        navy: {
            icon: 'bg-navy text-white',
            wash: 'from-navy/[0.07] via-white to-white',
            line: 'bg-navy',
        },
        sky: {
            icon: 'bg-sky-600 text-white',
            wash: 'from-sky-50 via-white to-white',
            line: 'bg-sky-500',
        },
        amber: {
            icon: 'bg-gold text-white',
            wash: 'from-amber-50 via-white to-white',
            line: 'bg-gold',
        },
        emerald: {
            icon: 'bg-emerald-600 text-white',
            wash: 'from-emerald-50 via-white to-white',
            line: 'bg-emerald-500',
        },
        violet: {
            icon: 'bg-violet-600 text-white',
            wash: 'from-violet-50 via-white to-white',
            line: 'bg-violet-500',
        },
    };

export function ApplicantHero({
    eyebrow,
    title,
    subtitle,
    icon: Icon,
    badge,
    action,
    className,
}: {
    eyebrow: string;
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    badge?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <header
            className={cn(
                'relative isolate overflow-hidden rounded-[28px] border border-navy/10 bg-gradient-to-br from-[#08132d] via-navy to-[#1c3970] px-5 py-6 text-white shadow-[0_24px_70px_-38px_rgba(8,14,32,0.9)] sm:px-8 sm:py-8',
                className,
            )}
        >
            <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full border border-gold/15 bg-gold/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-36 left-1/3 size-72 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.055]" />
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-light via-gold to-gold-dark" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-4xl min-w-0">
                    <div className="mb-4 flex flex-wrap items-center gap-2.5">
                        <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-gold-light shadow-inner backdrop-blur-sm">
                            <Icon className="size-5" />
                        </span>
                        <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-gold-light uppercase">
                            {eyebrow}
                        </span>
                        {badge}
                    </div>
                    <h1 className="text-2xl leading-tight font-extrabold text-white sm:text-3xl lg:text-[2rem]">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68 sm:text-[15px]">
                            {subtitle}
                        </p>
                    )}
                </div>
                {action && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                        {action}
                    </div>
                )}
            </div>
        </header>
    );
}

export function ApplicantMetricCard({
    label,
    value,
    description,
    icon: Icon,
    tone = 'navy',
    className,
}: {
    label: string;
    value: ReactNode;
    description: string;
    icon: LucideIcon;
    tone?: Tone;
    className?: string;
}) {
    const styles = metricTones[tone];

    return (
        <div
            className={cn(
                'group relative min-h-36 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,27,61,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_55px_-34px_rgba(15,27,61,0.55)]',
                className,
            )}
        >
            <div
                className={cn(
                    'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
                    styles.line,
                )}
            />
            <div
                className={cn(
                    'pointer-events-none absolute -right-8 -bottom-10 size-32 rounded-full transition-transform duration-500 group-hover:scale-110',
                    styles.glow,
                )}
            />
            <div className="relative flex h-full items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-[0.11em] text-slate-400 uppercase">
                        {label}
                    </p>
                    <p
                        className={cn(
                            'mt-2 text-3xl leading-none font-extrabold tabular-nums',
                            styles.value,
                        )}
                    >
                        {value}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                </div>
                <span
                    className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3',
                        styles.icon,
                    )}
                >
                    <Icon className="size-5" />
                </span>
            </div>
        </div>
    );
}

export function ApplicantSectionCard({
    title,
    description,
    icon: Icon,
    tone = 'navy',
    action,
    children,
    className,
}: {
    title: string;
    description?: string;
    icon: LucideIcon;
    tone?: Tone;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    const styles = sectionTones[tone];

    return (
        <section
            className={cn(
                'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-40px_rgba(15,27,61,0.65)]',
                className,
            )}
        >
            <div className={cn('absolute inset-y-0 left-0 w-1', styles.line)} />
            <div
                className={cn(
                    'flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
                    styles.wash,
                )}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
                            styles.icon,
                        )}
                    >
                        <Icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="font-bold text-navy">{title}</h2>
                        {description && (
                            <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:text-sm">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}
