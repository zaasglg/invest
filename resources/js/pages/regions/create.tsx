import { Head, useForm, Link } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
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
import * as regions from '@/routes/regions';

interface Region {
    id: number;
    name: string;
}

interface Props {
    parents: Region[];
}

export default function Create({ parents }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        color: '#3B82F6',
        icon_file: null as File | null,
        area: '',
        type: 'district',
        subtype: 'district',
        parent_id: '',
        geometry: [[]] as { lat: number; lng: number }[][],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(regions.store.url());
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Аймақтар', href: regions.index.url() },
                { title: 'Құру', href: '#' },
            ]}
        >
            <Head title="Аймақ құру" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="mb-6 text-2xl font-bold text-[#0f1b3d]">
                    Жаңа аймақ
                </h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="type"
                            className="font-normal text-gray-500"
                        >
                            Аймақ түрі
                        </Label>
                        <Select
                            value={data.type}
                            onValueChange={(value) => setData('type', value)}
                        >
                            <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                <SelectValue placeholder="Түрін таңдаңыз" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="oblast">Облыс</SelectItem>
                                <SelectItem value="district">Аудан</SelectItem>
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
                                className="font-normal text-gray-500"
                            >
                                Ата аймақ (Облыс)
                            </Label>
                            <Select
                                value={data.parent_id}
                                onValueChange={(value) =>
                                    setData('parent_id', value)
                                }
                            >
                                <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                    <SelectValue placeholder="Облысты таңдаңыз" />
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
                                className="font-normal text-gray-500"
                            >
                                Аудан / Қала
                            </Label>
                            <Select
                                value={data.subtype}
                                onValueChange={(value) =>
                                    setData('subtype', value)
                                }
                            >
                                <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                    <SelectValue placeholder="Таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="district">
                                        Аудан
                                    </SelectItem>
                                    <SelectItem value="city">
                                        Қала
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
                            className="font-normal text-gray-500"
                        >
                            Атауы
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="Мысалы: Сауран"
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
                            className="font-normal text-gray-500"
                        >
                            Аймақ түсі
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
                                className="h-10 w-14 cursor-pointer rounded-md border-gray-200 bg-transparent p-1 shadow-none"
                            />
                            <Input
                                value={data.color}
                                onChange={(e) =>
                                    setData('color', e.target.value)
                                }
                                className="h-10 border-gray-200 bg-transparent font-mono uppercase shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
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
                            className="font-normal text-gray-500"
                        >
                            Белгіше жүктеу (PNG, JPG, WEBP, SVG)
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
                            className="h-10 border-gray-200 bg-transparent shadow-none file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-gray-200 focus:border-[#0f1b3d] focus-visible:ring-0"
                        />
                        <p className="text-xs text-gray-500">
                            Файл жүктелмесе, стандартты белгіше
                            қолданылады.
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
                            className="font-normal text-gray-500"
                        >
                            Ауданы (га)
                        </Label>
                        <Input
                            id="area"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.area}
                            onChange={(e) => setData('area', e.target.value)}
                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="Мысалы: 120.50"
                        />
                        {errors.area && (
                            <span className="text-sm text-red-500">
                                {errors.area}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="font-normal text-gray-500">
                            Орналасу (полигон)
                        </Label>
                        <LocationPicker
                            multiPolygon
                            mapStyle="standard"
                            value={data.geometry}
                            onChange={(val) => setData('geometry', val)}
                            className="w-full"
                        />
                        {errors.geometry && (
                            <span className="text-sm text-red-500">
                                {errors.geometry}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            Сақтау
                        </Button>
                        <Link
                            href={regions.index.url()}
                            className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]"
                        >
                            Болдырмау
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
