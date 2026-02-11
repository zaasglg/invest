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

            <div className="flex h-full flex-col p-4">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
                        Пользователи
                    </h1>
                    <Link href={usersRoutes.create.url()}>
                        <Button className="shadow-none">
                            <Plus className="h-4 w-4 mr-2" />
                            Создать пользователя
                        </Button>
                    </Link>
                </div>

                <div>
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
                                    <TableCell colSpan={6} className="text-center text-neutral-500">
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            #{user.id}
                                        </TableCell>
                                        <TableCell className="font-medium">{user.full_name}</TableCell>
                                        <TableCell className="text-neutral-600">{user.email}</TableCell>
                                        <TableCell>{user.role_model?.display_name || '—'}</TableCell>
                                        <TableCell>{user.region?.name || '—'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={usersRoutes.edit.url(user.id)}>
                                                    <Button variant="ghost" size="icon">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(user.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
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
