import { Head, Link, usePage, router, useForm } from '@inertiajs/react';
import { ChevronDown, Eye, Pencil, Plus, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import { formatMoneyCompact } from '@/lib/utils';
import * as promZonesRoutes from '@/routes/prom-zones';

import type { PaginatedData } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface PromZone {
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
    promZones: PaginatedData<PromZone>;
    regions: Region[];
    filters: Partial<Filters>;
}

export default function Index({ promZones, regions, filters }: Props) {
    const { url } = usePage();
    const canModify = useCanModify();
    const { data, setData, get } = useForm<Filters>({
        search: filters.search ?? '',
        region_id: filters.region_id ?? '',
        status: filters.status ?? '',
    });
    const [filtersOpen, setFiltersOpen] = useState(
        !!(filters.search || filters.region_id || filters.status),
    );

    const handleDelete = (id: number) => {
        if (confirm('Бұл пром зонаны жоюға сенімдісіз бе?')) {
            router.delete(promZonesRoutes.destroy.url(id));
        }
    };

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(promZonesRoutes.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        router.get(promZonesRoutes.index.url());
    };

    const getStatusLabel = (status: string) => {
        return status === 'active' ? 'Белсенді' : 'Дамушы';
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
                    title: 'Пром зоналар',
                    href: promZonesRoutes.index.url(),
                },
            ]}
        >
            <Head title="Пром зоналар" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Пром зоналар
                    </h1>
                    {canModify && (
                        <Link href={promZonesRoutes.create.url()}>
                            <Button className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                                <Plus className="mr-2 h-4 w-4" />
                                Пром зона құру
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
                        Сүзгілер
                        <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {filtersOpen && (
                        <form onSubmit={submitFilters} className="mt-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="search">Іздеу</Label>
                                    <Input
                                        id="search"
                                        value={data.search}
                                        onChange={(e) =>
                                            setData('search', e.target.value)
                                        }
                                        placeholder="Пром зона атауы"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Аймақ</Label>
                                    <Select
                                        value={data.region_id}
                                        onValueChange={(v) =>
                                            setData('region_id', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Барлық аймақтар" />
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
                                    <Label>Күйі</Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(v) =>
                                            setData('status', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Барлық күйлер" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                Белсенді
                                            </SelectItem>
                                            <SelectItem value="developing">
                                                Дамушы
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
                                    Қолдану
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-gray-200 shadow-none hover:bg-gray-50"
                                    onClick={clearFilters}
                                >
                                    Тазалау
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Атауы</TableHead>
                                <TableHead>Аймақ</TableHead>
                                <TableHead>Аумағы (га)</TableHead>
                                <TableHead>Инвестициялар (млн)</TableHead>
                                <TableHead>Күйі</TableHead>
                                <TableHead className="text-right">
                                    Әрекеттер
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {promZones.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-gray-400"
                                    >
                                        Деректер жоқ
                                    </TableCell>
                                </TableRow>
                            ) : (
                                promZones.data.map((zone) => (
                                    <TableRow key={zone.id}>
                                        <TableCell className="font-medium text-gray-400">
                                            #{zone.id}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={promZonesRoutes.show.url(
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
                                                ? (() => {
                                                      const v = Number(
                                                          zone.investment_projects_sum_total_investment,
                                                      );
                                                      return formatMoneyCompact(
                                                          v,
                                                          {
                                                              includeCurrency: false,
                                                          },
                                                      );
                                                  })()
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`${getStatusColor(zone.status)} border-0 px-3 py-1 text-sm font-medium`}
                                            >
                                                {getStatusLabel(zone.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                    title="Қарау"
                                                >
                                                    <Link
                                                        href={promZonesRoutes.show.url(
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
                                                            title="Өңдеу"
                                                        >
                                                            <Link
                                                                href={
                                                                    promZonesRoutes.edit.url(
                                                                        zone.id,
                                                                    ) +
                                                                    `?return_to=${encodeURIComponent(url)}`
                                                                }
                                                            >
                                                                {/* <Pencil className="h-4 w-4" /> */}
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    zone.id,
                                                                )
                                                            }
                                                            title="Жою"
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

                <Pagination paginator={promZones} />
            </div>
        </AppLayout>
    );
}


