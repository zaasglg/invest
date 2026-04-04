import { Head, useForm, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, FileText, Info, MapPin } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useState, useMemo } from 'react';
import LocationPicker from '@/components/location-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatMoneyCompact } from '@/lib/utils';
import * as investmentProjects from '@/routes/investment-projects';

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

interface InvestUser {
    id: number;
    full_name: string;
    region_id: number | null;
}

interface Props {
    regions: Region[];
    projectTypes: ProjectType[];
    users: User[];
    sezList: Sez[];
    industrialZones: IndustrialZone[];
    isDistrictScoped?: boolean;
    userRegionId?: number | null;
    isSuperAdmin?: boolean;
    investUsers?: InvestUser[];
}

export default function Create({ regions, projectTypes, users, sezList, industrialZones, isDistrictScoped, userRegionId, isSuperAdmin, investUsers = [] }: Props) {
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
        current_status: '',
        region_id: userRegionId ? userRegionId.toString() : '',
        project_type_id: '',
        sector: [] as string[],
        jobs_count: '',
        capacity: '',
        total_investment: '',
        status: 'plan',
        start_date: '',
        end_date: '',
        executor_ids: [] as string[],
        geometry: [] as { lat: number, lng: number }[],
        infrastructure: {
            gas: { needed: false, capacity: '' },
            water: { needed: false, capacity: '' },
            electricity: { needed: false, capacity: '' },
            land: { needed: false, capacity: '' },
        } as Record<string, { needed: boolean; capacity: string }>,
        created_by: '' as string,
    });

    const [selectedOblastId, setSelectedOblastId] = useState<string>(userOblastId);
    const [currentStep, setCurrentStep] = useState(1);

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
        return users.filter((u) => u.region_id && u.baskarma_type !== 'oblast');
    }, [users]);

    const oblastUsers = useMemo(() => {
        return users.filter((u) => u.baskarma_type === 'oblast');
    }, [users]);

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

    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const validateStep1 = (): boolean => {
        const errors: Record<string, string> = {};

        if (!data.name.trim()) {
            errors.name = 'Жобаның атауын енгізіңіз';
        }
        if (!data.region_id) {
            errors.region_id = 'Ауданды таңдаңыз';
        }
        if (!data.project_type_id) {
            errors.project_type_id = 'Жобаның түрін таңдаңыз';
        }
        if (!data.total_investment) {
            errors.total_investment = 'Жалпы инвестицияны енгізіңіз';
        } else if (isNaN(Number(data.total_investment))) {
            errors.total_investment = 'Жалпы инвестиция сан болуы керек';
        }
        if (!data.company_name.trim()) {
            errors.company_name = 'Компания атауын енгізіңіз';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const nextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (currentStep === 1 && !validateStep1()) {
            return;
        }

        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const prevStep = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setValidationErrors({});
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const steps = [
        { id: 1, name: 'Негізгі ақпарат' },
        { id: 2, name: 'Мәліметтер' },
        { id: 3, name: 'Қарап шығу' },
    ];

    return (
        <AppLayout breadcrumbs={[
            { title: 'Инвестициялық жобалар', href: investmentProjects.index.url() },
            { title: 'Жоба құру', href: '#' }
        ]}>
            <Head title="Жоба құру" />

            <div className="flex h-full flex-col p-6">
                <h1 className="mb-6 text-2xl font-bold text-[#0f1b3d]">Жоба құру</h1>

                {/* Step Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex flex-1 items-center">
                                <div className="flex items-center">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                                            currentStep > step.id
                                                ? 'bg-[#0f1b3d] text-white'
                                                : currentStep === step.id
                                                  ? 'bg-[#0f1b3d] text-white'
                                                  : 'bg-gray-200 text-gray-500'
                                        }`}
                                    >
                                        {currentStep > step.id ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            step.id
                                        )}
                                    </div>
                                    <span
                                        className={`ml-3 text-sm font-medium ${
                                            currentStep >= step.id
                                                ? 'text-[#0f1b3d]'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        {step.name}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`mx-4 h-0.5 flex-1 ${
                                            currentStep > step.id
                                                ? 'bg-[#0f1b3d]'
                                                : 'bg-gray-200'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={submit} className="flex flex-1 flex-col">
                    {/* Step 1: Негізгі ақпарат */}
                    {currentStep === 1 && (
                        <div className="rounded-lg border border-gray-200 bg-white p-6">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-[#0f1b3d]">
                                    Негізгі ақпарат
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Инвестициялық жоба туралы негізгі мәліметтерді толтырыңыз.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* Жоба атауы және Компания - 2 column */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Жобаның атауы <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => {
                                                setData('name', e.target.value);
                                                if (validationErrors.name) {
                                                    setValidationErrors(prev => ({ ...prev, name: '' }));
                                                }
                                            }}
                                            className={`h-10 border-gray-200 bg-transparent shadow-none focus-visible:ring-0 focus:border-[#0f1b3d] ${validationErrors.name ? 'border-red-500' : ''}`}
                                            placeholder="Мысалы: Күн электр станциясы"
                                            autoFocus
                                        />
                                        {(errors.name || validationErrors.name) && <span className="text-sm text-red-500">{errors.name || validationErrors.name}</span>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="company_name" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Компания <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="company_name"
                                            value={data.company_name}
                                            onChange={(e) => {
                                                setData('company_name', e.target.value);
                                                if (validationErrors.company_name) {
                                                    setValidationErrors(prev => ({ ...prev, company_name: '' }));
                                                }
                                            }}
                                            className={`h-10 border-gray-200 bg-transparent shadow-none focus-visible:ring-0 focus:border-[#0f1b3d] ${validationErrors.company_name ? 'border-red-500' : ''}`}
                                            placeholder="Мысалы: Green Energy Corp"
                                        />
                                        {(errors.company_name || validationErrors.company_name) && <span className="text-sm text-red-500">{errors.company_name || validationErrors.company_name}</span>}
                                    </div>
                                </div>

                                {isSuperAdmin && investUsers.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="created_by" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Куратор
                                        </Label>
                                        <Select
                                            value={data.created_by}
                                            onValueChange={(value) => setData('created_by', value)}
                                        >
                                            <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:ring-0 focus:border-[#0f1b3d]">
                                                <SelectValue placeholder="Кураторды таңдаңыз" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {investUsers.map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.full_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.created_by && <span className="text-sm text-red-500">{errors.created_by}</span>}
                                    </div>
                                )}

                                {/* Облыс және Аудан - 2 column */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="oblast" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Облыс
                                        </Label>
                                        <Select
                                            value={selectedOblastId}
                                            onValueChange={(value) => {
                                                setSelectedOblastId(value);
                                                setData('region_id', '');
                                            }}
                                            disabled={isDistrictScoped}
                                        >
                                            <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:ring-0 focus:border-[#0f1b3d]">
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
                                        <Label htmlFor="region_id" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Аудан / Қала <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={data.region_id}
                                            onValueChange={(value) => {
                                                setData('region_id', value);
                                                if (validationErrors.region_id) {
                                                    setValidationErrors(prev => ({ ...prev, region_id: '' }));
                                                }
                                            }}
                                            disabled={!selectedOblastId || isDistrictScoped}
                                        >
                                            <SelectTrigger className={`h-10 w-full border-gray-200 shadow-none focus:ring-0 focus:border-[#0f1b3d] ${validationErrors.region_id ? 'border-red-500' : ''}`}>
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
                                                        Қол жетімді аудандар жоқ
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {(errors.region_id || validationErrors.region_id) && <span className="text-sm text-red-500">{errors.region_id || validationErrors.region_id}</span>}
                                    </div>
                                </div>

                                {/* Жоба түрі және Сектор - 2 column */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="project_type_id" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Жобаның түрі <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={data.project_type_id}
                                            onValueChange={(value) => {
                                                setData('project_type_id', value);
                                                if (validationErrors.project_type_id) {
                                                    setValidationErrors(prev => ({ ...prev, project_type_id: '' }));
                                                }
                                            }}
                                        >
                                            <SelectTrigger className={`h-10 w-full border-gray-200 shadow-none focus:ring-0 focus:border-[#0f1b3d] ${validationErrors.project_type_id ? 'border-red-500' : ''}`}>
                                                <SelectValue placeholder="Түрді таңдаңыз" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projectTypes.map((type) => (
                                                    <SelectItem key={type.id} value={type.id.toString()}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {(errors.project_type_id || validationErrors.project_type_id) && <span className="text-sm text-red-500">{errors.project_type_id || validationErrors.project_type_id}</span>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="sector" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Сектор <span className="text-xs font-normal normal-case text-gray-400">(міндетті емес)</span>
                                        </Label>
                                        <div className="max-h-40 space-y-3 overflow-y-auto rounded-md border border-gray-200 p-4">
                                            {!data.region_id ? (
                                                <p className="py-2 text-center text-sm text-gray-400">
                                                    Алдымен ауданды таңдаңыз
                                                </p>
                                            ) : (
                                                <>
                                                    {availableSez.length === 0 && availableIndustrialZones.length === 0 ? (
                                                        <p className="py-2 text-center text-sm text-gray-400">
                                                            Бұл ауданда қол жетімді секторлар жоқ
                                                        </p>
                                                    ) : (
                                                        <>
                                                            {availableSez.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-medium uppercase text-gray-500">СЭЗ</p>
                                                                    {availableSez.map((sez) => {
                                                                        const value = `sez-${sez.id}`;
                                                                        return (
                                                                            <div key={value} className="flex items-center space-x-2">
                                                                                <Checkbox
                                                                                    id={value}
                                                                                    checked={data.sector.includes(value)}
                                                                                    onCheckedChange={(checked) => handleSectorChange(value, checked as boolean)}
                                                                                    className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                                                />
                                                                                <Label htmlFor={value} className="cursor-pointer font-normal">
                                                                                    {sez.name}
                                                                                </Label>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            {availableIndustrialZones.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-medium uppercase text-gray-500">Индустриялық аймақтар</p>
                                                                    {availableIndustrialZones.map((iz) => {
                                                                        const value = `industrial_zone-${iz.id}`;
                                                                        return (
                                                                            <div key={value} className="flex items-center space-x-2">
                                                                                <Checkbox
                                                                                    id={value}
                                                                                    checked={data.sector.includes(value)}
                                                                                    onCheckedChange={(checked) => handleSectorChange(value, checked as boolean)}
                                                                                    className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                                                />
                                                                                <Label htmlFor={value} className="cursor-pointer font-normal">
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

                                {/* Жұмыс орындары, Қуаттылық, Инвестиция - 3 column */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="jobs_count" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Жұмыс орындары
                                        </Label>
                                        <Input
                                            id="jobs_count"
                                            type="number"
                                            min="0"
                                            value={data.jobs_count}
                                            onChange={(e) => setData('jobs_count', e.target.value)}
                                            className="h-10 border-gray-200 bg-transparent shadow-none focus-visible:ring-0 focus:border-[#0f1b3d]"
                                            placeholder="0"
                                        />
                                        {errors.jobs_count && <span className="text-sm text-red-500">{errors.jobs_count}</span>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="capacity" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Қуаттылығы
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="capacity"
                                                type="text"
                                                value={data.capacity}
                                                onChange={(e) => setData('capacity', e.target.value)}
                                                className="h-10 border-gray-200 bg-transparent pr-12 shadow-none focus-visible:ring-0 focus:border-[#0f1b3d]"
                                                placeholder="Мысалы: 500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                                МВт/с
                                            </span>
                                        </div>
                                        {errors.capacity && <span className="text-sm text-red-500">{errors.capacity}</span>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="total_investment" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Жалпы инвестиция <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="total_investment"
                                                type="number"
                                                step="0.01"
                                                value={data.total_investment}
                                                onChange={(e) => setData('total_investment', e.target.value)}
                                                className="h-10 border-gray-200 bg-transparent pr-12 shadow-none focus-visible:ring-0 focus:border-[#0f1b3d]"
                                                placeholder="0.00"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                                KZT
                                            </span>
                                        </div>
                                        {(errors.total_investment || validationErrors.total_investment) && <span className="text-sm text-red-500">{errors.total_investment || validationErrors.total_investment}</span>}
                                    </div>
                                </div>

                                {/* Мәртебесі - full width */}
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="status" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Ағымдағы мәртебесі
                                    </Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(value) => setData('status', value)}
                                    >
                                        <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:ring-0 focus:border-[#0f1b3d]">
                                            <SelectValue placeholder="Мәртебені таңдаңыз" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="plan">Жоспарлау</SelectItem>
                                            <SelectItem value="implementation">Іске асыру</SelectItem>
                                            <SelectItem value="launched">Іске қосылған</SelectItem>
                                            <SelectItem value="suspended">Тоқтатылған</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status && <span className="text-sm text-red-500">{errors.status}</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Мәліметтер */}
                    {currentStep === 2 && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Сол жақ: Сипаттама және Инфрақұрылым */}
                            <div className="space-y-6">
                                {/* Сипаттама */}
                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-[#0f1b3d]" />
                                        <h3 className="font-semibold text-[#0f1b3d]">
                                            Сипаттама және жағдайы
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Жоба сипаттамасы
                                            </Label>
                                            <Textarea
                                                id="description"
                                                value={data.description}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                                                className="min-h-[100px] border-gray-200 bg-transparent shadow-none focus-visible:ring-0 focus:border-[#0f1b3d]"
                                                placeholder="Жобаның негізгі мақсаттары мен ауқымын сипаттаңыз..."
                                            />
                                            {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="current_status" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Ағымдағы жағдайы
                                            </Label>
                                            <Textarea
                                                id="current_status"
                                                value={data.current_status}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('current_status', e.target.value)}
                                                className="min-h-[80px] border-gray-200 bg-transparent shadow-none focus-visible:ring-0 focus:border-[#0f1b3d]"
                                                placeholder="Жобаның қазіргі орындалу кезеңі қандай?"
                                            />
                                            {errors.current_status && <span className="text-sm text-red-500">{errors.current_status}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Инфрақұрылым */}
                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <Info className="h-5 w-5 text-[#0f1b3d]" />
                                        <h3 className="font-semibold text-[#0f1b3d]">
                                            Инфрақұрылымға қажеттілік
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'gas', label: 'Газ' },
                                            { key: 'water', label: 'Су (Сумен қамтамасыз ету)' },
                                            { key: 'electricity', label: 'Электр қуаты' },
                                            { key: 'land', label: 'Жер учаскесі' },
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center gap-4">
                                                <div className="flex w-48 items-center space-x-2">
                                                    <Checkbox
                                                        id={`infra-${item.key}`}
                                                        checked={data.infrastructure[item.key]?.needed || false}
                                                        onCheckedChange={(checked) => {
                                                            setData('infrastructure', {
                                                                ...data.infrastructure,
                                                                [item.key]: {
                                                                    ...data.infrastructure[item.key],
                                                                    needed: checked as boolean,
                                                                },
                                                            });
                                                        }}
                                                        className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                    />
                                                    <Label htmlFor={`infra-${item.key}`} className="cursor-pointer font-normal">
                                                        {item.label}
                                                    </Label>
                                                </div>
                                                {data.infrastructure[item.key]?.needed && (
                                                    <div className="flex flex-1 items-center gap-2">
                                                        <Input
                                                            value={data.infrastructure[item.key]?.capacity || ''}
                                                            onChange={(e) => {
                                                                setData('infrastructure', {
                                                                    ...data.infrastructure,
                                                                    [item.key]: {
                                                                        ...data.infrastructure[item.key],
                                                                        capacity: e.target.value,
                                                                    },
                                                                });
                                                            }}
                                                            className="h-9 max-w-[200px] border-gray-200 bg-transparent shadow-none focus-visible:ring-0 focus:border-[#0f1b3d]"
                                                            placeholder="Көлемі"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Құжаттар - placeholder */}
                                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                            <FileText className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <h4 className="mb-1 font-medium text-gray-700">
                                            Жоба құжаттары
                                        </h4>
                                        <p className="mb-3 text-sm text-gray-500">
                                            Жоба құрылғаннан кейін сызбаларды, техникалық сипаттамаларды жүктеуге болады.
                                        </p>
                                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                                            Келесі қадамда қолжетімді
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Оң жақ: Карта */}
                            <div className="rounded-lg border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-[#0f1b3d]" />
                                        <div>
                                            <h3 className="font-semibold text-[#0f1b3d]">
                                                Географиялық орналасу
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Интерактивті полигон таңдау
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <LocationPicker
                                    value={data.geometry}
                                    onChange={(val) => setData('geometry', val)}
                                    className="w-full"
                                    regionBoundary={regionBoundary}
                                    overlayEntities={overlayEntities}
                                />
                                {errors.geometry && <span className="text-sm text-red-500">{errors.geometry}</span>}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Қарап шығу */}
                    {currentStep === 3 && (
                        <div className="rounded-lg border border-gray-200 bg-white p-6">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-[#0f1b3d]">
                                    Қарап шығу
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Жоба мәліметтерін тексеріп, растаңыз.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* Негізгі ақпарат */}
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <h4 className="mb-3 font-medium text-[#0f1b3d]">Негізгі ақпарат</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Жоба атауы:</span>
                                            <p className="font-medium">{data.name || '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Компания:</span>
                                            <p className="font-medium">{data.company_name || '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Облыс:</span>
                                            <p className="font-medium">
                                                {oblasts.find(o => o.id.toString() === selectedOblastId)?.name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Аудан:</span>
                                            <p className="font-medium">
                                                {districts.find(d => d.id.toString() === data.region_id)?.name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Жоба түрі:</span>
                                            <p className="font-medium">
                                                {projectTypes.find(t => t.id.toString() === data.project_type_id)?.name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Жұмыс орындары:</span>
                                            <p className="font-medium">{data.jobs_count || '0'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Инвестиция:</span>
                                            <p className="font-medium">{data.total_investment ? formatMoneyCompact(parseFloat(data.total_investment)) : '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Қуаттылығы:</span>
                                            <p className="font-medium">{data.capacity || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Сипаттама */}
                                {data.description && (
                                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                        <h4 className="mb-2 font-medium text-[#0f1b3d]">Сипаттама</h4>
                                        <p className="text-sm text-gray-600">{data.description}</p>
                                    </div>
                                )}

                                {/* Инфрақұрылым */}
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <h4 className="mb-3 font-medium text-[#0f1b3d]">Инфрақұрылым</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(data.infrastructure)
                                            .filter(([, val]) => val.needed)
                                            .map(([key]) => (
                                                <span
                                                    key={key}
                                                    className="rounded-full bg-[#0f1b3d]/10 px-3 py-1 text-sm text-[#0f1b3d]"
                                                >
                                                    {key === 'gas' && 'Газ'}
                                                    {key === 'water' && 'Су'}
                                                    {key === 'electricity' && 'Электр'}
                                                    {key === 'land' && 'Жер'}
                                                </span>
                                            ))}
                                        {Object.values(data.infrastructure).every(v => !v.needed) && (
                                            <span className="text-sm text-gray-400">Инфрақұрылым таңдалмаған</span>
                                        )}
                                    </div>
                                </div>

                                {/* Орындаушылар */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-gray-500 font-normal">Орындаушылар</Label>
                                    <div className="border border-gray-200 rounded-md p-4 max-h-64 overflow-y-auto">
                                        <>
                                            {districtUsers.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Аудан исполнителі</p>
                                                    <div className="space-y-2">
                                                        {districtUsers.map((user) => (
                                                            <div key={user.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`user-${user.id}`}
                                                                    checked={data.executor_ids.includes(user.id.toString())}
                                                                    onCheckedChange={(checked) => handleExecutorChange(user.id.toString(), checked as boolean)}
                                                                    className="border-gray-200 data-[state=checked]:bg-[#c8a44e] data-[state=checked]:border-[#c8a44e]"
                                                                />
                                                                <Label htmlFor={`user-${user.id}`} className="font-normal cursor-pointer">
                                                                    <span>{user.full_name}</span>
                                                                    {user.position && (
                                                                        <span className="text-gray-400"> — {user.position}</span>
                                                                    )}
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {oblastUsers.length > 0 && (
                                                <div className={districtUsers.length > 0 ? 'border-t border-gray-200 pt-3' : ''}>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Облыс исполнителі</p>
                                                    <div className="space-y-2">
                                                        {oblastUsers.map((user) => (
                                                            <div key={user.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`user-${user.id}`}
                                                                    checked={data.executor_ids.includes(user.id.toString())}
                                                                    onCheckedChange={(checked) => handleExecutorChange(user.id.toString(), checked as boolean)}
                                                                    className="border-gray-200 data-[state=checked]:bg-[#c8a44e] data-[state=checked]:border-[#c8a44e]"
                                                                />
                                                                <Label htmlFor={`user-${user.id}`} className="font-normal cursor-pointer">
                                                                    <span>{user.full_name}</span>
                                                                    {user.position && (
                                                                        <span className="text-gray-400"> — {user.position}</span>
                                                                    )}
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    </div>
                                    {errors.executor_ids && <span className="text-sm text-red-500">{errors.executor_ids}</span>}
                                </div>

                                {/* Мерзімдер */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="start_date" className="text-gray-500 font-normal">Басталу жылы</Label>
                                        <Input
                                            id="start_date"
                                            type="number"
                                            min="1990"
                                            max="2100"
                                            value={data.start_date ? data.start_date.split('-')[0] : ''}
                                            onChange={(e) => setData('start_date', e.target.value ? `${e.target.value}-01-01` : '')}
                                            placeholder="Мысалы: 2024"
                                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                                        />
                                        {errors.start_date && <span className="text-sm text-red-500">{errors.start_date}</span>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="end_date" className="text-gray-500 font-normal">Аяқталу жылы</Label>
                                        <Input
                                            id="end_date"
                                            type="number"
                                            min="1990"
                                            max="2100"
                                            value={data.end_date ? data.end_date.split('-')[0] : ''}
                                            onChange={(e) => setData('end_date', e.target.value ? `${e.target.value}-12-31` : '')}
                                            placeholder="Мысалы: 2025"
                                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                                        />
                                        {errors.end_date && <span className="text-sm text-red-500">{errors.end_date}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-6 flex items-center justify-between">
                        <div>
                            {currentStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="flex items-center gap-2 text-sm text-[#0f1b3d] hover:text-[#c8a44e]"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Артқа
                                </button>
                            ) : (
                                <Link
                                    href={investmentProjects.index.url()}
                                    className="flex items-center gap-2 text-sm text-[#0f1b3d] hover:text-[#c8a44e]"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Болдырмау
                                </Link>
                            )}
                        </div>

                        <div>
                            {currentStep < 3 ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    className="bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2a4d]"
                                >
                                    Келесі қадам
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]"
                                >
                                    Сақтау
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
