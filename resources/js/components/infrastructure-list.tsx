import type { LucideIcon } from 'lucide-react';
import { Car, Droplets, Flame, TrainFront, Wifi, Zap } from 'lucide-react';
import { useState } from 'react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

type InfrastructureConsumer = {
    id: number | null;
    name: string;
    capacity: string | null;
    value: number;
    status: string | null;
};

type UsageEntry = {
    total?: number;
    used?: number;
    remaining?: number;
    consumers?: InfrastructureConsumer[];
};

type Props = {
    infrastructure: InfrastructureData;
    usage?: Record<string, UsageEntry>;
    className?: string;
};

type MeteredResource = 'electricity' | 'gas' | 'water';

type InfrastructureItem = {
    key: keyof InfrastructureData;
    name: string;
    icon: LucideIcon;
    details: InfrastructureDetails;
};

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

const RESOURCE_STYLES: Record<
    MeteredResource,
    { line: string; glow: string; icon: string }
> = {
    electricity: {
        line: '#d8b84e',
        glow: 'rgba(216, 184, 78, 0.34)',
        icon: 'bg-amber-100 text-amber-700',
    },
    gas: {
        line: '#71c98d',
        glow: 'rgba(113, 201, 141, 0.34)',
        icon: 'bg-emerald-100 text-emerald-700',
    },
    water: {
        line: '#63b8e8',
        glow: 'rgba(99, 184, 232, 0.34)',
        icon: 'bg-sky-100 text-sky-700',
    },
};

const SIMPLE_RESOURCE_STYLES: Record<
    'roads' | 'railway' | 'internet',
    { line: string; icon: string }
> = {
    roads: {
        line: '#aeb8c7',
        icon: 'bg-slate-200 text-slate-600',
    },
    railway: {
        line: '#8f87ef',
        icon: 'bg-indigo-100 text-indigo-700',
    },
    internet: {
        line: '#65c8db',
        icon: 'bg-cyan-100 text-cyan-700',
    },
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

function UsageLineChart({
    color,
    glow,
    resourceKey,
    used,
    unit,
}: {
    color: string;
    glow: string;
    resourceKey: MeteredResource;
    used: number;
    unit: string;
}) {
    const chartPaths: Record<MeteredResource, string> = {
        electricity:
            'M4 91 C20 44 36 46 54 55 C77 68 88 70 102 38 C116 8 131 24 145 50 C161 78 176 69 185 25 C190 9 199 6 212 3',
        gas: 'M4 78 C22 67 34 30 54 47 C75 65 84 81 103 51 C121 22 133 31 146 45 C161 61 174 58 184 24 C191 6 200 8 212 12',
        water: 'M4 84 C24 78 34 54 55 58 C76 61 87 35 104 39 C124 45 133 77 151 59 C169 42 177 18 190 26 C199 31 204 17 212 8',
    };
    const markers: Record<MeteredResource, { x: number; y: number }> = {
        electricity: { x: 122, y: 22 },
        gas: { x: 112, y: 38 },
        water: { x: 151, y: 59 },
    };
    const marker = markers[resourceKey];

    return (
        <div
            aria-label={`Қолданылған қуат: ${formatAmount(used, unit)}`}
            className="relative h-24 w-full"
            role="img"
        >
            <svg
                aria-hidden="true"
                className="size-full overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 216 104"
            >
                <defs>
                    <linearGradient
                        id={`usage-fade-${resourceKey}`}
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                    >
                        <stop offset="0" stopColor={color} stopOpacity="0.22" />
                        <stop offset="1" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                    <filter id={`usage-glow-${resourceKey}`}>
                        <feGaussianBlur result="blur" stdDeviation="2.4" />
                    </filter>
                </defs>
                <path
                    className="infrastructure-widget-area"
                    d={`${chartPaths[resourceKey]} L212 104 L4 104 Z`}
                    fill={`url(#usage-fade-${resourceKey})`}
                />
                <path
                    d={chartPaths[resourceKey]}
                    fill="none"
                    filter={`url(#usage-glow-${resourceKey})`}
                    stroke={glow}
                    strokeWidth="7"
                />
                <path
                    className="infrastructure-widget-line"
                    d={chartPaths[resourceKey]}
                    fill="none"
                    pathLength="1"
                    stroke={color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                />
            </svg>
            <span
                aria-hidden="true"
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                    left: `${(marker.x / 216) * 100}%`,
                    top: `${(marker.y / 104) * 100}%`,
                }}
            >
                <span className="infrastructure-widget-marker relative block size-3.5 rounded-full border-[3px] border-white bg-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.2)]">
                    <span
                        className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{ backgroundColor: color }}
                    />
                </span>
            </span>
            <div
                className="infrastructure-widget-tooltip absolute -translate-x-1/2 rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-[8px] font-bold whitespace-nowrap text-slate-700 shadow-sm backdrop-blur-md"
                style={{
                    left: `${(marker.x / 216) * 100}%`,
                    top: `${Math.min(78, (marker.y / 104) * 100 + 12)}%`,
                }}
            >
                {formatAmount(used, unit)}
            </div>
        </div>
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
    const total = Math.max(
        parsedTotal,
        usage?.total ?? 0,
        (usage?.used ?? 0) + (usage?.remaining ?? 0),
    );
    const used = Math.max(
        0,
        usage?.used ??
            (usage?.remaining !== undefined ? total - usage.remaining : 0),
    );
    const remaining = Math.max(0, usage?.remaining ?? total - used);
    const rawPercentage = total > 0 ? Math.round((used / total) * 100) : 0;
    const percentage = Math.min(100, rawPercentage);
    const styles = RESOURCE_STYLES[resourceKey];

    return (
        <div>
            <UsageLineChart
                color={styles.line}
                glow={styles.glow}
                resourceKey={resourceKey}
                unit={unit}
                used={used}
            />
            <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                    <p className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                        Жүктеме
                    </p>
                    <p className="mt-1 text-5xl leading-none font-medium tracking-[-0.06em] text-navy tabular-nums">
                        {rawPercentage > 100 ? '100+' : percentage}
                        <span className="ml-0.5 text-2xl text-slate-400">
                            %
                        </span>
                    </p>
                </div>
                <div className="mb-1 text-right">
                    <p className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                        Қалды
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-700 tabular-nums">
                        {formatAmount(remaining, unit)}
                    </p>
                </div>
            </div>
        </div>
    );
}

