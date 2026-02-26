import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import * as regions from '@/routes/regions';

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
    color: string;
    icon: string;
    type: string;
    subtype: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    regions: PaginatedData<Region>;
}

function resolveRegionIconPath(icon: string | null | undefined): string | null {
    if (!icon) {
        return null;
    }

    if (icon.startsWith('http://') || icon.startsWith('https://')) {
        return icon;
    }

    if (icon.startsWith('/')) {
        return icon;
    }

    if (icon.includes('/')) {
        return `/storage/${icon}`;
    }

    return null;
}

export default function Index({ regions: regionsData }: Props) {
    const handleDelete = (id: number) => {
        if (confirm('Вы уверены?')) {
            router.delete(regions.destroy.url(id));
        }
    };

    return (
        <AppLayout
            breadcrumbs={[{ title: 'Регионы', href: regions.index.url() }]}
        >
            <Head title="Регионы" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Регионы
                    </h1>
                    <Button asChild size="sm" className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                        <Link href={regions.create.url()}>Создать новый</Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead>Тип</TableHead>
                                <TableHead>Цвет</TableHead>
                                <TableHead>Иконка</TableHead>
                                <TableHead className="text-right">
                                    Действия
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {regionsData.data.map((region) => (
                                <TableRow key={region.id}>
                                    <TableCell className="font-medium text-gray-400">
                                        #{region.id}
                                    </TableCell>
                                    <TableCell className="font-semibold text-[#0f1b3d]">{region.name}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                                            {region.type === 'oblast'
                                                ? 'Облыс'
                                                : region.subtype === 'city'
                                                  ? 'Город'
                                                  : 'Район'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-4 w-4 rounded border border-gray-200"
                                                style={{
                                                    backgroundColor:
                                                        region.color ||
                                                        '#3B82F6',
                                                }}
                                            />
                                            <span className="font-mono text-xs text-gray-500 uppercase">
                                                {region.color || '#3B82F6'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                        {(() => {
                                            const iconPath =
                                                resolveRegionIconPath(
                                                    region.icon,
                                                );

                                            return (
                                                <div className="flex items-center gap-2">
                                                    {iconPath && (
                                                        <img
                                                            src={iconPath}
                                                            alt={`Иконка ${region.name}`}
                                                            className="h-5 w-5 object-contain"
                                                        />
                                                    )}
                                                    <span>
                                                        {region.icon ||
                                                            'factory'}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell className="space-x-2 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                            className="h-8 w-8 transition-colors hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                        >
                                            <Link
                                                href={regions.edit.url(
                                                    region.id,
                                                )}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                                            onClick={() =>
                                                handleDelete(region.id)
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {regionsData.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-12 text-center text-gray-400"
                                    >
                                        Нет данных. Создайте первый регион.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={regionsData} />
            </div>
        </AppLayout>
    );
}
