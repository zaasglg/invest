import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2, UserIcon, X } from 'lucide-react';
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
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { PaginatedData } from '@/types';
import * as usersRoutes from '@/routes/users';

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
    baskarma_type: 'oblast' | 'district' | null;
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
    { label: 'Облыстық басқарма', value: 'oblast' },
    { label: 'Аудандық', value: 'district' },
    { label: 'Қосымша инстанциялар', value: 'additional' },
] as const;

export default function Index({ users, filters }: Props) {
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

    const handleDelete = (id: number) => {
        if (confirm('Бұл пайдаланушыны жоюға сенімдісіз бе?')) {
            router.delete(usersRoutes.destroy.url(id));
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Пайдаланушылар', href: '#' }]}>
            <Head title="Пайдаланушылар" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Пайдаланушылар
                    </h1>
                    <Link href={usersRoutes.create.url()}>
                        <Button className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            <Plus className="mr-2 h-4 w-4" />
                            Пайдаланушы құру
                        </Button>
                    </Link>
                </div>

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
                                            {user.baskarma_type === 'district'
                                                ? user.region?.name ||
                                                  user.position ||
                                                  '—'
                                                : user.position || '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() =>
                                                        handleDelete(user.id)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
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
