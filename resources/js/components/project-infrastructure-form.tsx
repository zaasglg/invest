import {
    Car,
    Droplets,
    Flame,
    LandPlot,
    TrainFront,
    Wifi,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import InfrastructureUnitSelect from '@/components/infrastructure-unit-select';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    convertInfrastructureValue,
    INFRASTRUCTURE_PERIOD_NOTE,
    PROJECT_INFRASTRUCTURE_FIELDS,
} from '@/lib/infrastructure';
import type {
    ProjectInfrastructureData,
    ProjectInfrastructureKey,
} from '@/lib/infrastructure';

const INFRASTRUCTURE_ICONS: Record<ProjectInfrastructureKey, LucideIcon> = {
    electricity: Zap,
    water: Droplets,
    gas: Flame,
    roads: Car,
    railway: TrainFront,
    internet: Wifi,
    land: LandPlot,
};

export default function ProjectInfrastructureForm({
    value,
    onChange,
    errors = {},
}: {
    value: ProjectInfrastructureData;
    onChange: (value: ProjectInfrastructureData) => void;
    errors?: Partial<Record<string, string>>;
}) {
    const updateNeeded = (key: ProjectInfrastructureKey, needed: boolean) => {
        onChange({
            ...value,
            [key]: {
                ...value[key],
                needed,
            },
        });
    };

    const updateCapacity = (
        key: ProjectInfrastructureKey,
        field: 'required_capacity' | 'used_capacity',
        capacity: string,
    ) => {
        onChange({
            ...value,
            [key]: {
                ...value[key],
                [field]: capacity,
            },
        });
    };

    const updateUnit = (key: ProjectInfrastructureKey, unit: string) => {
        const details = value[key];

        onChange({
            ...value,
            [key]: {
                ...details,
                unit,
                required_capacity: convertInfrastructureValue(
                    details.required_capacity,
                    key,
                    details.unit,
                    unit,
                ),
                used_capacity: convertInfrastructureValue(
                    details.used_capacity,
                    key,
                    details.unit,
                    unit,
                ),
            },
        });
    };

    return (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            <p className="p-4 text-xs text-gray-500">
                «Қажетті» — жобаға керек көлем. Зонаның қалдығынан тек
                «Пайдалануда» көрсетілген нақты көлем шегеріледі.
                Пайдаланылмаса, 0 енгізіңіз. {INFRASTRUCTURE_PERIOD_NOTE}
            </p>
            <InputError message={errors.infrastructure} className="p-4" />
            {PROJECT_INFRASTRUCTURE_FIELDS.map((field) => {
                const details = value[field.key];
                const Icon = INFRASTRUCTURE_ICONS[field.key];

                return (
                    <div
                        key={field.key}
                        className="flex flex-wrap items-center gap-3 p-4"
                    >
                        <div className="flex min-w-0 flex-[1_1_14rem] flex-wrap items-center gap-3">
                            <span className="flex size-8 items-center justify-center rounded-md bg-gray-50 text-gray-500">
                                <Icon className="size-4" />
                            </span>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={details.needed}
                                    className="border-gray-200 data-[state=checked]:border-[#c8a44e] data-[state=checked]:bg-[#c8a44e]"
                                    id={`infra-${field.key}`}
                                    onCheckedChange={(checked) =>
                                        updateNeeded(
                                            field.key,
                                            Boolean(checked),
                                        )
                                    }
                                />
                                <Label
                                    className="cursor-pointer font-normal"
                                    htmlFor={`infra-${field.key}`}
                                >
                                    {field.label}
                                </Label>
                            </div>
                            <InputError
                                className="w-full"
                                message={errors[`infrastructure.${field.key}`]}
                            />
                            <InputError
                                className="w-full"
                                message={
                                    errors[`infrastructure.${field.key}.needed`]
                                }
                            />
                        </div>

                        {details.needed && (
                            <div className="grid min-w-0 flex-[2_1_24rem] grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
                                <CapacityInput
                                    id={`infra-${field.key}-required-capacity`}
                                    error={
                                        errors[
                                            `infrastructure.${field.key}.required_capacity`
                                        ]
                                    }
                                    label="Қажетті"
                                    onChange={(capacity) =>
                                        updateCapacity(
                                            field.key,
                                            'required_capacity',
                                            capacity,
                                        )
                                    }
                                    value={details.required_capacity}
                                />
                                <CapacityInput
                                    id={`infra-${field.key}-used-capacity`}
                                    error={
                                        errors[
                                            `infrastructure.${field.key}.used_capacity`
                                        ]
                                    }
                                    label="Пайдалануда"
                                    onChange={(capacity) =>
                                        updateCapacity(
                                            field.key,
                                            'used_capacity',
                                            capacity,
                                        )
                                    }
                                    value={details.used_capacity}
                                />
                                <InfrastructureUnitSelect
                                    id={`infra-${field.key}-unit`}
                                    resource={field.key}
                                    value={details.unit}
                                    onValueChange={(unit) =>
                                        updateUnit(field.key, unit)
                                    }
                                    error={
                                        errors[
                                            `infrastructure.${field.key}.unit`
                                        ]
                                    }
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function CapacityInput({
    id,
    error,
    label,
    value,
    onChange,
}: {
    id: string;
    error?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="min-w-0">
            <Label
                htmlFor={id}
                className="mb-1.5 block text-xs font-medium text-gray-500"
            >
                {label}
            </Label>
            <div>
                <Input
                    id={id}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : undefined}
                    aria-label={label}
                    className="h-9 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="0"
                    step="any"
                    type="number"
                    value={value}
                />
            </div>
            <InputError id={`${id}-error`} message={error} className="mt-1" />
        </div>
    );
}
