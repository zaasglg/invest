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
import { FormEventHandler, useMemo, useState } from 'react';
import * as subsoilUsersRoutes from '@/routes/subsoil-users';
import LocationPicker from '@/components/location-picker';

interface Region {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
    geometry: { lat: number, lng: number }[] | null;
}

interface SubsoilUser {
    id: number;
    name: string;
    bin: string;
    region_id: number;
    mineral_type: string;
    license_status: 'active' | 'expired' | 'suspended';
    license_start: string | null;
    license_end: string | null;
    location?: { lat: number, lng: number }[];
}

interface Props {
    subsoilUser: SubsoilUser;
    regions: Region[];
}

export default function Edit({ subsoilUser, regions }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: subsoilUser.name || '',
        bin: subsoilUser.bin || '',
        region_id: subsoilUser.region_id?.toString() || '',
        mineral_type: subsoilUser.mineral_type || '',
        license_status: subsoilUser.license_status || 'active',
        license_start: subsoilUser.license_start || '',
        license_end: subsoilUser.license_end || '',
        location: subsoilUser.location || [],
    });

    const initialRegion = regions.find(r => r.id === subsoilUser.region_id);
    const initialOblastId = initialRegion
        ? (initialRegion.type === 'oblast' ? initialRegion.id.toString() : initialRegion.parent_id?.toString() || '')
        : '';

    const [selectedOblastId, setSelectedOblastId] = useState<string>(initialOblastId);

    const oblasts = useMemo(() => regions.filter(r => r.type === 'oblast'), [regions]);

    const districts = useMemo(() => {
        if (!selectedOblastId) return [];
        return regions.filter(r => r.parent_id === parseInt(selectedOblastId));
    }, [regions, selectedOblastId]);
    
    const selectedDistrict = useMemo(() => {
        if (!data.region_id) return null;
        return regions.find(r => r.id.toString() === data.region_id);
    }, [regions, data.region_id]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(subsoilUsersRoutes.update.url(subsoilUser.id));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Недропользование', href: subsoilUsersRoutes.index.url() },
            { title: 'Редактирование', href: '#' }
        ]}>
            <Head title="Редактирование недропользователя" />

            <div className="flex h-full flex-col p-4 max-w-2xl">
                <h1 className="text-2xl font-bold font-serif mb-6 text-neutral-900 dark:text-neutral-100">Редактирование</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name" className="text-neutral-500 font-normal">Наименование</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                                autoFocus
                            />
                            {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="bin" className="text-neutral-500 font-normal">БИН</Label>
                            <Input
                                id="bin"
                                value={data.bin}
                                onChange={(e) => setData('bin', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            />
                            {errors.bin && <span className="text-sm text-red-500">{errors.bin}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="oblast" className="text-neutral-500 font-normal">Область</Label>
                            <Select
                                value={selectedOblastId}
                                onValueChange={(value) => {
                                    setSelectedOblastId(value);
                                    setData('region_id', '');
                                }}
                            >
                                <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                    <SelectValue placeholder="Выберите область" />
                                </SelectTrigger>
                                <SelectContent>
                                    {oblasts.map((oblast) => (
                                        <SelectItem key={oblast.id} value={oblast.id.toString()}>
                                            {oblast.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="region_id" className="text-neutral-500 font-normal">Район / Город</Label>
                            <Select
                                value={data.region_id}
                                onValueChange={(value) => setData('region_id', value)}
                                disabled={!selectedOblastId}
                            >
                                <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                    <SelectValue placeholder="Выберите район" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts.map((district) => (
                                        <SelectItem key={district.id} value={district.id.toString()}>
                                            {district.name}
                                        </SelectItem>
                                    ))}
                                    {selectedOblastId && districts.length === 0 && (
                                        <SelectItem value="none" disabled>
                                            Нет доступных районов
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {errors.region_id && <span className="text-sm text-red-500">{errors.region_id}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="mineral_type" className="text-neutral-500 font-normal">Тип минерала</Label>
                            <Input
                                id="mineral_type"
                                value={data.mineral_type}
                                onChange={(e) => setData('mineral_type', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            />
                            {errors.mineral_type && <span className="text-sm text-red-500">{errors.mineral_type}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="license_status" className="text-neutral-500 font-normal">Статус лицензии</Label>
                            <Select
                                value={data.license_status}
                                onValueChange={(value) => setData('license_status', value as 'active' | 'expired' | 'suspended')}
                            >
                                <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                    <SelectValue placeholder="Выберите статус" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Активна</SelectItem>
                                    <SelectItem value="expired">Истекла</SelectItem>
                                    <SelectItem value="suspended">Приостановлена</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.license_status && <span className="text-sm text-red-500">{errors.license_status}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="license_start" className="text-neutral-500 font-normal">Дата начала лицензии</Label>
                            <Input
                                id="license_start"
                                type="date"
                                value={data.license_start}
                                onChange={(e) => setData('license_start', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            />
                            {errors.license_start && <span className="text-sm text-red-500">{errors.license_start}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="license_end" className="text-neutral-500 font-normal">Дата окончания лицензии</Label>
                            <Input
                                id="license_end"
                                type="date"
                                value={data.license_end}
                                onChange={(e) => setData('license_end', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            />
                            {errors.license_end && <span className="text-sm text-red-500">{errors.license_end}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-neutral-500 font-normal">Геолокация (полигон)</Label>
                        <LocationPicker
                            value={data.location}
                            onChange={(val) => setData('location', val)}
                            regionBoundary={selectedDistrict?.geometry || undefined}
                            className="w-full"
                        />
                        {/* 
                            // @ts-ignore */}
                        {errors.location && <span className="text-sm text-red-500">{errors.location}</span>}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="shadow-none">
                            Сохранить
                        </Button>
                        <Link href={subsoilUsersRoutes.index.url()} className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
