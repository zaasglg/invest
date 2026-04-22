import { Head, useForm, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    FileText,
    ExternalLink,
    ImageIcon,
    Info,
    MapPin,
} from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useState, useMemo, useEffect } from 'react';
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
import * as documentsRoutes from '@/routes/investment-projects/documents';

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

interface PromZone {
    id: number;
    name: string;
    region_id: number;
    location?: { lat: number; lng: number }[] | null;
}

interface InvestmentProject {
    id: number;
    name: string;
    company_name: string | null;
    description: string | null;
    current_status: string | null;
    region_id: number;
    project_type_id: number;
    sector: string[];
    jobs_count?: number | null;
    capacity?: string | null;
    total_investment: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    executors?: User[];
    geometry?: { lat: number; lng: number }[];
    infrastructure?: Record<
        string,
        { needed: boolean; capacity: string }
    > | null;
    documents?: Array<{
        id: number;
        name: string;
        file_path: string;
        type: string;
    }>;
    photos_count?: number;
    created_by?: number | null;
    curator_ids?: number[];
}

interface InvestUser {
    id: number;
    full_name: string;
    region_id: number | null;
    invest_sub_role?: string | null;
}

interface Props {
    project: InvestmentProject;
    regions: Region[];
    projectTypes: ProjectType[];
    users: User[];
    sezList: Sez[];
    industrialZones: IndustrialZone[];
    promZones: PromZone[];
    isSuperAdmin?: boolean;
    investUsers?: InvestUser[];
    investSubRole?: string | null;
    restrictedSectorType?: 'sez' | 'industrial_zone' | 'prom_zone' | null;
}

