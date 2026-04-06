import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { FormEventHandler } from 'react';
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
    const { url } = usePage();
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const returnUrl = queryParams.get('return_to');
    const { data, setData, put, processing, errors } = useForm({
        return_to: returnUrl || '',
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
    const [currentStep, setCurrentStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
        if (currentStep === 3) {
            put(subsoilUsersRoutes.update.url(subsoilUser.id));
        }
    };

    const validateStep1 = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!data.name.trim()) {
            newErrors.name = 'Атауын енгізіңіз';
        }
        if (!data.region_id) {
            newErrors.region_id = 'Ауданды таңдаңыз';
        }
        if (!data.mineral_type.trim()) {
            newErrors.mineral_type = 'Минерал түрін енгізіңіз';
        }

        setValidationErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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

    const getLicenseStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Белсенді';
            case 'expired': return 'Мерзімі өткен';
            case 'suspended': return 'Тоқтатылған';
            case 'illegal': return 'Заңсыз';
            default: return '—';
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Жер қойнауын пайдалану', href: subsoilUsersRoutes.index.url() },
            { title: 'Өңдеу', href: '#' }
        ]}>
            <Head title="Жер қойнауын пайдаланушыны өңдеу" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="text-2xl font-bold mb-2 text-[#0f1b3d]">Өңдеу</h1>

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
                                    Жер қойнауын пайдаланушы туралы негізгі мәліметтерді толтырыңыз.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Атауы <span className="text-red-500">*</span>
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
                                            className={`h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0 ${validationErrors.name ? 'border-red-500' : ''}`}
                                            autoFocus
                                        />
                                        {(errors.name || validationErrors.name) && <span className="text-sm text-red-500">{errors.name || validationErrors.name}</span>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="bin" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            БСН
                                        </Label>
                                        <Input
                                            id="bin"
                                            value={data.bin}
                                            onChange={(e) => setData('bin', e.target.value)}
                                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                        />
                                        {errors.bin && <span className="text-sm text-red-500">{errors.bin}</span>}
                                    </div>
                                </div>

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
                                            <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
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
                                            <SelectTrigger className={`h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0 ${validationErrors.region_id ? 'border-red-500' : ''}`}>
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
                                        {(errors.region_id || validationErrors.region_id) && <span className="text-sm text-red-500">{errors.region_id || validationErrors.region_id}</span>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="mineral_type" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Минерал түрі <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="mineral_type"
                                            value={data.mineral_type}
                                            onChange={(e) => setData('mineral_type', e.target.value)}
                                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                        />
                                        {(errors.mineral_type || validationErrors.mineral_type) && <span className="text-sm text-red-500">{errors.mineral_type || validationErrors.mineral_type}</span>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="total_area" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Аумағы (га)
                                        </Label>
                                        <Input
                                            id="total_area"
                                            type="number"
                                            step="0.01"
                                            value={data.total_area}
                                            onChange={(e) => setData('total_area', e.target.value)}
                                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                            placeholder="0.00"
                                        />
                                        {errors.total_area && <span className="text-sm text-red-500">{errors.total_area}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Мәліметтер */}
                    {currentStep === 2 && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="space-y-6">
                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-[#0f1b3d]">Сипаттама</h3>
                                        <p className="text-sm text-gray-500">Қосымша ақпаратты толтырыңыз.</p>
                                    </div>
                                    <textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className="min-h-[100px] w-full resize-none rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-none focus:border-[#0f1b3d] focus:outline-none focus-visible:ring-0"
                                        placeholder="Жер қойнауын пайдаланушы қызметінің сипаттамасы"
                                    />
                                    {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-[#0f1b3d]">Лицензия</h3>
                                        <p className="text-sm text-gray-500">Лицензия ақпаратын толтырыңыз.</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="license_status" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Лицензия күйі
                                            </Label>
                                            <Select
                                                value={data.license_status}
                                                onValueChange={(value) => setData('license_status', value as 'active' | 'expired' | 'suspended' | 'illegal')}
                                            >
                                                <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
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

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="license_start" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                    Басталу күні
                                                </Label>
                                                <Input
                                                    id="license_start"
                                                    type="date"
                                                    value={data.license_start}
                                                    onChange={(e) => setData('license_start', e.target.value)}
                                                    className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                                />
                                                {errors.license_start && <span className="text-sm text-red-500">{errors.license_start}</span>}
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="license_end" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                    Аяқталу күні
                                                </Label>
                                                <Input
                                                    id="license_end"
                                                    type="date"
                                                    value={data.license_end}
                                                    onChange={(e) => setData('license_end', e.target.value)}
                                                    className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                                />
                                                {errors.license_end && <span className="text-sm text-red-500">{errors.license_end}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-6">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-[#0f1b3d]">Орналасу (полигон)</h3>
                                    <p className="text-sm text-gray-500">Картадан орналасуды белгілеңіз.</p>
                                </div>
                                <LocationPicker
                                    value={data.location}
                                    onChange={(val) => setData('location', val)}
                                    regionBoundary={selectedDistrict?.geometry || undefined}
                                    className="h-[400px] w-full"
                                />
                                {errors.location && <span className="text-sm text-red-500">{errors.location}</span>}
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
                                    Деректерді тексеріп, сақтаңыз.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <h4 className="mb-3 font-medium text-[#0f1b3d]">Негізгі ақпарат</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Атауы:</span>
                                            <p className="font-medium">{data.name || '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">БСН:</span>
                                            <p className="font-medium">{data.bin || '—'}</p>
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
                                            <span className="text-gray-500">Минерал түрі:</span>
                                            <p className="font-medium">{data.mineral_type || '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Аумағы:</span>
                                            <p className="font-medium">{data.total_area ? `${data.total_area} га` : '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <h4 className="mb-3 font-medium text-[#0f1b3d]">Лицензия</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Күйі:</span>
                                            <p className="font-medium">{getLicenseStatusLabel(data.license_status)}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Мерзімі:</span>
                                            <p className="font-medium">
                                                {data.license_start && data.license_end 
                                                    ? `${data.license_start} — ${data.license_end}` 
                                                    : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {data.description && (
                                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                        <h4 className="mb-2 font-medium text-[#0f1b3d]">Сипаттама</h4>
                                        <p className="text-sm text-gray-600">{data.description}</p>
                                    </div>
                                )}

                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <h4 className="mb-3 font-medium text-[#0f1b3d]">Орналасу</h4>
                                    <p className="text-sm text-gray-600">
                                        {data.location && data.location.length > 0
                                            ? `${data.location.length} нүкте белгіленді`
                                            : 'Орналасу белгіленбеді'}
                                    </p>
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
                                    href={subsoilUsersRoutes.index.url()}
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
