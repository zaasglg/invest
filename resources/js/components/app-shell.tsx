import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ChatWidget } from '@/components/chat-widget';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { SharedData } from '@/types';

type Props = {
    children: ReactNode;
    variant?: 'header' | 'sidebar';
};

export function AppShell({ children, variant = 'header' }: Props) {
    const { auth, sidebarOpen: isOpen } = usePage<SharedData>().props;
    const roleName = auth.user?.role_model?.name;
    const showChat = roleName !== 'investor' && roleName !== 'moderator';

    if (variant === 'header') {
        return (
            <div className="app-shell flex min-h-screen w-full flex-col overflow-x-hidden">
                {children}
                {showChat && <ChatWidget />}
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={isOpen}>
            {children}
            {showChat && <ChatWidget />}
        </SidebarProvider>
    );
}
