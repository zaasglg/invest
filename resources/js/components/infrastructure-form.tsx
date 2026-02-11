import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Car,
    Droplets,
    Flame,
    TrainFront,
    Wifi,
    Zap,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export interface InfrastructureDetails {
    available: boolean;
    capacity?: string;
    type?: string;
    distance?: string;
}

export interface InfrastructureData {
    electricity?: InfrastructureDetails;
    water?: InfrastructureDetails;
    gas?: InfrastructureDetails;
    roads?: InfrastructureDetails;
    railway?: InfrastructureDetails;
    internet?: InfrastructureDetails;
}

type InfraKey = keyof InfrastructureData;

interface InfraField {
    key: InfraKey;
    label: string;
    icon: LucideIcon;
    detailLabel: string;
    detailPlaceholder: string;
}

const INFRA_FIELDS: InfraField[] = [
    {
        key: 'electricity',
        label: 'Электроснабжение',
        icon: Zap,
        detailLabel: 'Мощность',
        detailPlaceholder: '50 МВт',
    },
    {
        key: 'water',
        label: 'Водоснабжение',
        icon: Droplets,
        detailLabel: 'Мощность',
        detailPlaceholder: '1000 м³/сут',
    },
    {
        key: 'gas',
        label: 'Газоснабжение',
        icon: Flame,
        detailLabel: 'Мощность',
        detailPlaceholder: '500 м³/ч',
    },
    {
        key: 'roads',
        label: 'Дороги',
        icon: Car,
        detailLabel: 'Расстояние',
        detailPlaceholder: '5 км',
    },
    {
        key: 'railway',
        label: 'Ж/Д тупик',
        icon: TrainFront,
        detailLabel: 'Расстояние',
        detailPlaceholder: '10 км',
    },
    {
        key: 'internet',
        label: 'Интернет',
        icon: Wifi,
        detailLabel: 'Тип',
        detailPlaceholder: 'Оптоволокно',
    },
];

export function getEmptyInfrastructure(): InfrastructureData {
    return {
        electricity: { available: false, capacity: '' },
        water: { available: false, capacity: '' },
        gas: { available: false, capacity: '' },
        roads: { available: false, distance: '' },
        railway: { available: false, distance: '' },
        internet: { available: false, type: '' },
    };
}

interface InfrastructureFormProps {
    value: InfrastructureData;
    onChange: (value: InfrastructureData) => void;
}

export default function InfrastructureForm({
    value,
    onChange,
}: InfrastructureFormProps) {
    const updateField = (
        key: InfraKey,
        field: string,
        fieldValue: boolean | string,
    ) => {
        const current = value[key] || { available: false };
        onChange({
            ...value,
            [key]: {
                ...current,
                [field]: fieldValue,
            },
        });
    };

    const getDetailKey = (key: InfraKey): string => {
        if (key === 'roads' || key === 'railway') return 'distance';
        if (key === 'internet') return 'type';
        return 'capacity';
    };

    const getDetailValue = (key: InfraKey): string => {
        const item = value[key];
        if (!item) return '';
        const dk = getDetailKey(key);
        if (dk === 'capacity') return item.capacity || '';
        if (dk === 'distance') return item.distance || '';
        if (dk === 'type') return item.type || '';
        return '';
    };

    return (
        <div className="flex flex-col gap-2">
            <Label className="text-neutral-500 font-normal">
                Инфраструктура
            </Label>
            <div className="rounded-md border border-neutral-200">
                {INFRA_FIELDS.map((field, idx) => {
                    const item = value[field.key];
                    const available = item?.available ?? false;
                    const detailKey = getDetailKey(field.key);
                    const detailValue = getDetailValue(field.key);

                    return (
                        <div
                            key={field.key}
                            className={`flex items-center gap-4 px-4 py-3 ${
                                idx < INFRA_FIELDS.length - 1
                                    ? 'border-b border-neutral-100'
                                    : ''
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-[180px]">
                                <div className="rounded-md bg-neutral-50 p-1.5 text-neutral-500">
                                    <field.icon className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={`infra-${field.key}`}
                                        checked={available}
                                        onCheckedChange={(checked) =>
                                            updateField(
                                                field.key,
                                                'available',
                                                !!checked,
                                            )
                                        }
                                    />
                                    <Label
                                        htmlFor={`infra-${field.key}`}
                                        className="cursor-pointer text-sm font-medium text-neutral-700"
                                    >
                                        {field.label}
                                    </Label>
                                </div>
                            </div>

                            <div className="flex flex-1 items-center gap-2">
                                <span className="text-xs text-neutral-400 whitespace-nowrap">
                                    {field.detailLabel}:
                                </span>
                                <Input
                                    value={detailValue}
                                    onChange={(e) =>
                                        updateField(
                                            field.key,
                                            detailKey,
                                            e.target.value,
                                        )
                                    }
                                    className="h-8 shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 bg-transparent text-sm"
                                    placeholder={field.detailPlaceholder}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
