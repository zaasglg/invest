import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface Photo {
    id: number;
    file_path: string;
    description?: string | null;
}

interface PhotoLightboxProps {
    photos: Photo[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function PhotoLightbox({
    photos,
    initialIndex = 0,
    isOpen,
    onClose,
}: PhotoLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Reset zoom and position when photo changes
    useEffect(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }, [currentIndex]);

    // Reset index when lightbox opens with new initialIndex
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    const goToPrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    }, [photos.length]);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }, [photos.length]);

    const handleZoomIn = useCallback(() => {
        if (zoom < 5) {
            setZoom((prev) => prev + 0.5);
        }
    }, [zoom]);

    const handleZoomOut = useCallback(() => {
        if (zoom > 1) {
            setZoom((prev) => prev - 0.5);
            if (zoom - 0.5 === 1) {
                setPosition({ x: 0, y: 0 });
            }
        }
    }, [zoom]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === '+' || e.key === '=') handleZoomIn();
            if (e.key === '-' || e.key === '_') handleZoomOut();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goToPrevious, goToNext, handleZoomIn, handleZoomOut, onClose]);

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

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const currentPhoto = photos[currentIndex];

    if (!isOpen || !currentPhoto) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 rounded-full p-2 text-white transition-colors hover:bg-white/10"
                aria-label="Жабу"
            >
                <X className="h-6 w-6" />
            </button>

            {/* Navigation buttons */}
            {photos.length > 1 && (
                <>
                    <button
                        onClick={goToPrevious}
                        className="absolute top-1/2 left-4 z-50 -translate-y-1/2 rounded-full p-2 text-white transition-colors hover:bg-white/10"
                        aria-label="Алдыңғы фото"
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute top-1/2 right-4 z-50 -translate-y-1/2 rounded-full p-2 text-white transition-colors hover:bg-white/10"
                        aria-label="Келесі фото"
                    >
                        <ChevronRight className="h-8 w-8" />
                    </button>
                </>
            )}

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-4 py-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="h-8 w-8 text-white hover:bg-white/10"
                >
                    <ZoomOut className="h-4 w-4" />
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
                    <ZoomIn className="h-4 w-4" />
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

            {/* Photo counter */}
            {photos.length > 1 && (
                <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                    {currentIndex + 1} / {photos.length}
                </div>
            )}

            {/* Image container */}
            <div
                className="relative flex h-full w-full cursor-grab items-center justify-center overflow-hidden active:cursor-grabbing"
                onClick={
                    zoom === 1
                        ? (e) => {
                              if (e.target === e.currentTarget) goToNext();
                          }
                        : undefined
                }
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    cursor:
                        zoom > 1
                            ? isDragging
                                ? 'grabbing'
                                : 'grab'
                            : 'pointer',
                }}
            >
                <img
                    src={`/storage/${currentPhoto.file_path}`}
                    alt={currentPhoto.description || 'Жоба фотосы'}
                    className="max-h-full max-w-full object-contain transition-transform"
                    style={{
                        transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                        cursor:
                            zoom > 1
                                ? isDragging
                                    ? 'grabbing'
                                    : 'grab'
                                : 'pointer',
                    }}
                    draggable={false}
                />

                {/* Photo description */}
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
