import { Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    Archive,
    ArrowLeft,
    CalendarDays,
    Camera,
    CheckCircle2,
    Clock3,
    Download,
    Eye,
    Image as ImageIcon,
    Images,
    Layers3,
    LoaderCircle,
    MapPin,
    Sparkles,
    Trash2,
    Upload,
    UserRound,
    X,
} from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';
import PhotoLightbox from '@/components/photo-lightbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/ui/page';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 45 * 1024 * 1024;

export interface GalleryPhoto {
    id: number;
    file_path: string;
    gallery_date: string | null;
    description: string | null;
    created_at: string;
    deleted_at?: string | null;
    deleter?: { id: number; full_name: string } | null;
}

export interface DatedGallery {
    [date: string]: GalleryPhoto[];
}

interface DetailItem {
    label: string;
    value: string;
}

interface GalleryWorkspaceProps {
    title: string;
    entityName: string;
    entityLabel: string;
    backLabel: string;
    backUrl: string;
    mainGallery: GalleryPhoto[];
    datedGallery: DatedGallery;
    renderPhotos: GalleryPhoto[];
    deletedPhotos?: GalleryPhoto[];
    canEdit: boolean;
    canDelete: boolean;
    canDownload?: boolean;
    canViewDeleted?: boolean;
    canChooseGalleryDate: boolean;
    defaultDateToToday?: boolean;
    storeUrl: string;
    destroyUrl: (photo: GalleryPhoto) => string;
    downloadUrl?: (photo: GalleryPhoto) => string;
    details: DetailItem[];
}