export default function Edit({
    project,
    regions,
    projectTypes,
    users,
    sezList,
    industrialZones,
    promZones,
    isSuperAdmin,
    investUsers = [],
    restrictedSectorType = null,
}: Props) {
    const { url } = usePage();
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const returnUrl = queryParams.get('return_to');

    const { data, setData, put, processing, errors } = useForm({
        name: project.name || '',
        company_name: project.company_name || '',
        description: project.description || '',
        current_status: project.current_status || '',
        region_id: project.region_id?.toString() || '',
        project_type_id: project.project_type_id?.toString() || '',
        sector: project.sector
            ? Array.isArray(project.sector)
                ? project.sector
                : [project.sector]
            : [],
        jobs_count: project.jobs_count ? project.jobs_count.toString() : '',
        capacity: project.capacity || '',
        total_investment: project.total_investment || '',
        status: project.status || 'plan',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        executor_ids: project.executors?.map((u) => u.id.toString()) || [],
        geometry: project.geometry || [],
        infrastructure: project.infrastructure || {
            gas: { needed: false, capacity: '' },
            water: { needed: false, capacity: '' },
            electricity: { needed: false, capacity: '' },
            land: { needed: false, capacity: '' },
        },
        created_by: project.created_by?.toString() || '',
        curator_ids: (project.curator_ids || []).map((id) => id.toString()),
        return_to: returnUrl || '',
    });

    const initialRegion = regions.find((r) => r.id === project.region_id);
    const initialOblastId = initialRegion
        ? initialRegion.type === 'oblast'
            ? initialRegion.id.toString()
            : initialRegion.parent_id?.toString() || ''
        : '';

    const [selectedOblastId, setSelectedOblastId] =
        useState<string>(initialOblastId);
    const [currentStep, setCurrentStep] = useState(1);

    const oblasts = useMemo(
        () => regions.filter((r) => r.type === 'oblast'),
        [regions],
    );

    const districts = useMemo(() => {
        if (!selectedOblastId) return [];
        return regions.filter(
            (r) => r.parent_id === parseInt(selectedOblastId),
        );
    }, [regions, selectedOblastId]);

    const availableSez = useMemo(() => {
        if (!data.region_id) return [];
        if (restrictedSectorType && restrictedSectorType !== 'sez') return [];
        return sezList.filter((s) => s.region_id === parseInt(data.region_id));
    }, [sezList, data.region_id, restrictedSectorType]);

    const availableIndustrialZones = useMemo(() => {
        if (!data.region_id) return [];
        if (restrictedSectorType && restrictedSectorType !== 'industrial_zone')
            return [];
        return industrialZones.filter(
            (iz) => iz.region_id === parseInt(data.region_id),
        );
    }, [industrialZones, data.region_id, restrictedSectorType]);

    const availablePromZones = useMemo(() => {
        if (!data.region_id) return [];
        if (restrictedSectorType && restrictedSectorType !== 'prom_zone')
            return [];
        return promZones.filter((prom) => prom.region_id === parseInt(data.region_id));
    }, [promZones, data.region_id, restrictedSectorType]);

    const selectedRegion = useMemo(() => {
        if (!data.region_id) return null;
        return regions.find((r) => r.id === parseInt(data.region_id)) || null;
    }, [regions, data.region_id]);

    const regionBoundary = useMemo(() => {
        return selectedRegion?.geometry || undefined;
    }, [selectedRegion]);

    const overlayEntities = useMemo(() => {
        const entities: {
            id: number;
            name: string;
            type: 'sez' | 'iz' | 'prom';
            location?: { lat: number; lng: number }[] | null;
        }[] = [];
        const currentSectors = Array.isArray(data.sector) ? data.sector : [];
        currentSectors.forEach((s) => {
            const [type, idStr] = s.split('-');
            const id = parseInt(idStr);
            if (type === 'sez') {
                const sez = sezList.find((x) => x.id === id);
                if (sez)
                    entities.push({
                        id: sez.id,
                        name: sez.name,
                        type: 'sez',
                        location: sez.location,
                    });
            } else if (type === 'industrial_zone') {
                const iz = industrialZones.find((x) => x.id === id);
                if (iz)
                    entities.push({
                        id: iz.id,
                        name: iz.name,
                        type: 'iz',
                        location: iz.location,
                    });
            } else if (type === 'prom_zone') {
                const promZone = promZones.find((x) => x.id === id);
                if (promZone)
                    entities.push({
                        id: promZone.id,
                        name: promZone.name,
                        type: 'prom',
                        location: promZone.location,
                    });
            }
        });
        return entities;
    }, [data.sector, sezList, industrialZones, promZones]);

    const districtUsers = useMemo(() => {
        return users.filter((u) => u.region_id && u.baskarma_type !== 'oblast');
    }, [users]);

    const oblastUsers = useMemo(() => {
        return users.filter((u) => u.baskarma_type === 'oblast');
    }, [users]);

    // District ispolnitel users that must be auto-assigned and cannot be removed
    const lockedIspolnitelIds = useMemo(() => {
        if (!data.region_id) return [] as string[];
        const regionId = parseInt(data.region_id);
        return users
            .filter(
                (u) =>
                    u.role_model?.name === 'ispolnitel' &&
                    u.region_id === regionId,
            )
            .map((u) => u.id.toString());
    }, [users, data.region_id]);

    // Auto-add district ispolnitel users when region changes
    useEffect(() => {
        if (lockedIspolnitelIds.length === 0) return;
        const merged = new Set([
            ...data.executor_ids,
            ...lockedIspolnitelIds,
        ]);
        const next = Array.from(merged);
        if (next.length !== data.executor_ids.length) {
            setData('executor_ids', next);
        }
    }, [lockedIspolnitelIds]);

    const handleExecutorChange = (userId: string, checked: boolean) => {
        // Prevent unchecking locked ispolnitel users
        if (!checked && lockedIspolnitelIds.includes(userId)) return;
        const currentIds = data.executor_ids;
        if (checked) {
            setData('executor_ids', [...currentIds, userId]);
        } else {
            setData(
                'executor_ids',
                currentIds.filter((id) => id !== userId),
            );
        }
    };

    const handleSectorChange = (sectorValue: string, checked: boolean) => {
        const currentSectors = Array.isArray(data.sector) ? data.sector : [];
        if (checked) {
            setData('sector', [...currentSectors, sectorValue]);
        } else {
            setData(
                'sector',
                currentSectors.filter((s) => s !== sectorValue),
            );
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(investmentProjects.update.url(project.id));
    };

    const handleCancel = () => {
        if (returnUrl) {
            window.location.href = returnUrl;
        } else {
            window.location.href = investmentProjects.index.url();
        }
    };

    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});

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
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Инвестициялық жобалар',
                    href: investmentProjects.index.url(),
                },
                { title: 'Өңдеу', href: '#' },
            ]}
        >
            <Head title="Жобаны өңдеу" />

            <div className="flex h-full flex-col p-6">
                <h1 className="mb-6 text-2xl font-bold text-[#0f1b3d]">
                    Жобаны өңдеу
                </h1>

                {/* Step Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className="flex flex-1 items-center"
                            >
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
                                    Инвестициялық жоба туралы негізгі
                                    мәліметтерді толтырыңыз.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* Жоба атауы және Компания - 2 column */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="name"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Жобаның атауы{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => {
                                                setData('name', e.target.value);
                                                if (validationErrors.name) {
                                                    setValidationErrors(
                                                        (prev) => ({
                                                            ...prev,
                                                            name: '',
                                                        }),
                                                    );
                                                }
                                            }}
                                            className={`h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0 ${validationErrors.name ? 'border-red-500' : ''}`}
                                            placeholder="Мысалы: Күн электр станциясы"
                                            autoFocus
                                        />
                                        {(errors.name ||
                                            validationErrors.name) && (
                                            <span className="text-sm text-red-500">
                                                {errors.name ||
                                                    validationErrors.name}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="company_name"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Компания{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="company_name"
                                            value={data.company_name}
                                            onChange={(e) => {
                                                setData(
                                                    'company_name',
                                                    e.target.value,
                                                );
                                                if (
                                                    validationErrors.company_name
                                                ) {
                                                    setValidationErrors(
                                                        (prev) => ({
                                                            ...prev,
                                                            company_name: '',
                                                        }),
                                                    );
                                                }
                                            }}
                                            className={`h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0 ${validationErrors.company_name ? 'border-red-500' : ''}`}
                                            placeholder="Мысалы: Green Energy Corp"
                                        />
                                        {(errors.company_name ||
                                            validationErrors.company_name) && (
                                            <span className="text-sm text-red-500">
                                                {errors.company_name ||
                                                    validationErrors.company_name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {isSuperAdmin && investUsers.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                            Кураторлар{' '}
                                            <span className="text-xs font-normal text-gray-400 normal-case">
                                                (бір немесе бірнеше)
                                            </span>
                                        </Label>
                                        <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-4">
                                            {investUsers.map((u) => {
                                                const value = u.id.toString();
                                                const checked = data.curator_ids.includes(value);
                                                return (
                                                    <div
                                                        key={u.id}
                                                        className="flex items-center space-x-2"
                                                    >
                                                        <Checkbox
                                                            id={`curator-${u.id}`}
                                                            checked={checked}
                                                            onCheckedChange={(isChecked) => {
                                                                if (isChecked) {
                                                                    setData('curator_ids', [
                                                                        ...data.curator_ids,
                                                                        value,
                                                                    ]);
                                                                } else {
                                                                    setData(
                                                                        'curator_ids',
                                                                        data.curator_ids.filter(
                                                                            (id) => id !== value,
                                                                        ),
                                                                    );
                                                                }
                                                            }}
                                                            className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                        />
                                                        <Label
                                                            htmlFor={`curator-${u.id}`}
                                                            className="cursor-pointer font-normal"
                                                        >
                                                            {u.full_name}
                                                            {u.invest_sub_role && (
                                                                <span className="ml-1 text-xs text-gray-400">
                                                                    ({u.invest_sub_role})
                                                                </span>
                                                            )}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {errors.curator_ids && (
                                            <span className="text-sm text-red-500">
                                                {errors.curator_ids}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Облыс және Аудан - 2 column */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="oblast"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Облыс
                                        </Label>
                                        <Select
                                            value={selectedOblastId}
                                            onValueChange={(value) => {
                                                setSelectedOblastId(value);
                                                setData('region_id', '');
                                            }}
                                        >
                                            <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                                <SelectValue placeholder="Облысты таңдаңыз" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {oblasts.map((oblast) => (
                                                    <SelectItem
                                                        key={oblast.id}
                                                        value={oblast.id.toString()}
                                                    >
                                                        {oblast.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="region_id"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Аудан / Қала{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Select
                                            value={data.region_id}
                                            onValueChange={(value) => {
                                                setData('region_id', value);
                                                setData('sector', []);
                                                if (
                                                    validationErrors.region_id
                                                ) {
                                                    setValidationErrors(
                                                        (prev) => ({
                                                            ...prev,
                                                            region_id: '',
                                                        }),
                                                    );
                                                }
                                            }}
                                            disabled={!selectedOblastId}
                                        >
                                            <SelectTrigger
                                                className={`h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0 ${validationErrors.region_id ? 'border-red-500' : ''}`}
                                            >
                                                <SelectValue placeholder="Ауданды таңдаңыз" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {districts.map((district) => (
                                                    <SelectItem
                                                        key={district.id}
                                                        value={district.id.toString()}
                                                    >
                                                        {district.name}
                                                    </SelectItem>
                                                ))}
                                                {selectedOblastId &&
                                                    districts.length === 0 && (
                                                        <SelectItem
                                                            value="none"
                                                            disabled
                                                        >
                                                            Қол жетімді аудандар
                                                            жоқ
                                                        </SelectItem>
                                                    )}
                                            </SelectContent>
                                        </Select>
                                        {(errors.region_id ||
                                            validationErrors.region_id) && (
                                            <span className="text-sm text-red-500">
                                                {errors.region_id ||
                                                    validationErrors.region_id}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Жоба түрі және Сектор - 2 column */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="project_type_id"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Жобаның түрі{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Select
                                            value={data.project_type_id}
                                            onValueChange={(value) => {
                                                setData(
                                                    'project_type_id',
                                                    value,
                                                );
                                                if (
                                                    validationErrors.project_type_id
                                                ) {
                                                    setValidationErrors(
                                                        (prev) => ({
                                                            ...prev,
                                                            project_type_id: '',
                                                        }),
                                                    );
                                                }
                                            }}
                                        >
                                            <SelectTrigger
                                                className={`h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0 ${validationErrors.project_type_id ? 'border-red-500' : ''}`}
                                            >
                                                <SelectValue placeholder="Түрді таңдаңыз" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projectTypes.map((type) => (
                                                    <SelectItem
                                                        key={type.id}
                                                        value={type.id.toString()}
                                                    >
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {(errors.project_type_id ||
                                            validationErrors.project_type_id) && (
                                            <span className="text-sm text-red-500">
                                                {errors.project_type_id ||
                                                    validationErrors.project_type_id}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="sector"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Сектор{' '}
                                            <span className="text-xs font-normal text-gray-400 normal-case">
                                                {restrictedSectorType ? (
                                                    <span className="text-red-500">(міндетті)</span>
                                                ) : (
                                                    '(міндетті емес)'
                                                )}
                                            </span>
                                            {Array.isArray(data.sector) &&
                                                data.sector.length > 0 && (
                                                    <span className="ml-1 text-xs font-normal text-gray-500 normal-case">
                                                        ({data.sector.length}{' '}
                                                        таңдалды)
                                                    </span>
                                                )}
                                        </Label>
                                        <div className="max-h-40 space-y-3 overflow-y-auto rounded-md border border-gray-200 p-4">
                                            {!data.region_id ? (
                                                <p className="py-2 text-center text-sm text-gray-400">
                                                    Алдымен ауданды таңдаңыз
                                                </p>
                                            ) : (
                                                <>
                                                    {availableSez.length ===
                                                        0 &&
                                                    availableIndustrialZones.length ===
                                                        0 &&
                                                    availablePromZones.length ===
                                                        0 ? (
                                                        <p className="py-2 text-center text-sm text-gray-400">
                                                            Бұл ауданда қол
                                                            жетімді секторлар
                                                            жоқ
                                                        </p>
                                                    ) : (
                                                        <>
                                                            {availableSez.length >
                                                                0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-medium text-gray-500 uppercase">
                                                                        АЭА
                                                                    </p>
                                                                    {availableSez.map(
                                                                        (
                                                                            sez,
                                                                        ) => {
                                                                            const value = `sez-${sez.id}`;
                                                                            const isChecked =
                                                                                Array.isArray(
                                                                                    data.sector,
                                                                                ) &&
                                                                                data.sector.includes(
                                                                                    value,
                                                                                );
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        value
                                                                                    }
                                                                                    className="flex items-center space-x-2"
                                                                                >
                                                                                    <Checkbox
                                                                                        id={
                                                                                            value
                                                                                        }
                                                                                        checked={
                                                                                            isChecked
                                                                                        }
                                                                                        onCheckedChange={(
                                                                                            checked,
                                                                                        ) =>
                                                                                            handleSectorChange(
                                                                                                value,
                                                                                                checked as boolean,
                                                                                            )
                                                                                        }
                                                                                        className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                                                    />
                                                                                    <Label
                                                                                        htmlFor={
                                                                                            value
                                                                                        }
                                                                                        className="cursor-pointer font-normal"
                                                                                    >
                                                                                        {
                                                                                            sez.name
                                                                                        }
                                                                                    </Label>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            )}
                                                            {availableIndustrialZones.length >
                                                                0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-medium text-gray-500 uppercase">
                                                                        Индустриялық
                                                                        аймақтар
                                                                    </p>
                                                                    {availableIndustrialZones.map(
                                                                        (
                                                                            iz,
                                                                        ) => {
                                                                            const value = `industrial_zone-${iz.id}`;
                                                                            const isChecked =
                                                                                Array.isArray(
                                                                                    data.sector,
                                                                                ) &&
                                                                                data.sector.includes(
                                                                                    value,
                                                                                );
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        value
                                                                                    }
                                                                                    className="flex items-center space-x-2"
                                                                                >
                                                                                    <Checkbox
                                                                                        id={
                                                                                            value
                                                                                        }
                                                                                        checked={
                                                                                            isChecked
                                                                                        }
                                                                                        onCheckedChange={(
                                                                                            checked,
                                                                                        ) =>
                                                                                            handleSectorChange(
                                                                                                value,
                                                                                                checked as boolean,
                                                                                            )
                                                                                        }
                                                                                        className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                                                    />
                                                                                    <Label
                                                                                        htmlFor={
                                                                                            value
                                                                                        }
                                                                                        className="cursor-pointer font-normal"
                                                                                    >
                                                                                        {
                                                                                            iz.name
                                                                                        }
                                                                                    </Label>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            )}
                                                            {availablePromZones.length >
                                                                0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-medium text-gray-500 uppercase">
                                                                        Пром зоналар
                                                                    </p>
                                                                    {availablePromZones.map(
                                                                        (
                                                                            promZone,
                                                                        ) => {
                                                                            const value = `prom_zone-${promZone.id}`;
                                                                            const isChecked =
                                                                                Array.isArray(
                                                                                    data.sector,
                                                                                ) &&
                                                                                data.sector.includes(
                                                                                    value,
                                                                                );
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        value
                                                                                    }
                                                                                    className="flex items-center space-x-2"
                                                                                >
                                                                                    <Checkbox
                                                                                        id={
                                                                                            value
                                                                                        }
                                                                                        checked={
                                                                                            isChecked
                                                                                        }
                                                                                        onCheckedChange={(
                                                                                            checked,
                                                                                        ) =>
                                                                                            handleSectorChange(
                                                                                                value,
                                                                                                checked as boolean,
                                                                                            )
                                                                                        }
                                                                                        className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                                                    />
                                                                                    <Label
                                                                                        htmlFor={
                                                                                            value
                                                                                        }
                                                                                        className="cursor-pointer font-normal"
                                                                                    >
                                                                                        {
                                                                                            promZone.name
                                                                                        }
                                                                                    </Label>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        {errors.sector && (
                                            <span className="text-sm text-red-500">
                                                {errors.sector}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Жұмыс орындары, Қуаттылық, Инвестиция - 3 column */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="jobs_count"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Жұмыс орындары
                                        </Label>
                                        <Input
                                            id="jobs_count"
                                            type="number"
                                            min="0"
                                            value={data.jobs_count}
                                            onChange={(e) =>
                                                setData(
                                                    'jobs_count',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                            placeholder="0"
                                        />
                                        {errors.jobs_count && (
                                            <span className="text-sm text-red-500">
                                                {errors.jobs_count}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="capacity"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Қуаттылығы
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="capacity"
                                                type="text"
                                                value={data.capacity}
                                                onChange={(e) =>
                                                    setData(
                                                        'capacity',
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-10 border-gray-200 bg-transparent pr-12 shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                                placeholder="Мысалы: 500"
                                            />
                                            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-gray-400">
                                                МВт/с
                                            </span>
                                        </div>
                                        {errors.capacity && (
                                            <span className="text-sm text-red-500">
                                                {errors.capacity}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="total_investment"
                                            className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                        >
                                            Жалпы инвестиция{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="total_investment"
                                                type="number"
                                                step="0.01"
                                                value={data.total_investment}
                                                onChange={(e) =>
                                                    setData(
                                                        'total_investment',
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-10 border-gray-200 bg-transparent pr-12 shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                                placeholder="0.00"
                                            />
                                            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-gray-400">
                                                KZT
                                            </span>
                                        </div>
                                        {(errors.total_investment ||
                                            validationErrors.total_investment) && (
                                            <span className="text-sm text-red-500">
                                                {errors.total_investment ||
                                                    validationErrors.total_investment}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Мәртебесі - full width */}
                                <div className="flex flex-col gap-2">
                                    <Label
                                        htmlFor="status"
                                        className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                    >
                                        Ағымдағы мәртебесі
                                    </Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(value) =>
                                            setData('status', value)
                                        }
                                    >
                                        <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                            <SelectValue placeholder="Мәртебені таңдаңыз" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="plan">
                                                Жоспарлау
                                            </SelectItem>
                                            <SelectItem value="implementation">
                                                Іске асыру
                                            </SelectItem>
                                            <SelectItem value="launched">
                                                Іске қосылған
                                            </SelectItem>
                                            <SelectItem value="suspended">
                                                Тоқтатылған
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status && (
                                        <span className="text-sm text-red-500">
                                            {errors.status}
                                        </span>
                                    )}
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
                                            <Label
                                                htmlFor="description"
                                                className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                            >
                                                Жоба сипаттамасы
                                            </Label>
                                            <Textarea
                                                id="description"
                                                value={data.description}
                                                onChange={(
                                                    e: React.ChangeEvent<HTMLTextAreaElement>,
                                                ) =>
                                                    setData(
                                                        'description',
                                                        e.target.value,
                                                    )
                                                }
                                                className="min-h-[100px] border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                                placeholder="Жобаның негізгі мақсаттары мен ауқымын сипаттаңыз..."
                                            />
                                            {errors.description && (
                                                <span className="text-sm text-red-500">
                                                    {errors.description}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Label
                                                htmlFor="current_status"
                                                className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                                            >
                                                Ағымдағы жағдайы
                                            </Label>
                                            <Textarea
                                                id="current_status"
                                                value={data.current_status}
                                                onChange={(
                                                    e: React.ChangeEvent<HTMLTextAreaElement>,
                                                ) =>
                                                    setData(
                                                        'current_status',
                                                        e.target.value,
                                                    )
                                                }
                                                className="min-h-[80px] border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                                placeholder="Жобаның қазіргі орындалу кезеңі қандай?"
                                            />
                                            {errors.current_status && (
                                                <span className="text-sm text-red-500">
                                                    {errors.current_status}
                                                </span>
                                            )}
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
                                            {
                                                key: 'water',
                                                label: 'Су (Сумен қамтамасыз ету)',
                                            },
                                            {
                                                key: 'electricity',
                                                label: 'Электр қуаты',
                                            },
                                            {
                                                key: 'land',
                                                label: 'Жер учаскесі',
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.key}
                                                className="flex items-center gap-4"
                                            >
                                                <div className="flex w-48 items-center space-x-2">
                                                    <Checkbox
                                                        id={`infra-${item.key}`}
                                                        checked={
                                                            data.infrastructure[
                                                                item.key
                                                            ]?.needed || false
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) => {
                                                            setData(
                                                                'infrastructure',
                                                                {
                                                                    ...data.infrastructure,
                                                                    [item.key]:
                                                                        {
                                                                            ...data
                                                                                .infrastructure[
                                                                                item
                                                                                    .key
                                                                            ],
                                                                            needed: checked as boolean,
                                                                        },
                                                                },
                                                            );
                                                        }}
                                                        className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                    />
                                                    <Label
                                                        htmlFor={`infra-${item.key}`}
                                                        className="cursor-pointer font-normal"
                                                    >
                                                        {item.label}
                                                    </Label>
                                                </div>
                                                {data.infrastructure[item.key]
                                                    ?.needed && (
                                                    <div className="flex flex-1 items-center gap-2">
                                                        <Input
                                                            value={
                                                                data
                                                                    .infrastructure[
                                                                    item.key
                                                                ]?.capacity ||
                                                                ''
                                                            }
                                                            onChange={(e) => {
                                                                setData(
                                                                    'infrastructure',
                                                                    {
                                                                        ...data.infrastructure,
                                                                        [item.key]:
                                                                            {
                                                                                ...data
                                                                                    .infrastructure[
                                                                                    item
                                                                                        .key
                                                                                ],
                                                                                capacity:
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                            },
                                                                    },
                                                                );
                                                            }}
                                                            className="h-9 max-w-[200px] border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                                            placeholder="Көлемі"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Құжаттар */}
                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-[#0f1b3d]" />
                                            <h3 className="font-semibold text-[#0f1b3d]">
                                                Құжаттар
                                            </h3>
                                        </div>
                                        <Link
                                            href={documentsRoutes.index.url(
                                                project.id,
                                            )}
                                            className="flex items-center gap-1 text-sm text-[#0f1b3d] hover:text-[#c8a44e]"
                                        >
                                            Басқару
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
                                    {project.documents &&
                                    project.documents.length > 0 ? (
                                        <div className="space-y-2">
                                            {project.documents
                                                .slice(0, 3)
                                                .map((doc) => (
                                                    <div
                                                        key={doc.id}
                                                        className="flex items-center gap-3 rounded bg-gray-50 p-2"
                                                    >
                                                        <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                                        <span className="flex-1 truncate text-sm">
                                                            {doc.name}
                                                        </span>
                                                    </div>
                                                ))}
                                            {project.documents.length > 3 && (
                                                <p className="text-xs text-gray-500">
                                                    +
                                                    {project.documents.length -
                                                        3}{' '}
                                                    құжат
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="py-2 text-center text-sm text-gray-400">
                                            Құжаттар жоқ
                                        </p>
                                    )}
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
                                {errors.geometry && (
                                    <span className="text-sm text-red-500">
                                        {errors.geometry}
                                    </span>
                                )}
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
                                    <h4 className="mb-3 font-medium text-[#0f1b3d]">
                                        Негізгі ақпарат
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">
                                                Жоба атауы:
                                            </span>
                                            <p className="font-medium">
                                                {data.name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Компания:
                                            </span>
                                            <p className="font-medium">
                                                {data.company_name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Облыс:
                                            </span>
                                            <p className="font-medium">
                                                {oblasts.find(
                                                    (o) =>
                                                        o.id.toString() ===
                                                        selectedOblastId,
                                                )?.name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Аудан:
                                            </span>
                                            <p className="font-medium">
                                                {districts.find(
                                                    (d) =>
                                                        d.id.toString() ===
                                                        data.region_id,
                                                )?.name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Жоба түрі:
                                            </span>
                                            <p className="font-medium">
                                                {projectTypes.find(
                                                    (t) =>
                                                        t.id.toString() ===
                                                        data.project_type_id,
                                                )?.name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Жұмыс орындары:
                                            </span>
                                            <p className="font-medium">
                                                {data.jobs_count || '0'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Инвестиция:
                                            </span>
                                            <p className="font-medium">
                                                {data.total_investment
                                                    ? formatMoneyCompact(
                                                          parseFloat(
                                                              data.total_investment,
                                                          ),
                                                      )
                                                    : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Қуаттылығы:
                                            </span>
                                            <p className="font-medium">
                                                {data.capacity || '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Сипаттама */}
                                {data.description && (
                                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                        <h4 className="mb-2 font-medium text-[#0f1b3d]">
                                            Сипаттама
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {data.description}
                                        </p>
                                    </div>
                                )}

                                {/* Инфрақұрылым */}
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <h4 className="mb-3 font-medium text-[#0f1b3d]">
                                        Инфрақұрылым
                                    </h4>
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
                                                    {key === 'electricity' &&
                                                        'Электр'}
                                                    {key === 'land' && 'Жер'}
                                                </span>
                                            ))}
                                        {Object.values(
                                            data.infrastructure,
                                        ).every((v) => !v.needed) && (
                                            <span className="text-sm text-gray-400">
                                                Инфрақұрылым таңдалмаған
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Орындаушылар */}
                                <div className="flex flex-col gap-2">
                                    <Label className="font-normal text-gray-500">
                                        Орындаушылар
                                    </Label>
                                    <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 p-4">
                                        <>
                                            {districtUsers.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                                                        Аудан исполнителі
                                                    </p>
                                                    <div className="space-y-2">
                                                        {districtUsers.map(
                                                            (user) => (
                                                                <div
                                                                    key={
                                                                        user.id
                                                                    }
                                                                    className="flex items-center space-x-2"
                                                                >
                                                                    <Checkbox
                                                                        id={`user-${user.id}`}
                                                                        checked={data.executor_ids.includes(
                                                                            user.id.toString(),
                                                                        )}
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) =>
                                                                            handleExecutorChange(
                                                                                user.id.toString(),
                                                                                checked as boolean,
                                                                            )
                                                                        }
                                                                        disabled={lockedIspolnitelIds.includes(
                                                                            user.id.toString(),
                                                                        )}
                                                                        className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                                    />
                                                                    <Label
                                                                        htmlFor={`user-${user.id}`}
                                                                        className={`font-normal ${lockedIspolnitelIds.includes(user.id.toString()) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                                    >
                                                                        <span>
                                                                            {
                                                                                user.full_name
                                                                            }
                                                                        </span>
                                                                        {lockedIspolnitelIds.includes(
                                                                            user.id.toString(),
                                                                        ) && (
                                                                            <span className="ml-1 text-xs text-amber-600">
                                                                                (авто)
                                                                            </span>
                                                                        )}
                                                                        {user.position && (
                                                                            <span className="text-gray-400">
                                                                                {' '}
                                                                                —{' '}
                                                                                {
                                                                                    user.position
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </Label>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {oblastUsers.length > 0 && (
                                                <div
                                                    className={
                                                        districtUsers.length > 0
                                                            ? 'border-t border-gray-200 pt-3'
                                                            : ''
                                                    }
                                                >
                                                    <p className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                                                        Облыс исполнителі
                                                    </p>
                                                    <div className="space-y-2">
                                                        {oblastUsers.map(
                                                            (user) => (
                                                                <div
                                                                    key={
                                                                        user.id
                                                                    }
                                                                    className="flex items-center space-x-2"
                                                                >
                                                                    <Checkbox
                                                                        id={`user-${user.id}`}
                                                                        checked={data.executor_ids.includes(
                                                                            user.id.toString(),
                                                                        )}
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) =>
                                                                            handleExecutorChange(
                                                                                user.id.toString(),
                                                                                checked as boolean,
                                                                            )
                                                                        }
                                                                        className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                                                    />
                                                                    <Label
                                                                        htmlFor={`user-${user.id}`}
                                                                        className="cursor-pointer font-normal"
                                                                    >
                                                                        <span>
                                                                            {
                                                                                user.full_name
                                                                            }
                                                                        </span>
                                                                        {user.position && (
                                                                            <span className="text-gray-400">
                                                                                {' '}
                                                                                —{' '}
                                                                                {
                                                                                    user.position
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </Label>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    </div>
                                    {errors.executor_ids && (
                                        <span className="text-sm text-red-500">
                                            {errors.executor_ids}
                                        </span>
                                    )}
                                </div>

                                {/* Мерзімдер */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="start_date"
                                            className="font-normal text-gray-500"
                                        >
                                            Басталу жылы
                                        </Label>
                                        <Input
                                            id="start_date"
                                            type="number"
                                            min="1990"
                                            max="2100"
                                            value={
                                                data.start_date
                                                    ? data.start_date.split(
                                                          '-',
                                                      )[0]
                                                    : ''
                                            }
                                            onChange={(e) =>
                                                setData(
                                                    'start_date',
                                                    e.target.value
                                                        ? `${e.target.value}-01-01`
                                                        : '',
                                                )
                                            }
                                            placeholder="Мысалы: 2024"
                                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                        />
                                        {errors.start_date && (
                                            <span className="text-sm text-red-500">
                                                {errors.start_date}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="end_date"
                                            className="font-normal text-gray-500"
                                        >
                                            Аяқталу жылы
                                        </Label>
                                        <Input
                                            id="end_date"
                                            type="number"
                                            min="1990"
                                            max="2100"
                                            value={
                                                data.end_date
                                                    ? data.end_date.split(
                                                          '-',
                                                      )[0]
                                                    : ''
                                            }
                                            onChange={(e) =>
                                                setData(
                                                    'end_date',
                                                    e.target.value
                                                        ? `${e.target.value}-12-31`
                                                        : '',
                                                )
                                            }
                                            placeholder="Мысалы: 2025"
                                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                        />
                                        {errors.end_date && (
                                            <span className="text-sm text-red-500">
                                                {errors.end_date}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Галерея */}
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="h-5 w-5 text-gray-400" />
                                            <h4 className="font-medium text-[#0f1b3d]">
                                                Галерея
                                            </h4>
                                        </div>
                                        <Link
                                            href={`/investment-projects/${project.id}/gallery`}
                                            className="flex items-center gap-1 text-sm text-[#0f1b3d] hover:text-[#c8a44e]"
                                        >
                                            Басқару
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
                                    {project.photos_count &&
                                    project.photos_count > 0 ? (
                                        <p className="mt-2 text-sm text-gray-600">
                                            Жүктелген фотосуреттер:{' '}
                                            {project.photos_count}
                                        </p>
                                    ) : (
                                        <p className="mt-2 text-sm text-gray-400">
                                            Фотосуреттер жоқ
                                        </p>
                                    )}
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
                                    href={
                                        returnUrl ||
                                        investmentProjects.index.url()
                                    }
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
