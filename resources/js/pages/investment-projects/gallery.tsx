import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Image as ImageIcon, Trash2, Calendar, X, AlertCircle, Eye, Download } from 'lucide-react';
import PhotoLightbox from '@/components/photo-lightbox';
import { useCanModify } from '@/hooks/use-can-modify';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per photo
const MAX_TOTAL_SIZE = 45 * 1024 * 1024; // 45MB total

interface ProjectType {
    id: number;
    name: string;
}

interface Region {
    id: number;
    name: string;
}

interface InvestmentProject {
    id: number;
    name: string;
    region?: Region;
    project_type?: ProjectType;
}

interface ProjectPhoto {
    id: number;
    file_path: string;
    gallery_date: string | null;
    description: string | null;
    created_at: string;
}

interface DatedGallery {
    [date: string]: ProjectPhoto[];
}

interface Props {
    project: InvestmentProject;
    mainGallery: ProjectPhoto[];
    datedGallery: DatedGallery;
    renderPhotos?: ProjectPhoto[];
    canDownload: boolean;
}

export default function Gallery({ project, mainGallery, datedGallery, renderPhotos = [], canDownload }: Props) {
    const canModify = useCanModify();
    const [photos, setPhotos] = useState<FileList | null>(null);
    const [galleryDate, setGalleryDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [photoType, setPhotoType] = useState<'gallery' | 'render'>('gallery');
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [uploadError, setUploadError] = useState<string>('');

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxPhotos, setLightboxPhotos] = useState<ProjectPhoto[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const openLightbox = (photos: ProjectPhoto[], index: number) => {
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

            // Check individual file size
            const oversizedFile = files.find(f => f.size > MAX_FILE_SIZE);
            if (oversizedFile) {
                setUploadError(`Файл "${oversizedFile.name}" слишком большой. Максимум ${MAX_FILE_SIZE / 1024 / 1024}MB на фото.`);
                return;
            }

            // Check total size
            const totalSize = files.reduce((sum, f) => sum + f.size, 0);
            if (totalSize > MAX_TOTAL_SIZE) {
                setUploadError(`Общий размер файлов (${(totalSize / 1024 / 1024).toFixed(1)}MB) превышает лимит (${MAX_TOTAL_SIZE / 1024 / 1024}MB). Выберите меньше файлов или меньшего размера.`);
                return;
            }

            setPhotos(e.target.files);

            // Create preview URLs
            const urls = files.map(file => URL.createObjectURL(file));
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
        Array.from(photos).forEach(photo => {
            formData.append('photos[]', photo);
        });
        if (galleryDate) {
            formData.append('gallery_date', galleryDate);
        }
        if (description) {
            formData.append('description', description);
        }
        formData.append('photo_type', photoType);

        router.post(`/investment-projects/${project.id}/gallery`, formData, {
            onSuccess: () => {
                clearPhotos();
                setIsUploading(false);
            },
            onError: () => {
                setIsUploading(false);
            },
        });
    };

    const handleDelete = (photoId: number) => {
        if (confirm('Вы уверены, что хотите удалить это фото?')) {
            router.delete(`/investment-projects/${project.id}/gallery/${photoId}`);
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
        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        .reduce((acc, [date, photos]) => {
            acc[date] = photos;
            return acc;
        }, {} as DatedGallery);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Проекты', href: '/investment-projects' },
                { title: project.name, href: `/investment-projects/${project.id}` },
                { title: 'Галерея', href: '' },
            ]}
        >
            <Head title={`Галерея - ${project.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 w-full max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href={`/investment-projects/${project.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-[#0f1b3d] mb-2 transition-colors">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Назад к проекту
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-[#0f1b3d]">Галерея проекта</h1>
                        <p className="text-sm text-gray-500 mt-1">{project.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Upload Form */}
                    {canModify && (
                    <div className="lg:col-span-1">
                        <Card className="shadow-none sticky top-4">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Upload className="h-5 w-5 text-gray-500" />
                                    Загрузить фото
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div>
                                        <Label className="block mb-2">Тип фото</Label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPhotoType('gallery')}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                                                    photoType === 'gallery'
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                Галерея
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPhotoType('render')}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                                                    photoType === 'render'
                                                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                Будущее
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {photoType === 'render'
                                                ? 'Проекттің болашақтағы көрінісі (рендер)'
                                                : 'Қазіргі күйдегі фотосуреттер'}
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="photos" className="block mb-2">Фотографии</Label>
                                        <div className="relative">
                                            <Input
                                                id="photos"
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handlePhotoChange}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="photos"
                                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                            >
                                                <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                                                <span className="text-sm text-gray-600">Нажмите для выбора</span>
                                                <span className="text-xs text-gray-400 mt-1">До 5MB на фото, максимум 45MB всего</span>
                                            </label>
                                        </div>

                                        {/* Upload Error */}
                                        {uploadError && (
                                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-red-700">{uploadError}</p>
                                            </div>
                                        )}

                                        {/* Preview */}
                                        {previewUrls.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-600">Выбрано: {previewUrls.length}</span>
                                                    <button
                                                        type="button"
                                                        onClick={clearPhotos}
                                                        className="text-red-600 hover:text-red-700 text-xs"
                                                    >
                                                        Очистить
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {previewUrls.slice(0, 6).map((url, idx) => (
                                                        <div key={idx} className="relative aspect-square">
                                                            <img
                                                                src={url}
                                                                alt={`Preview ${idx + 1}`}
                                                                className="w-full h-full object-cover rounded border"
                                                            />
                                                        </div>
                                                    ))}
                                                    {previewUrls.length > 6 && (
                                                        <div className="relative aspect-square bg-gray-100 rounded border flex items-center justify-center">
                                                            <span className="text-sm text-gray-600">
                                                                +{previewUrls.length - 6}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="gallery_date" className="block mb-2">Дата галереи (опционально)</Label>
                                        <Input
                                            id="gallery_date"
                                            type="date"
                                            value={galleryDate}
                                            onChange={(e) => setGalleryDate(e.target.value)}
                                            className="w-full"
                                            disabled={photoType === 'render'}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {galleryDate
                                                ? 'Фото будут добавлены к этой дате'
                                                : 'Автоматически установится сегодняшняя дата'}
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="description" className="block mb-2">Описание (опционально)</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Краткое описание для всех загружаемых фото"
                                            className="min-h-[80px] resize-none"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={!photos || photos.length === 0 || isUploading}
                                    >
                                        {isUploading ? 'Загрузка...' : `Загрузить ${photos?.length || 0} фото`}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                    )}

                    {/* Gallery Display */}
                    <div className={canModify ? 'lg:col-span-3 space-y-8' : 'lg:col-span-4 space-y-8'}>
                        {/* Main Gallery (only for legacy photos without dates) */}
                        {mainGallery.length > 0 && (
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-gray-500" />
                                    Основная галерея
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                        ({mainGallery.length})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {mainGallery.length === 0 ? (
                                    <div className="text-center py-12">
                                        <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">Нет фотографий</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Загрузите фотографии, оставив поле даты пустым
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {mainGallery.map((photo, index) => (
                                            <PhotoCard
                                                key={photo.id}
                                                photo={photo}
                                                index={index}
                                                photos={mainGallery}
                                                onDelete={handleDelete}
                                                onOpen={openLightbox}
                                                canModify={canModify}
                                                canDownload={canDownload}
                                                projectId={project.id}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        )}

                        {/* Render Photos */}
                        {renderPhotos.length > 0 && (
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Eye className="h-5 w-5 text-purple-500" />
                                        Болашақтағы көрінісі
                                        <span className="text-sm font-normal text-gray-500 ml-2">
                                            ({renderPhotos.length})
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {renderPhotos.map((photo, index) => (
                                            <PhotoCard
                                                key={photo.id}
                                                photo={photo}
                                                index={index}
                                                photos={renderPhotos}
                                                onDelete={handleDelete}
                                                onOpen={openLightbox}
                                                canModify={canModify}
                                                canDownload={canDownload}
                                                projectId={project.id}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Dated Galleries */}
                        {Object.keys(sortedDatedGallery).length > 0 ? (
                            <div className="space-y-8">
                                <h2 className="text-xl font-bold text-[#0f1b3d] flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Ход реализации по датам
                                </h2>
                                {Object.entries(sortedDatedGallery).map(([date, photos]) => (
                                    <Card key={date} className="shadow-none">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Calendar className="h-5 w-5 text-blue-500" />
                                                {formatDate(date)}
                                                <span className="text-sm font-normal text-gray-500 ml-2">
                                                    ({photos.length} фото)
                                                </span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {photos.map((photo, index) => (
                                                    <PhotoCard
                                                        key={photo.id}
                                                        photo={photo}
                                                        index={index}
                                                        photos={photos}
                                                        onDelete={handleDelete}
                                                        onOpen={openLightbox}
                                                        canModify={canModify}
                                                        canDownload={canDownload}
                                                        projectId={project.id}
                                                    />
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : mainGallery.length === 0 && renderPhotos.length === 0 ? (
                            <Card className="shadow-none">
                                <CardContent className="py-12">
                                    <div className="text-center">
                                        <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">Нет фотографий</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Загрузите фотографии через форму слева
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}
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
    photo: ProjectPhoto;
    index: number;
    photos: ProjectPhoto[];
    onDelete: (id: number) => void;
    onOpen: (photos: ProjectPhoto[], index: number) => void;
    canModify: boolean;
    canDownload: boolean;
    projectId: number;
}

function PhotoCard({ photo, index, photos, onDelete, onOpen, canModify, canDownload, projectId }: PhotoCardProps) {
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
            className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onOpen(photos, index)}
        >
            <img
                src={`/storage/${photo.file_path}`}
                alt={photo.description || 'Фото проекта'}
                className="w-full h-full object-cover"
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
                    <p className="text-white text-xs truncate">{photo.description}</p>
                </div>
            )}
            {isHovered && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
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
                    {canDownload && (
                        <a
                            href={`/investment-projects/${projectId}/gallery/${photo.id}/download`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center h-10 w-10 bg-white/90 hover:bg-white rounded-md transition-colors"
                            title="Жүктеу"
                        >
                            <Download className="h-4 w-4" />
                        </a>
                    )}
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
