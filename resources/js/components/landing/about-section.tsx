import { BookOpen, Building, Users } from 'lucide-react';

export function AboutSection() {
    return (
        <section
            id="about"
            className="relative bg-white py-20 sm:py-28 lg:py-32"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                    {/* Left visual */}
                    <div className="relative">
                        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1b3d] to-[#1a2d5e] p-8 sm:p-12">
                            {/* Abstract pattern */}
                            <div
                                className="absolute inset-0 opacity-5"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20V9.5a2.5 2.5 0 015 0V12h2v2h-2v2h2v2h-2v3.5a2.5 2.5 0 01-5 0z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                                }}
                            />

                            <div className="relative space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-gradient-to-r from-[#c8a44e]/50 to-transparent" />
                                    <span className="text-xs font-semibold tracking-[0.3em] text-[#c8a44e] uppercase">
                                        Since 2020
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-[#c8a44e]/50 to-transparent" />
                                </div>

                                <div className="space-y-4 text-center">
                                    <h3 className="text-2xl font-extrabold text-white sm:text-3xl">
                                        Turkistan Region
                                    </h3>
                                    <p className="text-sm leading-relaxed text-white/50 sm:text-base">
                                        Located in the heart of the Silk Road,
                                        Turkistan is a rapidly modernizing region
                                        with a population of over 2 million people
                                        and a centuries-old heritage of trade and
                                        cultural exchange.
                                    </p>
                                </div>

                                {/* Mini stats */}
                                <div className="grid grid-cols-3 gap-4 pt-4">
                                    {[
                                        {
                                            icon: Users,
                                            value: '2M+',
                                            label: 'Population',
                                        },
                                        {
                                            icon: Building,
                                            value: '16',
                                            label: 'Districts',
                                        },
                                        {
                                            icon: BookOpen,
                                            value: '1500+',
                                            label: 'Years of History',
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="text-center"
                                        >
                                            <item.icon className="mx-auto mb-2 h-5 w-5 text-[#c8a44e]/70" />
                                            <div className="text-lg font-bold text-white sm:text-xl">
                                                {item.value}
                                            </div>
                                            <div className="text-[10px] text-white/40 uppercase tracking-wide sm:text-xs">
                                                {item.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Decorative card offset */}
                        <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-3xl border border-[#c8a44e]/10 bg-[#c8a44e]/5" />
                    </div>

                    {/* Right: text content */}
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c8a44e]/20 bg-[#c8a44e]/5 px-4 py-1.5">
                            <span className="text-xs font-semibold tracking-wider text-[#c8a44e] uppercase">
                                About The Region
                            </span>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#0f1b3d] sm:text-4xl lg:text-5xl">
                            A Land of{' '}
                            <span className="bg-gradient-to-r from-[#c8a44e] to-[#9a7d35] bg-clip-text text-transparent">
                                Opportunity
                            </span>
                        </h2>
                        <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-500 sm:text-lg">
                            <p>
                                The Turkistan region sits at a strategic
                                crossroads between East and West. As Kazakhstan
                                continues to transform into a regional economic
                                powerhouse, Turkistan stands as its cultural and
                                spiritual capital — and increasingly, its
                                investment hub.
                            </p>
                            <p>
                                With modern infrastructure projects underway,
                                including a new international airport, a high-speed
                                rail link, and world-class SEZ facilities, the
                                region offers unparalleled access to Central Asian
                                markets.
                            </p>
                            <p>
                                Our investment portal provides transparent,
                                real-time data on every project, zone, and
                                opportunity — empowering you to make informed
                                decisions with confidence.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
