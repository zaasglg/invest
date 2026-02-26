import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormEventHandler, useState, useMemo } from 'react';
import * as industrialZones from '@/routes/industrial-zones';
import LocationPicker from '@/components/location-picker';
import InfrastructureForm, {
    getEmptyInfrastructure,
} from '@/components/infrastructure-form';

import type { InfrastructureData } from '@/components/infrastructure-form';

interface Region {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
    geometry: { lat: number, lng: number }[] | null;
}

interface Props {
    regions: Region[];
    isDistrictScoped?: boolean;
    userRegionId?: number | null;
}

export default function Create({ regions, isDistrictScoped, userRegionId }: Props) {
    const userDistrict = useMemo(() => {
        if (!userRegionId) return null;
        return regions.find((r) => r.id === userRegionId) || null;
    }, [regions, userRegionId]);

    const userOblastId = useMemo(() => {
        if (!userDistrict?.parent_id) return '';
        return userDistrict.parent_id.toString();
    }, [userDistrict]);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        region_id: userRegionId ? userRegionId.toString() : '',
        total_area: '',
        status: 'developing',
        description: '',
        location: [] as { lat: number; lng: number }[],
        infrastructure: getEmptyInfrastructure() as InfrastructureData,
    });

    const [selectedOblastId, setSelectedOblastId] = useState<string>(userOblastId);

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
        post(industrialZones.store.url());
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Индустриальные зоны', href: industrialZones.index.url() },
            { title: 'Создание', href: '#' }
        ]}>
            <Head title="Создание ИЗ" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="text-2xl font-bold mb-6 text-[#0f1b3d]">Новая ИЗ</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-gray-500 font-normal">Наименование</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            placeholder="Например: ИЗ Шымкент"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="oblast" className="text-gray-500 font-normal">Область</Label>
                            <Select
                                value={selectedOblastId}
                                onValueChange={(value) => {
                                    setSelectedOblastId(value);
                                    setData('region_id', '');
                                }}
                                disabled={isDistrictScoped}
                            >
                                <SelectTrigger className="shadow-none border-gray-200 focus:ring-0 focus:border-[#0f1b3d] h-10 w-full">
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
                            <Label htmlFor="region_id" className="text-gray-500 font-normal">Район / Город</Label>
                            <Select
                                value={data.region_id}
                                onValueChange={(value) => setData('region_id', value)}
                                disabled={!selectedOblastId || isDistrictScoped}
                            >
                                <SelectTrigger className="shadow-none border-gray-200 focus:ring-0 focus:border-[#0f1b3d] h-10 w-full">
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

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="total_area" className="text-gray-500 font-normal">Общая площадь (га)</Label>
                        <Input
                            id="total_area"
                            type="number"
                            step="0.01"
                            value={data.total_area}
                            onChange={(e) => setData('total_area', e.target.value)}
                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            placeholder="0.00"
                        />
                        {errors.total_area && <span className="text-sm text-red-500">{errors.total_area}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="status" className="text-gray-500 font-normal">Статус</Label>
                        <Select
                            value={data.status}
                            onValueChange={(value) => setData('status', value)}
                        >
                            <SelectTrigger className="shadow-none border-gray-200 focus:ring-0 focus:border-[#0f1b3d] h-10 w-full">
                                <SelectValue placeholder="Выберите статус" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Активная</SelectItem>
                                <SelectItem value="developing">Развивающаяся</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.status && <span className="text-sm text-red-500">{errors.status}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="description" className="text-gray-500 font-normal">Описание</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] bg-transparent min-h-[120px]"
                            placeholder="Описание ИЗ..."
                        />
                        {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                    </div>

                    <InfrastructureForm
                        value={data.infrastructure}
                        onChange={(val) => setData('infrastructure', val)}
                    />

                    <div className="flex flex-col gap-2">
                        <Label className="text-gray-500 font-normal">Геолокация (полигон)</Label>
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
                        <Button disabled={processing} className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            Сохранить
                        </Button>
                        <Link href={industrialZones.index.url()} className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
