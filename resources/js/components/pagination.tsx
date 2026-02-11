import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { PaginatedData } from '@/types';

interface PaginationProps<T> {
    paginator: PaginatedData<T>;
    preserveState?: boolean;
    preserveScroll?: boolean;
}

export default function Pagination<T>({
    paginator,
    preserveState = true,
    preserveScroll = false,
}: PaginationProps<T>) {
    if (paginator.last_page <= 1) {
        return null;
    }

    const navigate = (url: string | null) => {
        if (!url) return;
        router.get(url, {}, { preserveState, preserveScroll, replace: true });
    };

    // Build page numbers to show (with ellipsis)
    const pages = buildPageNumbers(
        paginator.current_page,
        paginator.last_page,
    );

    return (
        <div className="flex flex-col items-center justify-between gap-4 px-2 py-4 sm:flex-row">
            <p className="text-sm text-neutral-500">
                Показано {paginator.from ?? 0}–{paginator.to ?? 0} из{' '}
                {paginator.total}
            </p>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shadow-none"
                    disabled={!paginator.prev_page_url}
                    onClick={() => navigate(paginator.prev_page_url)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {pages.map((page, idx) =>
                    page === '...' ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="flex h-8 w-8 items-center justify-center text-sm text-neutral-400"
                        >
                            …
                        </span>
                    ) : (
                        <Button
                            key={page}
                            variant={
                                page === paginator.current_page
                                    ? 'default'
                                    : 'outline'
                            }
                            size="icon"
                            className="h-8 w-8 shadow-none"
                            onClick={() => {
                                const link = paginator.links.find(
                                    (l) => l.label === String(page),
                                );
                                navigate(link?.url ?? null);
                            }}
                        >
                            {page}
                        </Button>
                    ),
                )}

                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shadow-none"
                    disabled={!paginator.next_page_url}
                    onClick={() => navigate(paginator.next_page_url)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

/**
 * Build an array of page numbers with ellipsis markers.
 * Always show first, last, and a window around the current page.
 */
function buildPageNumbers(
    current: number,
    last: number,
): (number | '...')[] {
    if (last <= 7) {
        return Array.from({ length: last }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];
    const delta = 1;
    const rangeStart = Math.max(2, current - delta);
    const rangeEnd = Math.min(last - 1, current + delta);

    pages.push(1);

    if (rangeStart > 2) {
        pages.push('...');
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
    }

    if (rangeEnd < last - 1) {
        pages.push('...');
    }

    pages.push(last);

    return pages;
}
