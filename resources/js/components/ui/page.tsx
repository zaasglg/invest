/**
 * Turkistan Invest — Design System
 *
 * Shared design primitives for building pages consistently.
 * Import these in any page and compose layouts effortlessly.
 *
 * Usage example:
 *   import { PageContainer, PageHeader, StatCard, FilterPanel } from '@/components/ui/page';
 *
 *   <PageContainer>
 *     <PageHeader title="Projects" action={<Button>Create</Button>} />
 *     <StatCard label="Total" value="42" />
 *     <FilterPanel />
 *     <DataTable />
 *   </PageContainer>
 */

import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/* ─── PAGE CONTAINER ──────────────────────────────────────────────────── */
/** Full-width padded container used as the root of every page body. */
export function PageContainer({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8',
                className,
            )}
        >
            {children}
        </div>
    );
}

/* ─── PAGE HEADER ─────────────────────────────────────────────────────── */
/** Title bar with optional subtitle, badge, and right-aligned action slot. */
export function PageHeader({
    title,
    subtitle,
    badge,
    action,
    className,
}: {
    title: string;
    subtitle?: string;
    badge?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
        >
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    <h1 className="truncate text-2xl font-bold tracking-tight text-[#0f1b3d]">
                        {title}
                    </h1>
                    {badge}
                </div>
                {subtitle && (
                    <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
                )}
            </div>
            {action && <div className="mt-3 shrink-0 sm:mt-0">{action}</div>}
        </div>
    );
}

/* ─── STAT CARD ───────────────────────────────────────────────────────── */
/** Small metric card for KPI rows. */
export function StatCard({
    label,
    value,
    description,
    icon,
    trend,
    className,
}: {
    label: string;
    value: React.ReactNode;
    description?: string;
    icon?: React.ReactNode;
    trend?: { value: string; positive: boolean };
    className?: string;
}) {
    return (
        <div
            className={cn(
                'rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
                className,
            )}
        >
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        {label}
                    </p>
                    <p className="mt-1.5 truncate text-2xl font-extrabold text-[#0f1b3d]">
                        {value}
                    </p>
                    {description && (
                        <p className="mt-1 text-xs text-gray-400">
                            {description}
                        </p>
                    )}
                    {trend && (
                        <p
                            className={cn(
                                'mt-1 text-xs font-semibold',
                                trend.positive
                                    ? 'text-emerald-600'
                                    : 'text-red-500',
                            )}
                        >
                            {trend.positive ? '↑' : '↓'} {trend.value}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0f1b3d]/5 text-[#0f1b3d]">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── FILTER PANEL ────────────────────────────────────────────────────── */
/** Collapsible filter panel with consistent styling. */
export function FilterPanel({
    open,
    onToggle,
    children,
    className,
}: {
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'rounded-xl border border-gray-100 bg-white shadow-sm',
                className,
            )}
        >
            <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-[#0f1b3d]"
                onClick={onToggle}
                aria-expanded={open}
            >
                <span className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#0f1b3d]/5 text-[10px] font-bold text-[#0f1b3d]">
                        F
                    </span>
                    Фильтры
                </span>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 text-gray-400 transition-transform',
                        open && 'rotate-180',
                    )}
                />
            </button>
            {open && (
                <div className="border-t border-gray-50 px-5 pb-5 pt-4">
                    {children}
                </div>
            )}
        </div>
    );
}

/* ─── DATA CARD ───────────────────────────────────────────────────────── */
/** Wrapper for data sections (tables, lists). */
export function DataCard({
    children,
    className,
    noPadding,
}: {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}) {
    return (
        <div
            className={cn(
                'overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm',
                !noPadding && 'p-5',
                className,
            )}
        >
            {children}
        </div>
    );
}

/* ─── EMPTY STATE ─────────────────────────────────────────────────────── */
/** Placeholder for empty data. */
export function EmptyState({
    icon,
    title = 'Нет данных',
    description,
    action,
}: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            {icon && (
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                    {icon}
                </div>
            )}
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-gray-500">
                    {description}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

/* ─── SECTION DIVIDER ─────────────────────────────────────────────────── */
/** Labeled section inside a form or detail page. */
export function SectionHeading({
    title,
    description,
    action,
    className,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex items-start justify-between border-b border-gray-100 pb-4',
                className,
            )}
        >
            <div>
                <h3 className="text-base font-bold text-[#0f1b3d]">{title}</h3>
                {description && (
                    <p className="mt-0.5 text-sm text-gray-500">
                        {description}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

/* ─── FORM SECTION ────────────────────────────────────────────────────── */
/** Card wrapper for form sections with title. */
export function FormCard({
    title,
    description,
    children,
    className,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'rounded-xl border border-gray-100 bg-white p-6 shadow-sm',
                className,
            )}
        >
            {title && (
                <div className="mb-5 border-b border-gray-50 pb-4">
                    <h3 className="text-base font-bold text-[#0f1b3d]">
                        {title}
                    </h3>
                    {description && (
                        <p className="mt-0.5 text-sm text-gray-500">
                            {description}
                        </p>
                    )}
                </div>
            )}
            {children}
        </div>
    );
}

/* ─── STATUS BADGE ────────────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, string> = {
    plan: 'bg-blue-50 text-blue-700 ring-blue-600/10',
    implementation: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    launched: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    suspended: 'bg-red-50 text-red-700 ring-red-600/10',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    developing: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    new: 'bg-blue-50 text-blue-700 ring-blue-600/10',
    in_progress: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    done: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    rejected: 'bg-red-50 text-red-700 ring-red-600/10',
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
};

export function StatusBadge({
    status,
    label,
    className,
}: {
    status: string;
    label: string;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-700 ring-gray-600/10',
                className,
            )}
        >
            {label}
        </span>
    );
}

/* ─── ACTION BUTTON VARIANTS ──────────────────────────────────────────── */
/** Pre-styled primary action link (gold CTA style). */
export function PrimaryActionLink({
    href,
    children,
    className,
}: {
    href: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-[#0f1b3d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a2d5e] hover:shadow-md',
                className,
            )}
        >
            {children}
        </Link>
    );
}
