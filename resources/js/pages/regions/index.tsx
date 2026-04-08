import { Head, Link, router, usePage } from '@inertiajs/react';
import { Trash2, Edit, GripVertical, MoveRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import * as regions from '@/routes/regions';

import type { PaginatedData, SharedData } from '@/types';

interface Region {
    id: number;
    name: string;
    color: string;
    icon: string;
    type: string;
    subtype: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    regions: PaginatedData<Region>;
}

function resolveRegionIconPath(icon: string | null | undefined): string | null {
    if (!icon) {
        return null;
    }

    if (icon.startsWith('http://') || icon.startsWith('https://')) {
        return icon;
    }

    if (icon.startsWith('/')) {
        return icon;
    }

    if (icon.includes('/')) {
        return `/storage/${icon}`;
    }

    return null;
}

function SortableRegionRow({
    id,
    children,
    isEnabled,
}: {
    id: number;
    children: React.ReactNode;
    isEnabled: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });
    if (!isEnabled) {
        return <TableRow>{children}</TableRow>;
    }

    return (
        <TableRow
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                position: isDragging ? 'relative' : undefined,
                zIndex: isDragging ? 10 : undefined,
            }}
            className="transition-colors hover:bg-gray-50"
        >
            <TableCell className="w-6 py-3 pr-0 pl-3">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab rounded p-1 hover:bg-gray-100"
                >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
            </TableCell>
            {children}
        </TableRow>
    );
}

export default function Index({ regions: regionsData }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.user?.role_model?.name === 'superadmin';

    const [orderedRegions, setOrderedRegions] = useState<Region[]>(
        regionsData.data,
    );
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [regionToMove, setRegionToMove] = useState<Region | null>(null);
    const [targetPage, setTargetPage] = useState<number>(1);

    const openMoveModal = (region: Region) => {
        setRegionToMove(region);
        setTargetPage(1);
        setIsMoveModalOpen(true);
    };

    const handleMoveSubmit = () => {
        if (!regionToMove) return;

        router.post(
            `/regions/${regionToMove.id}/move-to-page`,
            {
                target_page: targetPage,
            },
            {
                onSuccess: () => setIsMoveModalOpen(false),
            },
        );
    };

    useEffect(() => {
        setOrderedRegions(regionsData.data);
    }, [regionsData.data]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const saveOrder = (newOrder: Region[]) => {
        const csrfTokenValue =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';

        fetch('/regions/reorder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfTokenValue,
            },
            body: JSON.stringify({
                region_ids: newOrder.map((r) => r.id),
                page: regionsData.current_page || 1,
            }),
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (!isSuperAdmin) return;

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = orderedRegions.findIndex((r) => r.id === active.id);
        const newIndex = orderedRegions.findIndex((r) => r.id === over.id);

        const newOrder = arrayMove(orderedRegions, oldIndex, newIndex);
        setOrderedRegions(newOrder);
        saveOrder(newOrder);
    };

    const handleDelete = (id: number) => {
        if (confirm('Сенімдісіз бе?')) {
            router.delete(regions.destroy.url(id));
        }
    };

    return (
        <AppLayout
            breadcrumbs={[{ title: 'Аймақтар', href: regions.index.url() }]}
        >
            <Head title="Аймақтар" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Аймақтар
                    </h1>
                    <Button
                        asChild
                        size="sm"
                        className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]"
                    >
                        <Link href={regions.create.url()}>Жаңа қосу</Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {isSuperAdmin && (
                                        <TableHead className="w-12"></TableHead>
                                    )}
                                    <TableHead className="w-[80px]">
                                        ID
                                    </TableHead>
                                    <TableHead>Атауы</TableHead>
                                    <TableHead>Түрі</TableHead>
                                    <TableHead>Түсі</TableHead>
                                    <TableHead>Белгіше</TableHead>
                                    <TableHead className="text-right">
                                        Әрекеттер
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <SortableContext
                                    items={orderedRegions.map((r) => r.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {orderedRegions.map((region) => (
                                        <SortableRegionRow
                                            key={region.id}
                                            id={region.id}
                                            isEnabled={isSuperAdmin}
                                        >
                                            <TableCell className="font-medium text-gray-400">
                                                #{region.id}
                                            </TableCell>
                                            <TableCell className="font-semibold text-[#0f1b3d]">
                                                {region.name}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                                                    {region.type === 'oblast'
                                                        ? 'Облыс'
                                                        : region.subtype ===
                                                            'city'
                                                          ? 'Қала'
                                                          : 'Аудан'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-4 w-4 rounded border border-gray-200"
                                                        style={{
                                                            backgroundColor:
                                                                region.color ||
                                                                '#3B82F6',
                                                        }}
                                                    />
                                                    <span className="font-mono text-xs text-gray-500 uppercase">
                                                        {region.color ||
                                                            '#3B82F6'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {(() => {
                                                    const iconPath =
                                                        resolveRegionIconPath(
                                                            region.icon,
                                                        );

                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            {iconPath && (
                                                                <img
                                                                    src={
                                                                        iconPath
                                                                    }
                                                                    alt={`${region.name} белгішесі`}
                                                                    className="h-5 w-5 object-contain"
                                                                />
                                                            )}
                                                            <span>
                                                                {region.icon ||
                                                                    'factory'}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="flex justify-end space-x-2 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Басқа бетке ауыстыру"
                                                    className="h-8 w-8 transition-colors hover:bg-blue-50 hover:text-blue-700"
                                                    onClick={() =>
                                                        openMoveModal(region)
                                                    }
                                                >
                                                    <MoveRight className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 transition-colors hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                >
                                                    <Link
                                                        href={regions.edit.url(
                                                            region.id,
                                                        )}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                                                    onClick={() =>
                                                        handleDelete(region.id)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </SortableRegionRow>
                                    ))}
                                </SortableContext>
                                {orderedRegions.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={isSuperAdmin ? 7 : 6}
                                            className="py-12 text-center text-gray-400"
                                        >
                                            Мәлімет жоқ. Бірінші аймақты
                                            құрыңыз.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>

                <Pagination paginator={regionsData} />

                <Dialog
                    open={isMoveModalOpen}
                    onOpenChange={setIsMoveModalOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Аймақтың орнын ауыстыру</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="targetPage">
                                Қай бетке апарамыз?
                            </Label>
                            <Input
                                id="targetPage"
                                type="number"
                                min={1}
                                max={regionsData.last_page}
                                value={targetPage}
                                onChange={(e) =>
                                    setTargetPage(parseInt(e.target.value) || 1)
                                }
                                className="mt-2"
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                Жалпы беттер саны: {regionsData.last_page}
                            </p>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsMoveModalOpen(false)}
                            >
                                Болдырмау
                            </Button>
                            <Button
                                onClick={handleMoveSubmit}
                                className="bg-[#c8a44e] text-white hover:bg-[#b8943e]"
                            >
                                Сақтау
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