function InfrastructureConsumersDialog({
    item,
    usage,
    open,
    onOpenChange,
}: {
    item: InfrastructureItem | null;
    usage?: UsageEntry;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!item) return null;

    const consumers = usage?.consumers ?? [];
    const isMetered = METERED_KEYS.includes(item.key as MeteredResource);
    const resourceKey = isMetered ? (item.key as MeteredResource) : null;
    const accent = resourceKey
        ? RESOURCE_STYLES[resourceKey].line
        : (SIMPLE_RESOURCE_STYLES[
              item.key as keyof typeof SIMPLE_RESOURCE_STYLES
          ]?.line ?? '#aeb8c7');
    const total = usage?.total ?? 0;

    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent className="max-h-[90vh] gap-0 overflow-hidden rounded-[32px] border border-white/80 bg-white/95 p-0 shadow-[0_50px_140px_-32px_rgba(15,23,42,0.5)] backdrop-blur-2xl lg:max-w-5xl [&>button]:top-7 [&>button]:right-7 [&>button]:flex [&>button]:size-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-slate-100/80 [&>button]:text-slate-500 [&>button]:opacity-100 [&>button]:transition-colors [&>button]:hover:bg-slate-200 [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0">
                <DialogHeader className="relative overflow-hidden border-b border-slate-200/70 px-7 pt-8 pb-7 text-left sm:px-10 sm:pt-10 sm:pb-8">
                    <div
                        className="pointer-events-none absolute -top-32 -left-20 size-72 rounded-full opacity-[0.09] blur-3xl"
                        style={{ backgroundColor: accent }}
                    />
                    <div className="relative max-w-3xl pr-12">
                        <div
                            className="mb-4 h-0.5 w-10 rounded-full"
                            style={{ backgroundColor: accent }}
                        />
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase">
                                Инфрақұрылымды пайдаланатын жобалар
                            </p>
                            <DialogTitle className="mt-2 text-3xl leading-none font-extrabold tracking-[-0.04em] text-navy sm:text-4xl">
                                {item.name}
                            </DialogTitle>
                            <DialogDescription className="mt-3 text-sm leading-relaxed text-slate-500">
                                {consumers.length > 0
                                    ? `${consumers.length} жоба осы инфрақұрылымға қосылған`
                                    : 'Бұл инфрақұрылымды пайдаланатын жоба жоқ'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-3 divide-x divide-slate-200/70 border-b border-slate-200/70 bg-slate-50/60">
                    <div className="px-7 py-5 sm:px-10 sm:py-6">
                        <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                            Жобалар
                        </p>
                        <p className="mt-2 text-2xl font-extrabold tracking-tight text-navy tabular-nums">
                            {consumers.length}
                        </p>
                    </div>
                    <div className="px-7 py-5 sm:px-10 sm:py-6">
                        <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                            {resourceKey ? 'Қолданылды' : 'Желі күйі'}
                        </p>
                        <p className="mt-2 truncate text-lg font-extrabold tracking-tight text-navy">
                            {resourceKey
                                ? formatAmount(
                                      usage?.used ?? 0,
                                      RESOURCE_UNITS[resourceKey],
                                  )
                                : item.details.available
                                  ? 'Белсенді'
                                  : 'Қолжетімсіз'}
                        </p>
                    </div>
                    <div className="px-7 py-5 sm:px-10 sm:py-6">
                        <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                            Қолжетімді
                        </p>
                        <p className="mt-2 truncate text-lg font-extrabold tracking-tight text-emerald-700">
                            {resourceKey
                                ? formatAmount(
                                      usage?.remaining ?? 0,
                                      RESOURCE_UNITS[resourceKey],
                                  )
                                : item.details.available
                                  ? 'Иә'
                                  : 'Жоқ'}
                        </p>
                    </div>
                </div>

                <div className="max-h-[52vh] overflow-auto p-5 sm:p-8">
                    {consumers.length > 0 ? (
                        <div className="min-w-[720px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)]">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200/80 bg-slate-50/80">
                                        <th className="px-6 py-4 text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                                            Жоба
                                        </th>
                                        <th className="px-6 py-4 text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                                            Қажетті қуат
                                        </th>
                                        <th className="px-6 py-4 text-right text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                                            Үлесі
                                        </th>
                                        <th className="px-6 py-4 text-right text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                                            Күйі
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {consumers.map((consumer, index) => {
                                        const percentage =
                                            total > 0
                                                ? Math.min(
                                                      100,
                                                      Math.round(
                                                          (consumer.value /
                                                              total) *
                                                              100,
                                                      ),
                                                  )
                                                : null;

                                        return (
                                            <tr
                                                key={
                                                    consumer.id ??
                                                    `${consumer.name}-${index}`
                                                }
                                                className="transition-colors hover:bg-slate-50/80"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="min-w-0">
                                                        <p className="max-w-sm truncate text-base font-bold tracking-tight text-navy">
                                                            {consumer.name}
                                                        </p>
                                                        <p className="mt-1 text-[10px] font-semibold tracking-wide text-slate-400 tabular-nums">
                                                            ЖОБА №
                                                            {consumer.id ?? '—'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-semibold whitespace-nowrap text-slate-700 tabular-nums">
                                                    {consumer.capacity || '—'}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    {percentage !== null ? (
                                                        <span className="inline-flex min-w-11 justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-navy tabular-nums">
                                                            {percentage}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                                        Пайдаланады
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex min-h-64 flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-white/70 px-6 text-center">
                            <p className="text-base font-extrabold text-navy">
                                Жобалар табылмады
                            </p>
                            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                                Қазір бұл инфрақұрылымды пайдаланатын жоба
                                тіркелмеген.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
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
    const [selectedItem, setSelectedItem] = useState<InfrastructureItem | null>(
        null,
    );
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
        <section
            className={cn('rounded-lg bg-slate-50/90 p-4 sm:p-5', className)}
        >
            <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                    <h3 className="mt-1 text-3xl font-extrabold text-navy">
                        Инфрақұрылым
                    </h3>
                </div>
                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                    {items.filter((item) => item.details.available).length}/
                    {items.length} қолжетімді
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metered.map((item) => {
                    const resourceKey = item.key as MeteredResource;
                    const styles = RESOURCE_STYLES[resourceKey];
                    const total = Math.max(
                        parseCapacity(item.details.capacity, resourceKey),
                        usage[item.key]?.total ?? 0,
                        (usage[item.key]?.used ?? 0) +
                            (usage[item.key]?.remaining ?? 0),
                    );

                    return (
                        <button
                            aria-haspopup="dialog"
                            key={item.key}
                            className="group relative min-h-[290px] min-w-0 cursor-pointer overflow-hidden rounded-[26px] border border-slate-200/80 bg-[#f8f9fb] p-5 text-left shadow-[0_18px_42px_-32px_rgba(15,23,42,0.28)] transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.32)] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0"
                            onClick={() => setSelectedItem(item)}
                            type="button"
                        >
                            <div className="relative z-10 flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                        Жалпы қуат ·{' '}
                                        {formatAmount(
                                            total,
                                            RESOURCE_UNITS[resourceKey],
                                        )}
                                    </p>
                                    <h4 className="mt-1.5 text-lg leading-snug font-bold tracking-tight text-navy">
                                        {item.name}
                                    </h4>
                                    <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                        Қолжетімді
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-full border border-white/80',
                                        styles.icon,
                                    )}
                                >
                                    <item.icon className="size-[18px]" />
                                </span>
                            </div>
                            <div className="relative z-10 mt-2.5">
                                <CapacityMeter
                                    resourceKey={resourceKey}
                                    details={item.details}
                                    usage={usage[item.key]}
                                />
                            </div>
                        </button>
                    );
                })}

                {simple.map((item) => {
                    const detail =
                        item.details.capacity ||
                        item.details.type ||
                        item.details.distance ||
                        '';
                    const styles =
                        SIMPLE_RESOURCE_STYLES[
                            item.key as keyof typeof SIMPLE_RESOURCE_STYLES
                        ];

                    return (
                        <button
                            aria-haspopup="dialog"
                            key={item.key}
                            className="group relative min-h-[250px] min-w-0 cursor-pointer overflow-hidden rounded-[26px] border border-slate-200/80 bg-[#f8f9fb] p-5 text-left shadow-[0_18px_42px_-32px_rgba(15,23,42,0.28)] transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.32)] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0"
                            onClick={() => setSelectedItem(item)}
                            type="button"
                        >
                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                        Желі күйі
                                    </p>
                                    <h4 className="mt-1.5 text-lg leading-snug font-bold tracking-tight text-navy">
                                        {item.name}
                                    </h4>
                                    <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                        {item.details.available
                                            ? 'Қолжетімді'
                                            : 'Жоқ'}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-full border border-white/80',
                                        styles?.icon ??
                                            'bg-slate-200 text-slate-600',
                                    )}
                                >
                                    <item.icon className="size-[18px]" />
                                </span>
                            </div>
                            <div className="relative z-10 mt-10">
                                <p className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                                    Сипаттамасы
                                </p>
                                <p className="mt-2 truncate text-4xl font-medium tracking-[-0.05em] text-navy">
                                    {detail || 'Көрсетілмеген'}
                                </p>
                            </div>
                            <div className="absolute inset-x-5 bottom-5 z-10 flex items-center justify-between border-t border-slate-200 pt-3">
                                <span className="text-[9px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                                    Инфрақұрылым
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/80">
                                    <span
                                        className={cn(
                                            'size-1.5 rounded-full',
                                            item.details.available
                                                ? 'bg-emerald-400'
                                                : 'bg-amber-400',
                                        )}
                                    />
                                    {item.details.available
                                        ? 'Белсенді'
                                        : 'Қолжетімсіз'}
                                </span>
                            </div>
                            <item.icon className="pointer-events-none absolute right-5 bottom-12 size-20 opacity-[0.025]" />
                        </button>
                    );
                })}
            </div>
            <InfrastructureConsumersDialog
                item={selectedItem}
                onOpenChange={(open) => {
                    if (!open) setSelectedItem(null);
                }}
                open={selectedItem !== null}
                usage={selectedItem ? usage[selectedItem.key] : undefined}
            />
        </section>
    );
}
