import {
    Briefcase,
    Factory,
    Folder,
    LayoutDashboard,
    Layers,
    Map as MapIcon,
    Shield,
    Tags,
    Users,
} from 'lucide-react';
import { dashboard } from '@/routes';
import * as industrialZones from '@/routes/industrial-zones';
import * as investmentProjects from '@/routes/investment-projects';
import * as projectTypes from '@/routes/project-types';
import * as regions from '@/routes/regions';
import * as roles from '@/routes/roles';
import * as sezs from '@/routes/sezs';
import * as subsoilUsers from '@/routes/subsoil-users';
import * as usersRoutes from '@/routes/users';
import type { NavItem, User } from '@/types';

export const mainNavItems: NavItem[] = [
    {
        title: 'Дашборд',
        href: dashboard.url(),
        icon: LayoutDashboard,
    },
];

export const zoneNavItems: NavItem[] = [
    {
        title: 'СЭЗ',
        href: sezs.index.url(),
        icon: Folder,
    },
    {
        title: 'ИЗ',
        href: industrialZones.index.url(),
        icon: Factory,
    },
    {
        title: 'Недропользование',
        href: subsoilUsers.index.url(),
        icon: Layers,
    },
    {
        title: 'Регионы',
        href: regions.index.url(),
        icon: MapIcon,
    },
];

export const projectNavItems: NavItem[] = [
    {
        title: 'Инвест. проекты',
        href: investmentProjects.index.url(),
        icon: Briefcase,
    },
    {
        title: 'Типы проектов',
        href: projectTypes.index.url(),
        icon: Tags,
    },
];

export const adminNavItems: NavItem[] = [
    {
        title: 'Роли',
        href: roles.index.url(),
        icon: Shield,
    },
    {
        title: 'Пользователи',
        href: usersRoutes.index.url(),
        icon: Users,
    },
];

export const headerNavItems: NavItem[] = [
    ...mainNavItems,
    ...zoneNavItems,
    ...projectNavItems,
    ...adminNavItems,
];

const HIDDEN_NAV_TITLES_BY_ROLE: Record<string, Set<string>> = {
    akim: new Set([
        'Регионы',
        'Инвест. проекты',
        'Типы проектов',
        'Роли',
        'Пользователи',
    ]),
    zamakim: new Set([
        'Регионы',
        'Инвест. проекты',
        'Типы проектов',
        'Роли',
        'Пользователи',
    ]),
};

const normalizeRoleKey = (value: string) => value.toLowerCase().replace(/\s+/g, '');

export const getRoleKey = (user: User | null | undefined): string | null => {
    if (!user) return null;

    const roleCandidates = [
        user.role,
        user.role_model?.name ?? null,
        user.role_model?.display_name ?? null,
    ].filter(Boolean) as string[];

    if (roleCandidates.length === 0) return null;

    const normalizedCandidates = roleCandidates.map((candidate) =>
        normalizeRoleKey(candidate),
    );

    if (normalizedCandidates.some((value) => value.includes('zamakim'))) {
        return 'zamakim';
    }

    if (normalizedCandidates.some((value) => value.includes('akim'))) {
        return 'akim';
    }

    return null;
};

export const filterNavItemsByRole = (items: NavItem[], user: User | null | undefined) => {
    const roleKey = getRoleKey(user);
    if (!roleKey) return items;

    const hidden = HIDDEN_NAV_TITLES_BY_ROLE[roleKey];
    if (!hidden) return items;

    return items.filter((item) => !hidden.has(item.title));
};
