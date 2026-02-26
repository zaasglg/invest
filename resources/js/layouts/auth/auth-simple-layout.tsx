import { Link } from '@inertiajs/react';

import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f1b3d] via-[#162650] to-[#0a1228]" />
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8a44e' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative z-10 w-full max-w-sm">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/assets/images/logo-2.png"
                            alt="Turkistan Invest"
                            className="h-10 shrink-0"
                        />
                        <div className="flex flex-col leading-none">
                            <span className="text-base font-bold tracking-wider text-white">
                                TURKISTAN
                            </span>
                            <span className="text-xs font-medium tracking-[0.25em] text-[#c8a44e]">
                                INVEST
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/20 backdrop-blur-md">
                    <div className="mb-6 flex flex-col items-center gap-2">
                        <h1 className="text-xl font-bold text-white">
                            {title}
                        </h1>
                        <p className="text-center text-sm text-white/50">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>

                {/* Back link */}
                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-sm text-white/40 transition-colors hover:text-white/70"
                    >
                        &larr; Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
