import {
    Building2,
    Factory,
    Gem,
    Landmark,
    Mountain,
    Wheat,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface Sector {
    title: string;
    description: string;
    icon: React.ElementType;
    stats: string;
    statsLabel: string;
    gradient: string;
    iconColor: string;
    span?: string;
}

const sectors: Sector[] = [
    {
        title: 'Agriculture & Agribusiness',
        description:
            'Leverage fertile lands and modern irrigation infrastructure to create high-yield agricultural ventures.',
        icon: Wheat,
        stats: '45+',
        statsLabel: 'active projects',
        gradient: 'from-emerald-500/10 to-emerald-500/5',
        iconColor: 'text-emerald-500',
        span: 'lg:col-span-2',
    },
    {
        title: 'Tourism & Hospitality',
        description:
            'Tap into the growing tourism market, powered by UNESCO heritage sites and Silk Road history.',
        icon: Mountain,
        stats: '30+',
        statsLabel: 'tourism zones',
        gradient: 'from-sky-500/10 to-sky-500/5',
        iconColor: 'text-sky-500',
    },
    {
        title: 'Industry & Manufacturing',
        description:
            'Access special economic zones with tax incentives and modern infrastructure for industrial production.',
        icon: Factory,
        stats: '12',
        statsLabel: 'industrial zones',
        gradient: 'from-amber-500/10 to-amber-500/5',
        iconColor: 'text-amber-500',
    },
    {
        title: 'Mining & Subsoil',
        description:
            'Explore rich mineral deposits and natural resources with streamlined licensing processes.',
        icon: Gem,
        stats: '60+',
        statsLabel: 'licensed sites',
        gradient: 'from-violet-500/10 to-violet-500/5',
        iconColor: 'text-violet-500',
    },
    {
        title: 'Real Estate & Infrastructure',
        description:
            'Invest in rapidly developing urban areas with growing demand for residential and commercial properties.',
        icon: Building2,
        stats: '$800M+',
        statsLabel: 'in development',
        gradient: 'from-rose-500/10 to-rose-500/5',
        iconColor: 'text-rose-500',
    },
    {
        title: 'Special Economic Zones',
        description:
            'Benefit from zero customs duties, corporate income tax exemptions, and simplified regulations.',
        icon: Landmark,
        stats: '5',
        statsLabel: 'active SEZs',
        gradient: 'from-[#c8a44e]/10 to-[#c8a44e]/5',
        iconColor: 'text-[#c8a44e]',
        span: 'lg:col-span-2',
    },
];

export function SectorsBentoGrid() {
    return (
        <section
            id="sectors"
            className="relative overflow-hidden bg-white py-20 sm:py-28 lg:py-32"
        >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="mx-auto max-w-2xl text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c8a44e]/20 bg-[#c8a44e]/5 px-4 py-1.5">
                        <span className="text-xs font-semibold tracking-wider text-[#c8a44e] uppercase">
                            Investment Sectors
                        </span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#0f1b3d] sm:text-4xl lg:text-5xl">
                        Diverse Opportunities,{' '}
                        <span className="bg-gradient-to-r from-[#c8a44e] to-[#9a7d35] bg-clip-text text-transparent">
                            One Region
                        </span>
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-gray-500 sm:text-lg">
                        Turkistan region offers investment potential across
                        multiple high-growth sectors with government backing
                        and international partnerships.
                    </p>
                </div>

                {/* Bento grid */}
                <div className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
                    {sectors.map((sector) => (
                        <div
                            key={sector.title}
                            className={cn(
                                'group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/50 sm:p-8',
                                sector.span,
                            )}
                        >
                            {/* Gradient background on hover */}
                            <div
                                className={cn(
                                    'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                                    sector.gradient,
                                )}
                            />

                            <div className="relative z-10">
                                {/* Icon */}
                                <div
                                    className={cn(
                                        'mb-4 inline-flex items-center justify-center rounded-xl bg-gray-50 p-3 transition-colors group-hover:bg-white',
                                        sector.iconColor,
                                    )}
                                >
                                    <sector.icon className="h-6 w-6" />
                                </div>

                                {/* Content */}
                                <h3 className="text-lg font-bold text-[#0f1b3d] sm:text-xl">
                                    {sector.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                    {sector.description}
                                </p>

                                {/* Stats */}
                                <div className="mt-5 flex items-baseline gap-2 border-t border-gray-100 pt-4">
                                    <span className="text-2xl font-extrabold text-[#0f1b3d]">
                                        {sector.stats}
                                    </span>
                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                        {sector.statsLabel}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
