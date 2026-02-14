import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Upload,
    Image as ImageIcon,
    Trash2,
    Calendar,
    AlertCircle,
    Eye,
} from 'lucide-react';
import PhotoLightbox from '@/components/photo-lightbox';
import { useCanModify } from '@/hooks/use-can-modify';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 45 * 1024 * 1024;

interface Region {
    id: number;
    name: string;
}

interface SubsoilUser {
    id: number;
    name: string;
    region?: Region;
}

interface SubsoilPhoto {
    id: number;
    file_path: string;
    gallery_date: string | null;
    description: string | null;
    created_at: string;
}

interface DatedGallery {
    [date: string]: SubsoilPhoto[];
}

interface Props {
    subsoilUser: SubsoilUser;
    mainGallery: SubsoilPhoto[];
    datedGallery: DatedGallery;
    renderPhotos?: SubsoilPhoto[];
}

export default function Gallery({
    subsoilUser,
    mainGallery,
    datedGallery,
    renderPhotos = [],
}: Props) {
    const canModify = useCanModify();
    const [photos, setPhotos] = useState<FileList | null>(null);
    const [galleryDate, setGalleryDate] = useState('');
    const [description, setDescription] = useState('');
    const [photoType, setPhotoType] = useState<'gallery' | 'render'>(
        'gallery',
    );
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [uploadError, setUploadError] = useState<string>('');

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxPhotos, setLightboxPhotos] = useState<SubsoilPhoto[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const openLightbox = (photos: SubsoilPhoto[], index: number) => {
        setLightboxPhotos(photos);
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadError('');
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);

            const oversizedFile = files.find((f) => f.size > MAX_FILE_SIZE);
            if (oversizedFile) {
                setUploadError(
                    `Файл "${oversizedFile.name}" слишком большой. Максимум ${MAX_FILE_SIZE / 1024 / 1024}MB на фото.`,
                );
                return;
            }

            const totalSize = files.reduce((sum, f) => sum + f.size, 0);
            if (totalSize > MAX_TOTAL_SIZE) {
                setUploadError(
                    `Общий размер файлов (${(totalSize / 1024 / 1024).toFixed(1)}MB) превышает лимит (${MAX_TOTAL_SIZE / 1024 / 1024}MB).`,
                );
                return;
            }

            setPhotos(e.target.files);
            const urls = files.map((file) => URL.createObjectURL(file));
            setPreviewUrls(urls);
        }
    };

    const clearPhotos = () => {
        setPhotos(null);
        setPreviewUrls([]);
        setGalleryDate('');
        setDescription('');
        setPhotoType('gallery');
        setUploadError('');
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!photos || photos.length === 0) return;

        setIsUploading(true);

        const formData = new FormData();
        Array.from(photos).forEach((photo) => {
            formData.append('photos[]', photo);
        });
        if (galleryDate) {
            formData.append('gallery_date', galleryDate);
        }
        if (description) {
            formData.append('description', description);
        }
        formData.append('photo_type', photoType);

        router.post(
            `/subsoil-users/${subsoilUser.id}/gallery`,
            formData,
            {
                onSuccess: () => {
                    clearPhotos();
                    setIsUploading(false);
                },
                onError: () => {
                    setIsUploading(false);
                },
            },
        );
    };

    const handleDelete = (photoId: number) => {
        if (confirm('Вы уверены, что хотите удалить это фото?')) {
            router.delete(
                `/subsoil-users/${subsoilUser.id}/gallery/${photoId}`,
            );
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const sortedDatedGallery = Object.entries(datedGallery)
        .sort(
            (a, b) =>
                new Date(b[0]).getTime() - new Date(a[0]).getTime(),
        )
        .reduce(
            (acc, [date, photos]) => {
                acc[date] = photos;
                return acc;
            },
            {} as DatedGallery,
        );

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Недропользователи',
                    href: '/subsoil-users',
                },
                {
                    title: subsoilUser.name,
                    href: `/subsoil-users/${subsoilUser.id}`,
                },
                { title: 'Галерея', href: '' },
            ]}
        >
            <Head title={`Галерея - ${subsoilUser.name}`} />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link
                            href={`/subsoil-users/${subsoilUser.id}`}
                            className="mb-2 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-900"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Назад
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            Галерея
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {subsoilUser.name}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* Upload Form */}
                    {canModify && (
                        <div className="lg:col-span-1">
                            <Card className="sticky top-4 shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Upload className="h-5 w-5 text-gray-500" />
                                        Загрузить фото
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={handleUpload}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <Label className="mb-2 block">
                                                Тип фото
                                            </Label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPhotoType('gallery')
                                                    }
                                                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                                        photoType === 'gallery'
                                                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    Галерея
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPhotoType('render')
                                                    }
                                                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                                        photoType === 'render'
                                                            ? 'border-purple-200 bg-purple-50 text-purple-700'
                                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    Будущее
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="photos"
                                                className="mb-2 block"
                                            >
                                                Фотографии
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="photos"
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={
                                                        handlePhotoChange
                                                    }
                                                    className="hidden"
                                                />
                                                <label
                                                    htmlFor="photos"
                                                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:bg-gray-50"
                                                >
                                                    <ImageIcon className="mb-2 h-8 w-8 text-gray-400" />
                                                    <span className="text-sm text-gray-600">
                                                        Нажмите для выбора
                                                    </span>
                                                    <span className="mt-1 text-xs text-gray-400">
                                                        До 5MB на фото
                                                    </span>
                                                </label>
                                            </div>

                                            {uploadError && (
                                                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                                                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                                                    <p className="text-sm text-red-700">
                                                        {uploadError}
                                                    </p>
                                                </div>
                                            )}

                                            {previewUrls.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-600">
                                                            Выбрано:{' '}
                                                            {
                                                                previewUrls.length
                                                            }
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                clearPhotos
                                                            }
                                                            className="text-xs text-red-600 hover:text-red-700"
                                                        >
                                                            Очистить
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {previewUrls
                                                            .slice(0, 6)
                                                            .map(
                                                                (url, idx) => (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="relative aspect-square"
                                                                    >
                                                                        <img
                                                                            src={
                                                                                url
                                                                            }
                                                                            alt={`Preview ${idx + 1}`}
                                                                            className="h-full w-full rounded border object-cover"
                                                                        />
                                                                    </div>
                                                                ),
                                                            )}
                                                        {previewUrls.length >
                                                            6 && (
                                                            <div className="relative flex aspect-square items-center justify-center rounded border bg-gray-100">
                                                                <span className="text-sm text-gray-600">
                                                                    +
                                                                    {previewUrls.length -
                                                                        6}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="gallery_date"
                                                className="mb-2 block"
                                            >
                                                Дата галереи (опционально)
                                            </Label>
                                            <Input
                                                id="gallery_date"
                                                type="date"
                                                value={galleryDate}
                                                onChange={(e) =>
                                                    setGalleryDate(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full"
                                                disabled={
                                                    photoType === 'render'
                                                }
                                            />
                                            <p className="mt-1 text-xs text-gray-500">
                                                {galleryDate
                                                    ? 'Фото будут добавлены к этой дате'
                                                    : 'Оставьте пустым для основной галереи'}
                                            </p>
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="description"
                                                className="mb-2 block"
                                            >
                                                Описание (опционально)
                                            </Label>
                                            <Textarea
                                                id="description"
                                                value={description}
                                                onChange={(e) =>
                                                    setDescription(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Краткое описание"
                                                className="min-h-[80px] resize-none"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={
                                                !photos ||
                                                photos.length === 0 ||
                                                isUploading
                                            }
                                        >
                                            {isUploading
                                                ? 'Загрузка...'
                                                : `Загрузить ${photos?.length || 0} фото`}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Gallery Display */}
                    <div
                        className={
                            canModify
                                ? 'space-y-8 lg:col-span-3'
                                : 'space-y-8 lg:col-span-4'
                        }
                    >
                        {/* Main Gallery */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <ImageIcon className="h-5 w-5 text-gray-500" />
                                    Основная галерея
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({mainGallery.length})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {mainGallery.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                                        <p className="text-gray-500">
                                            Нет фотографий
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                        {mainGallery.map((photo, index) => (
                                            <PhotoCard
                                                key={photo.id}
                                                photo={photo}
                                                index={index}
                                                photos={mainGallery}
                                                onDelete={handleDelete}
                                                onOpen={openLightbox}
                                                canModify={canModify}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Render Photos */}
                        {renderPhotos.length > 0 && (
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Eye className="h-5 w-5 text-purple-500" />
                                        Болашақтағы көрінісі
                                        <span className="ml-2 text-sm font-normal text-gray-500">
                                            ({renderPhotos.length})
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                        {renderPhotos.map((photo, index) => (
                                            <PhotoCard
                                                key={photo.id}
                                                photo={photo}
                                                index={index}
                                                photos={renderPhotos}
                                                onDelete={handleDelete}
                                                onOpen={openLightbox}
                                                canModify={canModify}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Dated Galleries */}
                        {Object.keys(sortedDatedGallery).length > 0 && (
                            <div className="space-y-8">
                                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                                    <Calendar className="h-5 w-5" />
                                    Ход реализации по датам
                                </h2>
                                {Object.entries(sortedDatedGallery).map(
                                    ([date, photos]) => (
                                        <Card
                                            key={date}
                                            className="shadow-none"
                                        >
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <Calendar className="h-5 w-5 text-blue-500" />
                                                    {formatDate(date)}
                                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                                        ({photos.length} фото)
                                                    </span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                                    {photos.map(
                                                        (photo, index) => (
                                                            <PhotoCard
                                                                key={photo.id}
                                                                photo={photo}
                                                                index={index}
                                                                photos={photos}
                                                                onDelete={
                                                                    handleDelete
                                                                }
                                                                onOpen={
                                                                    openLightbox
                                                                }
                                                                canModify={
                                                                    canModify
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ),
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Lightbox */}
                <PhotoLightbox
                    photos={lightboxPhotos}
                    initialIndex={lightboxIndex}
                    isOpen={lightboxOpen}
                    onClose={closeLightbox}
                />
            </div>
        </AppLayout>
    );
}

interface PhotoCardProps {
    photo: SubsoilPhoto;
    index: number;
    photos: SubsoilPhoto[];
    onDelete: (id: number) => void;
    onOpen: (photos: SubsoilPhoto[], index: number) => void;
    canModify: boolean;
}

function PhotoCard({
    photo,
    index,
    photos,
    onDelete,
    onOpen,
    canModify,
}: PhotoCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onOpen(photos, index)}
        >
            <img
                src={`/storage/${photo.file_path}`}
                alt={photo.description || 'Фото'}
                className="h-full w-full object-cover"
            />
            {/* Date badge */}
            {(photo.gallery_date || photo.created_at) && (
                <div className="absolute top-2 left-2 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDateTime(photo.gallery_date || photo.created_at!)}
                    </span>
                </div>
            )}
            {/* Description overlay */}
            {photo.description && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="truncate text-xs text-white">
                        {photo.description}
                    </p>
                </div>
            )}
            {isHovered && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40">
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpen(photos, index);
                        }}
                        className="h-10 w-10 bg-white/90 hover:bg-white"
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                    {canModify && (
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(photo.id);
                            }}
                            className="h-10 w-10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
