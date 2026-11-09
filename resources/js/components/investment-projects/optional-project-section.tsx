import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export default function OptionalProjectSection({
    planned,
    title,
    children,
    hasError = false,
    className = '',
}: {
    planned: boolean;
    title: string;
    children: ReactNode;
    hasError?: boolean;
    className?: string;
}) {
    if (!planned) return children;

    return (
        <details
            open={hasError || undefined}
            className={`group rounded-lg border border-slate-200 bg-white p-4 ${className}`}
        >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-medium text-[#0f1b3d] outline-none focus-visible:ring-2 focus-visible:ring-gold/50 [&::-webkit-details-marker]:hidden">
                <span>
                    {title}{' '}
                    <span className="font-normal text-slate-400">
                        · міндетті емес
                    </span>
                </span>
                <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                />
            </summary>
            <div className="mt-4 space-y-4">{children}</div>
        </details>
    );
}
