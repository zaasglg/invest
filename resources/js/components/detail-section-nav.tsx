import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface DetailSectionNavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    count?: number | string;
}

export default function DetailSectionNav({
    items,
    ariaLabel = 'Бет бөлімдері',
    className,
}: {
    items: DetailSectionNavItem[];
    ariaLabel?: string;
    className?: string;
}) {
    return (
        <nav
            aria-label={ariaLabel}
            className={cn(
                'sticky top-2 z-30 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_14px_36px_-28px_rgba(15,27,61,0.65)] backdrop-blur print:hidden',
                className,
            )}
        >
            <div className="flex min-w-max items-center gap-1">
                {items.map((item) => {
                    const content = (
                        <>
                            <item.icon className="size-4 text-gold-dark" />
                            <span>{item.label}</span>
                            {item.count !== undefined && (
                                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                    {item.count}
                                </span>
                            )}
                        </>
                    );
                    const itemClassName =
                        'inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-sand-light hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40';

                    return item.href.startsWith('#') ? (
                        <a
                            key={`${item.href}-${item.label}`}
                            href={item.href}
                            className={itemClassName}
                        >
                            {content}
                        </a>
                    ) : (
                        <Link
                            key={`${item.href}-${item.label}`}
                            href={item.href}
                            className={itemClassName}
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
