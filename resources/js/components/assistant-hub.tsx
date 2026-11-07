import { usePage } from '@inertiajs/react';
import * as Dialog from '@radix-ui/react-dialog';
import {
    BotMessageSquare,
    ChevronRight,
    MessageCircle,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AssistantPanel } from '@/components/assistant-panel';
import { ChatWidget } from '@/components/chat-widget';
import { ProactiveAssistantWidget } from '@/components/proactive-assistant-widget';
import { Button } from '@/components/ui/button';
import type { SharedData } from '@/types';

type AssistantView = 'menu' | 'chat' | 'activity' | null;

export function AssistantHub() {
    const { unreadAssistantNotificationsCount } = usePage<SharedData>().props;
    const [view, setView] = useState<AssistantView>(null);
    const currentView = useRef<AssistantView>(null);
    const [unreadCount, setUnreadCount] = useState(
        unreadAssistantNotificationsCount,
    );

    useEffect(() => {
        setUnreadCount(unreadAssistantNotificationsCount);
    }, [unreadAssistantNotificationsCount]);

    useEffect(() => {
        const handleCounts = (event: Event) => {
            const counts = (event as CustomEvent<{ assistant_count: number }>)
                .detail;
            setUnreadCount(counts.assistant_count);
        };

        window.addEventListener('notification-counts-updated', handleCounts);

        return () =>
            window.removeEventListener(
                'notification-counts-updated',
                handleCounts,
            );
    }, []);

    const changeView = (nextView: AssistantView) => {
        currentView.current = nextView;
        setView(nextView);
    };
    const openMenu = () => changeView('menu');
    const close = () => changeView(null);
    const handleCloseAutoFocus = (event: Event) => {
        // Switching services should focus the new panel, not the launcher.
        if (currentView.current !== null) event.preventDefault();
    };
    const badge = unreadCount > 99 ? '99+' : unreadCount;

    return (
        <Dialog.Root
            modal={false}
            open={view !== null}
            onOpenChange={(open) => changeView(open ? 'menu' : null)}
        >
            <Dialog.Trigger asChild>
                <Button
                    type="button"
                    size="icon"
                    aria-label={
                        view !== null
                            ? 'Көмекшіні жабу'
                            : unreadCount > 0
                              ? `Көмекшілерді ашу, ${unreadCount} оқылмаған хабарлама`
                              : 'Көмекшілерді ашу'
                    }
                    title={view !== null ? 'Жабу' : 'Көмекшілер'}
                    className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-[1000] h-14 w-14 rounded-full border border-[#c8a44e]/60 bg-[#0f1b3d] p-0 text-[#e3c97a] shadow-[0_8px_28px_rgba(15,27,61,0.28)] transition-colors hover:border-[#e3c97a] hover:bg-[#1b3156] focus-visible:ring-[#c8a44e] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:left-6 print:hidden"
                >
                    {view !== null ? (
                        <X className="size-6" />
                    ) : (
                        <MessageCircle className="size-6" />
                    )}
                    {unreadCount > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white"
                        >
                            {badge}
                        </span>
                    )}
                </Button>
            </Dialog.Trigger>

            {view === 'menu' && (
                <AssistantPanel
                    title="Көмекшілер"
                    description="Қажетті көмекті таңдаңыз"
                    icon={MessageCircle}
                    onCloseAutoFocus={handleCloseAutoFocus}
                    className="sm:w-[360px]"
                >
                    <div className="min-h-0 space-y-2 overflow-y-auto p-3">
                        <button
                            type="button"
                            onClick={() => changeView('chat')}
                            className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:border-[#c8a44e]/25 hover:bg-[#f8f6ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a44e]"
                        >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f1b3d] text-[#e3c97a]">
                                <BotMessageSquare className="h-6 w-6" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-[#0f1b3d]">
                                    AI көмекші
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                    Сұрақтар, талдау және кеңес
                                </span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[#9a7624]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => changeView('activity')}
                            className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:border-[#c8a44e]/25 hover:bg-[#f8f6ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a44e]"
                        >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f5e8bd] to-[#c8a44e] text-[#0f1b3d]">
                                <Sparkles className="h-6 w-6" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0f1b3d]">
                                    Іс-қимыл көмекшісі
                                    {unreadCount > 0 && (
                                        <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                                            {badge} жаңа
                                        </span>
                                    )}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                    Ұсыныстар мен мерзім ескертулері
                                </span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[#9a7624]" />
                        </button>
                    </div>
                    <div className="shrink-0 border-t bg-slate-50 px-4 py-2.5 text-center text-[10px] font-medium tracking-widest text-slate-400">
                        IN-MAP
                    </div>
                </AssistantPanel>
            )}

            <ChatWidget
                isOpen={view === 'chat'}
                onBack={openMenu}
                onCloseAutoFocus={handleCloseAutoFocus}
            />
            <ProactiveAssistantWidget
                isOpen={view === 'activity'}
                onBack={openMenu}
                onClose={close}
                onCloseAutoFocus={handleCloseAutoFocus}
            />
        </Dialog.Root>
    );
}
