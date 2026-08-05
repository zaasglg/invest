import { Head, Link } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
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
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
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
    const canModify = useCanModify();

    return (
        <AppLayout breadcrumbs={[{ title: 'Рөлдер', href: '#' }]}>
            <Head title="Рөлдер" />

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold text-gold-dark uppercase">
                            Қолжетімділікті басқару
                        </p>
                        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                            Пайдаланушы рөлдері
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Жүйелік рөлдер мен оларға тиесілі пайдаланушылар.
                        </p>
                    </div>
                    {canModify && (
                        <Link href={rolesRoutes.create.url()}>
                            <Button className="bg-gold text-white hover:bg-gold-dark">
                                <Plus className="h-4 w-4" />
                                Рөл құру
                            </Button>
                        </Link>
                    )}
                </header>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Жүйелік аты</TableHead>
                                <TableHead>Көрсетілетін аты</TableHead>
                                <TableHead>Сипаттама</TableHead>
                                <TableHead>Пайдаланушылар</TableHead>
                                <TableHead className="text-right">
                                    Әрекеттер
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-12 text-center text-gray-400"
                                    >
                                        Мәлімет жоқ
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.data.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium text-gray-400">
                                            #{role.id}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {role.name}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {role.display_name}
                                        </TableCell>
                                        <TableCell className="text-neutral-600">
                                            {role.description || '—'}
                                        </TableCell>
                                        <TableCell>
                                            {role.users_count}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {canModify && (
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={rolesRoutes.edit.url(
                                                            role.id,
                                                        )}
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
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

                <Pagination paginator={roles} />
            </div>
        </AppLayout>
    );
}
