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
    license_status?: 'active' | 'expired' | 'suspended';
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
            color: 'bg-red-100 text-red-800',
        },
        suspended: {
            label: 'Приостановлена',
            color: 'bg-amber-100 text-amber-800',
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

            <div className="flex h-full w-full flex-1 flex-col gap-8 p-6">
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
                                {licenseStatusMap[
                                    subsoilUser.license_status
                                ]?.label || subsoilUser.license_status}
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
                        {/* Gallery */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <ImageIcon className="h-5 w-5 text-gray-500" />
                                    Фотографии
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProjectGallerySlider
                                    photos={mainGallery}
                                />
                                {subsoilUser.description && (
                                    <p className="mt-4 whitespace-pre-wrap leading-relaxed text-gray-700">
                                        {subsoilUser.description}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Information */}
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
                                    {subsoilUser.total_area != null &&
                                        Number(subsoilUser.total_area) > 0 && (
                                            <div>
                                                <p className="mb-1 text-sm font-medium text-gray-500">
                                                    Площадь участка
                                                </p>
                                                <p className="text-xl font-bold text-blue-600">
                                                    {Number(
                                                        subsoilUser.total_area,
                                                    ).toLocaleString(
                                                        'ru-RU',
                                                    )}{' '}
                                                    га
                                                </p>
                                            </div>
                                        )}
                                    {(subsoilUser.license_start ||
                                        subsoilUser.license_end) && (
                                        <div>
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
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
