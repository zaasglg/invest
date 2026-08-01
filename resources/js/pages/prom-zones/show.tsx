import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Eye,
    ImageIcon,
    MapPin,
    Activity,
    Layers,
    AlertTriangle,
} from 'lucide-react';
import React from 'react';
import AreaOccupancyCard from '@/components/area-occupancy-card';
import type { AreaUsage } from '@/components/area-occupancy-card';
import InfrastructureList from '@/components/infrastructure-list';
import ProjectGallerySlider from '@/components/project-gallery-slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn, formatMoneyCompact } from '@/lib/utils';

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
    creator?: { id: number; full_name: string } | null;
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
    used_capacity_kw?: number;
    remaining_capacity_kw?: number;
    used_capacity?: number;
    remaining_capacity?: number;
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

interface PromZone {
    id: number;
    name: string;
    region_id: number;
    region?: Region;
    total_area?: number;
    status: 'active' | 'developing';
    infrastructure?: InfrastructureData | null;
    description?: string;
    issues?: Issue[];
    investment_projects?: InvestmentProject[];
    photos_count?: number;
    created_at: string;
}

interface Photo {
    id: number;
    file_path: string;
    description?: string | null;
    gallery_date?: string | null;
    created_at?: string | null;
}

interface Props {
    promZone: PromZone;
    areaUsage: AreaUsage;
    infrastructureUsage?: Record<
        string,
        { total: number; used: number; remaining: number }
    >;
    mainGallery?: Photo[];
    renderPhotos?: Photo[];
}

