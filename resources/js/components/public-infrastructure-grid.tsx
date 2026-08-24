import type { LucideIcon } from 'lucide-react';
import { Car, Droplets, Flame, TrainFront, Wifi, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PublicInfrastructureItem } from '@/types';

type InfrastructureItem = {
    key: string;
    label: string;
    unit: string;
    icon: LucideIcon;
    accent: string;
    iconClassName: string;
};

const items: InfrastructureItem[] = [
    {
        key: 'electricity',
        label: 'Электрмен жабдықтау',
        unit: 'кВт',
        icon: Zap,
        accent: '#d8b84e',
        iconClassName: 'bg-amber-50 text-amber-700',
    },
    {
        key: 'gas',
        label: 'Газбен жабдықтау',
        unit: 'м³/сағ',
        icon: Flame,
        accent: '#71c98d',
        iconClassName: 'bg-emerald-50 text-emerald-700',
    },
    {
        key: 'water',
        label: 'Сумен жабдықтау',
        unit: 'м³/тәу',
        icon: Droplets,
        accent: '#63b8e8',
        iconClassName: 'bg-sky-50 text-sky-700',
    },
    {
        key: 'roads',
        label: 'Автомобиль жолы',
        unit: 'км',
        icon: Car,
        accent: '#aeb8c7',
        iconClassName: 'bg-slate-200 text-slate-600',
    },
    {
        key: 'railway',
        label: 'Теміржол тұйығы',
        unit: 'км',
        icon: TrainFront,
        accent: '#8f87ef',
        iconClassName: 'bg-indigo-100 text-indigo-700',
    },
    {
        key: 'internet',
        label: 'Интернет',
        unit: 'Мбит/с',
        icon: Wifi,
        accent: '#65c8db',
        iconClassName: 'bg-cyan-100 text-cyan-700',
    },
];

const formatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 2,
});

const format = (value: number, unit: string) =>
    `${formatter.format(value)} ${unit}`;

export default function PublicInfrastructureGrid({
    infrastructure,
}: {
    infrastructure: Record<string, PublicInfrastructureItem>;
}) {
    const availableCount = items.filter(
        (item) => infrastructure[item.key]?.available,
    ).length;

    return (
        <section className="space-y-4">
            <div className="flex items-end justify-between gap-4 px-0.5">
                <div>
                    <div className="mb-3 h-0.5 w-8 rounded-full bg-gold" />
                    <h2 className="text-2xl font-bold tracking-[-0.035em] text-navy sm:text-3xl">
                        Инфрақұрылым
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500">
                        Қолжетімді ресурстар, жалпы және бос қуат
                    </p>
                </div>
                <span className="mb-1 shrink-0 rounded-full bg-navy/5 px-2.5 py-1 text-xs font-semibold text-navy tabular-nums">
                    {availableCount}/{items.length} қолжетімді
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                    const details = infrastructure[item.key];
                    const available = Boolean(details?.available);
                    const total = Math.max(
                        0,
                        Number(details?.total ?? details?.capacity ?? 0),
                    );
                    const used = Math.max(0, Number(details?.used ?? 0));
                    const remaining = Math.max(
                        0,
                        Number(details?.remaining ?? total - used),
                    );
                    const percentage =
                        total > 0
                            ? Math.min(100, Math.round((used / total) * 100))
                            : 0;

                    return (
                        <article
                            key={item.key}
                            className={cn(
                                'min-w-0 rounded-2xl border bg-white p-5 transition-colors',
                                available
                                    ? 'border-slate-200'
                                    : 'border-dashed border-slate-200 bg-slate-50/70',
                            )}
                        >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-500">
                                        {available
                                            ? `Жалпы қуат · ${format(total, item.unit)}`
                                            : 'Желі күйі'}
                                    </p>
                                    <h3 className="mt-1.5 text-lg leading-snug font-bold tracking-[-0.025em] text-navy">
                                        {item.label}
                                    </h3>
                                    <p
                                        className={cn(
                                            'mt-2 flex items-center gap-1.5 text-sm font-medium',
                                            available
                                                ? 'text-emerald-700'
                                                : 'text-slate-400',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'size-2 rounded-full',
                                                available
                                                    ? 'bg-emerald-500'
                                                    : 'bg-slate-300',
                                            )}
                                        />
                                        {available
                                            ? 'Қолжетімді'
                                            : 'Қосылмаған'}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                        item.iconClassName,
                                    )}
                                >
                                    <item.icon className="size-5" />
                                </span>
                            </div>

                            {available ? (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>Жүктеме</span>
                                        <span className="font-bold text-navy tabular-nums">
                                            {percentage}%
                                        </span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-navy/80 transition-[width] duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="mt-5 grid grid-cols-2 border-t border-slate-100">
                                        <div className="pt-4 pr-4">
                                            <p className="text-xs text-slate-400">
                                                Пайдалануда
                                            </p>
                                            <p className="mt-1 text-sm font-bold text-navy tabular-nums">
                                                {format(used, item.unit)}
                                            </p>
                                        </div>
                                        <div className="border-l border-slate-100 pt-4 pl-4">
                                            <p className="text-xs text-slate-400">
                                                Бос қуат
                                            </p>
                                            <p
                                                className="mt-1 text-sm font-bold tabular-nums"
                                                style={{ color: item.accent }}
                                            >
                                                {format(remaining, item.unit)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-8 text-xs leading-5 text-slate-400">
                                    Бұл ресурс бойынша қуат көрсетілмеген.
                                </p>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
