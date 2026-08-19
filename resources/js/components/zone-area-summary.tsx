import { Building2, Clock3, LandPlot, Sprout } from 'lucide-react';

import type { ZoneArea } from '@/types';

const formatArea = (value: number) =>
    `${new Intl.NumberFormat('kk-KZ', { maximumFractionDigits: 2 }).format(value)} га`;

export default function ZoneAreaSummary({ area }: { area: ZoneArea }) {
    const items = [
        {
            label: 'Жалпы аумақ',
            value: area.total,
            icon: LandPlot,
            tone: 'text-navy',
        },
        {
            label: 'Бос аумақ',
            value: area.available,
            icon: Sprout,
            tone: 'text-emerald-700',
        },
        {
            label: 'Резервте',
            value: area.reserved,
            icon: Clock3,
            tone: 'text-amber-700',
        },
        {
            label: 'Бос емес',
            value: area.occupied,
            icon: Building2,
            tone: 'text-slate-700',
        },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            {item.label}
                        </p>
                        <item.icon className="size-4 text-slate-400" />
                    </div>
                    <p className={`mt-3 text-2xl font-bold ${item.tone}`}>
                        {formatArea(item.value)}
                    </p>
                </div>
            ))}
        </div>
    );
}
