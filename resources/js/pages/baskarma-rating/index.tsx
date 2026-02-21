import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Award, BarChart3, Eye } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface RatingItem {
    id: number;
    full_name: string;
    position?: string | null;
    baskarma_type: string;
    region?: string | null;
    project_count: number;
    total: number;
    completed: number;
    active: number;
    overdue: number;
    kpd: number;
}

interface Props {
    districtRatings: RatingItem[];
    oblastRatings: RatingItem[];
}

function StackedTaskBar({
    active,
    completed,
    overdue,
    total,
}: {
    active: number;
    completed: number;
    overdue: number;
    total: number;
}) {
    // If total is 0, avoid division by zero
    const safeTotal = total > 0 ? total : 1;

    // Calculate widths as percentages
    const activePercent = (active / safeTotal) * 100;
    const completedPercent = (completed / safeTotal) * 100;
    const overduePercent = (overdue / safeTotal) * 100;

    return (
        <div className="flex w-[160px] flex-col gap-[2px]">
            {/* 1. Completed (Top - Green) */}
            <div className="relative h-5 w-full overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800">
                <div
                    className="absolute left-0 top-0 flex h-full items-center justify-center bg-green-500 text-[10px] font-bold text-white transition-all"
                    style={{ width: `${completedPercent}%` }}
                >
                    {completed > 0 && completed}
                </div>
            </div>

            {/* 2. Active (Middle - Yellow) */}
            <div className="relative h-5 w-full overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800">
                <div
                    className="absolute left-0 top-0 flex h-full items-center justify-center bg-amber-400 text-[10px] font-bold text-white transition-all"
                    style={{ width: `${activePercent}%` }}
                >
                    {active > 0 && active}
                </div>
            </div>

            {/* 3. Overdue (Bottom - Red) */}
            <div className="relative h-5 w-full overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800">
                <div
                    className="absolute left-0 top-0 flex h-full items-center justify-center bg-red-500 text-[10px] font-bold text-white transition-all"
                    style={{ width: `${overduePercent}%` }}
                >
                    {overdue > 0 && overdue}
                </div>
            </div>
        </div>
    );
}

function KpdBar({ kpd }: { kpd: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="h-2.5 w-24 overflow-hidden rounded-full bg-gray-200">
                <div
                    className={`h-full rounded-full transition-all ${
                        kpd >= 70
                            ? 'bg-blue-500'
                            : kpd >= 40
                              ? 'bg-amber-500'
                              : kpd > 0
                                ? 'bg-red-500'
                                : 'bg-gray-300'
                    }`}
                    style={{ width: `${kpd}%` }}
                />
            </div>
            <span className="text-sm font-medium text-gray-700">
                {kpd}%
            </span>
        </div>
    );
}

function RatingTable({
    ratings,
    title,
    icon,
}: {
    ratings: RatingItem[];
    title: string;
    icon: React.ReactNode;
}) {
    return (
        <Card className="shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {ratings.length === 0 ? (
                    <div className="px-6 pb-6 pt-2 text-center text-gray-500">
                        Нет зарегистрированных управлений
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-center">
                                    №
                                </TableHead>
                                <TableHead>ФИО</TableHead>
                                <TableHead className="text-center">
                                    Проекты
                                </TableHead>
                                <TableHead>Задачи</TableHead>
                                <TableHead>КПД</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ratings.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="text-center font-medium text-gray-500">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {item.full_name}
                                            </p>
                                            {item.position && (
                                                <p className="text-xs text-gray-500">
                                                    {item.position}
                                                </p>
                                            )}
                                            {item.region && (
                                                <p className="text-xs text-gray-400">
                                                    {item.region}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-semibold">
                                        {item.project_count}
                                    </TableCell>
                                    <TableCell>
                                        <StackedTaskBar
                                            active={item.active}
                                            completed={item.completed}
                                            overdue={item.overdue}
                                            total={item.total}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <KpdBar kpd={item.kpd} />
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/baskarma-rating/${item.id}`}
                                        >
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 border-amber-400 bg-amber-400 text-white hover:bg-amber-500 hover:text-white"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export default function BaskarmaRating({
    districtRatings,
    oblastRatings,
}: Props) {
    const [tab, setTab] = useState<'district' | 'oblast'>('district');

    return (
            <AppLayout
            breadcrumbs={[{ title: 'Рейтинг управлений', href: '' }]}
        >
            <Head title="Рейтинг управлений" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                        <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            Рейтинг управлений
                        </h1>
                        <p className="text-sm text-gray-500">
                            По результатам выполнения задач
                        </p>
                    </div>
                </div>

                {/* Tabs selector */}
                <div className="flex items-center gap-3">
                    <div className="rounded-md bg-white/50 p-0.5 shadow-sm">
                        <div role="tablist" className="flex">
                            <button
                                role="tab"
                                aria-selected={tab === 'district'}
                                onClick={() => setTab('district')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                                    tab === 'district'
                                        ? 'bg-amber-500 text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Районные ({districtRatings.length})
                            </button>
                            <button
                                role="tab"
                                aria-selected={tab === 'oblast'}
                                onClick={() => setTab('oblast')}
                                className={`ml-1 px-4 py-2 text-sm font-medium rounded-md transition ${
                                    tab === 'oblast'
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Областные ({oblastRatings.length})
                            </button>
                        </div>
                    </div>
                    {/* <div className="text-sm text-gray-500">Таңдаңыз</div> */}
                </div>

                {/* Tables (only selected) */}
                <div className="space-y-6">
                    {tab === 'district' ? (
                        <RatingTable
                            ratings={districtRatings}
                            title="Районные управления"
                            icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
                        />
                    ) : (
                        <RatingTable
                            ratings={oblastRatings}
                            title="Областные управления"
                            icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
