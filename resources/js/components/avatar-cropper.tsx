import { Check, Minus, Plus, RotateCcw } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

import type { Area } from 'react-easy-crop';

interface AvatarCropperProps {
    open: boolean;
    imageSrc: string;
    onClose: () => void;
    onCropComplete: (croppedBlob: Blob) => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });
}

async function getCroppedImage(
    imageSrc: string,
    pixelCrop: Area,
): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    // Set canvas size to desired crop size
    const size = Math.max(pixelCrop.width, pixelCrop.height);
    canvas.width = size;
    canvas.height = size;

    // Draw the cropped image
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        size,
        size,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas is empty'));
                }
            },
            'image/jpeg',
            0.92,
        );
    });
}

export default function AvatarCropper({
    open,
    imageSrc,
    onClose,
    onCropComplete,
}: AvatarCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null,
    );

    const onCropAreaComplete = useCallback(
        (_croppedArea: Area, croppedAreaPixels: Area) => {
            setCroppedAreaPixels(croppedAreaPixels);
        },
        [],
    );

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;

        try {
            const croppedBlob = await getCroppedImage(
                imageSrc,
                croppedAreaPixels,
            );
            onCropComplete(croppedBlob);
        } catch (err) {
            console.error('Error cropping image:', err);
        }
    };

    const handleReset = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    const adjustZoom = (delta: number) => {
        setZoom((prev) => Math.min(3, Math.max(1, prev + delta)));
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
                <DialogHeader className="sr-only">
                    <DialogTitle>Обрезка фото</DialogTitle>
                    <DialogDescription>
                        Переместите и масштабируйте изображение
                    </DialogDescription>
                </DialogHeader>

                {/* Crop area */}
                <div className="relative h-[400px] w-full bg-gray-900">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropAreaComplete}
                        style={{
                            containerStyle: {
                                background: '#1a1a2e',
                            },
                            cropAreaStyle: {
                                border: '3px solid white',
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                            },
                        }}
                    />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
                    {/* Zoom controls */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => adjustZoom(-0.2)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) =>
                                setZoom(parseFloat(e.target.value))
                            }
                            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                        />
                        <button
                            type="button"
                            onClick={() => adjustZoom(0.2)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            title="Сбросить"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Confirm button */}
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="h-12 w-12 rounded-full bg-green-500 p-0 shadow-lg hover:bg-green-600"
                    >
                        <Check className="h-6 w-6 text-white" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
