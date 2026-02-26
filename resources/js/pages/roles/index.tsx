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
import * as rolesRoutes from '@/routes/roles';

import type { PaginatedData } from '@/types';

interface Role {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    users_count: number;
}

interface Props {
    roles: PaginatedData<Role>;
}

export default function Index({ roles }: Props) {
    const handleDelete = (id: number, usersCount: number) => {
        if (usersCount > 0) {
            alert('Невозможно удалить роль, так как она назначена пользователям.');
            return;
        }

        if (confirm('Вы уверены, что хотите удалить эту роль?')) {
            router.delete(rolesRoutes.destroy.url(id));
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Роли', href: '#' }
        ]}>
            <Head title="Роли" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Роли пользователей
                    </h1>
                    <Link href={rolesRoutes.create.url()}>
                        <Button className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            <Plus className="h-4 w-4 mr-2" />
                            Создать роль
                        </Button>
                    </Link>
                </div>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Системное имя</TableHead>
                                <TableHead>Отображаемое имя</TableHead>
                                <TableHead>Описание</TableHead>
                                <TableHead>Пользователей</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.data.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium text-gray-400">
                                            #{role.id}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{role.name}</TableCell>
                                        <TableCell className="font-medium">{role.display_name}</TableCell>
                                        <TableCell className="text-neutral-600">{role.description || '—'}</TableCell>
                                        <TableCell>{role.users_count}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={rolesRoutes.edit.url(role.id)}>
                                                    <Button variant="ghost" size="icon" className="hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() => handleDelete(role.id, role.users_count)}
                                                    disabled={role.users_count > 0}
                                                >
                                                    <Trash2 className={`h-4 w-4 ${role.users_count > 0 ? 'text-neutral-300' : ''}`} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={roles} />
            </div>
        </AppLayout>
    );
}
