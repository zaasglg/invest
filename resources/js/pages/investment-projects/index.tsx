import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
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
import * as investmentProjectsRoutes from '@/routes/investment-projects';
import { useCanModify } from '@/hooks/use-can-modify';

import type { PaginatedData } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface ProjectType {
    id: number;
    name: string;
}

interface User {
    id: number;
    full_name: string;
}

interface Sez {
    id: number;
    name: string;
}

interface IndustrialZone {
    id: number;
    name: string;
}

interface SubsoilUser {
    id: number;
    name: string;
}

interface InvestmentProject {
    id: number;
    name: string;
    company_name: string | null;
    region: Region;
    project_type: ProjectType;
    sector: string;
    total_investment: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    creator: User;
    executors: User[];
    sezs?: Sez[];
    industrial_zones?: IndustrialZone[];
    subsoil_users?: SubsoilUser[];
}

interface Filters {
    search: string;
    region_id: string;
    project_type_id: string;
    status: string;
    executor_id: string;
    sector_type: string;
    sector_id: string;
    min_investment: string;
    max_investment: string;
    start_date_from: string;
    start_date_to: string;
    end_date_from: string;
    end_date_to: string;
}

interface Props {
    projects: PaginatedData<InvestmentProject>;
    regions: Region[];
    projectTypes: ProjectType[];
    users: User[];
    sezs: Sez[];
    industrialZones: IndustrialZone[];
    subsoilUsers: SubsoilUser[];
    filters: Partial<Filters>;
}

