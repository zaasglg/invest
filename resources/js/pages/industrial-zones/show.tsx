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

interface IndustrialZone {
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
    industrialZone: IndustrialZone;
}

export default function Show({ industrialZone }: Props) {
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

    const projects = industrialZone.investment_projects ?? [];
    const issues = industrialZone.issues ?? [];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Индустриальные зоны', href: `/regions/${industrialZone.region_id}` },
                { title: industrialZone.name, href: '' },
            ]}
        >
            <Head title={industrialZone.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 w-full">
                {/* Back link */}
                <Link
                    href={`/regions/${industrialZone.region_id}`}
                    className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Назад к списку
                </Link>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Banner + Info + Description */}
                        <Card className="overflow-hidden shadow-none py-0">
                            {/* Banner Header */}
                            <div className="bg-gray-900 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white">
                                        <Layers className="h-5 w-5" />
                                        <h1 className="text-xl font-bold">
                                            {industrialZone.name}
                                        </h1>
                                    </div>
                                    <Badge
                                        className={`${statusMap[industrialZone.status]?.color || 'bg-gray-100 text-gray-800'} border-0 px-3 py-1 text-sm font-medium`}
                                    >
                                        {statusMap[industrialZone.status]?.label || industrialZone.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Info Cards */}
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                            <MapPin className="h-3.5 w-3.5" /> Район
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {industrialZone.region?.name || 'Не указан'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                            <Activity className="h-3.5 w-3.5" /> Статус
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {statusMap[industrialZone.status]?.label || industrialZone.status}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                            <MapPin className="h-3.5 w-3.5" /> Площадь
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {industrialZone.total_area ? `${industrialZone.total_area} га` : 'Не указана'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                            <Building2 className="h-3.5 w-3.5" /> Объем инвестиций
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {industrialZone.investment_total
                                                ? formatCurrency(Number(industrialZone.investment_total))
                                                : 'Не указан'}
                                        </p>
                                    </div>
                                </div>

                                {/* Infrastructure */}
                                {industrialZone.infrastructure && (() => {
                                    const infraItems = [
                                        { key: 'electricity', name: 'Электроснабжение', icon: Zap, val: industrialZone.infrastructure.electricity, unit: 'МВт' },
                                        { key: 'gas', name: 'Газ', icon: Flame, val: industrialZone.infrastructure.gas, unit: 'м³/час' },
                                        { key: 'water', name: 'Водоснабжение', icon: Droplets, val: industrialZone.infrastructure.water, unit: 'м³/сут' },
                                        { key: 'roads', name: 'Дороги', icon: Car, val: industrialZone.infrastructure.roads, unit: 'км' },
                                        { key: 'railway', name: 'Ж/Д тупик', icon: TrainFront, val: industrialZone.infrastructure.railway, unit: 'км' },
                                        { key: 'internet', name: 'Интернет', icon: Wifi, val: industrialZone.infrastructure.internet, unit: '' },
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
                                                        <div key={item.key} className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50/50">
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
                                                                    <div className="mt-0.5 text-[10px] font-medium text-gray-400">
                                                                        {detail} {item.unit}
                                                                    </div>
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

                            {/* Description */}
                            <div className="border-t border-gray-200 px-6 py-5">
                                {/* <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    {industrialZone.name}
                                </h2> */}
                                <p className="whitespace-pre-wrap leading-relaxed text-gray-700">
                                    {industrialZone.description || 'Описание отсутствует.'}
                                </p>
                            </div>
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
                                                    className="cursor-pointer hover:bg-amber-50"
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
                                        href={`/industrial-zones/${industrialZone.id}/edit`}
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
                                    href={`/regions/${industrialZone.region_id}`}
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
                                    href={`/industrial-zones/${industrialZone.id}/issues`}
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
