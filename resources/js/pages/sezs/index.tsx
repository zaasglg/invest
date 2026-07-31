import { Head, Link, usePage, router, useForm } from '@inertiajs/react';
import { Edit, Eye, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import FilterPanel from '@/components/filter-panel';
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
import * as sezs from '@/routes/sezs';
import type { PaginatedData } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface Sez {
    id: number;
    name: string;
    region: Region;
    total_area: string | null;
    investment_projects_sum_total_investment: string | null;
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

export default function Index({ sezs: sezsData, regions, filters }: Props) {
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
        if (confirm('Сенімдісіз бе?')) {
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
        return status === 'active' ? 'Белсенді' : 'Дамушы';
    };

    const getStatusColor = (status: string) => {
        return status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-amber-100 text-amber-800';
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'АЭА', href: sezs.index.url() }]}>
            <Head title="АЭА" />

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold text-gold-dark uppercase">
                            Инвестициялық инфрақұрылым
                        </p>
                        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                            Арнайы экономикалық аймақтар
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Аймақтағы АЭА аумағы, инвестициялары және ағымдағы
                            күйі.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setFiltersOpen(true)}
                        >
                            <SlidersHorizontal data-icon="inline-start" />
                            Сүзгілер
                        </Button>
                        {canModify && (
                            <Link href={sezs.create.url()}>
                                <Button className="bg-gold text-white hover:bg-gold-dark">
                                    <Plus data-icon="inline-start" />
                                    Жаңа қосу
                                </Button>
                            </Link>
                        )}
                    </div>
                </header>

                <FilterPanel
                    open={filtersOpen}
                    onToggle={() => setFiltersOpen((prev) => !prev)}
                    onSubmit={submitFilters}
                    onClear={clearFilters}
                    activeCount={Object.values(data).filter(Boolean).length}
                    showTrigger={false}
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="search">Іздеу</Label>
                        <Input
                            id="search"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="АЭА атауы"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Аймақ</Label>
                        <Select
                            value={data.region_id}
                            onValueChange={(v) => setData('region_id', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Барлық аймақтар" />
                            </SelectTrigger>
                            <SelectContent>
                                {regions.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>
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
                            onValueChange={(v) => setData('status', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Барлық күйлер" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Белсенді</SelectItem>
                                <SelectItem value="developing">
                                    Дамушы
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </FilterPanel>

                <div className="overflow-hidden rounded-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Атауы</TableHead>
                                <TableHead>Аймақ</TableHead>
                                <TableHead>Аумағы (га)</TableHead>
                                <TableHead>Инвестициялар</TableHead>
                                <TableHead>Күйі</TableHead>
                                <TableHead className="text-right">
                                    Әрекеттер
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sezsData.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-gray-400"
                                    >
                                        Деректер жоқ
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sezsData.data.map((sez) => (
                                    <TableRow key={sez.id}>
                                        <TableCell className="font-medium text-gray-400">
                                            #{sez.id}
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            <Link
                                                href={sezs.show.url(sez.id)}
                                                className="text-[#0f1b3d] hover:text-[#c8a44e] hover:underline"
                                            >
                                                {sez.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{sez.region.name}</TableCell>
                                        <TableCell>
                                            {sez.total_area || '—'}
                                        </TableCell>
                                        <TableCell>
                                            {sez.investment_projects_sum_total_investment
                                                ? (() => {
                                                      const v = Number(
                                                          sez.investment_projects_sum_total_investment,
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
                                                className={`${getStatusColor(sez.status)} border-0 px-3 py-1 text-sm font-medium`}
                                            >
                                                {getStatusLabel(sez.status)}
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
                                                            className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                            title="Өңдеу"
                                                        >
                                                            <Link
                                                                href={
                                                                    sezs.edit.url(
                                                                        sez.id,
                                                                    ) +
                                                                    `?return_to=${encodeURIComponent(url)}`
                                                                }
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    sez.id,
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

                <Pagination paginator={sezsData} />
            </div>
        </AppLayout>
    );
}