export default function Show({
    promZone,
    areaUsage,
    infrastructureUsage = {},
    mainGallery = [],
    renderPhotos = [],
}: Props) {
    const { url } = usePage();
    const canModify = useCanModify();

    const statusMap: Record<string, { label: string; color: string }> = {
        active: {
            label: 'Белсенді',
            color: 'bg-green-100 text-green-800',
        },
        developing: {
            label: 'Дамушы',
            color: 'bg-amber-100 text-amber-800',
        },
    };

    const severityMap: Record<string, { label: string; color: string }> = {
        low: { label: 'Төмен', color: 'bg-blue-100 text-blue-800' },
        medium: { label: 'Орташа', color: 'bg-amber-100 text-amber-800' },
        high: { label: 'Жоғары', color: 'bg-red-100 text-red-800' },
    };

    const issueStatusMap: Record<string, { label: string; color: string }> = {
        open: { label: 'Ашық', color: 'bg-red-100 text-red-800' },
        in_progress: {
            label: 'Жұмыста',
            color: 'bg-amber-100 text-amber-800',
        },
        resolved: {
            label: 'Шешілді',
            color: 'bg-green-100 text-green-800',
        },
    };

    const projectStatusMap: Record<string, { label: string; color: string }> = {
        plan: {
            label: 'Жоспарлау',
            color: 'bg-blue-100 text-blue-800',
        },
        implementation: {
            label: 'Іске асыру',
            color: 'bg-amber-100 text-amber-800',
        },
        launched: {
            label: 'Іске қосылған',
            color: 'bg-green-100 text-green-800',
        },
        suspended: {
            label: 'Тоқтатылған',
            color: 'bg-yellow-100 text-yellow-800',
        },
    };

    const formatCurrency = (amount: number) => {
        return formatMoneyCompact(amount);
    };

    const projects = promZone.investment_projects ?? [];
    const totalInvestment = projects.reduce(
        (sum, project) => sum + Number(project.total_investment || 0),
        0,
    );
    const issues = promZone.issues ?? [];
    const photosCount =
        typeof promZone.photos_count === 'number' ? promZone.photos_count : 0;

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: promZone.region?.name || 'Аймақ',
                    href: `/regions/${promZone.region?.id}`,
                },
                { title: promZone.name, href: '' },
            ]}
        >
            <Head title={promZone.name} />

            <div className="page-surface flex h-full flex-1 flex-col gap-5 sm:gap-6">
                {/* Back link */}
                <Link
                    href={`/prom-zones`}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-navy"
                >
                    <ArrowLeft className="size-4" /> Тізімге қайту
                </Link>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    {/* Main Content */}
                    <div className="flex min-w-0 flex-col gap-6">
                        {/* Banner + Info + Description */}
                        <Card className="overflow-hidden border-slate-200/80 py-0 shadow-none">
                            {/* Banner Header */}
                            <div className="border-b border-slate-200 bg-white px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-navy">
                                        <span className="flex size-10 items-center justify-center rounded-md bg-navy text-gold">
                                            <Layers className="size-5" />
                                        </span>
                                        <h1 className="text-xl font-extrabold sm:text-2xl">
                                            {promZone.name}
                                        </h1>
                                    </div>
                                    <Badge
                                        className={`${statusMap[promZone.status]?.color || 'bg-gray-100 text-gray-800'} border-0 px-3 py-1 text-sm font-medium`}
                                    >
                                        {statusMap[promZone.status]?.label ||
                                            promZone.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Info Cards */}
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                    <div className="overflow-hidden rounded-lg md:col-span-2">
                                        <ProjectGallerySlider
                                            photos={mainGallery}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/60 md:col-span-3">
                                        {[
                                            {
                                                label: 'Аудан',
                                                value:
                                                    promZone.region?.name ||
                                                    'Көрсетілмеген',
                                                icon: MapPin,
                                            },
                                            {
                                                label: 'Күйі',
                                                value:
                                                    statusMap[promZone.status]
                                                        ?.label ||
                                                    promZone.status,
                                                icon: Activity,
                                            },
                                            {
                                                label: 'Аумағы',
                                                value: promZone.total_area
                                                    ? `${promZone.total_area} га`
                                                    : 'Көрсетілмеген',
                                                icon: MapPin,
                                            },
                                            {
                                                label: 'Инвестиция көлемі',
                                                value:
                                                    totalInvestment > 0
                                                        ? formatCurrency(
                                                              totalInvestment,
                                                          )
                                                        : 'Көрсетілмеген',
                                                icon: Building2,
                                            },
                                        ].map((metric, index) => (
                                            <div
                                                key={metric.label}
                                                className={cn(
                                                    'group relative min-h-32 p-5 sm:p-6',
                                                    index % 2 === 0 &&
                                                        'border-r border-slate-200',
                                                    index < 2 &&
                                                        'border-b border-slate-200',
                                                    index === 3 &&
                                                        'bg-amber-50/55',
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                                                        {metric.label}
                                                    </p>
                                                    <metric.icon className="size-4 text-gold-dark/70 transition-transform duration-200 group-hover:scale-110" />
                                                </div>
                                                <p className="mt-5 text-lg leading-tight font-extrabold tracking-tight text-navy sm:text-xl">
                                                    {metric.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Infrastructure */}
                                {promZone.infrastructure && (
                                    <InfrastructureList
                                        className="mt-6"
                                        infrastructure={promZone.infrastructure}
                                        usage={infrastructureUsage}
                                    />
                                )}
                            </CardContent>

                            {/* Description */}
                            <div className="border-t border-gray-200 px-6 py-5">
                                {/* <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#0f1b3d]">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    {promZone.name}
                                </h2> */}
                                <p className="leading-relaxed whitespace-pre-wrap text-gray-700">
                                    {promZone.description || 'Сипаттама жоқ.'}
                                </p>
                            </div>
                        </Card>

                        {/* Investment Projects */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="h-5 w-5 text-gray-500" />
                                    Инвестициялық жобалар
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
                                                <TableHead>Атауы</TableHead>
                                                <TableHead>Компания</TableHead>
                                                <TableHead>
                                                    Инвестициялар
                                                </TableHead>
                                                <TableHead>Күйі</TableHead>
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
                                                    <TableCell className="font-medium text-[#0f1b3d]">
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
                                        Байланыстырылған жобалар жоқ
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
                        {renderPhotos.length > 0 && (
                            <Card className="overflow-hidden shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Eye className="h-5 w-5 text-gray-500" />
                                        Болашақтағы сурет
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ProjectGallerySlider
                                        photos={renderPhotos}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Actions */}
                        <Card className="shadow-none">
                            <CardContent className="flex flex-col gap-3 p-4">
                                {canModify && (
                                    <Link
                                        href={`/prom-zones/${promZone.id}/edit?return_to=${encodeURIComponent(url)}`}
                                        className="w-full"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <Activity className="mr-2 h-4 w-4" />{' '}
                                            Өңдеу
                                        </Button>
                                    </Link>
                                )}
                                <Link
                                    href={`/prom-zones/${promZone.id}/gallery`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        Галерея
                                        {photosCount > 0 && (
                                            <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                {photosCount}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <Link
                                    href={`/regions/${promZone.region_id}`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <Layers className="mr-2 h-4 w-4" />{' '}
                                        Ауданға өту
                                    </Button>
                                </Link>
                                <Link
                                    href={`/prom-zones/${promZone.id}/issues`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <AlertTriangle className="mr-2 h-4 w-4" />{' '}
                                        Мәселелерді басқару
                                        {issues.length > 0 && (
                                            <span className="ml-auto rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                                                {issues.length}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <AreaOccupancyCard usage={areaUsage} />

                        {/* Issues */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <AlertTriangle className="h-5 w-5 text-gray-500" />
                                    Проблемалық мәселелер
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
                                                    <p className="text-sm font-semibold text-[#0f1b3d]">
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
                                                {issue.creator && (
                                                    <p className="mt-1 text-[11px] text-gray-400">
                                                        Қосқан:{' '}
                                                        {
                                                            issue.creator
                                                                .full_name
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-2 text-center text-sm text-gray-500">
                                        Проблемалық мәселелер жоқ
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
