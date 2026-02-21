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
import { ChevronDown, Edit, Eye, Plus, Trash2 } from 'lucide-react';
import * as subsoilUsersRoutes from '@/routes/subsoil-users';
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

interface SubsoilUser {
    id: number;
    name: string;
    bin: string;
    region: Region;
    mineral_type: string;
    license_status: 'active' | 'expired' | 'suspended' | 'illegal';
    license_start: string | null;
    license_end: string | null;
    created_at: string;
    updated_at: string;
}

interface Filters {
    search: string;
    region_id: string;
    license_status: string;
    mineral_type: string;
}

interface Props {
    subsoilUsers: PaginatedData<SubsoilUser>;
    regions: Region[];
    mineralTypes: string[];
    filters: Partial<Filters>;
}

const getStatusLabel = (
    status: SubsoilUser['license_status'],
) => {
    if (status === 'active') return 'Активна';
    if (status === 'expired') return 'Истекла';
    if (status === 'illegal') return 'Нелегально';
    return 'Приостановлена';
};

const getStatusColor = (
    status: SubsoilUser['license_status'],
) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'expired') return 'bg-gray-100 text-gray-800';
    if (status === 'illegal') return 'bg-red-600 text-white';
    return 'bg-amber-100 text-amber-800';
};

const formatDate = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
};

export default function Index({
    subsoilUsers,
    regions,
    mineralTypes,
    filters,
}: Props) {
    const canModify = useCanModify();
    const { data, setData, get, reset } = useForm<Filters>({
        search: filters.search ?? '',
        region_id: filters.region_id ?? '',
        license_status: filters.license_status ?? '',
        mineral_type: filters.mineral_type ?? '',
    });
    const [filtersOpen, setFiltersOpen] = useState(
        !!(
            filters.search ||
            filters.region_id ||
            filters.license_status ||
            filters.mineral_type
        ),
    );

    const handleDelete = (id: number) => {
        if (confirm('Вы уверены?')) {
            router.delete(subsoilUsersRoutes.destroy.url(id));
        }
    };

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(subsoilUsersRoutes.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        reset();
        get(subsoilUsersRoutes.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Недропользование',
                    href: subsoilUsersRoutes.index.url(),
                },
            ]}
        >
            <Head title="Недропользование" />

            <div className="flex h-full flex-col p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
                        Недропользование
                    </h1>
                    {canModify && (
                        <Link href={subsoilUsersRoutes.create.url()}>
                            <Button className="shadow-none">
                                <Plus className="mr-2 h-4 w-4" />
                                Создать нового
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
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="search">
                                        Поиск
                                    </Label>
                                    <Input
                                        id="search"
                                        value={data.search}
                                        onChange={(e) =>
                                            setData(
                                                'search',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Название или БИН"
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
                                    <Label>Статус лицензии</Label>
                                    <Select
                                        value={data.license_status}
                                        onValueChange={(v) =>
                                            setData('license_status', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Все статусы" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                Активна
                                            </SelectItem>
                                            <SelectItem value="expired">
                                                Истекла
                                            </SelectItem>
                                            <SelectItem value="suspended">
                                                Приостановлена
                                            </SelectItem>
                                            <SelectItem value="illegal">
                                                Нелегально
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Тип минерала</Label>
                                    <Select
                                        value={data.mineral_type}
                                        onValueChange={(v) =>
                                            setData('mineral_type', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Все минералы" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mineralTypes.map((mt) => (
                                                <SelectItem
                                                    key={mt}
                                                    value={mt}
                                                >
                                                    {mt}
                                                </SelectItem>
                                            ))}
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
                                <TableHead>БИН</TableHead>
                                <TableHead>Регион</TableHead>
                                <TableHead>Минерал</TableHead>
                                <TableHead>Лицензия</TableHead>
                                <TableHead>Период</TableHead>
                                <TableHead className="text-right">
                                    Действия
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subsoilUsers.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center text-neutral-500"
                                    >
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            ) : (
                                subsoilUsers.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-neutral-600 dark:text-neutral-400">
                                            #{user.id}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={subsoilUsersRoutes.show.url(
                                                    user.id,
                                                )}
                                                className="text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                {user.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{user.bin}</TableCell>
                                        <TableCell>
                                            {user.region?.name || '—'}
                                        </TableCell>
                                        <TableCell>
                                            {user.mineral_type}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`${getStatusColor(user.license_status)} border-0 px-3 py-1 text-sm font-medium`}
                                            >
                                                {getStatusLabel(
                                                    user.license_status,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(
                                                user.license_start,
                                            )}{' '}
                                            —{' '}
                                            {formatDate(
                                                user.license_end,
                                            )}
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
                                                        href={subsoilUsersRoutes.show.url(
                                                            user.id,
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
                                                                href={subsoilUsersRoutes.edit.url(
                                                                    user.id,
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
                                                                    user.id,
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

                <Pagination paginator={subsoilUsers} />
            </div>
        </AppLayout>
    );
}
