import { MapPin, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface Region {
    id: number;
    name: string;
    color?: string | null;
    icon?: string | null;
    geometry: { lat: number; lng: number }[] | null;
}

interface RegionSidebarProps {
    regions: Region[];
    activeRegionId: number | null;
    onRegionSelect: (region: Region) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function RegionSidebar({
    regions,
    activeRegionId,
    onRegionSelect,
    open,
    onOpenChange,
}: RegionSidebarProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {!open && (
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="fixed top-20 left-13 z-[1000] h-10 w-10 rounded-lg border border-white/20 bg-[#0f1b3d]/90 text-white shadow-lg backdrop-blur-sm hover:bg-[#0f1b3d] hover:text-[#c8a44e]"
                        title="Аудандар мен қалалар"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent
                side="left"
                className="w-80 border-r-white/10 bg-[#0f1b3d] p-0"
            >
                <SheetTitle className="sr-only">
                    Аудандар мен қалалар
                </SheetTitle>
                <SheetHeader className="border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-[#c8a44e]" />
                        <h2 className="text-base font-semibold text-white">
                            Аудандар мен қалалар
                        </h2>
                    </div>
                </SheetHeader>
                <div className="flex flex-col gap-1 overflow-y-auto p-3">
                    {regions.map((region) => (
                        <button
                            key={region.id}
                            onClick={() => {
                                onRegionSelect(region);
                                onOpenChange(false);
                            }}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                                activeRegionId === region.id &&
                                    'bg-[#c8a44e]/20 text-[#c8a44e]',
                            )}
                        >
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                    backgroundColor: region.color || '#c8a44e',
                                }}
                            />
                            <span>{region.name}</span>
                        </button>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}
