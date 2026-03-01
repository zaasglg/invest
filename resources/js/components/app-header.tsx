import { Link, usePage } from '@inertiajs/react';
import { Bell, Menu } from 'lucide-react';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { filterNavItemsByRole, headerNavItems } from '@/config/navigation';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, SharedData } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();
    const filteredHeaderNavItems = filterNavItemsByRole(
        headerNavItems,
        auth.user,
    );

    return (
        <>
            {/* ── Main nav bar ── */}
            <div className="border-b border-white/10 bg-[#0f1b3d]">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    {/* Logo */}
                    <Link href="/dashboard" className="mr-4 flex shrink-0 items-center gap-2.5">
                        <img
                            src="/assets/images/logo-2.png"
                            alt="Turkistan Invest"
                            className="h-7 shrink-0"
                        />
                        <div className="hidden flex-col leading-none sm:flex">
                            <span className="text-xs font-bold tracking-wider text-white">
                                TURKISTAN
                            </span>
                            <span className="text-[9px] font-medium tracking-[0.2em] text-[#c8a44e]">
                                INVEST
                            </span>
                        </div>
                    </Link>

                    {/* Mobile Menu */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 h-[34px] w-[34px] text-white/70 hover:bg-white/10 hover:text-white"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="flex h-full w-72 flex-col items-stretch justify-between border-r-white/10 bg-[#0f1b3d]"
                            >
                                <SheetTitle className="sr-only">
                                    Меню навигации
                                </SheetTitle>
                                <SheetHeader className="flex justify-start border-b border-white/10 px-4 pb-4 text-left">
                                    <div className="flex items-center gap-2.5">
                                        <img
                                            src="/assets/images/logo-2.png"
                                            alt="Turkistan Invest"
                                            className="h-7 shrink-0"
                                        />
                                        <div className="flex flex-col leading-none">
                                            <span className="text-xs font-bold tracking-wider text-white">
                                                TURKISTAN
                                            </span>
                                            <span className="text-[9px] font-medium tracking-[0.2em] text-[#c8a44e]">
                                                INVEST
                                            </span>
                                        </div>
                                    </div>
                                </SheetHeader>
                                <div className="flex h-full flex-1 flex-col space-y-1 p-3">
                                    {filteredHeaderNavItems.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                                                isCurrentUrl(item.href) &&
                                                    'bg-white/10 text-white',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="h-4 w-4" />
                                            )}
                                            <span>{item.title}</span>
                                        </Link>
                                    ))}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="ml-2 hidden h-full items-center lg:flex">
                        <NavigationMenu className="flex h-full items-stretch">
                            <NavigationMenuList className="flex h-full items-stretch gap-0.5">
                                {filteredHeaderNavItems.map((item, index) => (
                                    <NavigationMenuItem
                                        key={index}
                                        className="relative flex h-full items-center"
                                    >
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                'h-9 cursor-pointer rounded-lg bg-transparent px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white data-[active]:bg-transparent',
                                                isCurrentUrl(item.href) &&
                                                    'text-white',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="mr-1.5 h-3.5 w-3.5" />
                                            )}
                                            {item.title}
                                        </Link>
                                        {isCurrentUrl(item.href) && (
                                            <div className="absolute bottom-0 left-2 right-2 h-0.5 translate-y-px rounded-full bg-[#c8a44e]" />
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    {/* Right side: notifications + avatar */}
                    <div className="ml-auto flex items-center gap-1">
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href="/notifications"
                                        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                    >
                                        <Bell className="h-4 w-4" />
                                        {(page.props as any)
                                            .unreadNotificationsCount > 0 && (
                                            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                                                {
                                                    (page.props as any)
                                                        .unreadNotificationsCount
                                                }
                                            </span>
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>Уведомления</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-9 rounded-lg p-0 hover:bg-white/10"
                                >
                                    <Avatar className="size-7 overflow-hidden rounded-lg">
                                        <AvatarImage
                                            src={auth.user.avatar_url as string}
                                            alt={auth.user.name as string}
                                        />
                                        <AvatarFallback className="rounded-lg bg-[#c8a44e]/20 text-xs font-semibold text-[#c8a44e]">
                                            {getInitials(
                                                auth.user.name as string,
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* ── Breadcrumb bar ── */}
            {breadcrumbs.length > 1 && (
                <div className="border-b border-gray-100 bg-white">
                    <div className="mx-auto flex h-11 items-center px-4 md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
