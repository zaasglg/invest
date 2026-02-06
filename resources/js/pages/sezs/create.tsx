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
import * as sezs from '@/routes/sezs';
import LocationPicker from '@/components/location-picker';

interface Region {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
}

interface Props {
    regions: Region[];
}

export default function Create({ regions }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        region_id: '',
        total_area: '',
        investment_total: '',
        status: 'developing',
        description: '',
        location: [] as { lat: number, lng: number }[],
    });

    const [selectedOblastId, setSelectedOblastId] = useState<string>('');

    const oblasts = useMemo(() => regions.filter(r => r.type === 'oblast'), [regions]);

    const districts = useMemo(() => {
        if (!selectedOblastId) return [];
        return regions.filter(r => r.parent_id === parseInt(selectedOblastId));
    }, [regions, selectedOblastId]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(sezs.store.url());
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'СЭЗ', href: sezs.index.url() },
            { title: 'Создание', href: '#' }
        ]}>
            <Head title="Создание СЭЗ" />

            <div className="flex h-full flex-col p-4 max-w-2xl">
                <h1 className="text-2xl font-bold font-serif mb-6 text-neutral-900 dark:text-neutral-100">Новая СЭЗ</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-neutral-500 font-normal">Наименование</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="Например: СЭЗ Астана"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
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
                            <Label htmlFor="total_area" className="text-neutral-500 font-normal">Общая площадь (га)</Label>
                            <Input
                                id="total_area"
                                type="number"
                                step="0.01"
                                value={data.total_area}
                                onChange={(e) => setData('total_area', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                                placeholder="0.00"
                            />
                            {errors.total_area && <span className="text-sm text-red-500">{errors.total_area}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="investment_total" className="text-neutral-500 font-normal">Общий объем инвестиций (млн)</Label>
                            <Input
                                id="investment_total"
                                type="number"
                                step="0.01"
                                value={data.investment_total}
                                onChange={(e) => setData('investment_total', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                                placeholder="0.00"
                            />
                            {errors.investment_total && <span className="text-sm text-red-500">{errors.investment_total}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="status" className="text-neutral-500 font-normal">Статус</Label>
                        <Select
                            value={data.status}
                            onValueChange={(value) => setData('status', value)}
                        >
                            <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
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
                        <Label htmlFor="description" className="text-neutral-500 font-normal">Описание</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 bg-transparent min-h-[120px]"
                            placeholder="Описание СЭЗ..."
                        />
                        {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-neutral-500 font-normal">Геолокация (полигон)</Label>
                        <LocationPicker
                            value={data.location}
                            onChange={(val) => setData('location', val)}
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
                        <Link href={sezs.index.url()} className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
