import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormEventHandler } from 'react';
import * as regions from '@/routes/regions';
import LocationPicker from '@/components/location-picker';

interface Region {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    area: number | null;
    type: string;
    subtype: string | null;
    parent_id: number | null;
    geometry?: { lat: number; lng: number }[];
}

interface Props {
    region: Region;
    parents: Region[];
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

// Normalize corrupted geometry where lat/lng might be arrays instead of numbers
function normalizeGeometry(
    geometry?: { lat: any; lng: any }[],
): { lat: number; lng: number }[] {
    if (!geometry || !Array.isArray(geometry)) return [];
    const result: { lat: number; lng: number }[] = [];
    for (const point of geometry) {
        if (!point) continue;
        let lat = point.lat;
        let lng = point.lng;
        // If lat or lng are arrays (corrupted data), flatten into separate points
        if (
            Array.isArray(lat) &&
            Array.isArray(lng) &&
            lat.length === lng.length
        ) {
            for (let i = 0; i < lat.length; i++) {
                const pLat = Number(lng[i]); // lat/lng are swapped in corrupted data
                const pLng = Number(lat[i]);
                if (!isNaN(pLat) && !isNaN(pLng)) {
                    result.push({ lat: pLat, lng: pLng });
                }
            }
        } else {
            if (Array.isArray(lat)) lat = lat[0];
            if (Array.isArray(lng)) lng = lng[0];
            const nLat = Number(lat);
            const nLng = Number(lng);
            if (!isNaN(nLat) && !isNaN(nLng)) {
                result.push({ lat: nLat, lng: nLng });
            }
        }
    }
    return result;
}

export default function Edit({ region, parents }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'put' as const,
        name: region.name,
        color: region.color ?? '#3B82F6',
        icon_file: null as File | null,
        area:
            region.area !== null && region.area !== undefined
                ? String(region.area)
                : '',
        type: region.type || 'district',
        subtype: region.subtype || 'district',
        parent_id: region.parent_id ? region.parent_id.toString() : '',
        geometry: normalizeGeometry(region.geometry),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(regions.update.url(region.id));
    };

