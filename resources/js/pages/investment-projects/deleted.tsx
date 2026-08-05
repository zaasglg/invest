import { Head, Link, router, useForm } from '@inertiajs/react';
import { RotateCcw, Search, Trash2 } from 'lucide-react';
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
import { formatProjectTypeNames } from '@/lib/project-types';
import * as investmentProjectsRoutes from '@/routes/investment-projects';
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
    region: Region | null;
    project_type: ProjectType | null;
    project_types?: ProjectType[];
    curators: User[];
    deleter: User | null;
    deleted_at: string | null;
}

interface Props {
    projects: PaginatedData<InvestmentProject>;
    filters: { search: string };
}

const dateFormatter = new Intl.DateTimeFormat('kk-KZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function formatDeletedAt(value: string | null): string {
    if (!value) return '—';

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export default function Deleted({ projects, filters }: Props) {
    const { data, setData, get } = useForm({
        search: filters.search ?? '',
    });

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        get(investmentProjectsRoutes.deleted.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const restoreProject = (id: number) => {
        if (
            confirm(
                'Бұл жобаны қайтадан белсенді жобалар тізіміне қайтарғыңыз келетініне сенімдісіз бе?',
            )
        ) {
            router.post(investmentProjectsRoutes.restoreDeleted.url(id));
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Инвестициялық жобалар',
                    href: investmentProjectsRoutes.index.url(),
                },
                { title: 'Өшірілген жобалар', href: '' },
            ]}
        >
            <Head title="Өшірілген жобалар" />

            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase">
                            <Trash2 className="h-3.5 w-3.5" />
                            Тек супер әкімшіге қолжетімді
                        </p>
                        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                            Өшірілген жобалар
                        </h1>
                        <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
                            Бұл жобалар жүйеден физикалық түрде жойылмаған.
                            Олардың барлық дерегі, құжаттары және әрекеттер
                            тарихы сақталған.
                        </p>
                    </div>
                    <Link href={investmentProjectsRoutes.index.url()}>
                        <Button
                            variant="outline"
                            className="border-[#0f1b3d]/20 text-[#0f1b3d]"
                        >
                            Белсенді жобаларға оралу
                        </Button>
                    </Link>
                </header>

                <form
                    onSubmit={submitFilters}
                    className="flex items-center gap-3"
                >
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            value={data.search}
                            onChange={(event) =>
                                setData('search', event.target.value)
                            }
                            placeholder="Жоба немесе компанияны іздеу..."
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" size="sm">
                        Іздеу
                    </Button>
                </form>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="w-[50px]">№</TableHead>
                                <TableHead>Жоба</TableHead>
                                <TableHead>Аудан</TableHead>
                                <TableHead>Жоба түрі</TableHead>
                                <TableHead>Кураторлар</TableHead>
                                <TableHead>Өшірген</TableHead>
                                <TableHead>Өшірілген уақыт</TableHead>
                                <TableHead>Күйі</TableHead>
                                <TableHead className="text-right">
                                    Әрекет
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.data.length > 0 ? (
                                projects.data.map((project, index) => (
                                    <TableRow key={project.id}>
                                        <TableCell className="text-gray-500">
                                            {(projects.current_page - 1) *
                                                projects.per_page +
                                                index +
                                                1}
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={investmentProjectsRoutes.show.url(
                                                    project.id,
                                                )}
                                                className="font-medium text-[#0f1b3d] hover:text-[#c8a44e] hover:underline"
                                            >
                                                {project.name}
                                            </Link>
                                            {project.company_name && (
                                                <div className="text-xs text-gray-500">
                                                    {project.company_name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {project.region?.name || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {formatProjectTypeNames(project)}
                                        </TableCell>
                                        <TableCell className="max-w-56 text-sm text-gray-600">
                                            {project.curators.length > 0
                                                ? project.curators
                                                      .map(
                                                          (curator) =>
                                                              curator.full_name,
                                                      )
                                                      .join(', ')
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-gray-700">
                                            {project.deleter?.full_name || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm whitespace-nowrap text-gray-600">
                                            {formatDeletedAt(
                                                project.deleted_at,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100">
                                                Өшірілген
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-800"
                                                    onClick={() =>
                                                        restoreProject(
                                                            project.id,
                                                        )
                                                    }
                                                    title="Жобаны қалпына келтіру"
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
                                        colSpan={9}
                                        className="py-12 text-center text-gray-500"
                                    >
                                        Өшірілген жобалар табылмады.
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
