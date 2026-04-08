import { Head, Link, router, useForm } from '@inertiajs/react';
import { Archive, Eye, RotateCcw, Search } from 'lucide-react';
import { type FormEvent } from 'react';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatMoneyCompact } from '@/lib/utils';

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

interface InvestmentProject {
    id: number;
    name: string;
    company_name: string | null;
    region: Region;
    project_type: ProjectType;
    total_investment: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    executors: User[];
}

interface Props {
    projects: PaginatedData<InvestmentProject>;
    filters: { search: string };
}

export default function Archived({ projects, filters }: Props) {
    const { data, setData, get } = useForm({
        search: filters.search ?? '',
    });

    const handleUnarchive = (id: number) => {
        if (
            confirm('Бұл жобаны архивтен қайтарғыңыз келетініне сенімдісіз бе?')
        ) {
            router.post(`/investment-projects/${id}/unarchive`);
        }
    };

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get('/investment-projects-archived', {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            plan: 'Жоспарлау',
            implementation: 'Іске асыру',
            launched: 'Іске қосылған',
            suspended: 'Тоқтатылған',
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

    const formatInvestment = (value: string | number | null) => {
        if (!value) return '—';
        const num = Number(value);
        if (isNaN(num)) return String(value);

        return formatMoneyCompact(num);
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Инвестициялық жобалар',
                    href: '/investment-projects',
                },
                { title: 'Архив', href: '' },
            ]}
        >
            <Head title="Архивтелген жобалар" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Archive className="h-6 w-6 text-gray-500" />
                        <h1 className="text-2xl font-bold text-[#0f1b3d]">
                            Архивтелген жобалар
                        </h1>
                    </div>
                    <Link href="/investment-projects">
                        <Button
                            variant="outline"
                            className="border-[#0f1b3d]/20 text-[#0f1b3d]"
                        >
                            Белсенді жобаларға оралу
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <form
                    onSubmit={submitFilters}
                    className="flex items-center gap-3"
                >
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Жоба іздеу..."
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" size="sm">
                        Іздеу
                    </Button>
                </form>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="w-[50px]">№</TableHead>
                                <TableHead>Жоба атауы</TableHead>
                                <TableHead>Аудан</TableHead>
                                <TableHead>Түрі</TableHead>
                                <TableHead>Инвестиция</TableHead>
                                <TableHead>Мәртебесі</TableHead>
                                <TableHead className="text-right">
                                    Әрекет
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.data.length > 0 ? (
                                projects.data.map((project, idx) => (
                                    <TableRow key={project.id}>
                                        <TableCell className="text-gray-500">
                                            {(projects.current_page - 1) *
                                                projects.per_page +
                                                idx +
                                                1}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium text-[#0f1b3d]">
                                                    {project.name}
                                                </div>
                                                {project.company_name && (
                                                    <div className="text-xs text-gray-500">
                                                        {project.company_name}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {project.region?.name || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {project.project_type?.name || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {formatInvestment(
                                                project.total_investment,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`${getStatusColor(project.status)} border-0`}
                                            >
                                                {getStatusLabel(project.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/investment-projects/${project.id}`}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-500 hover:text-[#0f1b3d]"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                                                    onClick={() =>
                                                        handleUnarchive(
                                                            project.id,
                                                        )
                                                    }
                                                    title="Архивтен қайтару"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-gray-500"
                                    >
                                        Архивтелген жобалар табылмады.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={projects} />
            </div>
        </AppLayout>
    );
}
