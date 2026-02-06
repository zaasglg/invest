import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import * as regions from '@/routes/regions';
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
    type: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    regions: Region[];
}

export default function Index({ regions: data }: Props) {
    const handleDelete = (id: number) => {
        if (confirm('Вы уверены?')) {
            router.delete(regions.destroy.url(id));
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Регионы', href: regions.index.url() }]}>
            <Head title="Регионы" />

            <div className="flex h-full flex-col p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">Регионы</h1>
                    <Button asChild size="sm" className="shadow-none">
                        <Link href={regions.create.url()}>Создать новый</Link>
                    </Button>
                </div>

                <div className="rounded-xl bg-white dark:bg-neutral-900 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((region) => (
                                <TableRow key={region.id}>
                                    <TableCell className="font-medium text-neutral-600 dark:text-neutral-400">#{region.id}</TableCell>
                                    <TableCell>{region.name}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                            <Link href={regions.edit.url(region.id)}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors" onClick={() => handleDelete(region.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-neutral-500">
                                        Нет данных. Создайте первый регион.
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
