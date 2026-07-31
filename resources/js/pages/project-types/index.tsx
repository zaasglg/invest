import { Head, Link, router } from '@inertiajs/react';
import { Trash2, Edit } from 'lucide-react';
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
import * as projectTypes from '@/routes/project-types';
import type { PaginatedData } from '@/types';

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
    const canModify = useCanModify();

    const handleDelete = (id: number) => {
        if (confirm('Сенімдісіз бе?')) {
            router.delete(projectTypes.destroy.url(id));
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Жоба түрлері', href: projectTypes.index.url() },
            ]}
        >
            <Head title="Жоба түрлері" />

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold text-gold-dark uppercase">
                            Анықтамалық
                        </p>
                        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                            Жоба түрлері
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Инвестициялық жобаларды жіктеуге арналған санаттар.
                        </p>
                    </div>
                    {canModify && (
                        <Button
                            asChild
                            size="sm"
                            className="bg-gold text-white hover:bg-gold-dark"
                        >
                            <Link href={projectTypes.create.url()}>
                                Жаңа қосу
                            </Link>
                        </Button>
                    )}
                </header>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Атауы</TableHead>
                                <TableHead className="text-right">
                                    Әрекеттер
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {types.data.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium text-gray-400">
                                        #{type.id}
                                    </TableCell>
                                    <TableCell>{type.name}</TableCell>
                                    <TableCell className="space-x-2 text-right">
                                        {canModify && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                >
                                                    <Link
                                                        href={projectTypes.edit.url(
                                                            type.id,
                                                        )}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() =>
                                                        handleDelete(type.id)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {types.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="py-12 text-center text-gray-400"
                                    >
                                        Мәлімет жоқ. Бірінші жоба түрін құрыңыз.
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
