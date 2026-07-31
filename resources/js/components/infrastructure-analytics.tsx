import { Droplets, Flame, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';

type UsageEntry = { total?: number; used?: number; remaining?: number };
type ResourceKey = 'electricity' | 'gas' | 'water';

type Props = {
    usage?: Record<string, UsageEntry>;
    className?: string;
};

const RESOURCES: {
    key: ResourceKey;
    label: string;
    shortLabel: string;
    unit: string;
    icon: LucideIcon;
}[] = [
    {
        key: 'electricity',
        label: 'Электр қуаты',
        shortLabel: 'Электр',
        unit: 'кВт',
        icon: Zap,
    },
    {
        key: 'gas',
        label: 'Газ',
        shortLabel: 'Газ',
        unit: 'м³/сағ',
        icon: Flame,
    },
    {
        key: 'water',
        label: 'Су',
        shortLabel: 'Су',
        unit: 'м³/тәу',
        icon: Droplets,
    },
];

function formatNumber(value: number): string {
    return new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 0,
    }).format(value);
}

export default function InfrastructureAnalytics({
    usage = {},
    className,
}: Props) {
    const resources = useMemo(
        () =>
            RESOURCES.map((resource) => {
                const entry = usage[resource.key];
                const total = Number(entry?.total ?? 0);
                const used = Number(entry?.used ?? 0);
                const remaining = Math.max(
                    0,
                    Number(entry?.remaining ?? total - used),
                );

                return {
                    ...resource,
                    total,
                    used,
                    remaining,
                    percentage:
                        total > 0
                            ? Math.min(100, Math.round((used / total) * 100))
                            : 0,
                };
            }).filter((resource) => resource.total > 0),
        [usage],
    );
    const [selectedKey, setSelectedKey] = useState<ResourceKey>('electricity');
    const selected =
        resources.find((resource) => resource.key === selectedKey) ??
        resources[0];

    if (!selected || resources.length === 0) return null;

    const donutData = [
        { name: 'Қолданылды', value: selected.used, color: '#c8a44e' },
        { name: 'Қалды', value: selected.remaining, color: '#dfe7e3' },
    ];

    return (
        <section className={cn('mt-6', className)}>
            <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                    <p className="text-[11px] font-bold text-gold-dark uppercase">
                        Ағымдағы көрсеткіштер
                    </p>
                    <h3 className="mt-1 text-base font-extrabold text-navy">
                        Ресурстар аналитикасы
                    </h3>
                </div>
            </div>

            <div className="grid overflow-hidden rounded-lg border border-slate-200/80 bg-white lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                <div className="min-w-0 p-5 sm:p-6 lg:border-r lg:border-slate-100">
                    <div className="mb-5">
                        <p className="text-sm font-bold text-navy">
                            Қуат жүктемесі
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Толық қуатқа қатысты ағымдағы пайдалану
                        </p>
                    </div>

                    <div className="h-64 w-full sm:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={resources}
                                margin={{
                                    top: 16,
                                    right: 4,
                                    bottom: 0,
                                    left: -20,
                                }}
                            >
                                <CartesianGrid
                                    vertical={false}
                                    stroke="#eef1f5"
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="shortLabel"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fill: '#667085',
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    ticks={[0, 25, 50, 75, 100]}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `${value}%`}
                                    tick={{ fill: '#98a2b3', fontSize: 10 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    formatter={(_, __, item) => {
                                        const resource = item.payload;

                                        return [
                                            `${resource.percentage}% · ${formatNumber(resource.used)} / ${formatNumber(resource.total)} ${resource.unit}`,
                                            'Жүктеме',
                                        ];
                                    }}
                                    contentStyle={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 6,
                                        boxShadow:
                                            '0 12px 26px -18px rgba(15, 27, 61, 0.35)',
                                        fontSize: 12,
                                    }}
                                />
                                <Bar
                                    dataKey="percentage"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={64}
                                    animationDuration={800}
                                >
                                    {resources.map((resource) => (
                                        <Cell
                                            key={resource.key}
                                            cursor="pointer"
                                            fill={
                                                selected.key === resource.key
                                                    ? '#0f1b3d'
                                                    : resource.percentage >= 60
                                                      ? '#c8a44e'
                                                      : '#42b883'
                                            }
                                            fillOpacity={
                                                selected.key === resource.key
                                                    ? 1
                                                    : 0.72
                                            }
                                            onClick={() =>
                                                setSelectedKey(resource.key)
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex min-w-0 flex-col justify-between border-t border-slate-100 p-5 sm:p-6 lg:border-t-0">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold text-slate-400">
                                Таңдалған ресурс
                            </p>
                            <p className="mt-1 text-sm font-bold text-navy">
                                {selected.label}
                            </p>
                        </div>
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Қолжетімді
                        </span>
                    </div>

                    <div className="relative mx-auto h-52 w-full max-w-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    key={selected.key}
                                    data={donutData}
                                    dataKey="value"
                                    innerRadius={64}
                                    outerRadius={79}
                                    startAngle={90}
                                    endAngle={-270}
                                    paddingAngle={2}
                                    animationDuration={700}
                                >
                                    {donutData.map((entry) => (
                                        <Cell
                                            key={entry.name}
                                            fill={entry.color}
                                            stroke="transparent"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) =>
                                        `${formatNumber(Number(value))} ${selected.unit}`
                                    }
                                    contentStyle={{
                                        borderRadius: 8,
                                        border: '1px solid #e2e8f0',
                                        fontSize: 12,
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-extrabold text-navy tabular-nums">
                                {selected.percentage}%
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                қолданылды
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-4">
                        <div className="pr-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                Қолданылды
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-gold-dark tabular-nums">
                                {formatNumber(selected.used)} {selected.unit}
                            </p>
                        </div>
                        <div className="pl-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                Қалды
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-emerald-700 tabular-nums">
                                {formatNumber(selected.remaining)}{' '}
                                {selected.unit}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
