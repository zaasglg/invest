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

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold text-gold-dark uppercase">
                            Өндірістік инфрақұрылым
                        </p>
                        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                            Пром зоналар
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Өнеркәсіптік алаңдардың жүктемесі мен инвестициялық
                            көрсеткіштері.
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
                            <Link href={promZonesRoutes.create.url()}>
                                <Button className="bg-gold text-white hover:bg-gold-dark">
                                    <Plus data-icon="inline-start" />
                                    Пром зона құру
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
                            placeholder="Пром зона атауы"
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
