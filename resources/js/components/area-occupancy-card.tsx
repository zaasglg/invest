import { cn } from '@/lib/utils';

export type AreaUsage = {
    total: number;
    occupied: number;
    available: number;
    consumers: {
        id: number | null;
        name: string;
        area: number;
        capacity: string | null;
    }[];
};

function formatArea(value: number) {
    return `${new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 2,
    }).format(value)} га`;
}

export default function AreaOccupancyCard({
    usage,
    className,
}: {
    usage: AreaUsage;
    className?: string;
}) {
    const percentage =
        usage.total > 0
            ? Math.min(100, Math.round((usage.occupied / usage.total) * 100))
            : 0;
    const segmentCount = 31;
    const activeSegments = Math.round((percentage / 100) * segmentCount);

    return (
        <section
            className={cn(
                'relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[#f8f9fb] text-navy shadow-[0_20px_46px_-34px_rgba(15,23,42,0.3)]',
                className,
            )}
        >
            <div className="relative px-6 pt-6 pb-3">
                <div className="mb-4 h-0.5 w-8 rounded-full bg-gold" />
                <p className="text-[9px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                    Аумақ аналитикасы
                </p>
                <h3 className="mt-1.5 text-lg font-bold tracking-[-0.025em] text-navy">
                    Жердің толтырылуы
                </h3>
            </div>

            <div className="relative px-6 pt-5 pb-6">
                <dl className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                    <div className="flex flex-col items-center p-5 pt-6 pb-5">
                        <div
                            aria-label={`Аумақтың ${percentage}% пайдаланылған`}
                            className="relative h-28 w-full max-w-52 shrink-0"
                            role="img"
                        >
                            <svg
                                aria-hidden="true"
                                className="size-full overflow-visible"
                                viewBox="0 0 140 84"
                            >
                                {Array.from({ length: segmentCount }).map(
                                    (_, index) => {
                                        const angle =
                                            Math.PI +
                                            (index / (segmentCount - 1)) *
                                                Math.PI;
                                        const innerRadius = 40;
                                        const outerRadius = 53;
                                        const x1 =
                                            70 + Math.cos(angle) * innerRadius;
                                        const y1 =
                                            68 + Math.sin(angle) * innerRadius;
                                        const x2 =
                                            70 + Math.cos(angle) * outerRadius;
                                        const y2 =
                                            68 + Math.sin(angle) * outerRadius;
                                        const isActive = index < activeSegments;

                                        return (
                                            <line
                                                key={index}
                                                className={cn(
                                                    'area-occupancy-segment',
                                                    isActive &&
                                                        'area-occupancy-segment--active',
                                                )}
                                                stroke={
                                                    isActive
                                                        ? '#c8a44e'
                                                        : '#e2e8f0'
                                                }
                                                strokeLinecap="round"
                                                strokeWidth="4"
                                                style={{
                                                    animationDelay: `${index * 18}ms`,
                                                }}
                                                x1={x1}
                                                x2={x2}
                                                y1={y1}
                                                y2={y2}
                                            />
                                        );
                                    },
                                )}
                            </svg>
                            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                                <strong className="text-3xl leading-none font-semibold tracking-[-0.06em] text-navy tabular-nums">
                                    {percentage}%
                                </strong>
                                <span className="mt-1 text-[8px] font-bold tracking-wider text-slate-400 uppercase">
                                    Толды
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 w-full border-t border-slate-200 pt-4 text-center">
                            <dt className="text-[8px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                                Жалпы аумақ
                            </dt>
                            <dd className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-navy tabular-nums">
                                {formatArea(usage.total)}
                            </dd>
                            <p className="mx-auto mt-2 max-w-52 text-[9px] leading-relaxed text-slate-400">
                                Жобаларға бөлінген аумақтың ағымдағы күйі
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50/70">
                        <div className="px-5 py-4">
                            <dt className="text-[8px] font-bold tracking-wider text-slate-400 uppercase">
                                Бос
                            </dt>
                            <dd className="mt-1.5 text-sm font-bold text-emerald-700 tabular-nums">
                                {formatArea(usage.available)}
                            </dd>
                        </div>
                        <div className="px-5 py-4">
                            <dt className="text-[8px] font-bold tracking-wider text-slate-400 uppercase">
                                Бос емес
                            </dt>
                            <dd className="mt-1.5 text-sm font-bold text-slate-700 tabular-nums">
                                {formatArea(usage.occupied)}
                            </dd>
                        </div>
                    </div>
                </dl>

                <div className="mt-5 border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                            Аумақты алып жатқан жобалар
                        </p>
                        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[9px] font-bold text-slate-600 tabular-nums">
                            {usage.consumers.length}
                        </span>
                    </div>

                    {usage.consumers.length > 0 ? (
                        <div className="space-y-2">
                            {usage.consumers.slice(0, 5).map((consumer) => {
                                const share =
                                    usage.total > 0
                                        ? Math.min(
                                              100,
                                              Math.round(
                                                  (consumer.area /
                                                      usage.total) *
                                                      100,
                                              ),
                                          )
                                        : 0;

                                return (
                                    <div
                                        key={consumer.id ?? consumer.name}
                                        className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="min-w-0 truncate text-xs font-semibold text-navy">
                                                {consumer.name}
                                            </p>
                                            <span className="shrink-0 text-[10px] font-bold text-slate-500 tabular-nums">
                                                {formatArea(consumer.area)}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-slate-200">
                                            <div
                                                className="h-full rounded-full bg-gold"
                                                style={{ width: `${share}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {usage.consumers.length > 5 && (
                                <p className="pt-1 text-center text-[10px] font-semibold text-slate-400">
                                    Тағы {usage.consumers.length - 5} жоба
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.35)]">
                            <div>
                                <p className="text-xs font-semibold text-slate-700">
                                    Барлық аумақ бос
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                    Жобалар әлі орналастырылмаған
                                </p>
                            </div>
                            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]" />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
