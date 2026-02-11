import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
import * as subsoilUsersRoutes from '@/routes/subsoil-users';
import { useCanModify } from '@/hooks/use-can-modify';

import type { PaginatedData } from '@/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface Region {
    id: number;
    name: string;
}

interface SubsoilUser {
    id: number;
    name: string;
    bin: string;
    region: Region;
    mineral_type: string;
    license_status: 'active' | 'expired' | 'suspended';
    license_start: string | null;
    license_end: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    subsoilUsers: PaginatedData<SubsoilUser>;
}

const getStatusLabel = (status: SubsoilUser['license_status']) => {
    if (status === 'active') return 'Активна';
    if (status === 'expired') return 'Истекла';
    return 'Приостановлена';
};

const getStatusColor = (status: SubsoilUser['license_status']) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'expired') return 'bg-gray-100 text-gray-800';
    return 'bg-amber-100 text-amber-800';
};

const formatDate = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
};

export default function Index({ subsoilUsers }: Props) {
    const canModify = useCanModify();
    const handleDelete = (id: number) => {
        if (confirm('Вы уверены?')) {
            router.delete(subsoilUsersRoutes.destroy.url(id));
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Недропользование', href: subsoilUsersRoutes.index.url() }]}>
            <Head title="Недропользование" />

            <div className="flex h-full flex-col p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">Недропользование</h1>
                    {canModify && (
                        <Button asChild size="sm" className="shadow-none">
                            <Link href={subsoilUsersRoutes.create.url()}>Создать нового</Link>
                        </Button>
                    )}
                </div>

                <div className="rounded-xl bg-white dark:bg-neutral-900 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead>БИН</TableHead>
                                <TableHead>Регион</TableHead>
                                <TableHead>Минерал</TableHead>
                                <TableHead>Лицензия</TableHead>
                                <TableHead>Период</TableHead>
                                {canModify && <TableHead className="text-right">Действия</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subsoilUsers.data.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium text-neutral-600 dark:text-neutral-400">#{user.id}</TableCell>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.bin}</TableCell>
                                    <TableCell>{user.region?.name || '—'}</TableCell>
                                    <TableCell>{user.mineral_type}</TableCell>
                                    <TableCell>
                                        <Badge className={`${getStatusColor(user.license_status)} px-3 py-1 text-sm font-medium border-0`}>
                                            {getStatusLabel(user.license_status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(user.license_start)} — {formatDate(user.license_end)}
                                    </TableCell>
                                    {canModify && (
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                <Link href={subsoilUsersRoutes.edit.url(user.id)}>
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {subsoilUsers.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-neutral-500">
                                        Нет данных. Создайте первого недропользователя.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={subsoilUsers} />
            </div>
        </AppLayout>
    );
}
