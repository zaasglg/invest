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
        bin: '',
        region_id: userRegionId ? userRegionId.toString() : '',
        mineral_type: '',
        total_area: '',
        description: '',
        license_status: 'active',
        license_start: '',
        license_end: '',
        location: [] as { lat: number, lng: number }[],
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
        post(subsoilUsersRoutes.store.url());
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Недропользование', href: subsoilUsersRoutes.index.url() },
            { title: 'Создание', href: '#' }
        ]}>
            <Head title="Создание недропользователя" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="text-2xl font-bold mb-6 text-[#0f1b3d]">Новый недропользователь</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name" className="text-gray-500 font-normal">Наименование</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                                placeholder="Компания / организация"
                                autoFocus
                            />
                            {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="bin" className="text-gray-500 font-normal">БИН</Label>
                            <Input
                                id="bin"
                                value={data.bin}
                                onChange={(e) => setData('bin', e.target.value)}
                                className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                                placeholder="Идентификатор"
                            />
                            {errors.bin && <span className="text-sm text-red-500">{errors.bin}</span>}
                        </div>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="mineral_type" className="text-gray-500 font-normal">Тип минерала</Label>
                            <Input
                                id="mineral_type"
                                value={data.mineral_type}
                                onChange={(e) => setData('mineral_type', e.target.value)}
                                className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                                placeholder="Например: нефть"
                            />
                            {errors.mineral_type && <span className="text-sm text-red-500">{errors.mineral_type}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="total_area" className="text-gray-500 font-normal">Площадь (га)</Label>
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
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="description" className="text-gray-500 font-normal">Описание</Label>
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className="min-h-[100px] w-full resize-none rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-none focus:border-[#0f1b3d] focus:outline-none focus-visible:ring-0"
                            placeholder="Описание деятельности недропользователя"
                        />
                        {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="license_status" className="text-gray-500 font-normal">Статус лицензии</Label>
                            <Select
                                value={data.license_status}
                                onValueChange={(value) => setData('license_status', value)}
                            >
                                <SelectTrigger className="shadow-none border-gray-200 focus:ring-0 focus:border-[#0f1b3d] h-10 w-full">
                                    <SelectValue placeholder="Выберите статус" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Активна</SelectItem>
                                    <SelectItem value="expired">Истекла</SelectItem>
                                    <SelectItem value="suspended">Приостановлена</SelectItem>
                                    <SelectItem value="illegal">Нелегально</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.license_status && <span className="text-sm text-red-500">{errors.license_status}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="license_start" className="text-gray-500 font-normal">Дата начала лицензии</Label>
                            <Input
                                id="license_start"
                                type="date"
                                value={data.license_start}
                                onChange={(e) => setData('license_start', e.target.value)}
                                className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            />
                            {errors.license_start && <span className="text-sm text-red-500">{errors.license_start}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="license_end" className="text-gray-500 font-normal">Дата окончания лицензии</Label>
                            <Input
                                id="license_end"
                                type="date"
                                value={data.license_end}
                                onChange={(e) => setData('license_end', e.target.value)}
                                className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            />
                            {errors.license_end && <span className="text-sm text-red-500">{errors.license_end}</span>}
                        </div>
                    </div>

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
                        <Link href={subsoilUsersRoutes.index.url()} className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
