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
import { ChevronDown, Eye, Edit, Plus, Trash2 } from 'lucide-react';
import * as sezs from '@/routes/sezs';
import { useCanModify } from '@/hooks/use-can-modify';

import type { PaginatedData } from '@/types';
import type { FormEvent } from 'react';
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

interface Filters {
    search: string;
    region_id: string;
    status: string;
}

interface Props {
    sezs: PaginatedData<Sez>;
    regions: Region[];
    filters: Partial<Filters>;
}

export default function Index({
    sezs: sezsData,
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
        if (confirm('Вы уверены?')) {
            router.delete(sezs.destroy.url(id));
        }
    };

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(sezs.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        router.get(sezs.index.url());
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
            breadcrumbs={[{ title: 'СЭЗ', href: sezs.index.url() }]}
        >
            <Head title="СЭЗ" />

            <div className="flex h-full flex-col p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
                        Специальные экономические зоны
                    </h1>
                    {canModify && (
                        <Link href={sezs.create.url()}>
                            <Button className="shadow-none">
                                <Plus className="mr-2 h-4 w-4" />
                                Создать новую
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between text-left text-sm font-medium text-neutral-800 dark:text-neutral-200"
                        onClick={() => setFiltersOpen((prev) => !prev)}
                        aria-expanded={filtersOpen}
                    >
                        Фильтры
                        <ChevronDown
                            className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
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
                                        placeholder="Название СЭЗ"
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
                                    className="shadow-none"
                                >
                                    Применить
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="shadow-none"
                                    onClick={clearFilters}
                                >
                                    Сбросить
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="rounded-xl bg-white dark:bg-neutral-900 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">
                                    ID
                                </TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead>Регион</TableHead>
                                <TableHead>Площадь (га)</TableHead>
                                <TableHead>Инвестиции</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead className="text-right">
                                    Действия
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sezsData.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center text-neutral-500"
                                    >
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sezsData.data.map((sez) => (
                                    <TableRow key={sez.id}>
                                        <TableCell className="font-medium text-neutral-600 dark:text-neutral-400">
                                            #{sez.id}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={sezs.show.url(
                                                    sez.id,
                                                )}
                                                className="text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                {sez.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {sez.region.name}
                                        </TableCell>
                                        <TableCell>
                                            {sez.total_area || '—'}
                                        </TableCell>
                                        <TableCell>
                                            {sez.investment_total
                                                ? `${Number(sez.investment_total) >= 1000000 ? (Number(sez.investment_total) / 1000000).toFixed(1) + ' млн' : Number(sez.investment_total) >= 1000 ? (Number(sez.investment_total) / 1000000).toFixed(2) + ' млн' : sez.investment_total}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`${getStatusColor(sez.status)} border-0 px-3 py-1 text-sm font-medium`}
                                            >
                                                {getStatusLabel(
                                                    sez.status,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                                    title="Просмотр"
                                                >
                                                    <Link
                                                        href={sezs.show.url(
                                                            sez.id,
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
                                                            className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                                            title="Редактировать"
                                                        >
                                                            <Link
                                                                href={sezs.edit.url(
                                                                    sez.id,
                                                                )}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    sez.id,
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

                <Pagination paginator={sezsData} />
            </div>
        </AppLayout>
    );
}
