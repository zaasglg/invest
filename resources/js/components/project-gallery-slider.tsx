import { Calendar, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Photo {
    id: number;
    file_path: string;
    description?: string | null;
    gallery_date?: string | null;
    created_at?: string | null;
}

interface ProjectGallerySliderProps {
    photos: Photo[];
}

export default function ProjectGallerySlider({
    photos,
}: ProjectGallerySliderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }, [photos.length]);

    const goToPrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    }, [photos.length]);

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    // Auto-play (optional)
    useEffect(() => {
        if (photos.length <= 1) return;

        const interval = setInterval(() => {
            goToNext();
        }, 5000);

        return () => clearInterval(interval);
    }, [goToNext, photos.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNext, goToPrevious]);

    if (photos.length === 0) {
        return (
            <div className="mb-4 overflow-hidden rounded-lg bg-gray-100">
                <div className="flex aspect-video items-center justify-center">
                    <p className="text-gray-400">Фотосуреттер жоқ</p>
                </div>
            </div>
        );
    }

    const currentPhoto = photos[currentIndex];

    return (
        <>
            <div className="group relative mb-4 overflow-hidden rounded-lg bg-gray-900">
                {/* Main image */}
                <div className="relative aspect-video">
                    <img
                        src={`/storage/${currentPhoto.file_path}`}
                        alt={currentPhoto.description || 'Жоба фотосы'}
                        className="h-full w-full object-cover transition-opacity duration-300"
                    />

                    {/* Date & description overlay */}
                    <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <div className="flex items-end justify-between gap-4">
                            <p className="truncate text-sm text-white">
                                {currentPhoto.description || ''}
                            </p>
                            {(currentPhoto.gallery_date ||
                                currentPhoto.created_at) && (
                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(
                                        currentPhoto.gallery_date ||
                                            currentPhoto.created_at!,
                                    ).toLocaleDateString('kk-KZ', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Open lightbox button */}
                    <button
                        onClick={() => openLightbox(currentIndex)}
                        className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                    >
                        <ZoomIn className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation arrows */}
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={goToPrevious}
                            className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                            onClick={goToNext}
                            className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </>
                )}

                {/* Dots indicator */}
                {photos.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                        {photos.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`h-2 w-2 rounded-full transition-all ${
                                    index === currentIndex
                                        ? 'w-6 bg-white'
                                        : 'bg-white/50 hover:bg-white/75'
                                }`}
                            />
                        ))}
                    </div>
                )}

                {/* Photo counter */}
                {photos.length > 1 && (
                    <div className="absolute top-4 left-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                        {currentIndex + 1} / {photos.length}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <PhotoLightbox
                    photos={photos}
                    initialIndex={lightboxIndex}
                    isOpen={lightboxOpen}
                    onClose={closeLightbox}
                />
            )}
        </>
    );
}

// Lightbox component
interface PhotoLightboxProps {
    photos: Photo[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

function PhotoLightbox({
    photos,
    initialIndex,
    isOpen,
    onClose,
}: PhotoLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    useEffect(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }, [currentIndex]);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    };

    const handleZoomIn = () => {
        if (zoom < 5) setZoom((prev) => prev + 0.5);
    };

    const handleZoomOut = () => {
        if (zoom > 1) {
            setZoom((prev) => prev - 0.5);
            if (zoom - 0.5 === 1) setPosition({ x: 0, y: 0 });
        }
    };

    const handleResetZoom = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevious, goToNext]);

    if (!isOpen) return null;

    const currentPhoto = photos[currentIndex];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 rounded-full p-2 text-white hover:bg-white/10"
            >
                <X className="h-6 w-6" />
            </button>

            {photos.length > 1 && (
                <>
                    <button
                        onClick={goToPrevious}
                        className="absolute top-1/2 left-4 z-50 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10"
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute top-1/2 right-4 z-50 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10"
                    >
                        <ChevronRight className="h-8 w-8" />
                    </button>
                </>
            )}

            <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-4 py-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="h-8 w-8 text-white hover:bg-white/10"
                >
                    <span className="text-sm">−</span>
                </Button>
                <span className="min-w-[50px] text-center text-sm text-white">
                    {Math.round(zoom * 100)}%
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoom >= 5}
                    className="h-8 w-8 text-white hover:bg-white/10"
                >
                    <span className="text-sm">+</span>
                </Button>
                {zoom > 1 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetZoom}
                        className="text-xs text-white hover:bg-white/10"
                    >
                        Қалпына келтіру
                    </Button>
                )}
            </div>

            {photos.length > 1 && (
                <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                    {currentIndex + 1} / {photos.length}
                </div>
            )}

            <div
                className="relative flex h-full w-full items-center justify-center overflow-hidden"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img
                    src={`/storage/${currentPhoto.file_path}`}
                    alt={currentPhoto.description || 'Жоба фотосы'}
                    className="max-h-full max-w-full object-contain"
                    style={{
                        transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                        cursor:
                            zoom > 1
                                ? isDragging
                                    ? 'grabbing'
                                    : 'grab'
                                : 'default',
                    }}
                    draggable={false}
                />

                {currentPhoto.description && zoom === 1 && (
                    <div className="absolute bottom-20 left-1/2 max-w-2xl -translate-x-1/2 px-4">
                        <p className="rounded-lg bg-black/50 px-4 py-2 text-center text-sm text-white">
                            {currentPhoto.description}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
