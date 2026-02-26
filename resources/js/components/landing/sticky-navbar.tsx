import { Link } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface NavLink {
    label: string;
    href: string;
}

const navLinks: NavLink[] = [
    { label: 'About', href: '#about' },
    { label: 'Sectors', href: '#sectors' },
    { label: 'Statistics', href: '#statistics' },
    { label: 'Why Turkistan', href: '#why-turkistan' },
    { label: 'Contact', href: '#contact' },
];

export function StickyNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = useCallback(
        (href: string) => {
            setMobileOpen(false);
            const id = href.replace('#', '');
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        [],
    );

    return (
        <header
            className={cn(
                'fixed top-0 right-0 left-0 z-50 transition-all duration-300',
                scrolled
                    ? 'bg-[#0f1b3d]/95 shadow-lg shadow-black/10 backdrop-blur-md'
                    : 'bg-transparent',
            )}
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-3"
                >
                    <img
                        src="/assets/images/logo-2.png"
                        alt="Turkistan Invest"
                        className="h-8 shrink-0 sm:h-10"
                    />
                    <div className="flex flex-col leading-none">
                        <span className="text-sm font-bold tracking-wider text-white sm:text-base">
                            TURKISTAN
                        </span>
                        <span className="text-[10px] font-medium tracking-[0.25em] text-[#c8a44e] sm:text-xs">
                            INVEST
                        </span>
                    </div>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden items-center gap-1 lg:flex">
                    {navLinks.map((link) => (
                        <button
                            key={link.href}
                            onClick={() => scrollTo(link.href)}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            {link.label}
                        </button>
                    ))}
                    <Link
                        href="/login"
                        className="ml-4 rounded-lg border border-white/20 px-5 py-2 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/register"
                        className="ml-2 rounded-lg bg-[#c8a44e] px-5 py-2 text-sm font-semibold text-[#0f1b3d] transition-all hover:bg-[#e3c97a]"
                    >
                        Get Started
                    </Link>
                </nav>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white lg:hidden"
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </button>
            </div>

            {/* Mobile menu */}
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 lg:hidden',
                    mobileOpen
                        ? 'max-h-96 opacity-100'
                        : 'max-h-0 opacity-0',
                )}
            >
                <div className="border-t border-white/10 bg-[#0f1b3d]/98 px-4 pb-6 pt-4 backdrop-blur-md">
                    {navLinks.map((link) => (
                        <button
                            key={link.href}
                            onClick={() => scrollTo(link.href)}
                            className="block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            {link.label}
                        </button>
                    ))}
                    <div className="mt-4 flex flex-col gap-2">
                        <Link
                            href="/login"
                            className="rounded-lg border border-white/20 px-5 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-white/10"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-lg bg-[#c8a44e] px-5 py-2.5 text-center text-sm font-semibold text-[#0f1b3d] transition-all hover:bg-[#e3c97a]"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
