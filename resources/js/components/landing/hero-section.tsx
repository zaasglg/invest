import { Link } from '@inertiajs/react';
import { ArrowRight, ChevronDown } from 'lucide-react';

export function HeroSection() {
    const scrollToSectors = () => {
        const el = document.getElementById('sectors');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <section className="relative flex min-h-screen items-center overflow-hidden">
            {/* Background Layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f1b3d] via-[#162650] to-[#0a1228]" />
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8a44e' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            {/* Floating decorative elements */}
            <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-[#c8a44e]/5 blur-3xl" />
            <div className="absolute bottom-1/4 left-0 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl" />

            {/* Glowing line accents */}
            <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#c8a44e]/20 to-transparent" />
            <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#c8a44e]/20 to-transparent" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                    {/* Left: Content */}
                    <div className="max-w-2xl">
                        {/* Badge */}
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c8a44e]/30 bg-[#c8a44e]/10 px-4 py-1.5 sm:mb-8">
                            <span className="h-2 w-2 rounded-full bg-[#c8a44e] animate-pulse" />
                            <span className="text-xs font-semibold tracking-wider text-[#c8a44e] uppercase sm:text-sm">
                                Gateway to Central Asia
                            </span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                            Invest in the{' '}
                            <span className="bg-gradient-to-r from-[#c8a44e] to-[#e3c97a] bg-clip-text text-transparent">
                                Future
                            </span>
                            <br />
                            of Turkistan
                        </h1>

                        {/* Subheadline */}
                        <p className="mt-6 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg lg:text-xl">
                            Unlock world-class investment opportunities across
                            agriculture, tourism, industry, and special economic
                            zones in Kazakhstan&apos;s fastest-growing region.
                        </p>

                        {/* CTA Buttons */}
                        <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4">
                            <Link
                                href="/register"
                                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8a44e] px-7 py-3.5 text-sm font-bold text-[#0f1b3d] shadow-lg shadow-[#c8a44e]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e3c97a] hover:shadow-xl hover:shadow-[#c8a44e]/30 sm:text-base"
                            >
                                Start Investing
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <button
                                onClick={scrollToSectors}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 sm:text-base"
                            >
                                Explore Sectors
                            </button>
                        </div>

                        {/* Trust indicators */}
                        <div className="mt-10 flex items-center gap-6 border-t border-white/10 pt-8 sm:mt-14 sm:gap-10">
                            <div>
                                <div className="text-2xl font-extrabold text-white sm:text-3xl">
                                    $2.5B+
                                </div>
                                <div className="text-xs text-white/50 sm:text-sm">
                                    Investments attracted
                                </div>
                            </div>
                            <div className="h-10 w-px bg-white/10" />
                            <div>
                                <div className="text-2xl font-extrabold text-white sm:text-3xl">
                                    150+
                                </div>
                                <div className="text-xs text-white/50 sm:text-sm">
                                    Active projects
                                </div>
                            </div>
                            <div className="h-10 w-px bg-white/10" />
                            <div>
                                <div className="text-2xl font-extrabold text-white sm:text-3xl">
                                    12
                                </div>
                                <div className="text-xs text-white/50 sm:text-sm">
                                    Economic zones
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Abstract visual element */}
                    <div className="hidden lg:flex lg:items-center lg:justify-center">
                        <div className="relative">
                            {/* Outer ring */}
                            <div className="h-80 w-80 rounded-full border border-[#c8a44e]/20 xl:h-96 xl:w-96" />
                            {/* Middle ring */}
                            <div className="absolute inset-6 rounded-full border border-[#c8a44e]/10" />
                            {/* Inner filled circle */}
                            <div className="absolute inset-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/5 backdrop-blur-sm xl:inset-20">
                                <div className="text-center">
                                    <div className="text-5xl font-extrabold text-[#c8a44e] xl:text-6xl">
                                        TI
                                    </div>
                                    <div className="mt-1 text-[10px] font-semibold tracking-[0.3em] text-white/40 uppercase">
                                        Est. 2020
                                    </div>
                                </div>
                            </div>
                            {/* Orbiting dots */}
                            <div className="absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#c8a44e] shadow-lg shadow-[#c8a44e]/50" />
                            <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-white/30" />
                            <div className="absolute bottom-4 left-8 h-2 w-2 rounded-full bg-[#c8a44e]/40" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <button
                onClick={scrollToSectors}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/40 transition-colors hover:text-white/70"
                aria-label="Scroll down"
            >
                <ChevronDown className="h-6 w-6" />
            </button>
        </section>
    );
}
