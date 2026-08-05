import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Search, UserIcon, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { getIspolnitelTypeLabel } from '@/lib/ispolnitel-types';
import { cn } from '@/lib/utils';
import * as usersRoutes from '@/routes/users';
import type { PaginatedData } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface Role {
    id: number;
    display_name: string;
}

interface User {
    id: number;
    full_name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    baskarma_type: 'oblast' | 'district' | 'additional' | null;
    position: string | null;
    region: Region | null;
    role_model: Role | null;
}

interface Props {
    users: PaginatedData<User>;
    filters: { baskarma_type?: string; search?: string };
}

const FILTER_TABS = [
    { label: 'Барлығы', value: '' },
    { label: 'Басқармалар', value: 'oblast' },
    { label: 'Аудандық', value: 'district' },
    { label: 'Қосымша инстанциялар', value: 'additional' },
] as const;

export default function Index({ users, filters }: Props) {
    const canModify = useCanModify();
    const activeFilter = filters.baskarma_type ?? '';
    const [search, setSearch] = useState(filters.search ?? '');

    const visitUsers = (baskarmaType: string, searchValue: string) => {
        const query: Record<string, string> = {};
        const normalizedSearch = searchValue.trim();

        if (baskarmaType) query.baskarma_type = baskarmaType;
        if (normalizedSearch) query.search = normalizedSearch;

        router.get(usersRoutes.index.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const applyFilter = (value: string) => {
        visitUsers(value, search);
    };

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        visitUsers(activeFilter, search);
    };

    const clearSearch = () => {
        setSearch('');
        visitUsers(activeFilter, '');
    };
    const formatShortName = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length <= 1) return fullName;
        const first = parts[0];
        const initials = parts
            .slice(1)
            .map((p) => p.charAt(0).toUpperCase())
            .join('');
        return `${first} ${initials}`;
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Пайдаланушылар', href: '#' }]}>
            <Head title="Пайдаланушылар" />

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold text-gold-dark uppercase">
                            Жүйені басқару
                        </p>
                        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                            Пайдаланушылар
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Қолжетімділік, рөлдер және жауапты қызметкерлер
                            тізімі.
                        </p>
                    </div>
                    {canModify && (
                        <Link href={usersRoutes.create.url()}>
                            <Button className="bg-gold text-white hover:bg-gold-dark">
                                <Plus className="h-4 w-4" />
                                Пайдаланушы құру
                            </Button>
                        </Link>
                    )}
                </header>

                {/* Filter tabs */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap gap-2">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => applyFilter(tab.value)}
                                className={cn(
                                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                                    activeFilter === tab.value
                                        ? 'bg-[#0f1b3d] text-white'
                                        : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50',
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <form
                        onSubmit={submitSearch}
                        className="flex w-full gap-2 lg:w-[440px]"
                    >
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="АТЖ немесе лауазым бойынша іздеу"
                                aria-label="АТЖ немесе лауазым бойынша іздеу"
                                className="h-10 bg-white pr-9 pl-9"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    aria-label="Іздеуді тазалау"
                                    className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="h-10 bg-[#0f1b3d] px-5 text-white hover:bg-[#17284f]"
                        >
                            Іздеу
                        </Button>
                    </form>
                </div>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead className="w-[72px]" />
                                <TableHead>АТЖ</TableHead>
                                <TableHead>Нөмір</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Лауазым / Аудан</TableHead>
                                <TableHead className="text-right">
                                    Әрекеттер
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-gray-400"
                                    >
                                        Мәлімет жоқ
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-gray-400">
                                            #{user.id}
                                        </TableCell>
                                        <TableCell>
                                            {user.avatar ? (
                                                <img
                                                    src={`storage/${user.avatar}`}
                                                    alt={user.full_name}
                                                    className="h-10 w-10 rounded-full"
                                                />
                                            ) : (
                                                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                                                    <UserIcon className="h-7 w-7 text-gray-400" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-semibold text-[#0f1b3d]">
                                            {formatShortName(user.full_name)}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {user.phone || '—'}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            <div className="flex flex-col gap-0.5">
                                                {user.baskarma_type && (
                                                    <span className="text-xs font-medium text-[#0f1b3d]">
                                                        {getIspolnitelTypeLabel(
                                                            user.baskarma_type,
                                                        )}
                                                    </span>
                                                )}
                                                <span>
                                                    {user.baskarma_type ===
                                                    'district'
                                                        ? user.region?.name ||
                                                          user.position ||
                                                          '—'
                                                        : user.position || '—'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {canModify && (
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        href={usersRoutes.edit.url(
                                                            user.id,
                                                        )}
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={users} />
            </div>
        </AppLayout>
    );
}
