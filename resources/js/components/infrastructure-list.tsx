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
import {
    formatInfrastructureValue,
    normalizeStandardNumber,
    ZONE_INFRASTRUCTURE_FIELDS,
} from '@/lib/infrastructure';
import type {
    InfrastructureData,
    InfrastructureDetails,
    ZoneInfrastructureKey,
} from '@/lib/infrastructure';
import { cn } from '@/lib/utils';

type InfrastructureConsumer = {
    id: number | null;
    name: string;
    capacity: string | null;
    required_capacity: string | null;
    value: number;
    status: string | null;
};

type UsageEntry = {
    total?: number;
    used?: number;
    remaining?: number;
    overused?: number;
    consumers?: InfrastructureConsumer[];
};

type Props = {
    infrastructure: InfrastructureData;
    usage?: Record<string, UsageEntry>;
    className?: string;
};

type MeteredResource = ZoneInfrastructureKey;

type InfrastructureItem = {
    key: ZoneInfrastructureKey;
    name: string;
    icon: LucideIcon;
    details: InfrastructureDetails;
};

const INFRA_ITEMS: {
    key: ZoneInfrastructureKey;
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

const METERED_KEYS: MeteredResource[] = ZONE_INFRASTRUCTURE_FIELDS.map(
    ({ key }) => key,
);

const RESOURCE_UNITS: Record<MeteredResource, string> = {
    electricity: 'кВт',
    gas: 'м³/сағ',
    water: 'м³/тәу',
    roads: 'км',
    railway: 'км',
    internet: 'Мбит/с',
};

const RESOURCE_STYLES: Record<MeteredResource, { line: string; icon: string }> =
    {
        electricity: {
            line: '#d8b84e',
            icon: 'bg-amber-50 text-amber-700',
        },
        gas: {
            line: '#71c98d',
            icon: 'bg-emerald-50 text-emerald-700',
        },
        water: {
            line: '#63b8e8',
            icon: 'bg-sky-50 text-sky-700',
        },
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
    return Number(normalizeStandardNumber(capacity, key)) || 0;
}

function formatAmount(value: number, unit: string) {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function UsageLineChart({
    color,
    resourceKey,
    used,
    unit,
}: {
    color: string;
    resourceKey: MeteredResource;
    used: number;
    unit: string;
}) {
    const chartPaths: Record<MeteredResource, string> = {
        electricity:
            'M4 91 C20 44 36 46 54 55 C77 68 88 70 102 38 C116 8 131 24 145 50 C161 78 176 69 185 25 C190 9 199 6 212 3',
        gas: 'M4 78 C22 67 34 30 54 47 C75 65 84 81 103 51 C121 22 133 31 146 45 C161 61 174 58 184 24 C191 6 200 8 212 12',
        water: 'M4 84 C24 78 34 54 55 58 C76 61 87 35 104 39 C124 45 133 77 151 59 C169 42 177 18 190 26 C199 31 204 17 212 8',
        roads: 'M4 86 C25 72 40 76 58 56 C78 34 95 61 112 44 C132 23 145 48 162 35 C179 22 194 28 212 12',
        railway:
            'M4 90 C28 84 39 48 60 58 C82 69 91 31 113 40 C136 50 151 24 171 33 C188 41 199 18 212 9',
        internet:
            'M4 92 C22 61 38 77 58 48 C77 21 96 66 115 35 C133 6 151 55 171 29 C188 8 201 21 212 4',
    };
    const markers: Record<MeteredResource, { x: number; y: number }> = {
        electricity: { x: 122, y: 22 },
        gas: { x: 112, y: 38 },
        water: { x: 151, y: 59 },
        roads: { x: 145, y: 48 },
        railway: { x: 151, y: 24 },
        internet: { x: 171, y: 29 },
    };
    const marker = markers[resourceKey];

    return (
        <div
            aria-label={`Қолданылған қуат: ${formatAmount(used, unit)}`}
            className="relative h-20 w-full"
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
                        <stop offset="0" stopColor={color} stopOpacity="0.28" />
                        <stop offset="1" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    className="infrastructure-widget-area"
                    d={`${chartPaths[resourceKey]} L212 104 L4 104 Z`}
                    fill={`url(#usage-fade-${resourceKey})`}
                />
                <path
                    className="infrastructure-widget-line"
                    d={chartPaths[resourceKey]}
                    fill="none"
                    pathLength="1"
                    stroke={color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
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
                <span className="infrastructure-widget-marker relative block size-2.5 rounded-full border-2 border-white bg-white shadow-sm ring-1 ring-slate-200">
                    <span
                        className="absolute inset-0.5 rounded-full"
                        style={{ backgroundColor: color }}
                    />
                </span>
            </span>
            <div
                className="infrastructure-widget-tooltip absolute -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-slate-700 shadow-sm"
                style={{
                    left: `${(marker.x / 216) * 100}%`,
                    top: `${Math.min(78, (marker.y / 104) * 100 + 14)}%`,
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
    const total = Math.max(0, usage?.total ?? parsedTotal);
    const used = Math.max(
        0,
        usage?.used ??
            (usage?.remaining !== undefined ? total - usage.remaining : 0),
    );
    const remaining = Math.max(0, usage?.remaining ?? total - used);
    const overused = Math.max(0, usage?.overused ?? used - total);
    const rawPercentage = total > 0 ? Math.round((used / total) * 100) : 0;
    const percentage = Math.min(100, rawPercentage);
    const styles = RESOURCE_STYLES[resourceKey];

    const usedShare = Math.min(100, percentage);
    const remainShare = Math.max(0, 100 - usedShare);

    return (
        <div>
            <UsageLineChart
                color={styles.line}
                resourceKey={resourceKey}
                unit={unit}
                used={used}
            />
            <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full bg-navy/80 transition-[width] duration-500"
                        style={{ width: `${usedShare}%` }}
                    />
                    <div
                        className="h-full transition-[width] duration-500"
                        style={{
                            width: `${remainShare}%`,
                            backgroundColor: styles.line,
                            opacity: 0.55,
                        }}
                    />
                </div>
                <div className="mt-4 grid grid-cols-2 border-t border-slate-100">
                    <div className="pt-4 pr-4">
                        <p className="text-xs font-medium text-slate-500">
                            Жүктеме
                        </p>
                        <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-navy tabular-nums">
                            {rawPercentage}%
                        </p>
                    </div>
                    <div className="border-l border-slate-100 pt-4 pl-4">
                        <p className="text-xs font-medium text-slate-500">
                            {overused > 0 ? 'Артық жүктеме' : 'Қалды'}
                        </p>
                        <p
                            className={cn(
                                'mt-1.5 text-base font-bold tabular-nums',
                                overused > 0 ? 'text-red-600' : 'text-navy',
                            )}
                        >
                            {formatAmount(
                                overused > 0 ? overused : remaining,
                                unit,
                            )}
                        </p>
                    </div>
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
    const resourceKey = item.key;
    const accent = RESOURCE_STYLES[resourceKey].line;
    const total = usage?.total ?? 0;
    const overused = usage?.overused ?? 0;

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
                            Пайдалануда
                        </p>
                        <p className="mt-2 truncate text-lg font-extrabold tracking-tight text-navy">
                            {formatAmount(
                                usage?.used ?? 0,
                                RESOURCE_UNITS[resourceKey],
                            )}
                        </p>
                    </div>
                    <div className="px-7 py-5 sm:px-10 sm:py-6">
                        <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                            {overused > 0 ? 'Артық жүктеме' : 'Қолжетімді'}
                        </p>
                        <p
                            className={cn(
                                'mt-2 truncate text-lg font-extrabold tracking-tight',
                                overused > 0
                                    ? 'text-red-600'
                                    : 'text-emerald-700',
                            )}
                        >
                            {formatAmount(
                                overused > 0
                                    ? overused
                                    : (usage?.remaining ?? 0),
                                RESOURCE_UNITS[resourceKey],
                            )}
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
                                            Қажетті
                                        </th>
                                        <th className="px-6 py-4 text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                                            Пайдалануда
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
                                                ? Math.round(
                                                      (consumer.value / total) *
                                                          100,
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
                                                    {formatInfrastructureValue(
                                                        consumer.required_capacity,
                                                        resourceKey,
                                                    ) || '—'}
                                                </td>
                                                <td className="px-6 py-5 text-sm font-semibold whitespace-nowrap text-slate-700 tabular-nums">
                                                    {formatInfrastructureValue(
                                                        consumer.capacity,
                                                        resourceKey,
                                                    ) || '—'}
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
                                                        {consumer.value > 0
                                                            ? 'Пайдалануда'
                                                            : 'Қажетті'}
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
 * every available standardized resource renders an inline load meter.
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
        key: ZoneInfrastructureKey;
        name: string;
        icon: LucideIcon;
        details: InfrastructureDetails;
    }[];

    if (items.length === 0) return null;

    const metered = items.filter(
        (item) =>
            METERED_KEYS.includes(item.key) &&
            item.details.available &&
            normalizeStandardNumber(
                item.details.capacity ?? item.details.distance,
                item.key,
            ) !== '',
    );
    const simple = items.filter((item) => !metered.includes(item));

    return (
        <section className={cn('space-y-4', className)}>
            <div className="flex items-end justify-between gap-4 px-0.5">
                <div>
                    <div className="mb-3 h-0.5 w-8 rounded-full bg-gold" />
                    <h3 className="text-2xl font-bold tracking-[-0.035em] text-navy sm:text-3xl">
                        Инфрақұрылым
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-500">
                        Қолжетімді ресурстар және жүктеме
                    </p>
                </div>
                <span className="mb-1 rounded-full bg-navy/5 px-2.5 py-1 text-xs font-semibold text-navy tabular-nums">
                    {items.filter((item) => item.details.available).length}/
                    {items.length} қолжетімді
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metered.map((item) => {
                    const resourceKey = item.key;
                    const styles = RESOURCE_STYLES[resourceKey];
                    const total = Math.max(
                        0,
                        usage[item.key]?.total ??
                            parseCapacity(item.details.capacity, resourceKey),
                    );

                    return (
                        <button
                            aria-haspopup="dialog"
                            key={item.key}
                            className="min-w-0 cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:outline-none"
                            onClick={() => setSelectedItem(item)}
                            type="button"
                        >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-500">
                                        Жалпы қуат ·{' '}
                                        <span className="font-semibold text-slate-700 tabular-nums">
                                            {formatAmount(
                                                total,
                                                RESOURCE_UNITS[resourceKey],
                                            )}
                                        </span>
                                    </p>
                                    <h4 className="mt-1.5 text-lg leading-snug font-bold tracking-[-0.025em] text-navy">
                                        {item.name}
                                    </h4>
                                    <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                                        <span className="size-2 rounded-full bg-emerald-500" />
                                        Қолжетімді
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                        styles.icon,
                                    )}
                                >
                                    <item.icon className="size-5" />
                                </span>
                            </div>
                            <div className="mt-4">
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
                    const styles = RESOURCE_STYLES[item.key];
                    const formattedDetail =
                        formatInfrastructureValue(detail, item.key) || detail;

                    return (
                        <button
                            aria-haspopup="dialog"
                            key={item.key}
                            className="flex min-h-[220px] min-w-0 cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:outline-none"
                            onClick={() => setSelectedItem(item)}
                            type="button"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-500">
                                        Желі күйі
                                    </p>
                                    <h4 className="mt-1.5 text-lg leading-snug font-bold tracking-[-0.025em] text-navy">
                                        {item.name}
                                    </h4>
                                    <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                                        <span
                                            className={cn(
                                                'size-2 rounded-full',
                                                item.details.available
                                                    ? 'bg-emerald-500'
                                                    : 'bg-amber-400',
                                            )}
                                        />
                                        {item.details.available
                                            ? 'Қолжетімді'
                                            : 'Жоқ'}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                        styles?.icon ??
                                            'bg-slate-100 text-slate-500',
                                    )}
                                >
                                    <item.icon className="size-5" />
                                </span>
                            </div>

                            <div className="mt-auto border-t border-slate-100 pt-4">
                                <p className="text-xs font-medium text-slate-500">
                                    Сипаттамасы
                                </p>
                                <p className="mt-1.5 truncate text-2xl font-bold tracking-[-0.03em] text-navy">
                                    {formattedDetail || 'Көрсетілмеген'}
                                </p>
                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <span className="text-xs font-medium text-slate-500">
                                        Күйі
                                    </span>
                                    <span className="text-sm font-semibold text-navy">
                                        {item.details.available
                                            ? 'Белсенді'
                                            : 'Қолжетімсіз'}
                                    </span>
                                </div>
                            </div>
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
