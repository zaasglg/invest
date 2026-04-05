import { Head, useForm, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useState, useMemo } from 'react';
import InfrastructureForm, {
    getEmptyInfrastructure,
} from '@/components/infrastructure-form';
import type { InfrastructureData } from '@/components/infrastructure-form';
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
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import * as sezs from '@/routes/sezs';


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
            post(sezs.store.url());
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

    return (
        <AppLayout breadcrumbs={[
            { title: 'АЭА', href: sezs.index.url() },
            { title: 'Құру', href: '#' }
        ]}>
            <Head title="АЭА құру" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="text-2xl font-bold mb-2 text-[#0f1b3d]">Жаңа АЭА</h1>

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
                                    АЭА туралы негізгі мәліметтерді толтырыңыз.
                                </p>
                            </div>

                            <div className="space-y-6">
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
                                        placeholder="Мысалы: АЭА TURAN"
                                        autoFocus
                                    />
                                    {(errors.name || validationErrors.name) && <span className="text-sm text-red-500">{errors.name || validationErrors.name}</span>}
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
                                        <Label htmlFor="total_area" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Жалпы аумағы (га)
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

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="status" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Күйі
                                        </Label>
                                        <Select
                                            value={data.status}
                                            onValueChange={(value) => setData('status', value)}
                                        >
                                            <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                                <SelectValue placeholder="Күйін таңдаңыз" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Белсенді</SelectItem>
                                                <SelectItem value="developing">Дамушы</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.status && <span className="text-sm text-red-500">{errors.status}</span>}
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
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                                        className="min-h-[120px] border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                        placeholder="АЭА сипаттамасы..."
                                    />
                                    {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-[#0f1b3d]">Инфрақұрылым</h3>
                                        <p className="text-sm text-gray-500">Қол жетімді инфрақұрылымды таңдаңыз.</p>
                                    </div>
                                    <InfrastructureForm
                                        value={data.infrastructure}
                                        onChange={(val) => setData('infrastructure', val)}
                                    />
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
                                            <span className="text-gray-500">Аумағы:</span>
                                            <p className="font-medium">{data.total_area ? `${data.total_area} га` : '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Күйі:</span>
                                            <p className="font-medium">
                                                {data.status === 'active' ? 'Белсенді' : data.status === 'developing' ? 'Дамушы' : '—'}
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
                                    href={sezs.index.url()}
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
