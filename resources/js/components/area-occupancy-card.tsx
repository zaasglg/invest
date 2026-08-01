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
    const freeShare =
        usage.total > 0
            ? Math.min(100, Math.round((usage.available / usage.total) * 100))
            : 100;
    const segmentCount = 31;
    const activeSegments = Math.round((percentage / 100) * segmentCount);

    return (
        <section
            className={cn(
                'rounded-2xl border border-slate-200 bg-white',
                className,
            )}
        >
            <div className="px-5 pt-5 pb-1">
                <p className="text-[10px] font-medium tracking-[0.14em] text-slate-400 uppercase">
                    Аумақ аналитикасы
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-navy">
                    Жердің толтырылуы
                </h3>
            </div>

            <div className="px-5 pt-4 pb-5">
                <div
                    aria-label={`Аумақтың ${percentage}% пайдаланылған`}
                    className="relative mx-auto h-28 w-full max-w-52"
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
                                    (index / (segmentCount - 1)) * Math.PI;
                                const innerRadius = 40;
                                const outerRadius = 53;
                                const x1 = 70 + Math.cos(angle) * innerRadius;
                                const y1 = 68 + Math.sin(angle) * innerRadius;
                                const x2 = 70 + Math.cos(angle) * outerRadius;
                                const y2 = 68 + Math.sin(angle) * outerRadius;
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
                                            isActive ? '#c8a44e' : '#e2e8f0'
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
                        <strong className="text-3xl leading-none font-semibold tracking-[-0.05em] text-navy tabular-nums">
                            {percentage}%
                        </strong>
                        <span className="mt-1 text-[10px] text-slate-400">
                            толды
                        </span>
                    </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5">
                    <div className="flex items-baseline justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-medium tracking-[0.14em] text-slate-400 uppercase">
                                Жалпы аумақ
                            </p>
                            <p className="mt-1.5 text-[1.75rem] leading-none font-semibold tracking-[-0.04em] text-navy tabular-nums">
                                {formatArea(usage.total)}
                            </p>
                        </div>
                        <p className="max-w-[8.5rem] text-right text-[11px] leading-relaxed text-slate-400">
                            Ағымдағы бөліну күйі
                        </p>
                    </div>

                    <div className="mt-4">
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full bg-emerald-500 transition-[width] duration-500"
                                style={{ width: `${freeShare}%` }}
                                title={`Бос: ${freeShare}%`}
                            />
                            <div
                                className="h-full bg-navy transition-[width] duration-500"
                                style={{ width: `${percentage}%` }}
                                title={`Бос емес: ${percentage}%`}
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Бос {freeShare}%
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-navy" />
                                Бос емес {percentage}%
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 border-t border-slate-100">
                        <div className="pr-4 pt-4">
                            <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                                Бос
                            </p>
                            <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-emerald-700 tabular-nums">
                                {formatArea(usage.available)}
                            </p>
                        </div>
                        <div className="border-l border-slate-100 pl-4 pt-4">
                            <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                                Бос емес
                            </p>
                            <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-navy tabular-nums">
                                {formatArea(usage.occupied)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                            Аумақты алып жатқан жобалар
                        </p>
                        <span className="text-xs font-medium text-slate-400 tabular-nums">
                            {usage.consumers.length}
                        </span>
                    </div>

                    {usage.consumers.length > 0 ? (
                        <div className="divide-y divide-slate-100">
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
                                        className="py-3 first:pt-0 last:pb-0"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="min-w-0 truncate text-sm text-navy">
                                                {consumer.name}
                                            </p>
                                            <span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums">
                                                {formatArea(consumer.area)}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-px overflow-hidden bg-slate-100">
                                            <div
                                                className="h-full bg-gold"
                                                style={{ width: `${share}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {usage.consumers.length > 5 && (
                                <p className="pt-3 text-center text-xs text-slate-400">
                                    Тағы {usage.consumers.length - 5} жоба
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="py-1">
                            <p className="text-sm text-navy">
                                Барлық аумақ бос
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                                Жобалар әлі орналастырылмаған
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
