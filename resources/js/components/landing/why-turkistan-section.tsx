import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    Globe2,
    Handshake,
    Shield,
    TrendingUp,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface Advantage {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
}

const advantages: Advantage[] = [
    {
        icon: TrendingUp,
        title: 'High ROI Potential',
        description:
            'Strategic location on the New Silk Road with rapidly growing GDP and consumer markets.',
        color: 'text-emerald-500',
    },
    {
        icon: Shield,
        title: 'Government Support',
        description:
            'Tax exemptions, subsidized land, and streamlined business registration for qualified investors.',
        color: 'text-blue-500',
    },
    {
        icon: Globe2,
        title: 'Strategic Location',
        description:
            'At the crossroads of China, Russia, and South Asia — access to markets of 1+ billion consumers.',
        color: 'text-[#c8a44e]',
    },
    {
        icon: Handshake,
        title: 'Investor-Friendly Policies',
        description:
            'Dedicated one-stop service center for investors with multilingual support and legal assistance.',
        color: 'text-violet-500',
    },
];

export function WhyTurkistanSection() {
    return (
        <section
            id="why-turkistan"
            className="relative overflow-hidden bg-[#f8fafc] py-20 sm:py-28 lg:py-32"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                    {/* Left: Content */}
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c8a44e]/20 bg-[#c8a44e]/5 px-4 py-1.5">
                            <span className="text-xs font-semibold tracking-wider text-[#c8a44e] uppercase">
                                Why Choose Us
                            </span>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#0f1b3d] sm:text-4xl lg:text-5xl">
                            Your Gateway to{' '}
                            <span className="bg-gradient-to-r from-[#c8a44e] to-[#9a7d35] bg-clip-text text-transparent">
                                Central Asia
                            </span>
                        </h2>
                        <p className="mt-4 text-base leading-relaxed text-gray-500 sm:text-lg">
                            The Turkistan region offers a unique combination of
                            historical significance, strategic positioning, and
                            modern economic incentives designed specifically for
                            international investors.
                        </p>

                        <div className="mt-8 space-y-4">
                            {[
                                'Zero corporate income tax in SEZ for up to 25 years',
                                'Free land allocation for qualifying projects',
                                'Simplified visa regime for business visitors',
                                'Full repatriation of profits guaranteed by law',
                            ].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-start gap-3"
                                >
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                                    <span className="text-sm font-medium text-gray-700 sm:text-base">
                                        {item}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/register"
                            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0f1b3d] px-7 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1a2d5e] hover:shadow-lg sm:text-base"
                        >
                            Request Investment Guide
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    {/* Right: Advantage cards */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {advantages.map((adv, i) => (
                            <div
                                key={adv.title}
                                className={cn(
                                    'group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                                    i % 2 === 1 && 'sm:mt-8',
                                )}
                            >
                                <div
                                    className={cn(
                                        'mb-4 inline-flex rounded-xl bg-gray-50 p-3 transition-colors group-hover:bg-gray-100',
                                        adv.color,
                                    )}
                                >
                                    <adv.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-base font-bold text-[#0f1b3d] sm:text-lg">
                                    {adv.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                    {adv.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
