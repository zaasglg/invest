import { Head, Link, usePage, router, useForm } from '@inertiajs/react';
import { ChevronDown, Edit, Eye, Plus, Trash2 } from 'lucide-react';
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
import * as subsoilUsersRoutes from '@/routes/subsoil-users';

import type { PaginatedData } from '@/types';

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
    if (status === 'active') return 'Белсенді';
    if (status === 'expired') return 'Мерзімі өткен';
    if (status === 'illegal') return 'Заңсыз';
    return 'Тоқтатылған';
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
    const { url } = usePage();
    const canModify = useCanModify();
    const { data, setData, get } = useForm<Filters>({
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
        if (confirm('Сенімдісіз бе?')) {
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
        router.get(subsoilUsersRoutes.index.url());
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Жер қойнауын пайдалану',
                    href: subsoilUsersRoutes.index.url(),
                },
            ]}
        >
            <Head title="Жер қойнауын пайдалану" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Жер қойнауын пайдалану
                    </h1>
                    {canModify && (
                        <Link href={subsoilUsersRoutes.create.url()}>
                            <Button className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                                <Plus className="mr-2 h-4 w-4" />
                                Жаңасын құру
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
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="search">
                                        Іздеу
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
                                        placeholder="Атауы немесе БСН"
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
                                    <Label>Лицензия күйі</Label>
                                    <Select
                                        value={data.license_status}
                                        onValueChange={(v) =>
                                            setData('license_status', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Барлық күйлер" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                Белсенді
                                            </SelectItem>
                                            <SelectItem value="expired">
                                                Мерзімі өткен
                                            </SelectItem>
                                            <SelectItem value="suspended">
                                                Тоқтатылған
                                            </SelectItem>
                                            <SelectItem value="illegal">
                                                Заңсыз
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Минерал түрі</Label>
                                    <Select
                                        value={data.mineral_type}
                                        onValueChange={(v) =>
                                            setData('mineral_type', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Барлық минералдар" />
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
                                <TableHead className="w-[80px]">
                                    ID
                                </TableHead>
                                <TableHead>Атауы</TableHead>
                                <TableHead>БСН</TableHead>
                                <TableHead>Аймақ</TableHead>
                                <TableHead>Минерал</TableHead>
                                <TableHead>Лицензия</TableHead>
                                <TableHead>Кезең</TableHead>
                                <TableHead className="text-right">
                                    Әрекеттер
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subsoilUsers.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="py-12 text-center text-gray-400"
                                    >
                                        Деректер жоқ
                                    </TableCell>
                                </TableRow>
                            ) : (
                                subsoilUsers.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-gray-400">
                                            #{user.id}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={subsoilUsersRoutes.show.url(
                                                    user.id,
                                                )}
                                                className="font-semibold text-[#0f1b3d] hover:text-[#c8a44e] hover:underline"
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
                                                    className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                    title="Қарау"
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
                                                            className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                            title="Өңдеу"
                                                        >
                                                            <Link
                                                                href={subsoilUsersRoutes.edit.url(
                                                                    user.id,
                                                                ) + `?return_to=${encodeURIComponent(url)}`}
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

                <Pagination paginator={subsoilUsers} />
            </div>
        </AppLayout>
    );
}
