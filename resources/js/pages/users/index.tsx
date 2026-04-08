import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { UserIcon } from 'lucide-react';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
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
    region: Region | null;
    role_model: Role | null;
}

interface Props {
    users: PaginatedData<User>;
}

export default function Index({ users }: Props) {
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

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead className="w-[72px]" />
                                <TableHead>АТЖ</TableHead>
                                <TableHead>Нөмір</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Аймақ</TableHead>
                                <TableHead className="text-right">
                                    Әрекеттер
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
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
                                        <TableCell>
                                            {user.region?.name || '—'}
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