export default function Index({ projects, regions, projectTypes, users, sezs, industrialZones, subsoilUsers, filters }: Props) {
    const canModify = useCanModify();
    const { data, setData, get, reset } = useForm<Filters>({
        search: filters.search ?? '',
        region_id: filters.region_id ?? '',
        project_type_id: filters.project_type_id ?? '',
        status: filters.status ?? '',
        executor_id: filters.executor_id ?? '',
        sector_type: filters.sector_type ?? '',
        sector_id: filters.sector_id ?? '',
        min_investment: filters.min_investment ?? '',
        max_investment: filters.max_investment ?? '',
        start_date_from: filters.start_date_from ?? '',
        start_date_to: filters.start_date_to ?? '',
        end_date_from: filters.end_date_from ?? '',
        end_date_to: filters.end_date_to ?? '',
    });
    const [filtersOpen, setFiltersOpen] = useState(
        !!(filters.search || filters.region_id || filters.project_type_id || filters.status || filters.executor_id || filters.sector_type || filters.sector_id || filters.min_investment || filters.max_investment || filters.start_date_from || filters.start_date_to || filters.end_date_from || filters.end_date_to),
    );

    const handleDelete = (id: number) => {
        if (confirm('Вы уверены, что хотите удалить этот проект?')) {
            router.delete(investmentProjectsRoutes.destroy.url(id));
        }
    };

    const sectorOptions = useMemo(() => {
        if (data.sector_type === 'sez') {
            return sezs.map(sez => ({ value: String(sez.id), label: sez.name }));
        }
        if (data.sector_type === 'industrial_zone') {
            return industrialZones.map(iz => ({ value: String(iz.id), label: iz.name }));
        }
        if (data.sector_type === 'subsoil') {
            return subsoilUsers.map(su => ({ value: String(su.id), label: su.name }));
        }
        return [];
    }, [data.sector_type, sezs, industrialZones, subsoilUsers]);

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(investmentProjectsRoutes.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        reset();
        get(investmentProjectsRoutes.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const getSectorDisplay = (project: InvestmentProject) => {
        const sectors = [];
        
        if (project.sezs && project.sezs.length > 0) {
            sectors.push(...project.sezs.map(s => `СЭЗ: ${s.name}`));
        }
        
        if (project.industrial_zones && project.industrial_zones.length > 0) {
            sectors.push(...project.industrial_zones.map(iz => `ИЗ: ${iz.name}`));
        }
        
        if (project.subsoil_users && project.subsoil_users.length > 0) {
            sectors.push(...project.subsoil_users.map(su => `Недропользование: ${su.name}`));
        }
        
        return sectors.length > 0 ? sectors.join(', ') : '—';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            plan: 'Планирование',
            implementation: 'Реализация',
            launched: 'Запущен',
            suspended: 'Приостановлен',
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            plan: 'bg-blue-100 text-blue-800',
            implementation: 'bg-amber-100 text-amber-800',
            launched: 'bg-green-100 text-green-800',
            suspended: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Инвестиционные проекты', href: investmentProjectsRoutes.index.url() }
        ]}>
            <Head title="Инвестиционные проекты" />

            <div className="flex h-full flex-col p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
                        Инвестиционные проекты
                    </h1>
                    {canModify && (
                        <Link href={investmentProjectsRoutes.create.url()}>
                            <Button className="shadow-none">
                                <Plus className="h-4 w-4 mr-2" />
                                Создать проект
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
                                    <Label htmlFor="search">Поиск</Label>
                                    <Input
                                        id="search"
                                        value={data.search}
                                        onChange={(event) => setData('search', event.target.value)}
                                        placeholder="Название или компания"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Регион</Label>
                                    <Select
                                        value={data.region_id}
                                        onValueChange={(value) => setData('region_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Все регионы" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {regions.map((region) => (
                                                <SelectItem key={region.id} value={String(region.id)}>
                                                    {region.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Тип проекта</Label>
                                    <Select
                                        value={data.project_type_id}
                                        onValueChange={(value) => setData('project_type_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Все типы" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projectTypes.map((type) => (
                                                <SelectItem key={type.id} value={String(type.id)}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Статус</Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(value) => setData('status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Все статусы" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="plan">Планирование</SelectItem>
                                            <SelectItem value="implementation">Реализация</SelectItem>
                                            <SelectItem value="launched">Запущен</SelectItem>
                                            <SelectItem value="suspended">Приостановлен</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Исполнитель</Label>
                                    <Select
                                        value={data.executor_id}
                                        onValueChange={(value) => setData('executor_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Все исполнители" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={String(user.id)}>
                                                    {user.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Тип сектора</Label>
                                    <Select
                                        value={data.sector_type}
                                        onValueChange={(value) => {
                                            setData('sector_type', value);
                                            setData('sector_id', '');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Любой" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sez">СЭЗ</SelectItem>
                                            <SelectItem value="industrial_zone">ИЗ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Сектор</Label>
                                    <Select
                                        value={data.sector_id}
                                        onValueChange={(value) => setData('sector_id', value)}
                                        disabled={!data.sector_type}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={data.sector_type ? 'Все' : 'Выберите тип'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sectorOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="min_investment">Инвестиции от</Label>
                                    <Input
                                        id="min_investment"
                                        type="number"
                                        value={data.min_investment}
                                        onChange={(event) => setData('min_investment', event.target.value)}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="max_investment">Инвестиции до</Label>
                                    <Input
                                        id="max_investment"
                                        type="number"
                                        value={data.max_investment}
                                        onChange={(event) => setData('max_investment', event.target.value)}
                                        placeholder="∞"
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="start_date_from">Старт с</Label>
                                    <Input
                                        id="start_date_from"
                                        type="date"
                                        value={data.start_date_from}
                                        onChange={(event) => setData('start_date_from', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="start_date_to">Старт по</Label>
                                    <Input
                                        id="start_date_to"
                                        type="date"
                                        value={data.start_date_to}
                                        onChange={(event) => setData('start_date_to', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="end_date_from">Завершение с</Label>
                                    <Input
                                        id="end_date_from"
                                        type="date"
                                        value={data.end_date_from}
                                        onChange={(event) => setData('end_date_from', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="end_date_to">Завершение по</Label>
                                    <Input
                                        id="end_date_to"
                                        type="date"
                                        value={data.end_date_to}
                                        onChange={(event) => setData('end_date_to', event.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button type="submit" className="shadow-none">
                                    Применить
                                </Button>
                                <Button type="button" variant="outline" className="shadow-none" onClick={clearFilters}>
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
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead>Компания</TableHead>
                                <TableHead>Регион</TableHead>
                                <TableHead>Тип проекта</TableHead>
                                <TableHead>Сектор</TableHead>
                                <TableHead>Инвестиции (млн)</TableHead>
                                <TableHead>Исполнители</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center text-neutral-500">
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                projects.data.map((project) => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">
                                            #{project.id}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={investmentProjectsRoutes.show.url(project.id)}
                                                className="text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                {project.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{project.company_name || '—'}</TableCell>
                                        <TableCell>{project.region.name}</TableCell>
                                        <TableCell>{project.project_type.name}</TableCell>
                                        <TableCell>{getSectorDisplay(project)}</TableCell>
                                        <TableCell>{project.total_investment || '—'}</TableCell>
                                        <TableCell>
                                            {project.executors?.length > 0
                                                ? project.executors.map(e => e.full_name).join(', ')
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusColor(project.status)} px-3 py-1 text-sm font-medium border-0`}>
                                                {getStatusLabel(project.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600" title="Просмотр">
                                                    <Link href={investmentProjectsRoutes.show.url(project.id)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {canModify && (
                                                    <>
                                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600" title="Редактировать">
                                                            <Link href={investmentProjectsRoutes.edit.url(project.id)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700"
                                                            onClick={() => handleDelete(project.id)}
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

                <Pagination paginator={projects} />
            </div>
        </AppLayout>
    );
}
