import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import * as projectTypes from '@/routes/project-types';

import type { PaginatedData } from '@/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface ProjectType {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    types: PaginatedData<ProjectType>;
}

export default function Index({ types }: Props) {
    const handleDelete = (id: number) => {
        if (confirm('Вы уверены?')) {
            router.delete(projectTypes.destroy.url(id));
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Типы проектов', href: projectTypes.index.url() }]}>
            <Head title="Типы проектов" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">Типы проектов</h1>
                    <Button asChild size="sm" className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                        <Link href={projectTypes.create.url()}>Создать новый</Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {types.data.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium text-gray-400">#{type.id}</TableCell>
                                    <TableCell>{type.name}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]">
                                            <Link href={projectTypes.edit.url(type.id)}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(type.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {types.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-12 text-center text-gray-400">
                                        Нет данных. Создайте первый тип проекта.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={types} />
            </div>
        </AppLayout>
    );
}
