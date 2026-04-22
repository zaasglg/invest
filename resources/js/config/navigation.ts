import {
    Award,
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
import * as promZones from '@/routes/prom-zones';
import * as projectTypes from '@/routes/project-types';
import * as regions from '@/routes/regions';
import * as roles from '@/routes/roles';
import * as sezs from '@/routes/sezs';
import * as subsoilUsers from '@/routes/subsoil-users';
import * as usersRoutes from '@/routes/users';
import type { NavItem, User } from '@/types';

export const mainNavItems: NavItem[] = [
    {
        title: 'Басқару тақтасы',
        href: dashboard.url(),
        icon: LayoutDashboard,
    },
];

export const zoneNavItems: NavItem[] = [
    {
        title: 'АЭА',
        href: sezs.index.url(),
        icon: Folder,
    },
    {
        title: 'ИА',
        href: industrialZones.index.url(),
        icon: Factory,
    },
    {
        title: 'Пром зона',
        href: promZones.index.url(),
        icon: Factory,
    },
    {
        title: 'Жер қойнауын пайдалану',
        href: subsoilUsers.index.url(),
        icon: Layers,
    },
    {
        title: 'Аймақтар',
        href: regions.index.url(),
        icon: MapIcon,
    },
];

export const projectNavItems: NavItem[] = [
    {
        title: 'Инвест. жобалар',
        href: investmentProjects.index.url(),
        icon: Briefcase,
    },
    {
        title: 'Жоба түрлері',
        href: projectTypes.index.url(),
        icon: Tags,
    },
    {
        title: 'Рейтинг',
        href: '/baskarma-rating',
        icon: Award,
    },
];

export const adminNavItems: NavItem[] = [
    {
        title: 'Рөлдер',
        href: roles.index.url(),
        icon: Shield,
    },
    {
        title: 'Пайдаланушылар',
        href: usersRoutes.index.url(),
        icon: Users,
    },
];

export const headerNavItems: NavItem[] = [
    ...mainNavItems,
    {
        title: 'Инвест. жобалар',
        href: investmentProjects.index.url(),
        icon: Briefcase,
    },
    ...zoneNavItems,
    ...projectNavItems.filter((item) => item.title !== 'Инвест. жобалар'),
    ...adminNavItems,
];

const HIDDEN_NAV_TITLES_BY_ROLE: Record<string, Set<string>> = {
    akim: new Set(['Аймақтар', 'Жоба түрлері', 'Рөлдер', 'Пайдаланушылар']),
    zamakim: new Set(['Аймақтар', 'Жоба түрлері', 'Рөлдер', 'Пайдаланушылар']),
    invest: new Set(['Аймақтар', 'Рөлдер', 'Пайдаланушылар']),
    ispolnitel: new Set([
        'Аймақтар',
        'Жоба түрлері',
        'Рөлдер',
        'Пайдаланушылар',
    ]),
};

// Nav titles that each invest sub-role is NOT allowed to see.
const HIDDEN_NAV_TITLES_BY_INVEST_SUB_ROLE: Record<string, Set<string>> = {
    aea: new Set(['ИА', 'Пром зона', 'Жер қойнауын пайдалану']),
    ia: new Set(['АЭА', 'Пром зона', 'Жер қойнауын пайдалану']),
    prom_zone: new Set(['АЭА', 'ИА', 'Жер қойнауын пайдалану']),
    // turkistan_invest sees everything — no entry needed
};

const normalizeRoleKey = (value: string) =>
    value.toLowerCase().replace(/\s+/g, '');

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

    // Check exact role names first
    if (normalizedCandidates.some((value) => value === 'invest')) {
        return 'invest';
    }

    if (normalizedCandidates.some((value) => value === 'ispolnitel')) {
        return 'ispolnitel';
    }

    if (normalizedCandidates.some((value) => value.includes('zamakim'))) {
        return 'zamakim';
    }

    if (normalizedCandidates.some((value) => value.includes('akim'))) {
        return 'akim';
    }

    return null;
};

export const filterNavItemsByRole = (
    items: NavItem[],
    user: User | null | undefined,
) => {
    // Only superadmin can see Аймақтар
    let filteredItems = items;
    const isSuperAdmin =
        user?.role_model?.name === 'superadmin' || user?.role === 'superadmin';
    if (!isSuperAdmin) {
        filteredItems = filteredItems.filter(
            (item) => item.title !== 'Аймақтар',
        );
    }

    const roleKey = getRoleKey(user);
    if (!roleKey) return filteredItems;

    const hidden = HIDDEN_NAV_TITLES_BY_ROLE[roleKey];
    if (hidden) {
        filteredItems = filteredItems.filter((item) => !hidden.has(item.title));
    }

    // For invest users, also hide nav items based on sub-role.
    if (roleKey === 'invest' && user?.invest_sub_role) {
        const subRoleHidden =
            HIDDEN_NAV_TITLES_BY_INVEST_SUB_ROLE[user.invest_sub_role];
        if (subRoleHidden) {
            filteredItems = filteredItems.filter(
                (item) => !subRoleHidden.has(item.title),
            );
        }
    }

    return filteredItems;
};
