import { Link, usePage } from '@inertiajs/react';
import { Bell, Menu, MessageCircle, Shield, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Breadcrumbs } from '@/components/breadcrumbs';
import InMapLogo from '@/components/inmap-logo';
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
import {
    index as chatsIndex,
    unreadCount as chatUnreadCount,
} from '@/routes/chats';
import {
    index as notificationsIndex,
    unreadCount as notificationUnreadCount,
} from '@/routes/notifications';
import type { BreadcrumbItem, NavItem, SharedData } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const COMPACT_HEADER_NAV_TITLES = new Set([
    'Аймақтар',
    'Компаниялар',
    'Жоба түрлері',
    'Рейтинг',
]);

function HeaderNavIcon({
    icon,
    className,
}: {
    icon: NavItem['icon'];
    className: string;
}) {
    if (!icon) return null;

    const Icon = icon as LucideIcon;

    return <Icon className={className} />;
}

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const { isCurrentUrl } = useCurrentUrl();
    const [unreadChatMessagesCount, setUnreadChatMessagesCount] = useState(
        page.props.unreadChatMessagesCount,
    );
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(
        page.props.unreadNotificationsCount,
    );
    const filteredHeaderNavItems = filterNavItemsByRole(
        headerNavItems,
        auth.user,
    );
    const compactHeaderNavItems = filteredHeaderNavItems.filter((item) =>
        COMPACT_HEADER_NAV_TITLES.has(item.title),
    );
    const desktopHeaderNavItems = filteredHeaderNavItems.filter(
        (item) => !COMPACT_HEADER_NAV_TITLES.has(item.title),
    );

    useEffect(() => {
        setUnreadChatMessagesCount(page.props.unreadChatMessagesCount);
    }, [page.props.unreadChatMessagesCount]);

    useEffect(() => {
        setUnreadNotificationsCount(page.props.unreadNotificationsCount);
    }, [page.props.unreadNotificationsCount]);

    useEffect(() => {
        const handleNotificationCounts = (event: Event) => {
            const counts = (
                event as CustomEvent<{
                    count: number;
                    assistant_count: number;
                }>
            ).detail;
            setUnreadNotificationsCount(counts.count);
        };

        window.addEventListener(
            'notification-counts-updated',
            handleNotificationCounts,
        );

        return () =>
            window.removeEventListener(
                'notification-counts-updated',
                handleNotificationCounts,
            );
    }, []);

    useEffect(() => {
        const loadUnreadCounts = async () => {
            try {
                const requestOptions = {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                };
                const [chatResponse, notificationResponse] = await Promise.all([
                    fetch(chatUnreadCount.url(), requestOptions),
                    fetch(notificationUnreadCount.url(), requestOptions),
                ]);

                if (chatResponse.ok) {
                    const chatData = (await chatResponse.json()) as {
                        count: number;
                    };
                    setUnreadChatMessagesCount(chatData.count);
                }

                if (notificationResponse.ok) {
                    const notificationData =
                        (await notificationResponse.json()) as {
                            count: number;
                            assistant_count: number;
                        };
                    setUnreadNotificationsCount(notificationData.count);
                    window.dispatchEvent(
                        new CustomEvent('notification-counts-updated', {
                            detail: notificationData,
                        }),
                    );
                }
            } catch {
                // Keep the last known counts when the connection is unavailable.
            }
        };

        void loadUnreadCounts();
        const intervalId = window.setInterval(loadUnreadCounts, 5000);

        return () => window.clearInterval(intervalId);
    }, [auth.user.id]);

    return (
        <>
            {/* ── Main nav bar ── */}
            <div className="border-b border-white/10 bg-[#081224]">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    {/* Logo */}
                    <Link
                        href="/dashboard"
                        className="mr-4 flex shrink-0 items-center"
                    >
                        <InMapLogo />
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
                                className="flex h-full w-72 flex-col items-stretch justify-between border-r-white/10 bg-[#081224]"
                            >
                                <SheetTitle className="sr-only">
                                    Навигация мәзірі
                                </SheetTitle>
                                <SheetHeader className="flex justify-start border-b border-white/10 px-4 pb-4 text-left">
                                    <InMapLogo />
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
                                            <HeaderNavIcon
                                                icon={item.icon}
                                                className="h-4 w-4"
                                            />
                                            <span>{item.title}</span>
                                        </Link>
                                    ))}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="ml-2 hidden h-full min-w-0 flex-1 items-center lg:flex">
                        <div className="w-full overflow-hidden">
                            <NavigationMenu className="flex h-full w-max max-w-none items-stretch justify-start">
                                <NavigationMenuList className="flex h-full flex-nowrap items-stretch justify-start gap-0.5">
                                    {desktopHeaderNavItems.map(
                                        (item, index) => (
                                            <NavigationMenuItem
                                                key={index}
                                                className="relative flex h-full items-center"
                                            >
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        navigationMenuTriggerStyle(),
                                                        'h-9 cursor-pointer rounded-lg bg-transparent px-2 text-xs font-medium whitespace-nowrap text-white/70 transition-colors hover:bg-white/10 hover:text-white data-[active]:bg-transparent',
                                                        isCurrentUrl(
                                                            item.href,
                                                        ) && 'text-white',
                                                    )}
                                                >
                                                    <HeaderNavIcon
                                                        icon={item.icon}
                                                        className="mr-1.5 h-3.5 w-3.5"
                                                    />
                                                    {item.title}
                                                </Link>
                                                {isCurrentUrl(item.href) && (
                                                    <div className="absolute right-2 bottom-0 left-2 h-0.5 translate-y-px rounded-full bg-[#c8a44e]" />
                                                )}
                                            </NavigationMenuItem>
                                        ),
                                    )}
                                </NavigationMenuList>
                            </NavigationMenu>
                        </div>
                    </div>

                    {/* Right side: notifications + avatar */}
                    <div className="ml-auto flex items-center gap-1">
                        {compactHeaderNavItems.map((item) => (
                            <TooltipProvider key={item.title} delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            aria-label={item.title}
                                            className={cn(
                                                'flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white',
                                                isCurrentUrl(item.href) &&
                                                    'bg-white/10 text-white',
                                            )}
                                        >
                                            <HeaderNavIcon
                                                icon={item.icon}
                                                className="h-4 w-4"
                                            />
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {item.title}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                        {(auth.user?.role_model?.name === 'superadmin' ||
                            auth.user?.role === 'superadmin') && (
                            <>
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href="/roles"
                                                className={cn(
                                                    'flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white',
                                                    isCurrentUrl('/roles') &&
                                                        'bg-white/10 text-white',
                                                )}
                                            >
                                                <Shield className="h-4 w-4" />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>Рөлдер</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href="/users"
                                                className={cn(
                                                    'flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white',
                                                    isCurrentUrl('/users') &&
                                                        'bg-white/10 text-white',
                                                )}
                                            >
                                                <Users className="h-4 w-4" />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Пайдаланушылар
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </>
                        )}
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={chatsIndex.url()}
                                        className={cn(
                                            'relative flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white',
                                            isCurrentUrl('/chats') &&
                                                'bg-white/10 text-white',
                                        )}
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        {unreadChatMessagesCount > 0 && (
                                            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                                                {unreadChatMessagesCount > 99
                                                    ? '99+'
                                                    : unreadChatMessagesCount}
                                            </span>
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>Жоба чаттары</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={notificationsIndex.url()}
                                        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                    >
                                        <Bell className="h-4 w-4" />
                                        {unreadNotificationsCount > 0 && (
                                            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                                                {unreadNotificationsCount > 99
                                                    ? '99+'
                                                    : unreadNotificationsCount}
                                            </span>
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>Хабарламалар</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-9 rounded-lg p-0 hover:bg-white/10"
                                >
                                    <Avatar className="size-7 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user.avatar_url as string}
                                            alt={auth.user.name as string}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="rounded-full bg-[#c8a44e]/20 text-xs font-semibold text-[#c8a44e]">
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
