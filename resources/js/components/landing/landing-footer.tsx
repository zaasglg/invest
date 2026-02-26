import { Link } from '@inertiajs/react';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';

export function LandingFooter() {
    const currentYear = new Date().getFullYear();

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <footer id="contact" className="relative bg-[#080e20]">
            {/* CTA bar */}
            <div className="border-b border-white/5">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
                    <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-[#c8a44e]/10 to-[#c8a44e]/5 px-8 py-8 sm:flex-row sm:py-10 lg:px-12">
                        <div>
                            <h3 className="text-xl font-extrabold text-white sm:text-2xl">
                                Ready to invest in Turkistan?
                            </h3>
                            <p className="mt-1 text-sm text-white/50 sm:text-base">
                                Get started today and join 150+ successful
                                investment projects.
                            </p>
                        </div>
                        <Link
                            href="/register"
                            className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#c8a44e] px-7 py-3.5 text-sm font-bold text-[#0f1b3d] transition-all hover:-translate-y-0.5 hover:bg-[#e3c97a] hover:shadow-lg sm:text-base"
                        >
                            Start Now
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer columns */}
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-3">
                            <img
                                src="/assets/images/logo-2.png"
                                alt="Turkistan Invest"
                                className="h-8 shrink-0"
                            />
                            <div className="flex flex-col leading-none">
                                <span className="text-sm font-bold tracking-wider text-white">
                                    TURKISTAN
                                </span>
                                <span className="text-[10px] font-medium tracking-[0.25em] text-[#c8a44e]">
                                    INVEST
                                </span>
                            </div>
                        </div>
                        <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/40">
                            The official investment portal of the Turkistan
                            region. Connecting international investors with
                            world-class opportunities in Central Asia.
                        </p>
                    </div>

                    {/* Quick links */}
                    <div>
                        <h4 className="text-xs font-semibold tracking-wider text-white/60 uppercase">
                            Navigation
                        </h4>
                        <ul className="mt-4 space-y-3">
                            {[
                                { label: 'About', id: 'about' },
                                { label: 'Sectors', id: 'sectors' },
                                {
                                    label: 'Statistics',
                                    id: 'statistics',
                                },
                                {
                                    label: 'Why Turkistan',
                                    id: 'why-turkistan',
                                },
                            ].map((link) => (
                                <li key={link.id}>
                                    <button
                                        onClick={() => scrollTo(link.id)}
                                        className="text-sm text-white/40 transition-colors hover:text-white/80"
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="text-xs font-semibold tracking-wider text-white/60 uppercase">
                            For Investors
                        </h4>
                        <ul className="mt-4 space-y-3">
                            {[
                                'Investment Guide',
                                'Legal Framework',
                                'Tax Incentives',
                                'FAQ',
                            ].map((item) => (
                                <li key={item}>
                                    <Link
                                        href="#"
                                        className="text-sm text-white/40 transition-colors hover:text-white/80"
                                    >
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-xs font-semibold tracking-wider text-white/60 uppercase">
                            Contact
                        </h4>
                        <ul className="mt-4 space-y-3">
                            <li className="flex items-start gap-3">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#c8a44e]" />
                                <span className="text-sm text-white/40">
                                    Turkistan city, Kazakhstan
                                    <br />
                                    Akimat of Turkistan Region
                                </span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="h-4 w-4 shrink-0 text-[#c8a44e]" />
                                <a
                                    href="tel:+77252212345"
                                    className="text-sm text-white/40 transition-colors hover:text-white/80"
                                >
                                    +7 (725) 221-23-45
                                </a>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="h-4 w-4 shrink-0 text-[#c8a44e]" />
                                <a
                                    href="mailto:invest@turkistan.gov.kz"
                                    className="text-sm text-white/40 transition-colors hover:text-white/80"
                                >
                                    invest@turkistan.gov.kz
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
                    <p className="text-xs text-white/30">
                        &copy; {currentYear} Turkistan Invest. All rights
                        reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link
                            href="#"
                            className="text-xs text-white/30 transition-colors hover:text-white/60"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="#"
                            className="text-xs text-white/30 transition-colors hover:text-white/60"
                        >
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
