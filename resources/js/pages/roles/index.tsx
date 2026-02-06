import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
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

interface Role {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    users_count: number;
}

interface Props {
    roles: Role[];
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

            <div className="flex h-full flex-col p-4">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
                        Роли пользователей
                    </h1>
                    <Link href={rolesRoutes.create.url()}>
                        <Button className="shadow-none">
                            <Plus className="h-4 w-4 mr-2" />
                            Создать роль
                        </Button>
                    </Link>
                </div>

                <div>
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
                            {roles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-neutral-500">
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">
                                            #{role.id}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{role.name}</TableCell>
                                        <TableCell className="font-medium">{role.display_name}</TableCell>
                                        <TableCell className="text-neutral-600">{role.description || '—'}</TableCell>
                                        <TableCell>{role.users_count}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={rolesRoutes.edit.url(role.id)}>
                                                    <Button variant="ghost" size="icon">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(role.id, role.users_count)}
                                                    disabled={role.users_count > 0}
                                                >
                                                    <Trash2 className={`h-4 w-4 ${role.users_count > 0 ? 'text-neutral-300' : 'text-red-500'}`} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
