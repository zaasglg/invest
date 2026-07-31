import type { LucideIcon } from 'lucide-react';
import { Car, Droplets, Flame, TrainFront, Wifi, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface InfrastructureDetails {
    available?: boolean;
    capacity?: string;
    type?: string;
    distance?: string;
}

export interface InfrastructureData {
    electricity?: InfrastructureDetails;
    gas?: InfrastructureDetails;
    water?: InfrastructureDetails;
    roads?: InfrastructureDetails;
    railway?: InfrastructureDetails;
    internet?: InfrastructureDetails;
}

type UsageEntry = { total?: number; used?: number; remaining?: number };

type Props = {
    infrastructure: InfrastructureData;
    usage?: Record<string, UsageEntry>;
    className?: string;
};

type MeteredResource = 'electricity' | 'gas' | 'water';

const INFRA_ITEMS: {
    key: keyof InfrastructureData;
    name: string;
    icon: LucideIcon;
}[] = [
    { key: 'electricity', name: 'Электрмен жабдықтау', icon: Zap },
    { key: 'gas', name: 'Газ', icon: Flame },
    { key: 'water', name: 'Сумен жабдықтау', icon: Droplets },
    { key: 'roads', name: 'Жолдар', icon: Car },
    { key: 'railway', name: 'Теміржол тұйығы', icon: TrainFront },
    { key: 'internet', name: 'Интернет', icon: Wifi },
];

const METERED_KEYS: MeteredResource[] = ['electricity', 'gas', 'water'];

const RESOURCE_UNITS: Record<MeteredResource, string> = {
    electricity: 'кВт',
    gas: 'м³/сағ',
    water: 'м³/тәу',
};

function parseCapacity(capacity: string | undefined, key: MeteredResource) {
    if (!capacity) return 0;

    const value = Number(capacity.replace(',', '.').match(/[\d.]+/)?.[0] ?? 0);
    if (!Number.isFinite(value)) return 0;

    return key === 'electricity' && /мвт/i.test(capacity)
        ? value * 1000
        : value;
}

function formatAmount(value: number, unit: string) {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} ${unit}`;
}

function getLoadColor(percentage: number) {
    if (percentage >= 85) return 'bg-red-400';
    if (percentage >= 60) return 'bg-gold';
    return 'bg-emerald-500';
}

function AvailabilityBadge({ available }: { available?: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold',
                available
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700',
            )}
        >
            <span
                className={cn(
                    'size-1.5 rounded-full',
                    available ? 'bg-emerald-500' : 'bg-amber-500',
                )}
            />
            {available ? 'Қолжетімді' : 'Жоқ'}
        </span>
    );
}

function CapacityMeter({
    resourceKey,
    details,
    usage,
}: {
    resourceKey: MeteredResource;
    details: InfrastructureDetails;
    usage?: UsageEntry;
}) {
    const unit = RESOURCE_UNITS[resourceKey];
    const parsedTotal = parseCapacity(details.capacity, resourceKey);
    const total =
        parsedTotal || (usage?.used ?? 0) + (usage?.remaining ?? 0) || 0;
    const used = Math.max(
        0,
        usage?.used ??
            (usage?.remaining !== undefined ? total - usage.remaining : 0),
    );
    const remaining = Math.max(0, usage?.remaining ?? total - used);
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

    return (
        <div className="contents">
            <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                        Жүктеме
                    </span>
                    <span className="text-xs font-extrabold text-navy tabular-nums">
                        {percentage}%
                    </span>
                </div>
                <div className="h-2 overflow-hidden rounded-sm bg-slate-100">
                    <div
                        className={cn(
                            'h-full rounded-sm transition-[width] duration-500',
                            getLoadColor(percentage),
                        )}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 lg:border-l lg:border-slate-100 lg:pl-5">
                <div>
                    <dt className="text-[10px] font-bold text-slate-400 uppercase">
                        Жалпы
                    </dt>
                    <dd className="mt-1 text-xs font-bold whitespace-nowrap text-navy tabular-nums">
                        {formatAmount(total, unit)}
                    </dd>
                </div>
                <div>
                    <dt className="text-[10px] font-bold text-slate-400 uppercase">
                        Қолданылды
                    </dt>
                    <dd className="mt-1 text-xs font-bold whitespace-nowrap text-amber-700 tabular-nums">
                        {formatAmount(used, unit)}
                    </dd>
                </div>
                <div>
                    <dt className="text-[10px] font-bold text-slate-400 uppercase">
                        Қалды
                    </dt>
                    <dd className="mt-1 text-xs font-bold whitespace-nowrap text-emerald-700 tabular-nums">
                        {formatAmount(remaining, unit)}
                    </dd>
                </div>
            </dl>
        </div>
    );
}

/**
 * Unified infrastructure summary for SEZ / industrial / prom zone pages:
 * metered utilities (electricity, gas, water) render an inline load meter,
 * the rest render as compact availability cards.
 */
export default function InfrastructureList({
    infrastructure,
    usage = {},
    className,
}: Props) {
    const items = INFRA_ITEMS.map((item) => ({
        ...item,
        details: infrastructure[item.key],
    })).filter(
        (item) => item.details && item.details.available !== undefined,
    ) as {
        key: keyof InfrastructureData;
        name: string;
        icon: LucideIcon;
        details: InfrastructureDetails;
    }[];

    if (items.length === 0) return null;

    const metered = items.filter(
        (item) =>
            METERED_KEYS.includes(item.key as MeteredResource) &&
            item.details.available,
    );
    const simple = items.filter((item) => !metered.includes(item));

    return (
        <section className={className}>
            <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                    <p className="text-[11px] font-bold text-gold-dark uppercase">
                        Қуат және қолжетімділік
                    </p>
                    <h3 className="mt-1 text-base font-extrabold text-navy">
                        Инфрақұрылым
                    </h3>
                </div>
                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                    {items.filter((item) => item.details.available).length}/
                    {items.length} қолжетімді
                </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white">
                {metered.map((item, index) => (
                    <article
                        key={item.key}
                        className={cn(
                            'grid gap-4 p-4 transition-colors hover:bg-slate-50/60 lg:grid-cols-[minmax(220px,0.8fr)_minmax(180px,1fr)_minmax(330px,1.1fr)] lg:items-center',
                            index < metered.length - 1 &&
                                'border-b border-slate-100',
                        )}
                    >
                        <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
                            <span className="flex min-w-0 items-center gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-navy">
                                    <item.icon className="size-[18px]" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold text-navy">
                                        {item.name}
                                    </span>
                                    {item.details.capacity && (
                                        <span className="mt-0.5 block text-xs font-medium text-slate-400 tabular-nums">
                                            Қуаттылығы: {item.details.capacity}
                                        </span>
                                    )}
                                </span>
                            </span>
                            <AvailabilityBadge
                                available={item.details.available}
                            />
                        </div>
                        <CapacityMeter
                            resourceKey={item.key as MeteredResource}
                            details={item.details}
                            usage={usage[item.key]}
                        />
                    </article>
                ))}

                {simple.length > 0 && (
                    <div className="grid border-t border-slate-100 sm:grid-cols-3">
                        {simple.map((item) => {
                            const detail =
                                item.details.capacity ||
                                item.details.type ||
                                item.details.distance ||
                                '';

                            return (
                                <article
                                    key={item.key}
                                    className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-navy">
                                            <item.icon className="size-4" />
                                        </span>
                                        <span>
                                            <span className="block truncate text-sm font-bold text-navy">
                                                {item.name}
                                            </span>
                                            {detail && (
                                                <span className="mt-0.5 block text-xs text-slate-400">
                                                    {detail}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <AvailabilityBadge
                                        available={item.details.available}
                                    />
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
