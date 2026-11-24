import { Car, Droplets, Flame, TrainFront, Wifi, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import InfrastructureUnitSelect from '@/components/infrastructure-unit-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    convertInfrastructureValue,
    getEmptyInfrastructure,
    INFRASTRUCTURE_PERIOD_NOTE,
    ZONE_INFRASTRUCTURE_FIELDS,
} from '@/lib/infrastructure';
import type {
    InfrastructureData,
    ZoneInfrastructureKey,
} from '@/lib/infrastructure';

export {
    getEmptyInfrastructure,
    normalizeZoneInfrastructure,
} from '@/lib/infrastructure';
export type {
    InfrastructureData,
    InfrastructureDetails,
} from '@/lib/infrastructure';

const INFRASTRUCTURE_ICONS: Record<ZoneInfrastructureKey, LucideIcon> = {
    electricity: Zap,
    water: Droplets,
    gas: Flame,
    roads: Car,
    railway: TrainFront,
    internet: Wifi,
};

interface InfrastructureFormProps {
    value: InfrastructureData;
    onChange: (value: InfrastructureData) => void;
}

export default function InfrastructureForm({
    value,
    onChange,
}: InfrastructureFormProps) {
    const updateAvailable = (
        key: ZoneInfrastructureKey,
        available: boolean,
    ) => {
        const current = value[key] ?? {
            available: false,
            capacity: '',
        };

        onChange({
            ...value,
            [key]: {
                ...current,
                available,
                capacity: available ? (current.capacity ?? '') : '',
            },
        });
    };

    const updateCapacity = (key: ZoneInfrastructureKey, capacity: string) => {
        const current = value[key] ?? {
            available: false,
            capacity: '',
        };

        onChange({
            ...value,
            [key]: {
                ...current,
                capacity,
            },
        });
    };

    const updateUnit = (key: ZoneInfrastructureKey, unit: string) => {
        const current = value[key] ?? getEmptyInfrastructure()[key]!;

        onChange({
            ...value,
            [key]: {
                ...current,
                capacity: convertInfrastructureValue(
                    current.capacity,
                    key,
                    current.unit,
                    unit,
                ),
                unit,
            },
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <Label className="font-normal text-neutral-500">Инфрақұрылым</Label>
            <p className="text-xs text-muted-foreground">
                {INFRASTRUCTURE_PERIOD_NOTE}
            </p>
            <div className="rounded-md border border-neutral-200">
                {ZONE_INFRASTRUCTURE_FIELDS.map((field, index) => {
                    const item = value[field.key] ??
                        getEmptyInfrastructure()[field.key] ?? {
                            available: false,
                            capacity: '',
                        };
                    const Icon = INFRASTRUCTURE_ICONS[field.key];

                    return (
                        <div
                            key={field.key}
                            className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                                index < ZONE_INFRASTRUCTURE_FIELDS.length - 1
                                    ? 'border-b border-neutral-100'
                                    : ''
                            }`}
                        >
                            <div className="flex min-w-0 flex-[1_1_13rem] items-center gap-3">
                                <div className="rounded-md bg-neutral-50 p-1.5 text-neutral-500">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={`infra-${field.key}`}
                                        checked={item.available}
                                        onCheckedChange={(checked) =>
                                            updateAvailable(
                                                field.key,
                                                Boolean(checked),
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

                            {item.available && (
                                <div className="flex min-w-0 flex-[2_1_20rem] flex-wrap items-end gap-3">
                                    <div className="flex min-w-0 flex-[1_1_12rem] items-center gap-2">
                                        <span className="text-xs whitespace-nowrap text-neutral-400">
                                            {field.detailLabel}:
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <Input
                                                aria-label={`${field.label}, ${field.detailLabel}`}
                                                className="h-9 border-neutral-200 bg-transparent text-sm shadow-none focus:border-neutral-900 focus-visible:ring-0"
                                                inputMode="decimal"
                                                min="0"
                                                onChange={(event) =>
                                                    updateCapacity(
                                                        field.key,
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder={field.placeholder}
                                                step="any"
                                                type="number"
                                                value={item.capacity ?? ''}
                                            />
                                        </div>
                                    </div>
                                    <InfrastructureUnitSelect
                                        className="min-w-0 flex-[1_1_10rem]"
                                        id={`infra-${field.key}-unit`}
                                        resource={field.key}
                                        value={item.unit}
                                        onValueChange={(unit) =>
                                            updateUnit(field.key, unit)
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