function today(): string {
    return new Date().toISOString().split('T')[0];
}

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Күні белгісіз';

    return new Intl.DateTimeFormat('kk-KZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatDateTime(value?: string | null): string {
    if (!value) return 'Күні белгісіз';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Күні белгісіз';

    return new Intl.DateTimeFormat('kk-KZ', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function DeletedPhotoArchive({
    photos,
    canDownload,
    downloadUrl,
    onOpen,
}: {
    photos: GalleryPhoto[];
    canDownload: boolean;
    downloadUrl?: (photo: GalleryPhoto) => string;
    onOpen: (photos: GalleryPhoto[], index: number) => void;
}) {
    return (
        <Card className="overflow-hidden rounded-3xl border-rose-200/80 bg-rose-50/20 shadow-[0_18px_60px_-45px_rgba(225,29,72,0.45)]">
            <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-white to-slate-50 px-5 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm ring-1 ring-rose-100">
                        <Archive className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">
                            Өшірілген суреттер
                        </h2>
                        <p className="text-xs text-slate-500">
                            Файлдар физикалық жойылмаған және тек супер әкімшіге
                            көрсетіледі
                        </p>
                    </div>
                </div>
            </div>

            <CardContent className="p-4 sm:p-5">
                {photos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-rose-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                        Өшірілген суреттер жоқ
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {photos.map((photo, index) => (
                            <article
                                key={photo.id}
                                className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm"
                            >
                                <button
                                    type="button"
                                    onClick={() => onOpen(photos, index)}
                                    className="group relative block aspect-video w-full overflow-hidden bg-slate-100 text-left"
                                    title="Өшірілген суретті көру"
                                >
                                    <img
                                        src={`/storage/${photo.file_path}`}
                                        alt={
                                            photo.description ||
                                            'Өшірілген галерея суреті'
                                        }
                                        className="h-full w-full object-cover opacity-80 grayscale-[25%] transition group-hover:scale-105 group-hover:opacity-100"
                                        loading="lazy"
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/15 opacity-0 transition group-hover:opacity-100">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg">
                                            <Eye className="h-5 w-5" />
                                        </span>
                                    </span>
                                </button>
                                <div className="space-y-2 p-3.5">
                                    {photo.description && (
                                        <p className="line-clamp-2 text-sm font-medium text-slate-700">
                                            {photo.description}
                                        </p>
                                    )}
                                    <div className="space-y-1 text-xs text-slate-500">
                                        <p className="flex items-center gap-1.5">
                                            <UserRound className="h-3.5 w-3.5 text-rose-500" />
                                            {photo.deleter?.full_name ||
                                                'Өшірген адам белгісіз'}
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <Clock3 className="h-3.5 w-3.5 text-rose-500" />
                                            {formatDateTime(photo.deleted_at)}
                                        </p>
                                    </div>
                                    {canDownload && downloadUrl && (
                                        <a
                                            href={downloadUrl(photo)}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Жүктеу
                                        </a>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function PhotoCard({
    photo,
    index,
    photos,
    canDelete,
    canDownload,
    downloadUrl,
    onOpen,
    onDelete,
}: {
    photo: GalleryPhoto;
    index: number;
    photos: GalleryPhoto[];
    canDelete: boolean;
    canDownload: boolean;
    downloadUrl?: string;
    onOpen: (photos: GalleryPhoto[], index: number) => void;
    onDelete: (photo: GalleryPhoto) => void;
}) {
    return (
        <article
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-slate-100 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.65)] ring-1 ring-slate-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(15,23,42,0.55)] hover:ring-sky-200"
            onClick={() => onOpen(photos, index)}
        >
            <img
                src={`/storage/${photo.file_path}`}
                alt={photo.description || 'Галерея фотосы'}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/15" />

            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/45 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md">
                <CalendarDays className="h-3 w-3" />
                {formatDate(photo.gallery_date || photo.created_at)}
            </span>

            {photo.description && (
                <p className="absolute right-3 bottom-3 left-3 line-clamp-2 text-xs leading-5 font-medium text-white">
                    {photo.description}
                </p>
            )}

            <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onOpen(photos, index);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-slate-950/45 text-white backdrop-blur-md transition hover:bg-white hover:text-slate-900"
                    title="Үлкейтіп көру"
                    aria-label="Фотоны үлкейтіп көру"
                >
                    <Eye className="h-4 w-4" />
                </button>
                {canDownload && downloadUrl && (
                    <a
                        href={downloadUrl}
                        onClick={(event) => event.stopPropagation()}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-slate-950/45 text-white backdrop-blur-md transition hover:bg-white hover:text-sky-700"
                        title="Жүктеу"
                        aria-label="Фотоны жүктеу"
                    >
                        <Download className="h-4 w-4" />
                    </a>
                )}
                {canDelete && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete(photo);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/30 bg-rose-600/80 text-white backdrop-blur-md transition hover:bg-rose-600"
                        title="Фотоны өшіру"
                        aria-label="Фотоны өшіру"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </article>
    );
}

function GallerySection({
    title,
    description,
    photos,
    accent = 'sky',
    canDelete,
    canDownload,
    downloadUrl,
    onOpen,
    onDelete,
}: {
    title: string;
    description: string;
    photos: GalleryPhoto[];
    accent?: 'sky' | 'violet' | 'emerald';
    canDelete: boolean;
    canDownload: boolean;
    downloadUrl?: (photo: GalleryPhoto) => string;
    onOpen: (photos: GalleryPhoto[], index: number) => void;
    onDelete: (photo: GalleryPhoto) => void;
}) {
    const accents = {
        sky: {
            header: 'from-sky-50 via-white to-cyan-50/60',
            icon: 'bg-sky-50 text-sky-700 ring-sky-100',
            badge: 'bg-sky-100/70 text-sky-700 ring-sky-200',
        },
        violet: {
            header: 'from-violet-50 via-white to-fuchsia-50/50',
            icon: 'bg-violet-50 text-violet-700 ring-violet-100',
            badge: 'bg-violet-100/70 text-violet-700 ring-violet-200',
        },
        emerald: {
            header: 'from-emerald-50 via-white to-teal-50/50',
            icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
            badge: 'bg-emerald-100/70 text-emerald-700 ring-emerald-200',
        },
    }[accent];

    return (
        <Card className="overflow-hidden rounded-3xl border-slate-200/80 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.55)]">
            <div
                className={cn(
                    'flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6',
                    accents.header,
                )}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1',
                            accents.icon,
                        )}
                    >
                        {accent === 'violet' ? (
                            <Sparkles className="h-5 w-5" />
                        ) : accent === 'emerald' ? (
                            <CalendarDays className="h-5 w-5" />
                        ) : (
                            <Images className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">{title}</h2>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                            {description}
                        </p>
                    </div>
                </div>
                <span
                    className={cn(
                        'w-fit rounded-full px-3 py-1 text-xs font-bold ring-1',
                        accents.badge,
                    )}
                >
                    {photos.length} фото
                </span>
            </div>
            <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {photos.map((photo, index) => (
                        <PhotoCard
                            key={photo.id}
                            photo={photo}
                            index={index}
                            photos={photos}
                            canDelete={canDelete}
                            canDownload={canDownload}
                            downloadUrl={downloadUrl?.(photo)}
                            onOpen={onOpen}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function GalleryWorkspace({
    title,
    entityName,
    entityLabel,
    backLabel,
    backUrl,
    mainGallery,
    datedGallery,
    renderPhotos,
    deletedPhotos = [],
    canEdit,
    canDelete,
    canDownload = false,
    canViewDeleted = false,
    canChooseGalleryDate,
    defaultDateToToday = false,
    storeUrl,
    destroyUrl,
    downloadUrl,
    details,
}: GalleryWorkspaceProps) {
    const inputId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialDate = defaultDateToToday ? today() : '';
    const [photos, setPhotos] = useState<FileList | null>(null);
    const [galleryDate, setGalleryDate] = useState(initialDate);
    const [description, setDescription] = useState('');
    const [photoType, setPhotoType] = useState<'gallery' | 'render'>('gallery');
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [uploadError, setUploadError] = useState('');
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxPhotos, setLightboxPhotos] = useState<GalleryPhoto[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showDeletedPhotos, setShowDeletedPhotos] = useState(false);

    useEffect(() => {
        return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
    }, [previewUrls]);

    const sortedDatedGallery = Object.entries(datedGallery).sort(
        ([firstDate], [secondDate]) =>
            new Date(secondDate).getTime() - new Date(firstDate).getTime(),
    );
    const datedPhotosCount = sortedDatedGallery.reduce(
        (total, [, datedPhotos]) => total + datedPhotos.length,
        0,
    );
    const totalPhotos =
        mainGallery.length + renderPhotos.length + datedPhotosCount;

    const openLightbox = (selectedPhotos: GalleryPhoto[], index: number) => {
        setLightboxPhotos(selectedPhotos);
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const clearPhotos = () => {
        setPhotos(null);
        setPreviewUrls([]);
        setUploadError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const resetForm = () => {
        clearPhotos();
        setGalleryDate(initialDate);
        setDescription('');
        setPhotoType('gallery');
    };

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploadError('');
        const selectedPhotos = event.target.files;

        if (!selectedPhotos?.length) return;

        const files = Array.from(selectedPhotos);
        const oversizedFile = files.find(
            (selectedFile) => selectedFile.size > MAX_FILE_SIZE,
        );

        if (oversizedFile) {
            setUploadError(
                `«${oversizedFile.name}» файлы 5 МБ шегінен асып кетті.`,
            );
            return;
        }

        const totalSize = files.reduce(
            (sum, selectedFile) => sum + selectedFile.size,
            0,
        );
        if (totalSize > MAX_TOTAL_SIZE) {
            setUploadError(
                `Файлдардың жалпы көлемі 45 МБ шегінен асып кетті (${(totalSize / 1024 / 1024).toFixed(1)} МБ).`,
            );
            return;
        }

        setPhotos(selectedPhotos);
        setPreviewUrls(
            files.map((selectedFile) => URL.createObjectURL(selectedFile)),
        );
    };

    const handleUpload = (event: React.FormEvent) => {
        event.preventDefault();

        if (!photos?.length) return;

        const formData = new FormData();
        Array.from(photos).forEach((photo) => {
            formData.append('photos[]', photo);
        });
        if (photoType === 'gallery' && canChooseGalleryDate && galleryDate) {
            formData.append('gallery_date', galleryDate);
        }
        if (description) formData.append('description', description);
        formData.append('photo_type', photoType);

        setIsUploading(true);
        router.post(storeUrl, formData, {
            preserveState: false,
            onSuccess: resetForm,
            onFinish: () => setIsUploading(false),
        });
    };

    const handleDelete = (photo: GalleryPhoto) => {
        if (
            confirm(
                'Осы фотоны өшірілген суреттер бөліміне жіберуге сенімдісіз бе? Файл физикалық жойылмайды.',
            )
        ) {
            router.delete(destroyUrl(photo));
        }
    };

    const stats = [
        {
            label: 'Барлық фото',
            value: totalPhotos,
            icon: Images,
            className: 'bg-sky-50 text-sky-700 ring-sky-100',
        },
        {
            label: 'Кезеңдер саны',
            value: sortedDatedGallery.length,
            icon: CalendarDays,
            className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        },
        {
            label: 'Болашақ көрінісі',
            value: renderPhotos.length,
            icon: Sparkles,
            className: 'bg-violet-50 text-violet-700 ring-violet-100',
        },
    ];

    return (
        <PageContainer width="standard">
            <section className="relative overflow-hidden rounded-[28px] bg-[#0b1533] px-5 py-6 text-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.9)] sm:px-8 sm:py-8">
                <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
                <div className="relative">
                    <Link
                        href={backUrl}
                        className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {backLabel}
                    </Link>
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">
                        <Camera className="h-4 w-4" />
                        Медиа орталығы
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {title}
                    </h1>
                    <p className="mt-2 max-w-3xl truncate text-sm text-slate-300 sm:text-base">
                        {entityName}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
                            {entityLabel}
                        </span>
                        {details.slice(0, 2).map((detail) => (
                            <span
                                key={detail.label}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10"
                            >
                                <MapPin className="h-3 w-3 text-violet-300" />
                                {detail.value}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <div
                            key={stat.label}
                            className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.5)]"
                        >
                            <div
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-xl ring-1',
                                    stat.className,
                                )}
                            >
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl leading-none font-bold text-slate-900">
                                    {stat.value}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {stat.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </section>

            {canViewDeleted && (
                <section className="space-y-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            setShowDeletedPhotos((current) => !current)
                        }
                        className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    >
                        <Eye className="h-4 w-4" />
                        Өшірілген суреттер
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                            {deletedPhotos.length}
                        </span>
                    </Button>

                    {showDeletedPhotos && (
                        <DeletedPhotoArchive
                            photos={deletedPhotos}
                            canDownload={canDownload}
                            downloadUrl={downloadUrl}
                            onOpen={openLightbox}
                        />
                    )}
                </section>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                {canEdit && (
                    <aside className="lg:sticky lg:top-6">
                        <Card className="overflow-hidden rounded-3xl border-slate-200/80 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.65)]">
                            <div className="border-b border-slate-100 bg-gradient-to-br from-violet-50 via-white to-sky-50/60 px-5 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1533] text-violet-300 shadow-lg shadow-slate-900/15">
                                        <Upload className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900">
                                            Фото жүктеу
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Галереяны жаңарту
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-5">
                                <form
                                    onSubmit={handleUpload}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPhotoType('gallery')
                                            }
                                            className={cn(
                                                'rounded-lg px-3 py-2 text-xs font-semibold transition',
                                                photoType === 'gallery'
                                                    ? 'bg-white text-sky-700 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700',
                                            )}
                                        >
                                            <Images className="mr-1.5 inline h-3.5 w-3.5" />
                                            Галерея
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPhotoType('render')
                                            }
                                            className={cn(
                                                'rounded-lg px-3 py-2 text-xs font-semibold transition',
                                                photoType === 'render'
                                                    ? 'bg-white text-violet-700 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700',
                                            )}
                                        >
                                            <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                                            Болашақ
                                        </button>
                                    </div>

                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            id={inputId}
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="sr-only"
                                        />
                                        <label
                                            htmlFor={inputId}
                                            className={cn(
                                                'flex cursor-pointer flex-col items-center rounded-2xl border border-dashed px-4 py-6 text-center transition',
                                                photos?.length
                                                    ? 'border-violet-300 bg-violet-50/60'
                                                    : 'border-slate-300 bg-slate-50/70 hover:border-violet-300 hover:bg-violet-50/40',
                                            )}
                                        >
                                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm ring-1 ring-slate-200">
                                                {photos?.length ? (
                                                    <CheckCircle2 className="h-5 w-5" />
                                                ) : (
                                                    <ImageIcon className="h-5 w-5" />
                                                )}
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700">
                                                {photos?.length
                                                    ? `${photos.length} фото таңдалды`
                                                    : 'Фотоларды таңдаңыз'}
                                            </span>
                                            <span className="mt-1 text-xs text-slate-400">
                                                Бір фото 5 МБ, барлығы 45 МБ
                                            </span>
                                        </label>
                                    </div>

                                    {uploadError && (
                                        <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                            {uploadError}
                                        </div>
                                    )}

                                    {previewUrls.length > 0 && (
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-slate-600">
                                                    Алдын ала қарау
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={clearPhotos}
                                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700"
                                                >
                                                    <X className="h-3 w-3" />
                                                    Тазалау
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {previewUrls
                                                    .slice(0, 5)
                                                    .map((url, index) => (
                                                        <img
                                                            key={url}
                                                            src={url}
                                                            alt={`Таңдалған фото ${index + 1}`}
                                                            className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200"
                                                        />
                                                    ))}
                                                {previewUrls.length > 5 && (
                                                    <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">
                                                        +
                                                        {previewUrls.length - 5}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {photoType === 'gallery' &&
                                        (canChooseGalleryDate ? (
                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor={`${inputId}-date`}
                                                    className="text-xs font-semibold text-slate-600"
                                                >
                                                    Галерея күні
                                                </Label>
                                                <Input
                                                    id={`${inputId}-date`}
                                                    type="date"
                                                    value={galleryDate}
                                                    onChange={(event) =>
                                                        setGalleryDate(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50"
                                                />
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs leading-5 text-sky-800">
                                                Галерея күні жүктелген уақытпен
                                                автоматты сақталады.
                                            </div>
                                        ))}

                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor={`${inputId}-description`}
                                            className="text-xs font-semibold text-slate-600"
                                        >
                                            Сипаттама
                                            <span className="ml-1 font-normal text-slate-400">
                                                (міндетті емес)
                                            </span>
                                        </Label>
                                        <Textarea
                                            id={`${inputId}-description`}
                                            value={description}
                                            onChange={(event) =>
                                                setDescription(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Фотолар туралы қысқаша мәлімет"
                                            className="min-h-20 resize-none rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={
                                            !photos?.length || isUploading
                                        }
                                        className="h-11 w-full rounded-xl bg-[#0b1533] text-white shadow-lg shadow-slate-900/10 hover:bg-[#15244e]"
                                    >
                                        {isUploading ? (
                                            <>
                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                Жүктелуде...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-4 w-4" />
                                                {photos?.length || 0} фото
                                                жүктеу
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </aside>
                )}

                <main className={cn('space-y-6', !canEdit && 'lg:col-span-2')}>
                    {totalPhotos === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-20 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-100">
                                <Images className="h-6 w-6" />
                            </div>
                            <p className="font-semibold text-slate-700">
                                Галереяда әзірге фото жоқ
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Жаңа фотолар осы жерде көрінеді
                            </p>
                        </div>
                    ) : (
                        <>
                            {mainGallery.length > 0 && (
                                <GallerySection
                                    title="Негізгі галерея"
                                    description="Нысанның негізгі және жалпы фотосуреттері"
                                    photos={mainGallery}
                                    canDelete={canDelete}
                                    canDownload={canDownload}
                                    downloadUrl={downloadUrl}
                                    onOpen={openLightbox}
                                    onDelete={handleDelete}
                                />
                            )}

                            {renderPhotos.length > 0 && (
                                <GallerySection
                                    title="Болашақ көрінісі"
                                    description="Жобаның жоспарланған келбеті мен визуализациялары"
                                    photos={renderPhotos}
                                    accent="violet"
                                    canDelete={canDelete}
                                    canDownload={canDownload}
                                    downloadUrl={downloadUrl}
                                    onOpen={openLightbox}
                                    onDelete={handleDelete}
                                />
                            )}

                            {sortedDatedGallery.length > 0 && (
                                <section className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                                            <Layers3 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-slate-900">
                                                Іске асыру барысы
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                Фотолар күндер бойынша реттелген
                                            </p>
                                        </div>
                                    </div>
                                    {sortedDatedGallery.map(
                                        ([date, datedPhotos]) => (
                                            <GallerySection
                                                key={date}
                                                title={formatDate(date)}
                                                description="Осы кезеңде жүктелген фотоматериалдар"
                                                photos={datedPhotos}
                                                accent="emerald"
                                                canDelete={canDelete}
                                                canDownload={canDownload}
                                                downloadUrl={downloadUrl}
                                                onOpen={openLightbox}
                                                onDelete={handleDelete}
                                            />
                                        ),
                                    )}
                                </section>
                            )}
                        </>
                    )}
                </main>
            </div>

            <PhotoLightbox
                photos={lightboxPhotos}
                initialIndex={lightboxIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />
        </PageContainer>
    );
}
