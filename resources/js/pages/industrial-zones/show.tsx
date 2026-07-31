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
import { formatMoneyCompact } from '@/lib/utils';

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

interface IndustrialZone {
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
    industrialZone: IndustrialZone;
    infrastructureUsage?: Record<
        string,
        { total: number; used: number; remaining: number }
    >;
    mainGallery?: Photo[];
    renderPhotos?: Photo[];
}

export default function Show({
    industrialZone,
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

    const projects = industrialZone.investment_projects ?? [];
    const issues = industrialZone.issues ?? [];
    const photosCount =
        typeof industrialZone.photos_count === 'number'
            ? industrialZone.photos_count
            : 0;
    const totalInvestment = projects.reduce(
        (sum, project) => sum + Number(project.total_investment || 0),
        0,
    );
    const openIssues = issues.filter(
        (issue) => issue.status !== 'resolved',
    ).length;

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: industrialZone.region?.name || 'Аймақ',
                    href: `/regions/${industrialZone.region?.id}`,
                },
                { title: industrialZone.name, href: '' },
            ]}
        >
            <Head title={industrialZone.name} />

            <div className="page-surface flex h-full flex-1 flex-col gap-5 sm:gap-6">
                <div className="flex items-center justify-between gap-4">
                    <Link
                        href="/industrial-zones"
                        className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-navy"
                    >
                        <span className="flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white transition-transform group-hover:-translate-x-0.5">
                            <ArrowLeft className="size-4" />
                        </span>
                        Индустриялық аймақтар
                    </Link>
                    <span className="hidden text-xs font-semibold text-slate-400 sm:block">
                        ID #{industrialZone.id}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    {/* Main Content */}
                    <div className="flex min-w-0 flex-col gap-6">
                        {/* Banner + Info + Description */}
                        <Card className="overflow-hidden border-slate-200/80 py-0 shadow-none">
                            <header className="relative overflow-hidden border-b border-slate-200 bg-navy px-6 py-7 text-white sm:px-8">
                                <div className="absolute inset-y-0 right-0 w-1/3 border-l border-white/5 bg-[linear-gradient(90deg,transparent,rgba(200,164,78,0.08))]" />
                                <div className="relative flex items-start justify-between gap-5">
                                    <div className="flex min-w-0 items-start gap-4">
                                        <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/8 text-gold">
                                            <Layers className="size-6" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="mb-1 text-[11px] font-bold text-gold uppercase">
                                                Индустриялық аймақ
                                            </p>
                                            <h1 className="text-2xl leading-tight font-extrabold text-balance sm:text-3xl">
                                                {industrialZone.name}
                                            </h1>
                                            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300">
                                                <MapPin className="size-3.5" />
                                                {industrialZone.region?.name ||
                                                    'Аймақ көрсетілмеген'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="shrink-0 border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                                        {statusMap[industrialZone.status]
                                            ?.label || industrialZone.status}
                                    </Badge>
                                </div>
                            </header>

                            {/* Info Cards */}
                            <CardContent className="p-5 sm:p-6">
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.15fr)]">
                                    <div className="overflow-hidden rounded-md bg-slate-100">
                                        <ProjectGallerySlider
                                            photos={mainGallery}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-slate-50/60">
                                        {[
                                            {
                                                label: 'Жалпы аумақ',
                                                value: industrialZone.total_area
                                                    ? `${industrialZone.total_area} га`
                                                    : '—',
                                                icon: MapPin,
                                            },
                                            {
                                                label: 'Жобалар',
                                                value: projects.length,
                                                icon: Building2,
                                            },
                                            {
                                                label: 'Инвестициялар',
                                                value:
                                                    totalInvestment > 0
                                                        ? formatCurrency(
                                                              totalInvestment,
                                                          )
                                                        : '—',
                                                icon: Activity,
                                            },
                                            {
                                                label: 'Ашық мәселелер',
                                                value: openIssues,
                                                icon: AlertTriangle,
                                            },
                                        ].map((metric, index) => (
                                            <div
                                                key={metric.label}
                                                className={`p-4 sm:p-5 ${index % 2 === 0 ? 'border-r border-slate-200' : ''} ${index < 2 ? 'border-b border-slate-200' : ''}`}
                                            >
                                                <div className="mb-4 flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-slate-500">
                                                        {metric.label}
                                                    </span>
                                                    <metric.icon className="size-4 text-gold-dark" />
                                                </div>
                                                <p className="text-xl font-extrabold text-navy tabular-nums sm:text-2xl">
                                                    {metric.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Infrastructure */}
                                {industrialZone.infrastructure && (
                                    <InfrastructureList
                                        className="mt-6"
                                        infrastructure={
                                            industrialZone.infrastructure
                                        }
                                        usage={infrastructureUsage}
                                    />
                                )}
                            </CardContent>

                            {/* Description */}
                            <div className="border-t border-gray-200 px-6 py-5">
                                {/* <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#0f1b3d]">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    {industrialZone.name}
                                </h2> */}
                                <p className="leading-relaxed whitespace-pre-wrap text-gray-700">
                                    {industrialZone.description ||
                                        'Сипаттама жоқ.'}
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
                                        href={`/industrial-zones/${industrialZone.id}/edit?return_to=${encodeURIComponent(url)}`}
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
                                    href={`/industrial-zones/${industrialZone.id}/gallery`}
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
                                    href={`/regions/${industrialZone.region_id}`}
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
                                    href={`/industrial-zones/${industrialZone.id}/issues`}
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
