import { Link, usePage } from '@inertiajs/react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import {
    adminNavItems,
    filterNavItemsByRole,
    mainNavItems,
    projectNavItems,
    zoneNavItems,
} from '@/config/navigation';
import type { NavItem, SharedData } from '@/types';
import AppLogo from './app-logo';

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const filteredMain = filterNavItemsByRole(mainNavItems, auth.user);
    const filteredZones = filterNavItemsByRole(zoneNavItems, auth.user);
    const filteredProjects = filterNavItemsByRole(projectNavItems, auth.user);
    const filteredAdmin = filterNavItemsByRole(adminNavItems, auth.user);
    const sections = [
        { label: 'Обзор', items: filteredMain },
        { label: 'Зоны', items: filteredZones },
        { label: 'Проекты', items: filteredProjects },
        { label: 'Администрирование', items: filteredAdmin },
    ].filter((section) => section.items.length > 0);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-b from-sidebar-accent/30 to-transparent">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-0">
                {sections.map((section, index) => (
                    <div key={section.label}>
                        <NavMain items={section.items} label={section.label} />
                        {index < sections.length - 1 && <SidebarSeparator />}
                    </div>
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/50 bg-gradient-to-t from-sidebar-accent/20 to-transparent">
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
