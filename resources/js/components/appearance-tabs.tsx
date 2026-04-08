import { Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'inline-flex gap-1 rounded-lg bg-neutral-100 p-1',
                className,
            )}
            {...props}
        >
            <button
                className={cn(
                    'flex items-center rounded-md bg-white px-3.5 py-1.5 shadow-xs transition-colors',
                )}
            >
                <Sun className="-ml-1 h-4 w-4" />
                <span className="ml-1.5 text-sm">Жарық тақырып</span>
            </button>
        </div>
    );
}
