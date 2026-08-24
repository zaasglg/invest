import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import TurkistanDistrictMap from '@/components/auth/turkistan-district-map';

type Props = {
    children: ReactNode;
    description: string;
    eyebrow?: string;
    maxWidth?: '440' | '520';
    title: string;
};

export default function AuthPlatformShell({
    children,
    description,
    eyebrow,
    maxWidth = '440',
    title,
}: Props) {
    return (
        <div className="relative min-h-svh overflow-x-hidden bg-[#04090F] font-sans text-white">
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                    background:
                        'radial-gradient(50% 45% at 50% 32%, rgba(34, 211, 238, 0.05), transparent 70%)',
                }}
            />

            <div
                className="pointer-events-none absolute inset-y-[-10%] left-[58%] w-[min(56rem,90vw)] -translate-x-1/2"
                aria-hidden="true"
            >
                <TurkistanDistrictMap className="h-full w-full" />
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#04090F] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#04090F] to-transparent" />
            </div>

            <main className="relative z-10 flex min-h-svh items-center justify-center px-5 py-16 sm:px-8">
                <div
                    className={
                        maxWidth === '520'
                            ? 'w-full max-w-[520px]'
                            : 'w-full max-w-[440px]'
                    }
                >
                    <div className="relative border border-white/[0.09] bg-[#0A121D] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-9">
                        <CornerTick className="-top-px -left-px border-t border-l" />
                        <CornerTick className="-top-px -right-px border-t border-r" />
                        <CornerTick className="-bottom-px -left-px border-b border-l" />
                        <CornerTick className="-right-px -bottom-px border-r border-b" />

                        <div className="mb-8">
                            {eyebrow && (
                                <p className="mb-3 text-xs font-bold tracking-[0.18em] text-cyan-300 uppercase">
                                    {eyebrow}
                                </p>
                            )}
                            <h1 className="text-2xl font-bold tracking-[-0.02em] text-white">
                                {title}
                            </h1>
                            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                                {description}
                            </p>
                        </div>

                        {children}
                    </div>

                    <Link
                        href="/"
                        className="mx-auto mt-7 flex w-fit items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-200"
                    >
                        <ArrowLeft className="size-4" />
                        Басты бетке оралу
                    </Link>
                </div>
            </main>

            <p className="pointer-events-none absolute inset-x-0 bottom-6 z-10 hidden text-center text-xs text-slate-600 sm:block">
                IN-MAP · Инвестициялық платформа
            </p>
        </div>
    );
}

function CornerTick({ className }: { className: string }) {
    return (
        <span
            aria-hidden="true"
            className={`pointer-events-none absolute size-3.5 border-cyan-300/40 ${className}`}
        />
    );
}
