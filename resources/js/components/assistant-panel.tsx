import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AssistantPanelProps = {
    title: string;
    description: string;
    icon: LucideIcon;
    children: ReactNode;
    className?: string;
    onBack?: () => void;
    onCloseAutoFocus: (event: Event) => void;
};

export function AssistantPanel({
    title,
    description,
    icon: Icon,
    children,
    className,
    onBack,
    onCloseAutoFocus,
}: AssistantPanelProps) {
    return (
        <Dialog.Portal>
            <Dialog.Content
                onCloseAutoFocus={onCloseAutoFocus}
                className={cn(
                    'fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 z-[1001] flex max-h-[var(--assistant-panel-max-height)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#c8a44e]/25 bg-background text-foreground shadow-[0_20px_70px_-15px_rgba(15,27,61,0.35)] outline-none [--assistant-panel-max-height:calc(100dvh_-_7rem_-_env(safe-area-inset-bottom))] motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:left-6 sm:w-[400px] print:hidden',
                    className,
                )}
            >
                <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-br from-[#0f1b3d] to-[#1b3156] px-4 py-4 text-white">
                    {onBack ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Көмекшілер мәзіріне оралу"
                            onClick={onBack}
                            className="h-9 w-9 shrink-0 rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c8a44e]/20 text-[#e3c97a]">
                            <Icon className="h-5 w-5" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <Dialog.Title className="text-sm leading-5 font-semibold sm:text-base">
                            {title}
                        </Dialog.Title>
                        <Dialog.Description className="mt-1 text-xs leading-4 text-white/60">
                            {description}
                        </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Көмекшіні жабу"
                            className="h-9 w-9 shrink-0 rounded-full bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Dialog.Close>
                </div>
                {children}
            </Dialog.Content>
        </Dialog.Portal>
    );
}
