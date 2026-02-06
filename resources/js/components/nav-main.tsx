import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [], label }: { items: NavItem[]; label?: string }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-3">
            {label && (
                <SidebarGroupLabel className="px-2 mb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    {label}
                </SidebarGroupLabel>
            )}
            <SidebarMenu className="gap-1">
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                            className="h-9 rounded-lg px-3 font-medium transition-all duration-200 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary data-[active=true]:to-primary/90 data-[active=true]:text-primary-foreground data-[active=true]:shadow-md hover:bg-sidebar-accent/80 hover:translate-x-0.5"
                        >
                            <Link href={item.href} prefetch>
                                {item.icon && <item.icon className="h-4 w-4" />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
