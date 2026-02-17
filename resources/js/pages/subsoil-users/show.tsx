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
    ArrowLeft,
    MapPin,
    Activity,
    FileText,
    AlertTriangle,
    Calendar,
    ImageIcon,
    Layers,
    Eye,
    Download,
} from 'lucide-react';
import ProjectGallerySlider from '@/components/project-gallery-slider';
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

interface Photo {
    id: number;
    file_path: string;
    description?: string | null;
    gallery_date?: string | null;
    created_at?: string | null;
}

interface SubsoilUser {
    id: number;
    name: string;
    bin?: string;
    region_id: number;
    region?: Region;
    mineral_type?: string;
    total_area?: number;
    description?: string;
    license_status?: 'active' | 'expired' | 'suspended' | 'illegal';
    license_start?: string;
    license_end?: string;
    issues?: Issue[];
    documents?: Array<{ id: number; name: string }>;
    photos_count?: number;
    created_at: string;
}

interface Props {
    subsoilUser: SubsoilUser;
    mainGallery?: Photo[];
    renderPhotos?: Photo[];
}

export default function Show({
    subsoilUser,
    mainGallery = [],
    renderPhotos = [],
}: Props) {
    const canModify = useCanModify();
    const photosCount =
        typeof subsoilUser.photos_count === 'number'
            ? subsoilUser.photos_count
            : 0;

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
            color: 'bg-gray-100 text-gray-800',
        },
        suspended: {
            label: 'Приостановлена',
            color: 'bg-amber-100 text-amber-800',
        },
        illegal: {
            label: 'Нелегально',
            color: 'bg-red-600 text-white',
        },
    };

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

            <div className="flex h-full w-full flex-1 flex-col gap-6 p-6">
                {/* Back link */}
                <Link
                    href={`/regions/${subsoilUser.region_id}`}
                    className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Назад к
                    списку
                </Link>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Banner + Info */}
                        <Card className="overflow-hidden shadow-none py-0">
                            {/* Banner Header */}
                            <div className="bg-gray-900 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white">
                                        <Layers className="h-5 w-5" />
                                        <h1 className="text-xl font-bold">
                                            {subsoilUser.name}
                                        </h1>
                                    </div>
                                    {subsoilUser.license_status && (
                                        <Badge
                                            className={`${licenseStatusMap[subsoilUser.license_status]?.color || 'bg-gray-100 text-gray-800'} border-0 px-3 py-1 text-sm font-medium`}
                                        >
                                            {licenseStatusMap[
                                                subsoilUser.license_status
                                            ]?.label ||
                                                subsoilUser.license_status}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Photo + Info Cards */}
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                    {/* Photo */}
                                    <div className="overflow-hidden rounded-lg md:col-span-2">
                                        <ProjectGallerySlider
                                            photos={mainGallery}
                                        />
                                    </div>

                                    {/* Info Cards */}
                                    <div className="grid grid-cols-2 gap-3 md:col-span-3">
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <MapPin className="h-3.5 w-3.5" />{' '}
                                                Район
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {subsoilUser.region?.name ||
                                                    'Не указан'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <FileText className="h-3.5 w-3.5" />{' '}
                                                БИН
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {subsoilUser.bin || 'Не указан'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Layers className="h-3.5 w-3.5" />{' '}
                                                Полезное ископаемое
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {subsoilUser.mineral_type ||
                                                    'Не указано'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Activity className="h-3.5 w-3.5" />{' '}
                                                Статус лицензии
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {subsoilUser.license_status
                                                    ? licenseStatusMap[
                                                          subsoilUser
                                                              .license_status
                                                      ]?.label ||
                                                      subsoilUser.license_status
                                                    : 'Не указан'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <MapPin className="h-3.5 w-3.5" />{' '}
                                                Площадь участка
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {subsoilUser.total_area !=
                                                    null &&
                                                Number(
                                                    subsoilUser.total_area,
                                                ) > 0
                                                    ? `${Number(subsoilUser.total_area).toLocaleString('ru-RU')} га`
                                                    : 'Не указана'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Calendar className="h-3.5 w-3.5" />{' '}
                                                Срок лицензии
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
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
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            {/* Name & Description */}
                            <div className="border-t border-gray-200 px-6 py-5">
                                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    {subsoilUser.name}
                                </h2>
                                <p className="whitespace-pre-wrap leading-relaxed text-gray-700">
                                    {subsoilUser.description ||
                                        'Описание отсутствует.'}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Render Photos */}
                        {renderPhotos.length > 0 && (
                            <Card className="overflow-hidden shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Eye className="h-5 w-5 text-gray-500" />
                                        Видение будущего
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
                                    href={`/subsoil-users/${subsoilUser.id}/documents`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Документы
                                        {subsoilUser.documents &&
                                            subsoilUser.documents.length >
                                                0 && (
                                                <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                    {
                                                        subsoilUser.documents
                                                            .length
                                                    }
                                                </span>
                                            )}
                                    </Button>
                                </Link>
                                <Link
                                    href={`/subsoil-users/${subsoilUser.id}/gallery`}
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
                                    href={`/subsoil-users/${subsoilUser.id}/issues`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Проблемные вопросы
                                        {issues.length > 0 && (
                                            <span className="ml-auto rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                                                {issues.length}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
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
                                <a
                                    href={`/subsoil-users/${subsoilUser.id}/passport`}
                                    className="w-full"
                                >
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                        <Download className="mr-2 h-4 w-4" />
                                        Скачать паспорт объекта
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
