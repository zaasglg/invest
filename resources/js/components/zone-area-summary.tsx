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
            iconClass: 'bg-navy text-white shadow-navy/20',
            line: 'from-navy via-navy-light to-gold',
            glow: 'bg-navy/5',
        },
        {
            label: 'Бос аумақ',
            value: area.available,
            icon: Sprout,
            tone: 'text-emerald-700',
            iconClass: 'bg-emerald-600 text-white shadow-emerald-600/20',
            line: 'from-emerald-600 via-teal-500 to-emerald-300',
            glow: 'bg-emerald-500/10',
        },
        {
            label: 'Резервте',
            value: area.reserved,
            icon: Clock3,
            tone: 'text-amber-700',
            iconClass: 'bg-amber-500 text-white shadow-amber-500/20',
            line: 'from-amber-500 via-gold to-amber-300',
            glow: 'bg-amber-500/10',
        },
        {
            label: 'Бос емес',
            value: area.occupied,
            icon: Building2,
            tone: 'text-slate-700',
            iconClass: 'bg-slate-700 text-white shadow-slate-700/20',
            line: 'from-slate-700 via-slate-500 to-slate-300',
            glow: 'bg-slate-500/8',
        },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="group relative min-h-32 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(15,27,61,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 sm:p-5"
                >
                    <div
                        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.line}`}
                    />
                    <div
                        className={`pointer-events-none absolute -right-8 -bottom-10 size-28 rounded-full transition-transform duration-500 group-hover:scale-110 ${item.glow}`}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                        <p className="pt-1 text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                            {item.label}
                        </p>
                        <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl shadow-lg ${item.iconClass}`}
                        >
                            <item.icon className="size-4" />
                        </span>
                    </div>
                    <p
                        className={`relative mt-4 text-2xl font-extrabold tracking-tight tabular-nums ${item.tone}`}
                    >
                        {formatArea(item.value)}
                    </p>
                </div>
            ))}
        </div>
    );
}
