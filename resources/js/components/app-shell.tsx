import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { AssistantHub } from '@/components/assistant-hub';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { SharedData } from '@/types';

type Props = {
    children: ReactNode;
    variant?: 'header' | 'sidebar';
};

export function AppShell({ children, variant = 'header' }: Props) {
    const { auth, sidebarOpen: isOpen } = usePage<SharedData>().props;
    const showChat =
        Boolean(auth.user) && auth.user.role_model?.name !== 'applicant';

    if (variant === 'header') {
        return (
            <div className="app-shell flex min-h-screen w-full flex-col overflow-x-hidden">
                {children}
                {showChat && <AssistantHub key={auth.user.id} />}
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={isOpen}>
            {children}
            {showChat && <AssistantHub key={auth.user.id} />}
        </SidebarProvider>
    );
}
