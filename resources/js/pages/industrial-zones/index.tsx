import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ChevronDown, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import * as industrialZonesRoutes from '@/routes/industrial-zones';
import { useCanModify } from '@/hooks/use-can-modify';

import type { PaginatedData } from '@/types';
import type { FormEvent } from 'react';

interface Region {
    id: number;
    name: string;
}

interface IndustrialZone {
    id: number;
    name: string;
    region: Region;
    total_area: string | null;
    investment_projects_sum_total_investment: string | null;
    status: string;
}

interface Filters {
    search: string;
    region_id: string;
    status: string;
}

interface Props {
    industrialZones: PaginatedData<IndustrialZone>;
    regions: Region[];
    filters: Partial<Filters>;
}

export default function Index({
    industrialZones,
    regions,
    filters,
}: Props) {
    const canModify = useCanModify();
    const { data, setData, get, reset } = useForm<Filters>({
        search: filters.search ?? '',
        region_id: filters.region_id ?? '',
        status: filters.status ?? '',
    });
    const [filtersOpen, setFiltersOpen] = useState(
        !!(filters.search || filters.region_id || filters.status),
    );

    const handleDelete = (id: number) => {
        if (confirm('Вы уверены, что хотите удалить эту ИЗ?')) {
            router.delete(industrialZonesRoutes.destroy.url(id));
        }
    };

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(industrialZonesRoutes.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        router.get(industrialZonesRoutes.index.url());
    };

    const getStatusLabel = (status: string) => {
        return status === 'active' ? 'Активная' : 'Развивающаяся';
    };

    const getStatusColor = (status: string) => {
        return status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-amber-100 text-amber-800';
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Индустриальные зоны',
                    href: industrialZonesRoutes.index.url(),
                },
            ]}
        >
            <Head title="Индустриальные зоны" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Индустриальные зоны
                    </h1>
                    {canModify && (
                        <Link href={industrialZonesRoutes.create.url()}>
                            <Button className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                                <Plus className="mr-2 h-4 w-4" />
                                Создать ИЗ
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-[#0f1b3d]"
                        onClick={() => setFiltersOpen((prev) => !prev)}
                        aria-expanded={filtersOpen}
                    >
                        Фильтры
                        <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {filtersOpen && (
                        <form onSubmit={submitFilters} className="mt-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="search">
                                        Поиск
                                    </Label>
                                    <Input
                                        id="search"
                                        value={data.search}
                                        onChange={(e) =>
                                            setData('search', e.target.value)
                                        }
                                        placeholder="Название ИЗ"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Регион</Label>
                                    <Select
                                        value={data.region_id}
                                        onValueChange={(v) =>
                                            setData('region_id', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Все регионы" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {regions.map((r) => (
                                                <SelectItem
                                                    key={r.id}
                                                    value={String(r.id)}
                                                >
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Статус</Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(v) =>
                                            setData('status', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Все статусы" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                Активная
                                            </SelectItem>
                                            <SelectItem value="developing">
                                                Развивающаяся
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                    type="submit"
                                    className="bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2d5a]"
                                >
                                    Применить
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-gray-200 shadow-none hover:bg-gray-50"
                                    onClick={clearFilters}
                                >
                                    Сбросить
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">
                                    ID
                                </TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead>Регион</TableHead>
                                <TableHead>Площадь (га)</TableHead>
                                <TableHead>Инвестиции (млн)</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead className="text-right">
                                    Действия
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {industrialZones.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-gray-400"
                                    >
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                industrialZones.data.map((zone) => (
                                    <TableRow key={zone.id}>
                                        <TableCell className="font-medium text-gray-400">
                                            #{zone.id}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={industrialZonesRoutes.show.url(
                                                    zone.id,
                                                )}
                                                className="font-semibold text-[#0f1b3d] hover:text-[#c8a44e] hover:underline"
                                            >
                                                {zone.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {zone.region.name}
                                        </TableCell>
                                        <TableCell>
                                            {zone.total_area || '—'}
                                        </TableCell>
                                        <TableCell>
                                            {zone.investment_projects_sum_total_investment
                                                ? `${Number(zone.investment_projects_sum_total_investment) >= 1000000 ? (Number(zone.investment_projects_sum_total_investment) / 1000000).toFixed(1) + ' млн' : Number(zone.investment_projects_sum_total_investment) >= 1000 ? (Number(zone.investment_projects_sum_total_investment) / 1000000).toFixed(2) + ' млн' : zone.investment_projects_sum_total_investment}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`${getStatusColor(zone.status)} border-0 px-3 py-1 text-sm font-medium`}
                                            >
                                                {getStatusLabel(
                                                    zone.status,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                    title="Просмотр"
                                                >
                                                    <Link
                                                        href={industrialZonesRoutes.show.url(
                                                            zone.id,
                                                        )}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {canModify && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                            className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                            title="Редактировать"
                                                        >
                                                            <Link
                                                                href={industrialZonesRoutes.edit.url(
                                                                    zone.id,
                                                                )}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    zone.id,
                                                                )
                                                            }
                                                            title="Удалить"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
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
