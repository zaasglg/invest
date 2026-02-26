import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
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
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
    region: Region | null;
    role_model: Role | null;
}

interface Props {
    users: PaginatedData<User>;
}

export default function Index({ users }: Props) {
    const handleDelete = (id: number) => {
        if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            router.delete(usersRoutes.destroy.url(id));
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Пользователи', href: '#' }
        ]}>
            <Head title="Пользователи" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Пользователи
                    </h1>
                    <Link href={usersRoutes.create.url()}>
                        <Button className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            <Plus className="mr-2 h-4 w-4" />
                            Создать пользователя
                        </Button>
                    </Link>
                </div>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>ФИО</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Роль</TableHead>
                                <TableHead>Регион</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-gray-400">
                                            #{user.id}
                                        </TableCell>
                                        <TableCell className="font-semibold text-[#0f1b3d]">{user.full_name}</TableCell>
                                        <TableCell className="text-gray-500">{user.email}</TableCell>
                                        <TableCell>{user.role_model?.display_name || '—'}</TableCell>
                                        <TableCell>{user.region?.name || '—'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Link href={usersRoutes.edit.url(user.id)}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() => handleDelete(user.id)}
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
