import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Building2, MapPin, Users, Activity, FileText, ImageIcon, Download, AlertTriangle } from 'lucide-react';
import ProjectGallerySlider from '@/components/project-gallery-slider';
import { useCanModify } from '@/hooks/use-can-modify';

interface ProjectType {
    id: number;
    name: string;
}

interface Region {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
}

interface Photo {
    id: number;
    file_path: string;
    description?: string | null;
}

interface SectorEntity {
    id: number;
    name: string;
}

interface InvestmentProject {
    id: number;
    name: string;
    company_name?: string;
    description?: string;
    region_id: number;
    region?: Region;
    project_type_id: number;
    project_type?: ProjectType;
    sezs?: SectorEntity[];
    industrial_zones?: SectorEntity[];
    subsoil_users?: SectorEntity[];
    total_investment?: number;
    status: 'plan' | 'implementation' | 'launched' | 'suspended';
    start_date?: string;
    end_date?: string;
    creator?: User;
    executors?: User[];
    documents?: Array<{ id: number; name: string }>;
    issues?: Array<{ id: number; title: string }>;
    photos_count?: { photos_count: number } | number;
    created_at: string;
}

interface Props {
    project: InvestmentProject;
    mainGallery?: Photo[];
}

export default function Show({ project, mainGallery = [] }: Props) {
    const canModify = useCanModify();
    const photosCount = typeof project.photos_count === 'number'
        ? project.photos_count
        : (project.photos_count as any)?.photos_count || 0;

    const statusMap: Record<string, { label: string; color: string }> = {
        plan: { label: 'Планирование', color: 'bg-blue-100 text-blue-800' },
        implementation: { label: 'Реализация', color: 'bg-amber-100 text-amber-800' },
        launched: { label: 'Запущен', color: 'bg-green-100 text-green-800' },
        suspended: { label: 'Приостановлен', color: 'bg-yellow-100 text-yellow-800' },
    };

    const getSectorDetails = () => {
        const details: string[] = [];

        const sezList = project.sezs?.length ? project.sezs : [];
        if (sezList.length > 0) {
            details.push(`СЭЗ: ${sezList.map((item) => item.name).join(', ')}`);
        }

        const industrialZonesList = project.industrial_zones?.length
            ? project.industrial_zones
            : [];
        if (industrialZonesList.length > 0) {
            details.push(
                `Индустриальные зоны: ${industrialZonesList
                    .map((item) => item.name)
                    .join(', ')}`
            );
        }

        const subsoilUsersList = project.subsoil_users?.length
            ? project.subsoil_users
            : [];
        if (subsoilUsersList.length > 0) {
            details.push(
                `Недропользование: ${subsoilUsersList
                    .map((item) => item.name)
                    .join(', ')}`
            );
        }

        return details;
    };

    const sectorDetails = getSectorDetails();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('kk-KZ', {
            style: 'currency',
            currency: 'KZT',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Проекты', href: '/investment-projects' },
                { title: project.name, href: '' },
            ]}
        >
            <Head title={project.name} />

            <div className="flex h-full flex-1 flex-col gap-8 p-6 w-full">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <Link href="/investment-projects" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Назад к списку
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{project.name}</h1>
                        <div className="flex items-center gap-3 mt-2 text-gray-500">
                            {project.company_name && (
                                <span className="flex items-center text-sm">
                                    <Building2 className="h-4 w-4 mr-1.5" /> {project.company_name}
                                </span>
                            )}
                            <span className="flex items-center text-sm">
                                <MapPin className="h-4 w-4 mr-1.5" /> {project.region?.name || 'Нет региона'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge className={`${statusMap[project.status]?.color || 'bg-gray-100 text-gray-800'} px-3 py-1 text-sm font-medium border-0`}>
                            {statusMap[project.status]?.label || project.status}
                        </Badge>
                        <span className="text-xs text-gray-400">
                            ID: {project.id} | Создан: {new Date(project.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <Card className='shadow-none'>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    Описание проекта
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProjectGallerySlider photos={mainGallery} />
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {project.description || "Описание отсутствует."}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Project Details Grid */}
                        <Card className='shadow-none'>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-gray-500" />
                                    Детали реализации
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-1">Отрасль / Сектор</p>
                                        <p className="text-base font-semibold text-gray-900">{project.project_type?.name || 'Не указан'}</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {sectorDetails.length > 0
                                                ? sectorDetails.join(' • ')
                                                : 'Не указан'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-1">Сумма инвестиций</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            {project.total_investment ? formatCurrency(project.total_investment) : 'Не указана'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-1">Даты реализации</p>
                                        <div className="flex items-center gap-2 text-gray-900">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span>
                                                {project.start_date ? new Date(project.start_date).toLocaleDateString() : '...'}
                                                {' — '}
                                                {project.end_date ? new Date(project.end_date).toLocaleDateString() : '...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Information */}
                    <div className="space-y-6">
                        {/* Executors Card */}
                        <Card className='shadow-none'>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-gray-500" />
                                    Участники
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ответственный</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {project.creator?.name?.slice(0, 2).toUpperCase() || 'NA'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{project.creator?.name || 'Не указан'}</p>
                                            <p className="text-xs text-gray-500">Куратор проекта</p>
                                        </div>
                                    </div>
                                </div>

                                {project.executors && project.executors.length > 0 && (
                                    <div>
                                        <div className="h-px bg-gray-100 my-4"></div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Исполнители</p>
                                        <div className="flex flex-col gap-3">
                                            {project.executors.map(executor => (
                                                <div key={executor.id} className="flex items-center gap-3">
                                                    <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-[10px]">
                                                        {executor.name?.slice(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <p className="text-sm text-gray-700">{executor.name ?? '—'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card className='shadow-none'>
                            <CardContent className="p-4 flex flex-col gap-3">
                                {canModify && (
                                    <Link href={`/investment-projects/${project.id}/edit`} className="w-full">
                                        <Button variant="outline" className="w-full justify-start">
                                            <Activity className="mr-2 h-4 w-4" /> Редактировать проект
                                        </Button>
                                    </Link>
                                )}
                                <Link href={`/investment-projects/${project.id}/documents`} className="w-full">
                                    <Button variant="outline" className="w-full justify-start">
                                        <FileText className="mr-2 h-4 w-4" />
                                        Документы
                                        {project.documents && project.documents.length > 0 && (
                                            <span className="ml-auto bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                                                {project.documents.length}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <Link href={`/investment-projects/${project.id}/gallery`} className="w-full">
                                    <Button variant="outline" className="w-full justify-start">
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        Галерея
                                        {photosCount > 0 && (
                                            <span className="ml-auto bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                                                {photosCount}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <Link href={`/investment-projects/${project.id}/issues`} className="w-full">
                                    <Button variant="outline" className="w-full justify-start">
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Проблемные вопросы
                                        {project.issues && project.issues.length > 0 && (
                                            <span className="ml-auto bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs">
                                                {project.issues.length}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <a
                                    href={`/investment-projects/${project.id}/passport`}
                                    className="w-full"
                                >
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                        <Download className="mr-2 h-4 w-4" />
                                        Скачать паспорт проекта
                                    </Button>
                                </a>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
