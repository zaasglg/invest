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
    MapPin,
    Activity,
    FileText,
    Layers,
    AlertTriangle,
    Calendar,
} from 'lucide-react';
import { useCanModify } from '@/hooks/use-can-modify';

interface Region {
    id: number;
    name: string;
}

interface Issue {
    id: number;
    description?: string;
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

interface SubsoilUser {
    id: number;
    name: string;
    bin?: string;
    region_id: number;
    region?: Region;
    mineral_type?: string;
    license_status?: 'active' | 'expired' | 'suspended';
    license_start?: string;
    license_end?: string;
    issues?: Issue[];
    investment_projects?: InvestmentProject[];
    created_at: string;
}

interface Props {
    subsoilUser: SubsoilUser;
}

export default function Show({ subsoilUser }: Props) {
    const canModify = useCanModify();

    const licenseStatusMap: Record<
        string,
        { label: string; color: string }
    > = {
        active: {
            label: 'Активная',
            color: 'bg-green-100 text-green-800',
        },
        expired: {
            label: 'Истекла',
            color: 'bg-red-100 text-red-800',
        },
        suspended: {
            label: 'Приостановлена',
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

    const projects = subsoilUser.investment_projects ?? [];
    const issues = subsoilUser.issues ?? [];

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Недропользователи',
                    href: `/regions/${subsoilUser.region_id}`,
                },
                { title: subsoilUser.name, href: '' },
            ]}
        >
            <Head title={subsoilUser.name} />

            <div className="flex h-full flex-1 flex-col gap-8 p-6 w-full">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <Link
                            href={`/regions/${subsoilUser.region_id}`}
                            className="mb-4 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-900"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Назад к
                            списку
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            {subsoilUser.name}
                        </h1>
                        <div className="mt-2 flex items-center gap-3 text-gray-500">
                            <span className="flex items-center text-sm">
                                <MapPin className="mr-1.5 h-4 w-4" />{' '}
                                {subsoilUser.region?.name || 'Нет региона'}
                            </span>
                            {subsoilUser.bin && (
                                <span className="text-sm">
                                    БИН: {subsoilUser.bin}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {subsoilUser.license_status && (
                            <Badge
                                className={`${licenseStatusMap[subsoilUser.license_status]?.color || 'bg-gray-100 text-gray-800'} border-0 px-3 py-1 text-sm font-medium`}
                            >
                                {licenseStatusMap[subsoilUser.license_status]
                                    ?.label || subsoilUser.license_status}
                            </Badge>
                        )}
                        <span className="text-xs text-gray-400">
                            ID: {subsoilUser.id} | Создан:{' '}
                            {new Date(
                                subsoilUser.created_at,
                            ).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Details */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    Информация
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <p className="mb-1 text-sm font-medium text-gray-500">
                                            Полезное ископаемое
                                        </p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {subsoilUser.mineral_type ||
                                                'Не указано'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-sm font-medium text-gray-500">
                                            Статус лицензии
                                        </p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {subsoilUser.license_status
                                                ? licenseStatusMap[
                                                      subsoilUser
                                                          .license_status
                                                  ]?.label ||
                                                  subsoilUser.license_status
                                                : 'Не указан'}
                                        </p>
                                    </div>
                                    {(subsoilUser.license_start ||
                                        subsoilUser.license_end) && (
                                        <div className="sm:col-span-2">
                                            <p className="mb-1 text-sm font-medium text-gray-500">
                                                Срок лицензии
                                            </p>
                                            <div className="flex items-center gap-2 text-gray-900">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span>
                                                    {subsoilUser.license_start
                                                        ? new Date(
                                                              subsoilUser.license_start,
                                                          ).toLocaleDateString()
                                                        : '...'}
                                                    {' — '}
                                                    {subsoilUser.license_end
                                                        ? new Date(
                                                              subsoilUser.license_end,
                                                          ).toLocaleDateString()
                                                        : '...'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                                    className="cursor-pointer hover:bg-gray-100"
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
                                        href={`/subsoil-users/${subsoilUser.id}/edit`}
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
                                    href={`/regions/${subsoilUser.region_id}`}
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
                                    href={`/subsoil-users/${subsoilUser.id}/issues`}
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
                                                        {issue.description ||
                                                            'Без описания'}
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
