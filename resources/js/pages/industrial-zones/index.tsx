import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import * as industrialZonesRoutes from '@/routes/industrial-zones';
import { useCanModify } from '@/hooks/use-can-modify';

import type { PaginatedData } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface IndustrialZone {
    id: number;
    name: string;
    region: Region;
    total_area: string | null;
    investment_total: string | null;
    status: string;
}

interface Props {
    industrialZones: PaginatedData<IndustrialZone>;
}

export default function Index({ industrialZones }: Props) {
    const canModify = useCanModify();
    const handleDelete = (id: number) => {
        if (confirm('Вы уверены, что хотите удалить эту ИЗ?')) {
            router.delete(industrialZonesRoutes.destroy.url(id));
        }
    };

    const getStatusLabel = (status: string) => {
        return status === 'active' ? 'Активная' : 'Развивающаяся';
    };

    const getStatusColor = (status: string) => {
        return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800';
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Индустриальные зоны', href: '#' }
        ]}>
            <Head title="Индустриальные зоны" />

            <div className="flex h-full flex-col p-4">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
                        Индустриальные зоны
                    </h1>
                    {canModify && (
                        <Link href={industrialZonesRoutes.create.url()}>
                            <Button className="shadow-none">
                                <Plus className="h-4 w-4 mr-2" />
                                Создать ИЗ
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Наименование</TableHead>
                                <TableHead>Регион</TableHead>
                                <TableHead>Площадь (га)</TableHead>
                                <TableHead>Инвестиции (млн)</TableHead>
                                <TableHead>Статус</TableHead>
                                {canModify && <TableHead className="text-right">Действия</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {industrialZones.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-neutral-500">
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                industrialZones.data.map((zone) => (
                                    <TableRow key={zone.id}>
                                        <TableCell className="font-medium">{zone.name}</TableCell>
                                        <TableCell>{zone.region.name}</TableCell>
                                        <TableCell>{zone.total_area || '—'}</TableCell>
                                        <TableCell>{zone.investment_total || '—'}</TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusColor(zone.status)} px-3 py-1 text-sm font-medium border-0`}>
                                                {getStatusLabel(zone.status)}
                                            </Badge>
                                        </TableCell>
                                        {canModify && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={industrialZonesRoutes.edit.url(zone.id)}>
                                                        <Button variant="ghost" size="icon">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(zone.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={industrialZones} />
            </div>
        </AppLayout>
    );
}
