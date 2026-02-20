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
import { Checkbox } from '@/components/ui/checkbox';
import { FormEventHandler, useState, useMemo } from 'react';
import * as investmentProjects from '@/routes/investment-projects';
import LocationPicker from '@/components/location-picker';
import { FileText, Info } from 'lucide-react';

interface Region {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
    geometry?: { lat: number; lng: number }[] | null;
}

interface ProjectType {
    id: number;
    name: string;
}


interface User {
    id: number;
    full_name: string;
    region_id: number | null;
    baskarma_type: string | null;
    position: string | null;
    role_model?: { id: number; name: string; display_name: string } | null;
}

interface Sez {
    id: number;
    name: string;
    region_id: number;
    location?: { lat: number; lng: number }[] | null;
}

interface IndustrialZone {
    id: number;
    name: string;
    region_id: number;
    location?: { lat: number; lng: number }[] | null;
}

interface Props {
    regions: Region[];
    projectTypes: ProjectType[];
    users: User[];
    sezList: Sez[];
    industrialZones: IndustrialZone[];
    isDistrictScoped?: boolean;
    userRegionId?: number | null;
}

export default function Create({ regions, projectTypes, users, sezList, industrialZones, isDistrictScoped, userRegionId }: Props) {
    // Find user's district and its parent oblast for pre-selection
    const userDistrict = useMemo(() => {
        if (!userRegionId) return null;
        return regions.find((r) => r.id === userRegionId) || null;
    }, [regions, userRegionId]);

    const userOblastId = useMemo(() => {
        if (!userDistrict) return '';
        if (userDistrict.parent_id) return userDistrict.parent_id.toString();
        return '';
    }, [userDistrict]);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        company_name: '',
        description: '',
        region_id: userRegionId ? userRegionId.toString() : '',
        project_type_id: '',
        sector: [] as string[],
        total_investment: '',
        status: 'plan',
        start_date: '',
        end_date: '',
        executor_ids: [] as string[],
        geometry: [] as { lat: number, lng: number }[],
    });

    const [selectedOblastId, setSelectedOblastId] = useState<string>(userOblastId);

    const oblasts = useMemo(() => regions.filter(r => r.type === 'oblast'), [regions]);

    const districts = useMemo(() => {
        if (!selectedOblastId) return [];
        return regions.filter(r => r.parent_id === parseInt(selectedOblastId));
    }, [regions, selectedOblastId]);

    const availableSez = useMemo(() => {
        if (!data.region_id) return [];
        return sezList.filter(s => s.region_id === parseInt(data.region_id));
    }, [sezList, data.region_id]);

    const availableIndustrialZones = useMemo(() => {
        if (!data.region_id) return [];
        return industrialZones.filter(iz => iz.region_id === parseInt(data.region_id));
    }, [industrialZones, data.region_id]);

    const selectedRegion = useMemo(() => {
        if (!data.region_id) return null;
        return regions.find(r => r.id === parseInt(data.region_id)) || null;
    }, [regions, data.region_id]);

    const regionBoundary = useMemo(() => {
        return selectedRegion?.geometry || undefined;
    }, [selectedRegion]);

    const overlayEntities = useMemo(() => {
        const entities: { id: number; name: string; type: 'sez' | 'iz'; location?: { lat: number; lng: number }[] | null }[] = [];
        const currentSectors = data.sector;
        currentSectors.forEach(s => {
            const [type, idStr] = s.split('-');
            const id = parseInt(idStr);
            if (type === 'sez') {
                const sez = sezList.find(x => x.id === id);
                if (sez) entities.push({ id: sez.id, name: sez.name, type: 'sez', location: sez.location });
            } else if (type === 'industrial_zone') {
                const iz = industrialZones.find(x => x.id === id);
                if (iz) entities.push({ id: iz.id, name: iz.name, type: 'iz', location: iz.location });
            }
        });
        return entities;
    }, [data.sector, sezList, industrialZones]);

    const districtUsers = useMemo(() => {
        if (!data.region_id) return [];
        const regionId = parseInt(data.region_id);
        return users.filter((u) => u.region_id === regionId);
    }, [users, data.region_id]);

    const oblastUsers = useMemo(() => {
        if (!selectedOblastId) return [];
        return users.filter((u) => u.baskarma_type === 'oblast');
    }, [users, selectedOblastId]);

    const handleExecutorChange = (userId: string, checked: boolean) => {
        const currentIds = data.executor_ids;
        if (checked) {
            setData('executor_ids', [...currentIds, userId]);
        } else {
            setData('executor_ids', currentIds.filter(id => id !== userId));
        }
    };

    const handleSectorChange = (sectorValue: string, checked: boolean) => {
        const currentSectors = data.sector;
        if (checked) {
            setData('sector', [...currentSectors, sectorValue]);
        } else {
            setData('sector', currentSectors.filter(s => s !== sectorValue));
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(investmentProjects.store.url());
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Инвестиционные проекты', href: investmentProjects.index.url() },
            { title: 'Создание', href: '#' }
        ]}>
            <Head title="Создание проекта" />

            <div className="flex h-full flex-col p-4 max-w-2xl">
                <h1 className="text-2xl font-bold font-serif mb-6 text-neutral-900 dark:text-neutral-100">Новый проект</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-neutral-500 font-normal">Наименование проекта</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="Название проекта"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="company_name" className="text-neutral-500 font-normal">Компания</Label>
                        <Input
                            id="company_name"
                            value={data.company_name}
                            onChange={(e) => setData('company_name', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="Название компании"
                        />
                        {errors.company_name && <span className="text-sm text-red-500">{errors.company_name}</span>}
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
                                disabled={isDistrictScoped}
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
                                disabled={!selectedOblastId || isDistrictScoped}
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
                            <Label htmlFor="project_type_id" className="text-neutral-500 font-normal">Тип проекта</Label>
                            <Select
                                value={data.project_type_id}
                                onValueChange={(value) => setData('project_type_id', value)}
                            >
                                <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                    <SelectValue placeholder="Выберите тип" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id.toString()}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.project_type_id && <span className="text-sm text-red-500">{errors.project_type_id}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="sector" className="text-neutral-500 font-normal">Сектор</Label>
                            <div className="border border-neutral-200 rounded-md p-4 space-y-3 max-h-64 overflow-y-auto">
                                {!data.region_id ? (
                                    <p className="text-sm text-gray-400 text-center py-2">
                                        Сначала выберите район
                                    </p>
                                ) : (
                                    <>
                                        {availableSez.length === 0 && availableIndustrialZones.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-2">
                                                Нет доступных секторов в этом районе
                                            </p>
                                        ) : (
                                            <>
                                                {availableSez.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-gray-500 uppercase">СЭЗ</p>
                                                        {availableSez.map((sez) => {
                                                            const value = `sez-${sez.id}`;
                                                            return (
                                                                <div key={value} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={value}
                                                                        checked={data.sector.includes(value)}
                                                                        onCheckedChange={(checked) => handleSectorChange(value, checked as boolean)}
                                                                        className="border-neutral-200 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
                                                                    />
                                                                    <Label htmlFor={value} className="font-normal cursor-pointer">
                                                                        {sez.name}
                                                                    </Label>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {availableIndustrialZones.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-gray-500 uppercase">Индустриальные зоны</p>
                                                        {availableIndustrialZones.map((iz) => {
                                                            const value = `industrial_zone-${iz.id}`;
                                                            return (
                                                                <div key={value} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={value}
                                                                        checked={data.sector.includes(value)}
                                                                        onCheckedChange={(checked) => handleSectorChange(value, checked as boolean)}
                                                                        className="border-neutral-200 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
                                                                    />
                                                                    <Label htmlFor={value} className="font-normal cursor-pointer">
                                                                        {iz.name}
                                                                    </Label>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            {errors.sector && <span className="text-sm text-red-500">{errors.sector}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="total_investment" className="text-neutral-500 font-normal">Общий объем инвестиций (млн)</Label>
                            <Input
                                id="total_investment"
                                type="number"
                                step="0.01"
                                value={data.total_investment}
                                onChange={(e) => setData('total_investment', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                                placeholder="0.00"
                            />
                            {errors.total_investment && <span className="text-sm text-red-500">{errors.total_investment}</span>}
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
                                    <SelectItem value="plan">Планирование</SelectItem>
                                    <SelectItem value="implementation">Реализация</SelectItem>
                                    <SelectItem value="launched">Запущен</SelectItem>
                                    <SelectItem value="suspended">Приостановлен</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && <span className="text-sm text-red-500">{errors.status}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="start_date" className="text-neutral-500 font-normal">Дата начала</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={data.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            />
                            {errors.start_date && <span className="text-sm text-red-500">{errors.start_date}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="end_date" className="text-neutral-500 font-normal">Дата окончания</Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            />
                            {errors.end_date && <span className="text-sm text-red-500">{errors.end_date}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-neutral-500 font-normal">Исполнители</Label>
                        <div className="border border-neutral-200 rounded-md p-4 max-h-64 overflow-y-auto">
                            {!selectedOblastId ? (
                                <p className="text-sm text-neutral-400">
                                    Выберите область для отображения исполнителей
                                </p>
                            ) : (
                                <>
                                    {data.region_id && (
                                        <div className="mb-3">
                                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Управление района</p>
                                            {districtUsers.length === 0 ? (
                                                <p className="text-sm text-neutral-400 ml-1">Нет районного управления</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {districtUsers.map((user) => (
                                                        <div key={user.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`user-${user.id}`}
                                                                checked={data.executor_ids.includes(user.id.toString())}
                                                                onCheckedChange={(checked) => handleExecutorChange(user.id.toString(), checked as boolean)}
                                                                className="border-neutral-200 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
                                                            />
                                                            <Label htmlFor={`user-${user.id}`} className="font-normal cursor-pointer">
                                                                <span>{user.full_name}</span>
                                                                {user.position && (
                                                                    <span className="text-neutral-400"> — {user.position}</span>
                                                                )}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className={data.region_id ? 'border-t border-neutral-200 pt-3' : ''}>
                                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Управление области</p>
                                        {oblastUsers.length === 0 ? (
                                            <p className="text-sm text-neutral-400 ml-1">Нет областного управления</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {oblastUsers.map((user) => (
                                                    <div key={user.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`user-${user.id}`}
                                                            checked={data.executor_ids.includes(user.id.toString())}
                                                            onCheckedChange={(checked) => handleExecutorChange(user.id.toString(), checked as boolean)}
                                                            className="border-neutral-200 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
                                                        />
                                                        <Label htmlFor={`user-${user.id}`} className="font-normal cursor-pointer">
                                                            <span>{user.full_name}</span>
                                                            {user.position && (
                                                                <span className="text-neutral-400"> — {user.position}</span>
                                                            )}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        {/* 
                            // @ts-ignore */}
                        {errors.executor_ids && <span className="text-sm text-red-500">{errors.executor_ids}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="description" className="text-neutral-500 font-normal">Описание</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 bg-transparent min-h-[120px]"
                            placeholder="Описание проекта..."
                        />
                        {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-neutral-500 font-normal">Геолокация (полигон)</Label>
                        <LocationPicker
                            value={data.geometry}
                            onChange={(val) => setData('geometry', val)}
                            className="w-full"
                            regionBoundary={regionBoundary}
                            overlayEntities={overlayEntities}
                        />
                        {/*
                            // @ts-ignore */}
                        {errors.geometry && <span className="text-sm text-red-500">{errors.geometry}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-neutral-500 font-normal">Документы</Label>
                        <div className="border border-neutral-200 border-dashed rounded-md p-4 bg-gray-50">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                        Документы можно будет загрузить после создания проекта
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        После сохранения проекта вы сможете добавить документы: договоры, отчеты,
                                        презентации и другие файлы в форматах PDF, DOC, XLS и изображения.
                                    </p>
                                </div>
                                <FileText className="h-8 w-8 text-gray-300 flex-shrink-0" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="shadow-none">
                            Сохранить
                        </Button>
                        <Link href={investmentProjects.index.url()} className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
