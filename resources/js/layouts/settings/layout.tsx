import { Link } from '@inertiajs/react';
import { KeyRound, Palette, ShieldCheck, UserCircle } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';

import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Профиль',
        href: edit(),
        icon: UserCircle,
    },
    {
        title: 'Пароль',
        href: editPassword(),
        icon: KeyRound,
    },
    {
        title: 'Двухфакторная аутентификация',
        href: show(),
        icon: ShieldCheck,
    },
    {
        title: 'Оформление',
        href: editAppearance(),
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentUrl } = useCurrentUrl();

    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    return (
        <div className="mx-auto max-w-7xl px-6 py-6">
            <Heading
                title="Настройки"
                description="Управление профилем и настройками аккаунта"
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                <aside className="w-full shrink-0 lg:w-56">
                    <nav
                        className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm"
                        aria-label="Settings"
                    >
                        <div className="flex flex-col gap-0.5">
                            {sidebarNavItems.map((item, index) => (
                                <Button
                                    key={`${toUrl(item.href)}-${index}`}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn(
                                        'w-full justify-start rounded-lg text-gray-500 shadow-none hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]',
                                        {
                                            'bg-[#0f1b3d]/5 text-[#0f1b3d] font-semibold':
                                                isCurrentUrl(item.href),
                                        },
                                    )}
                                >
                                    <Link href={item.href}>
                                        {item.icon && (
                                            <item.icon className="h-4 w-4" />
                                        )}
                                        {item.title}
                                    </Link>
                                </Button>
                            ))}
                        </div>
                    </nav>
                </aside>

                <Separator className="lg:hidden" />

                <div className="min-w-0 flex-1">
                    <section className="max-w-2xl space-y-6">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
