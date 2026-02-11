import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Building2,
    Car,
    Droplets,
    Flame,
    MapPin,
    Activity,
    FileText,
    Layers,
    AlertTriangle,
    TrainFront,
    Wifi,
    Zap,
} from 'lucide-react';
import { useCanModify } from '@/hooks/use-can-modify';

interface Region {
    id: number;
    name: string;
}

interface Issue {
    id: number;
    title: string;
    description?: string;
    category?: string;
    severity?: string;
    status?: string;
}

interface InvestmentProject {
    id: number;
    name: string;
    company_name?: string;
    total_investment?: number;
    status: string;
    region?: Region;
}

interface InfrastructureDetails {
    available: boolean;
    capacity?: string;
    type?: string;
    distance?: string;
}

interface InfrastructureData {
    electricity?: InfrastructureDetails;
    water?: InfrastructureDetails;
    gas?: InfrastructureDetails;
    roads?: InfrastructureDetails;
    railway?: InfrastructureDetails;
    internet?: InfrastructureDetails;
}

interface Sez {
    id: number;
    name: string;
    region_id: number;
    region?: Region;
    total_area?: number;
    investment_total?: number;
    status: 'active' | 'developing';
    infrastructure?: InfrastructureData | null;
    description?: string;
    issues?: Issue[];
    investment_projects?: InvestmentProject[];
    created_at: string;
}

interface Props {
    sez: Sez;
}

