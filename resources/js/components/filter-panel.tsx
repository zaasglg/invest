import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type FilterPanelProps = {
    open: boolean;
    onToggle: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onClear: () => void;
    activeCount?: number;
    gridClassName?: string;
    showTrigger?: boolean;
    children: ReactNode;
};

export default function FilterPanel({
    open,
    onToggle,
    onSubmit,
    onClear,
    activeCount = 0,
    gridClassName,
    showTrigger = true,
    children,
}: FilterPanelProps) {
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        onSubmit(event);
        onToggle();
    };

    return (
        <Drawer
            direction="right"
            open={open}
            onOpenChange={(nextOpen) => {
                if (nextOpen !== open) onToggle();
            }}
        >
            {showTrigger && (
                <DrawerTrigger asChild>
                    <Button variant="outline">
                        <SlidersHorizontal data-icon="inline-start" />
                        Сүзгілер
                        {activeCount > 0 && (
                            <span className="flex size-5 items-center justify-center rounded-md bg-navy text-[11px] font-bold text-white tabular-nums">
                                {activeCount}
                            </span>
                        )}
                    </Button>
                </DrawerTrigger>
            )}

            <DrawerContent className="w-[min(92vw,36rem)] border-slate-200 bg-[#f7f8fa] sm:max-w-xl">
                <DrawerHeader className="border-b border-slate-200 bg-white px-6 py-5">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-md bg-navy text-white">
                            <SlidersHorizontal className="size-4" />
                        </span>
                        <div>
                            <DrawerTitle className="text-lg font-extrabold text-navy">
                                Сүзгілер
                            </DrawerTitle>
                            <DrawerDescription>
                                Тізімдегі нәтижелерді нақтылау
                            </DrawerDescription>
                        </div>
                    </div>
                </DrawerHeader>

                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <ScrollArea className="min-h-0 flex-1">
                        <div
                            className={cn(
                                'grid grid-cols-1 gap-5 p-6',
                                gridClassName,
                            )}
                        >
                            {children}
                        </div>
                    </ScrollArea>
                    <DrawerFooter className="flex-row border-t border-slate-200 bg-white px-6 py-4">
                        <Button type="submit" className="flex-1">
                            Қолдану
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClear}
                        >
                            <RotateCcw data-icon="inline-start" />
                            Тазалау
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}
