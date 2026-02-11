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
    area: number | null;
    type: string;
    parent_id: number | null;
    geometry?: { lat: number, lng: number }[];
}

interface Props {
    region: Region;
    parents: Region[];
}

// Normalize corrupted geometry where lat/lng might be arrays instead of numbers
function normalizeGeometry(geometry?: { lat: any; lng: any }[]): { lat: number; lng: number }[] {
    if (!geometry || !Array.isArray(geometry)) return [];
    const result: { lat: number; lng: number }[] = [];
    for (const point of geometry) {
        if (!point) continue;
        let lat = point.lat;
        let lng = point.lng;
        // If lat or lng are arrays (corrupted data), flatten into separate points
        if (Array.isArray(lat) && Array.isArray(lng) && lat.length === lng.length) {
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
    const { data, setData, put, processing, errors } = useForm({
        name: region.name,
        area: region.area !== null && region.area !== undefined ? String(region.area) : '',
        type: region.type || 'district',
        parent_id: region.parent_id ? region.parent_id.toString() : '',
        geometry: normalizeGeometry(region.geometry),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(regions.update.url(region.id));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Регионы', href: regions.index.url() },
            { title: 'Редактирование', href: '#' }
        ]}>
            <Head title="Редактирование региона" />

            <div className="flex h-full flex-col p-4 max-w-2xl">
                <h1 className="text-2xl font-bold font-serif mb-6 text-neutral-900 dark:text-neutral-100">Редактирование региона</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="type" className="text-neutral-500 font-normal">Тип региона</Label>
                        <Select
                            value={data.type}
                            onValueChange={(value) => setData('type', value)}
                        >
                            <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                <SelectValue placeholder="Выберите тип" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="oblast">Область</SelectItem>
                                <SelectItem value="district">Район</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.type && <span className="text-sm text-red-500">{errors.type}</span>}
                    </div>

                    {data.type === 'district' && (
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="parent_id" className="text-neutral-500 font-normal">Родительский регион (Область)</Label>
                            <Select
                                value={data.parent_id}
                                onValueChange={(value) => setData('parent_id', value)}
                            >
                                <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                    <SelectValue placeholder="Выберите область" />
                                </SelectTrigger>
                                <SelectContent>
                                    {parents.map((parent) => (
                                        <SelectItem key={parent.id} value={parent.id.toString()}>
                                            {parent.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.parent_id && <span className="text-sm text-red-500">{errors.parent_id}</span>}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-neutral-500 font-normal">Наименование</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="Например: Сауран"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="area" className="text-neutral-500 font-normal">Аумағы (га)</Label>
                        <Input
                            id="area"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.area}
                            onChange={(e) => setData('area', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="Например: 120.50"
                        />
                        {errors.area && <span className="text-sm text-red-500">{errors.area}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-neutral-500 font-normal">Геолокация (полигон)</Label>
                        <LocationPicker
                            value={data.geometry}
                            onChange={(val) => setData('geometry', val)}
                            className="w-full"
                        />
                        {/* 
                            // @ts-ignore */}
                        {(errors.geometry || Object.keys(errors).some(k => k.startsWith('geometry'))) && (
                            <span className="text-sm text-red-500">
                                {errors.geometry || 'Геолокация деректерінде қате бар. Нүктелерді қайта салыңыз.'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="shadow-none">
                            Обновить
                        </Button>
                        <Link href={regions.index.url()} className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
