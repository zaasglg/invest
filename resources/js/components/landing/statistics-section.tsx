import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface StatItem {
    value: number;
    suffix: string;
    label: string;
    description: string;
}

const stats: StatItem[] = [
    {
        value: 2.5,
        suffix: 'B+',
        label: 'Total Investments',
        description: 'Foreign and domestic capital attracted since 2020',
    },
    {
        value: 150,
        suffix: '+',
        label: 'Active Projects',
        description: 'Ongoing investment projects across all sectors',
    },
    {
        value: 35,
        suffix: '%',
        label: 'Annual Growth',
        description: 'Year-over-year regional economic growth rate',
    },
    {
        value: 50000,
        suffix: '+',
        label: 'Jobs Created',
        description: 'New employment opportunities generated',
    },
];

function formatNumber(n: number): string {
    if (n >= 1000) {
        return n.toLocaleString('en-US');
    }
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(1);
}

function AnimatedCounter({
    target,
    suffix,
    isVisible,
}: {
    target: number;
    suffix: string;
    isVisible: boolean;
}) {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (!isVisible) return;

        let frame: number;
        const duration = 2000;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrent(target * eased);

            if (progress < 1) {
                frame = requestAnimationFrame(animate);
            }
        };

        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [isVisible, target]);

    return (
        <span>
            {target < 10 ? '$' : ''}
            {formatNumber(Math.round(current * 10) / 10)}
            {suffix}
        </span>
    );
}

interface GrowthBarProps {
    label: string;
    percentage: number;
    color: string;
    delay: number;
    isVisible: boolean;
}

function GrowthBar({
    label,
    percentage,
    color,
    delay,
    isVisible,
}: GrowthBarProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/80">
                    {label}
                </span>
                <span className="text-sm font-bold text-white">
                    {percentage}%
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-1000 ease-out',
                        color,
                    )}
                    style={{
                        width: isVisible ? `${percentage}%` : '0%',
                        transitionDelay: `${delay}ms`,
                    }}
                />
            </div>
        </div>
    );
}

export function StatisticsSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.2 },
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section
            id="statistics"
            ref={sectionRef}
            className="relative overflow-hidden bg-[#0f1b3d] py-20 sm:py-28 lg:py-32"
        >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1a2d5e_0%,transparent_70%)]" />
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#c8a44e]/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mx-auto max-w-2xl text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c8a44e]/30 bg-[#c8a44e]/10 px-4 py-1.5">
                        <span className="text-xs font-semibold tracking-wider text-[#c8a44e] uppercase">
                            Regional Growth
                        </span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                        Numbers That Speak{' '}
                        <span className="bg-gradient-to-r from-[#c8a44e] to-[#e3c97a] bg-clip-text text-transparent">
                            Volumes
                        </span>
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-white/50 sm:text-lg">
                        Turkistan region is one of the fastest-growing
                        economies in Central Asia, consistently outpacing
                        national growth metrics.
                    </p>
                </div>

                {/* Stats grid */}
                <div className="mt-14 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, i) => (
                        <div
                            key={stat.label}
                            className={cn(
                                'group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-500 hover:border-[#c8a44e]/20 hover:bg-white/[0.06] sm:p-8',
                                isVisible
                                    ? 'translate-y-0 opacity-100'
                                    : 'translate-y-8 opacity-0',
                            )}
                            style={{
                                transitionDelay: `${i * 100}ms`,
                            }}
                        >
                            {/* Hover glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#c8a44e]/0 to-[#c8a44e]/0 transition-all duration-300 group-hover:from-[#c8a44e]/5 group-hover:to-transparent" />

                            <div className="relative z-10">
                                <div className="text-3xl font-extrabold text-white sm:text-4xl">
                                    <AnimatedCounter
                                        target={stat.value}
                                        suffix={stat.suffix}
                                        isVisible={isVisible}
                                    />
                                </div>
                                <div className="mt-2 text-sm font-semibold text-[#c8a44e]">
                                    {stat.label}
                                </div>
                                <div className="mt-1 text-xs leading-relaxed text-white/40">
                                    {stat.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Growth bars */}
                <div className="mt-16 rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-10">
                    <h3 className="mb-8 text-lg font-bold text-white sm:text-xl">
                        Sector Growth Rates (YoY)
                    </h3>
                    <div className="grid gap-6 sm:grid-cols-2 lg:gap-x-16">
                        <div className="space-y-5">
                            <GrowthBar
                                label="Agriculture"
                                percentage={78}
                                color="bg-emerald-500"
                                delay={200}
                                isVisible={isVisible}
                            />
                            <GrowthBar
                                label="Tourism"
                                percentage={92}
                                color="bg-sky-500"
                                delay={400}
                                isVisible={isVisible}
                            />
                            <GrowthBar
                                label="Industry"
                                percentage={65}
                                color="bg-amber-500"
                                delay={600}
                                isVisible={isVisible}
                            />
                        </div>
                        <div className="space-y-5">
                            <GrowthBar
                                label="Mining & Subsoil"
                                percentage={71}
                                color="bg-violet-500"
                                delay={300}
                                isVisible={isVisible}
                            />
                            <GrowthBar
                                label="Real Estate"
                                percentage={85}
                                color="bg-rose-500"
                                delay={500}
                                isVisible={isVisible}
                            />
                            <GrowthBar
                                label="Special Economic Zones"
                                percentage={88}
                                color="bg-[#c8a44e]"
                                delay={700}
                                isVisible={isVisible}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
