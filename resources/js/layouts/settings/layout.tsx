import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, KeyRound, Settings2, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import { cn, toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as editPassword } from '@/routes/user-password';
import type { NavItem } from '@/types';

type SettingsNavItem = Omit<NavItem, 'icon'> & {
    description: string;
    icon: LucideIcon;
};

const sidebarNavItems: SettingsNavItem[] = [
    {
        title: 'Профиль',
        description: 'Жеке мәліметтер және Telegram',
        href: edit(),
        icon: UserRound,
    },
    {
        title: 'Құпия сөз',
        description: 'Аккаунт қауіпсіздігі',
        href: editPassword(),
        icon: KeyRound,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const currentPath = usePage().url.split('?')[0];

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
            <header className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy-light to-[#29457f] px-6 py-7 shadow-[0_18px_45px_-28px_rgba(15,27,61,0.9)] sm:px-8">
                <div className="absolute -top-20 -right-16 h-52 w-52 rounded-full border border-white/10 bg-white/5" />
                <div className="absolute -right-4 -bottom-24 h-44 w-44 rounded-full border border-gold/20" />

                <div className="relative flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-gold-light shadow-inner backdrop-blur-sm">
                        <Settings2 className="size-6" />
                    </div>
                    <div>
                        <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-gold-light uppercase">
                            Аккаунт
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            Параметрлер
                        </h1>
                        <p className="mt-1 max-w-xl text-sm text-white/65">
                            Жеке мәліметтеріңізді, Telegram байланысын және
                            құпия сөзіңізді басқарыңыз.
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
                <aside className="lg:sticky lg:top-6">
                    <nav
                        className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_10px_35px_-28px_rgba(15,27,61,0.7)]"
                        aria-label="Параметрлер"
                    >
                        {sidebarNavItems.map((item) => {
                            const href = toUrl(item.href);
                            const active = currentPath === href.split('?')[0];

                            return (
                                <Link
                                    key={href}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors',
                                        active
                                            ? 'bg-navy text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-navy',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                                            active
                                                ? 'bg-white/10 text-gold-light'
                                                : 'bg-slate-100 text-slate-500 group-hover:bg-navy/5 group-hover:text-navy',
                                        )}
                                    >
                                        {item.icon && (
                                            <item.icon className="size-[18px]" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold">
                                            {item.title}
                                        </span>
                                        <span
                                            className={cn(
                                                'mt-0.5 block truncate text-xs',
                                                active
                                                    ? 'text-white/60'
                                                    : 'text-slate-400',
                                            )}
                                        >
                                            {item.description}
                                        </span>
                                    </span>
                                    <ChevronRight
                                        className={cn(
                                            'size-4 shrink-0',
                                            active
                                                ? 'text-white/50'
                                                : 'text-slate-300',
                                        )}
                                    />
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <main className="min-w-0 space-y-6">{children}</main>
            </div>
        </div>
    );
}
