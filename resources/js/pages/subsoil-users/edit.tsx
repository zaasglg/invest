import { Head, useForm, Link } from '@inertiajs/react';
import type { FormEventHandler} from 'react';
import { useMemo, useState } from 'react';
import LocationPicker from '@/components/location-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import * as subsoilUsersRoutes from '@/routes/subsoil-users';

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
    total_area: number | string | null;
    description?: string | null;
    license_status: 'active' | 'expired' | 'suspended' | 'illegal';
    license_start: string | null;
    license_end: string | null;
    location?: { lat: number, lng: number }[];
}

interface Props {
    subsoilUser: SubsoilUser;
    regions: Region[];
    isDistrictScoped?: boolean;
}

export default function Edit({ subsoilUser, regions, isDistrictScoped }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: subsoilUser.name || '',
        bin: subsoilUser.bin || '',
        region_id: subsoilUser.region_id?.toString() || '',
        mineral_type: subsoilUser.mineral_type || '',
        total_area: subsoilUser.total_area?.toString() || '',
        description: subsoilUser.description || '',
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
            { title: 'Жер қойнауын пайдалану', href: subsoilUsersRoutes.index.url() },
            { title: 'Өңдеу', href: '#' }
        ]}>
            <Head title="Жер қойнауын пайдаланушыны өңдеу" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="text-2xl font-bold mb-6 text-[#0f1b3d]">Өңдеу</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name" className="text-gray-500 font-normal">Атауы</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                                autoFocus
                            />
                            {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="bin" className="text-gray-500 font-normal">БСН</Label>
                            <Input
                                id="bin"
                                value={data.bin}
                                onChange={(e) => setData('bin', e.target.value)}
                                className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            />
                            {errors.bin && <span className="text-sm text-red-500">{errors.bin}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="oblast" className="text-gray-500 font-normal">Облыс</Label>
                            <Select
                                value={selectedOblastId}
                                onValueChange={(value) => {
                                    setSelectedOblastId(value);
                                    setData('region_id', '');
                                }}
                                disabled={isDistrictScoped}
                            >
                                <SelectTrigger className="shadow-none border-gray-200 focus:ring-0 focus:border-[#0f1b3d] h-10 w-full">
                                    <SelectValue placeholder="Облысты таңдаңыз" />
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
                            <Label htmlFor="region_id" className="text-gray-500 font-normal">Аудан / Қала</Label>
                            <Select
                                value={data.region_id}
                                onValueChange={(value) => setData('region_id', value)}
                                disabled={!selectedOblastId || isDistrictScoped}
                            >
                                <SelectTrigger className="shadow-none border-gray-200 focus:ring-0 focus:border-[#0f1b3d] h-10 w-full">
                                    <SelectValue placeholder="Ауданды таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts.map((district) => (
                                        <SelectItem key={district.id} value={district.id.toString()}>
                                            {district.name}
                                        </SelectItem>
                                    ))}
                                    {selectedOblastId && districts.length === 0 && (
                                        <SelectItem value="none" disabled>
                                            Қолжетімді аудандар жоқ
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {errors.region_id && <span className="text-sm text-red-500">{errors.region_id}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="mineral_type" className="text-gray-500 font-normal">Минерал түрі</Label>
                            <Input
                                id="mineral_type"
                                value={data.mineral_type}
                                onChange={(e) => setData('mineral_type', e.target.value)}
                                className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            />
                            {errors.mineral_type && <span className="text-sm text-red-500">{errors.mineral_type}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="total_area" className="text-gray-500 font-normal">Аумағы (га)</Label>
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
                        <Label htmlFor="description" className="text-gray-500 font-normal">Сипаттама</Label>
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className="min-h-[100px] w-full resize-none rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-none focus:border-[#0f1b3d] focus:outline-none focus-visible:ring-0"
                            placeholder="Жер қойнауын пайдаланушы қызметінің сипаттамасы"
                        />
                        {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="license_status" className="text-gray-500 font-normal">Лицензия күйі</Label>
                            <Select
                                value={data.license_status}
                                onValueChange={(value) => setData('license_status', value as 'active' | 'expired' | 'suspended' | 'illegal')}
                            >
                                <SelectTrigger className="shadow-none border-gray-200 focus:ring-0 focus:border-[#0f1b3d] h-10 w-full">
                                    <SelectValue placeholder="Күйді таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Белсенді</SelectItem>
                                    <SelectItem value="expired">Мерзімі өткен</SelectItem>
                                    <SelectItem value="suspended">Тоқтатылған</SelectItem>
                                    <SelectItem value="illegal">Заңсыз</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.license_status && <span className="text-sm text-red-500">{errors.license_status}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="license_start" className="text-gray-500 font-normal">Лицензия басталу күні</Label>
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
                            <Label htmlFor="license_end" className="text-gray-500 font-normal">Лицензия аяқталу күні</Label>
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
                        <Label className="text-gray-500 font-normal">Орналасу (полигон)</Label>
                        <LocationPicker
                            value={data.location}
                            onChange={(val) => setData('location', val)}
                            regionBoundary={selectedDistrict?.geometry || undefined}
                            className="w-full"
                        />
                        {errors.location && <span className="text-sm text-red-500">{errors.location}</span>}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            Сақтау
                        </Button>
                        <Link href={subsoilUsersRoutes.index.url()} className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]">
                            Болдырмау
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
