import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import * as projectTypes from '@/routes/project-types';
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
    types: ProjectType[];
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

            <div className="flex h-full flex-col p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">Типы проектов</h1>
                    <Button asChild size="sm" className="shadow-none">
                        <Link href={projectTypes.create.url()}>Создать новый</Link>
                    </Button>
                </div>

                <div className="rounded-xl bg-white dark:bg-neutral-900 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {types.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium text-neutral-600 dark:text-neutral-400">#{type.id}</TableCell>
                                    <TableCell>{type.name}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                            <Link href={projectTypes.edit.url(type.id)}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors" onClick={() => handleDelete(type.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {types.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-neutral-500">
                                        Нет данных. Создайте первый тип проекта.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
