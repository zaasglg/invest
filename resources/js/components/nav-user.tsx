import { Link, router, usePage } from '@inertiajs/react';
import { MoreVertical, LogOut, Settings, User } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { useIsMobile } from '@/hooks/use-mobile';
import { logout } from '@/routes';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import type { SharedData } from '@/types';

export function NavUser() {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    const handleLogout = () => {
        router.flushAll();
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="group data-[state=open]:bg-sidebar-accent/80 p-2 pr-3"
                            data-test="sidebar-menu-button"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <UserInfo user={auth.user} />
                            </div>
                            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="h-7 w-7 rounded-lg hover:bg-sidebar-accent flex items-center justify-center">
                                    <MoreVertical className="size-4 text-muted-foreground" />
                                </div>
                            </div>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="min-w-48 rounded-xl border-sidebar-border/50 bg-popover shadow-lg"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <div className="px-2 py-1.5 mb-1">
                            <p className="text-xs font-medium text-muted-foreground">Меню</p>
                        </div>
                        <DropdownMenuItem asChild className="rounded-lg gap-3 cursor-pointer">
                            <Link className="flex items-center gap-3" href={editProfile()}>
                                <User className="size-4" />
                                <span>Профиль</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-lg gap-3 cursor-pointer">
                            <Link className="flex items-center gap-3" href={editAppearance()}>
                                <Settings className="size-4" />
                                <span>Настройки</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem asChild className="rounded-lg gap-3 cursor-pointer text-destructive focus:text-destructive">
                            <Link
                                className="flex items-center gap-3 text-destructive"
                                href={logout()}
                                as="button"
                                onClick={handleLogout}
                            >
                                <LogOut className="size-4" />
                                <span>Выйти</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