export default function Show({ sez }: Props) {
    const canModify = useCanModify();

    const statusMap: Record<string, { label: string; color: string }> = {
        active: {
            label: 'Активная',
            color: 'bg-green-100 text-green-800',
        },
        developing: {
            label: 'Развивающаяся',
            color: 'bg-amber-100 text-amber-800',
        },
    };

    const severityMap: Record<string, { label: string; color: string }> = {
        low: { label: 'Низкая', color: 'bg-blue-100 text-blue-800' },
        medium: { label: 'Средняя', color: 'bg-amber-100 text-amber-800' },
        high: { label: 'Высокая', color: 'bg-red-100 text-red-800' },
    };

    const issueStatusMap: Record<string, { label: string; color: string }> = {
        open: { label: 'Открыт', color: 'bg-red-100 text-red-800' },
        in_progress: {
            label: 'В работе',
            color: 'bg-amber-100 text-amber-800',
        },
        resolved: {
            label: 'Решён',
            color: 'bg-green-100 text-green-800',
        },
    };

    const projectStatusMap: Record<string, { label: string; color: string }> =
        {
            plan: {
                label: 'Планирование',
                color: 'bg-blue-100 text-blue-800',
            },
            implementation: {
                label: 'Реализация',
                color: 'bg-amber-100 text-amber-800',
            },
            launched: {
                label: 'Запущен',
                color: 'bg-green-100 text-green-800',
            },
            suspended: {
                label: 'Приостановлен',
                color: 'bg-yellow-100 text-yellow-800',
            },
        };

    const formatCurrency = (amount: number) => {
        if (amount >= 1_000_000_000) {
            return `${(amount / 1_000_000_000).toFixed(1)} млрд тг`;
        }
        if (amount >= 1_000_000) {
            return `${(amount / 1_000_000).toFixed(1)} млн тг`;
        }
        return `${amount.toLocaleString('ru-RU')} тг`;
    };

    const projects = sez.investment_projects ?? [];
    const issues = sez.issues ?? [];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'СЭЗ', href: `/regions/${sez.region_id}` },
                { title: sez.name, href: '' },
            ]}
        >
            <Head title={sez.name} />

            <div className="flex h-full flex-1 flex-col gap-8 p-6 w-full">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <Link
                            href={`/regions/${sez.region_id}`}
                            className="mb-4 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-900"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Назад к
                            списку
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            {sez.name}
                        </h1>
                        <div className="mt-2 flex items-center gap-3 text-gray-500">
                            <span className="flex items-center text-sm">
                                <MapPin className="mr-1.5 h-4 w-4" />{' '}
                                {sez.region?.name || 'Нет региона'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge
                            className={`${statusMap[sez.status]?.color || 'bg-gray-100 text-gray-800'} border-0 px-3 py-1 text-sm font-medium`}
                        >
                            {statusMap[sez.status]?.label || sez.status}
                        </Badge>
                        <span className="text-xs text-gray-400">
                            ID: {sez.id} | Создан:{' '}
                            {new Date(sez.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Description */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    Описание
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap leading-relaxed text-gray-700">
                                    {sez.description ||
                                        'Описание отсутствует.'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Details */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Activity className="h-5 w-5 text-gray-500" />
                                    Детали
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <p className="mb-1 text-sm font-medium text-gray-500">
                                            Площадь
                                        </p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {sez.total_area
                                                ? `${sez.total_area} га`
                                                : 'Не указана'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-sm font-medium text-gray-500">
                                            Объем инвестиций
                                        </p>
                                        <p className="text-xl font-bold text-violet-600">
                                            {sez.investment_total
                                                ? formatCurrency(
                                                      Number(
                                                          sez.investment_total,
                                                      ),
                                                  )
                                                : 'Не указан'}
                                        </p>
                                    </div>
                                </div>

                                {sez.infrastructure && (() => {
                                    const infraItems = [
                                        { key: 'electricity', name: 'Электроснабжение', icon: Zap, val: sez.infrastructure.electricity },
                                        { key: 'gas', name: 'Газ', icon: Flame, val: sez.infrastructure.gas },
                                        { key: 'water', name: 'Водоснабжение', icon: Droplets, val: sez.infrastructure.water },
                                        { key: 'roads', name: 'Дороги', icon: Car, val: sez.infrastructure.roads },
                                        { key: 'railway', name: 'Ж/Д тупик', icon: TrainFront, val: sez.infrastructure.railway },
                                        { key: 'internet', name: 'Интернет', icon: Wifi, val: sez.infrastructure.internet },
                                    ].filter(i => i.val && i.val.available !== undefined);

                                    if (infraItems.length === 0) return null;

                                    return (
                                        <div className="mt-6">
                                            <p className="mb-2 text-sm font-medium text-gray-500">
                                                Инфраструктура
                                            </p>
                                            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                                                {infraItems.map((item) => {
                                                    const active = item.val?.available;
                                                    const detail = item.val?.capacity || item.val?.type || item.val?.distance || '';
                                                    return (
                                                        <div key={item.key} className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="rounded-md bg-gray-50 p-2 text-gray-500">
                                                                    <item.icon className="h-4 w-4" />
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end text-right">
                                                                <Badge variant="outline" className={`
                                                                    ${active ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}
                                                                    h-5 border px-1.5 py-0 text-[10px] font-medium
                                                                `}>
                                                                    {active ? 'Доступно' : 'Нет'}
                                                                </Badge>
                                                                {detail && (
                                                                    <div className="mt-0.5 text-[10px] font-medium text-gray-400">{detail}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>

                        {/* Investment Projects */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="h-5 w-5 text-gray-500" />
                                    Инвестиционные проекты
                                    {projects.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-2"
                                        >
                                            {projects.length}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {projects.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Название
                                                </TableHead>
                                                <TableHead>
                                                    Компания
                                                </TableHead>
                                                <TableHead>
                                                    Инвестиции
                                                </TableHead>
                                                <TableHead>Статус</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {projects.map((project) => (
                                                <TableRow
                                                    key={project.id}
                                                    className="cursor-pointer hover:bg-violet-50"
                                                    onClick={() =>
                                                        (window.location.href = `/investment-projects/${project.id}`)
                                                    }
                                                >
                                                    <TableCell className="font-medium text-gray-900">
                                                        {project.name}
                                                    </TableCell>
                                                    <TableCell className="text-gray-600">
                                                        {project.company_name ||
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell className="text-gray-600">
                                                        {project.total_investment
                                                            ? formatCurrency(
                                                                  Number(
                                                                      project.total_investment,
                                                                  ),
                                                              )
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={`${projectStatusMap[project.status]?.color || 'bg-gray-100 text-gray-800'} border-0`}
                                                        >
                                                            {projectStatusMap[
                                                                project.status
                                                            ]?.label ||
                                                                project.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="py-4 text-center text-sm text-gray-500">
                                        Нет привязанных проектов
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Actions */}
                        <Card className="shadow-none">
                            <CardContent className="flex flex-col gap-3 p-4">
                                {canModify && (
                                    <Link
                                        href={`/sezs/${sez.id}/edit`}
                                        className="w-full"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <Activity className="mr-2 h-4 w-4" />{' '}
                                            Редактировать
                                        </Button>
                                    </Link>
                                )}
                                <Link
                                    href={`/regions/${sez.region_id}`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <Layers className="mr-2 h-4 w-4" />{' '}
                                        Перейти к району
                                    </Button>
                                </Link>
                                <Link
                                    href={`/sezs/${sez.id}/issues`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <AlertTriangle className="mr-2 h-4 w-4" />{' '}
                                        Управление вопросами
                                        {issues.length > 0 && (
                                            <span className="ml-auto rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                                                {issues.length}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Issues */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <AlertTriangle className="h-5 w-5 text-gray-500" />
                                    Проблемные вопросы
                                    {issues.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-2"
                                        >
                                            {issues.length}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {issues.length > 0 ? (
                                    <div className="space-y-3">
                                        {issues.map((issue) => (
                                            <div
                                                key={issue.id}
                                                className="rounded-lg border p-3"
                                            >
                                                <div className="mb-1 flex items-center justify-between">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {issue.title}
                                                    </p>
                                                    <div className="flex gap-1">
                                                        {issue.severity && (
                                                            <Badge
                                                                className={`${severityMap[issue.severity]?.color || 'bg-gray-100 text-gray-800'} border-0 text-[10px]`}
                                                            >
                                                                {severityMap[
                                                                    issue
                                                                        .severity
                                                                ]?.label ||
                                                                    issue.severity}
                                                            </Badge>
                                                        )}
                                                        {issue.status && (
                                                            <Badge
                                                                className={`${issueStatusMap[issue.status]?.color || 'bg-gray-100 text-gray-800'} border-0 text-[10px]`}
                                                            >
                                                                {issueStatusMap[
                                                                    issue.status
                                                                ]?.label ||
                                                                    issue.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                {issue.description && (
                                                    <p className="text-xs text-gray-500">
                                                        {issue.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-2 text-center text-sm text-gray-500">
                                        Нет проблемных вопросов
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