    const existingIconPath = resolveRegionIconPath(region.icon);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Регионы', href: regions.index.url() },
                { title: 'Редактирование', href: '#' },
            ]}
        >
            <Head title="Редактирование региона" />

            <div className="flex h-full max-w-2xl flex-col p-4">
                <h1 className="mb-6 font-serif text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Редактирование региона
                </h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="type"
                            className="font-normal text-neutral-500"
                        >
                            Тип региона
                        </Label>
                        <Select
                            value={data.type}
                            onValueChange={(value) => setData('type', value)}
                        >
                            <SelectTrigger className="h-10 w-full border-neutral-200 shadow-none focus:border-neutral-900 focus:ring-0">
                                <SelectValue placeholder="Выберите тип" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="oblast">Область</SelectItem>
                                <SelectItem value="district">Район</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.type && (
                            <span className="text-sm text-red-500">
                                {errors.type}
                            </span>
                        )}
                    </div>

                    {data.type === 'district' && (
                        <div className="flex flex-col gap-2">
                            <Label
                                htmlFor="parent_id"
                                className="font-normal text-neutral-500"
                            >
                                Родительский регион (Область)
                            </Label>
                            <Select
                                value={data.parent_id}
                                onValueChange={(value) =>
                                    setData('parent_id', value)
                                }
                            >
                                <SelectTrigger className="h-10 w-full border-neutral-200 shadow-none focus:border-neutral-900 focus:ring-0">
                                    <SelectValue placeholder="Выберите область" />
                                </SelectTrigger>
                                <SelectContent>
                                    {parents.map((parent) => (
                                        <SelectItem
                                            key={parent.id}
                                            value={parent.id.toString()}
                                        >
                                            {parent.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.parent_id && (
                                <span className="text-sm text-red-500">
                                    {errors.parent_id}
                                </span>
                            )}
                        </div>
                    )}

                    {data.type === 'district' && (
                        <div className="flex flex-col gap-2">
                            <Label
                                htmlFor="subtype"
                                className="font-normal text-neutral-500"
                            >
                                Район / Город
                            </Label>
                            <Select
                                value={data.subtype}
                                onValueChange={(value) =>
                                    setData('subtype', value)
                                }
                            >
                                <SelectTrigger className="h-10 w-full border-neutral-200 shadow-none focus:border-neutral-900 focus:ring-0">
                                    <SelectValue placeholder="Таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="district">
                                        Район
                                    </SelectItem>
                                    <SelectItem value="city">
                                        Город
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.subtype && (
                                <span className="text-sm text-red-500">
                                    {errors.subtype}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="name"
                            className="font-normal text-neutral-500"
                        >
                            Наименование
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="h-10 border-neutral-200 bg-transparent shadow-none focus:border-neutral-900 focus-visible:ring-0"
                            placeholder="Например: Сауран"
                            autoFocus
                        />
                        {errors.name && (
                            <span className="text-sm text-red-500">
                                {errors.name}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="color"
                            className="font-normal text-neutral-500"
                        >
                            Цвет региона
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="color"
                                type="color"
                                value={data.color}
                                onChange={(e) =>
                                    setData(
                                        'color',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                className="h-10 w-14 cursor-pointer rounded-md border-neutral-200 bg-transparent p-1 shadow-none"
                            />
                            <Input
                                value={data.color}
                                onChange={(e) =>
                                    setData('color', e.target.value)
                                }
                                className="h-10 border-neutral-200 bg-transparent font-mono uppercase shadow-none focus:border-neutral-900 focus-visible:ring-0"
                                placeholder="#3B82F6"
                            />
                        </div>
                        {errors.color && (
                            <span className="text-sm text-red-500">
                                {errors.color}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="icon_file"
                            className="font-normal text-neutral-500"
                        >
                            Загрузить новую иконку (PNG, JPG, WEBP, SVG)
                        </Label>
                        <Input
                            id="icon_file"
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
                            onChange={(e) =>
                                setData(
                                    'icon_file',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                            className="h-10 border-neutral-200 bg-transparent shadow-none file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-neutral-200 focus:border-neutral-900 focus-visible:ring-0"
                        />
                        {existingIconPath && (
                            <div className="flex items-center gap-2 rounded-md border border-neutral-200 p-2">
                                <img
                                    src={existingIconPath}
                                    alt="Текущая иконка региона"
                                    className="h-8 w-8 object-contain"
                                />
                                <span className="text-xs text-neutral-500">
                                    Текущая загруженная иконка
                                </span>
                            </div>
                        )}
                        <p className="text-xs text-neutral-500">
                            Если файл не загрузить, текущая иконка останется без
                            изменений.
                        </p>
                        {errors.icon_file && (
                            <span className="text-sm text-red-500">
                                {errors.icon_file}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="area"
                            className="font-normal text-neutral-500"
                        >
                            Аумағы (га)
                        </Label>
                        <Input
                            id="area"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.area}
                            onChange={(e) => setData('area', e.target.value)}
                            className="h-10 border-neutral-200 bg-transparent shadow-none focus:border-neutral-900 focus-visible:ring-0"
                            placeholder="Например: 120.50"
                        />
                        {errors.area && (
                            <span className="text-sm text-red-500">
                                {errors.area}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="font-normal text-neutral-500">
                            Геолокация (полигон)
                        </Label>
                        <LocationPicker
                            value={data.geometry}
                            onChange={(val) => setData('geometry', val)}
                            className="w-full"
                        />
                        {/* 
                            // @ts-ignore */}
                        {(errors.geometry ||
                            Object.keys(errors).some((k) =>
                                k.startsWith('geometry'),
                            )) && (
                            <span className="text-sm text-red-500">
                                {errors.geometry ||
                                    'Геолокация деректерінде қате бар. Нүктелерді қайта салыңыз.'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="shadow-none">
                            Обновить
                        </Button>
                        <Link
                            href={regions.index.url()}
                            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
                        >
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
