import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
import * as sezs from '@/routes/sezs';
import { useCanModify } from '@/hooks/use-can-modify';
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

interface Sez {
    id: number;
    name: string;
    region: Region;
    total_area: string | null;
    investment_total: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    sezs: Sez[];
}

export default function Index({ sezs: data }: Props) {
    const canModify = useCanModify();
    const handleDelete = (id: number) => {
        if (confirm('Вы уверены?')) {
            router.delete(sezs.destroy.url(id));
        }
    };

    const getStatusLabel = (status: string) => {
        return status === 'active' ? 'Активная' : 'Развивающаяся';
    };

    const getStatusColor = (status: string) => {
        return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800';
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'СЭЗ', href: sezs.index.url() }]}>
            <Head title="СЭЗ" />

            <div className="flex h-full flex-col p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">Специальные экономические зоны</h1>
                    {canModify && (
                        <Button asChild size="sm" className="shadow-none">
                            <Link href={sezs.create.url()}>Создать новую</Link>
                        </Button>
                    )}
                </div>

                <div className="rounded-xl bg-white dark:bg-neutral-900 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead>Регион</TableHead>
                                <TableHead>Площадь (га)</TableHead>
                                <TableHead>Инвестиции</TableHead>
                                <TableHead>Статус</TableHead>
                                {canModify && <TableHead className="text-right">Действия</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((sez) => (
                                <TableRow key={sez.id}>
                                    <TableCell className="font-medium text-neutral-600 dark:text-neutral-400">#{sez.id}</TableCell>
                                    <TableCell className="font-medium">{sez.name}</TableCell>
                                    <TableCell>{sez.region.name}</TableCell>
                                    <TableCell>{sez.total_area || '—'}</TableCell>
                                    <TableCell>{sez.investment_total ? `${sez.investment_total} млн` : '—'}</TableCell>
                                    <TableCell>
                                        <Badge className={`${getStatusColor(sez.status)} px-3 py-1 text-sm font-medium border-0`}>
                                            {getStatusLabel(sez.status)}
                                        </Badge>
                                    </TableCell>
                                    {canModify && (
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                <Link href={sezs.edit.url(sez.id)}>
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors" onClick={() => handleDelete(sez.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-neutral-500">
                                        Нет данных. Создайте первую СЭЗ.
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
