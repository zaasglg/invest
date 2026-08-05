import { AlertTriangle, Factory, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

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
import {
    emptyProductionPlan,
    PRODUCTION_PERIODS,
    PRODUCTION_UNITS,
} from '@/lib/production';
import type {
    ProductionPeriod,
    ProductionPlanInput,
    ProductionUnit,
} from '@/lib/production';

interface Props {
    value: ProductionPlanInput[];
    notApplicable: boolean;
    onChange: (value: ProductionPlanInput[]) => void;
    onNotApplicableChange: (value: boolean) => void;
    errors?: Partial<Record<string, string>>;
}

export default function PlannedProductionForm({
    value,
    notApplicable,
    onChange,
    onNotApplicableChange,
    errors = {},
}: Props) {
    const update = <K extends keyof ProductionPlanInput>(
        index: number,
        field: K,
        fieldValue: ProductionPlanInput[K],
    ) => {
        onChange(
            value.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: fieldValue } : item,
            ),
        );
    };

    const fieldError = (index: number, field: string) =>
        errors[`planned_production.${index}.${field}`];

    const handleNotApplicable = (checked: boolean) => {
        onNotApplicableChange(checked);
        if (checked) onChange([]);
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-[#fff8e7] text-[#a9842f]">
                        <Factory className="size-5" />
                    </span>
                    <div>
                        <h3 className="font-semibold text-[#0f1b3d]">
                            Жоспарлы өндіріс
                        </h3>
                        <p className="mt-1 max-w-3xl text-sm text-gray-500">
                            Өнімді ғана емес, қызметті немесе жоба нәтижесін де
                            енгізуге болады. Мысалы: пәтер — дана, тұрғын үй
                            алаңы — м², қонақ үй — орын, қызмет көрсету —
                            қызмет.
                        </p>
                    </div>
                </div>
                {!notApplicable && (
                    <Button
                        className="shrink-0 border-[#c8a44e] text-[#8b6d24] hover:bg-[#fff8e7]"
                        onClick={() =>
                            onChange([...value, emptyProductionPlan()])
                        }
                        type="button"
                        variant="outline"
                    >
                        <Plus className="mr-2 size-4" />
                        Өнім/нәтиже қосу
                    </Button>
                )}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 p-3">
                <Checkbox
                    checked={notApplicable}
                    className="mt-0.5"
                    onCheckedChange={(checked) =>
                        handleNotApplicable(Boolean(checked))
                    }
                />
                <span>
                    <span className="block text-sm font-medium text-gray-800">
                        Бұл жобаға жоспарлы өндіріс қолданылмайды
                    </span>
                    <span className="block text-xs text-gray-500">
                        Өндірістік көрсеткіші жоқ әкімшілік немесе басқа жоба
                        болса таңдаңыз.
                    </span>
                </span>
            </label>

            {errors.planned_production && (
                <p className="mt-3 text-sm text-red-600">
                    {errors.planned_production}
                </p>
            )}

            {!notApplicable && value.length === 0 && (
                <div className="mt-5 rounded-lg border border-dashed border-gray-200 px-4 py-7 text-center text-sm text-gray-500">
                    Өндіріс жоспары әлі қосылмаған. Бұл бөлім міндетті емес.
                </div>
            )}

            {!notApplicable && value.length > 0 && (
                <div className="mt-5 space-y-4">
                    {value.map((item, index) => {
                        const cannotDelete = (item.facts_count ?? 0) > 0;

                        return (
                            <div
                                className="rounded-lg border border-gray-200 p-4"
                                key={item.id ?? item.client_key ?? index}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-[#0f1b3d]">
                                        {index + 1}-өнім немесе нәтиже
                                    </p>
                                    <Button
                                        aria-label="Өнім жолын өшіру"
                                        className="size-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                        disabled={cannotDelete}
                                        onClick={() =>
                                            onChange(
                                                value.filter(
                                                    (_, itemIndex) =>
                                                        itemIndex !== index,
                                                ),
                                            )
                                        }
                                        title={
                                            cannotDelete
                                                ? 'Нақты есебі бар жоспарды өшіруге болмайды'
                                                : 'Өшіру'
                                        }
                                        type="button"
                                        variant="ghost"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>

                                {item.legacy_value && (
                                    <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                        <div>
                                            <p className="font-medium">
                                                Бұрынғы қуаттылық дерегі
                                            </p>
                                            <p>{item.legacy_value}</p>
                                            <p className="mt-1 text-xs">
                                                Осы жолды толық толтырғанда ол
                                                жаңа жоспарлы өндіріс форматына
                                                ауысады.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
                                    <Field label="Өнім немесе нәтиже атауы">
                                        <Input
                                            onChange={(event) =>
                                                update(
                                                    index,
                                                    'product_name',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Мысалы: керамикалық кірпіш"
                                            value={item.product_name}
                                        />
                                        <ErrorText
                                            value={fieldError(
                                                index,
                                                'product_name',
                                            )}
                                        />
                                    </Field>

                                    <Field label="Жоспарлы көлем">
                                        <Input
                                            inputMode="decimal"
                                            min="0"
                                            onChange={(event) =>
                                                update(
                                                    index,
                                                    'planned_quantity',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="0"
                                            step="any"
                                            type="number"
                                            value={item.planned_quantity}
                                        />
                                        <ErrorText
                                            value={fieldError(
                                                index,
                                                'planned_quantity',
                                            )}
                                        />
                                    </Field>

                                    <Field label="Өлшем бірлігі">
                                        <Select
                                            onValueChange={(unit) =>
                                                update(
                                                    index,
                                                    'unit',
                                                    unit as ProductionUnit,
                                                )
                                            }
                                            value={item.unit}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PRODUCTION_UNITS.map(
                                                    (unit) => (
                                                        <SelectItem
                                                            key={unit.value}
                                                            value={unit.value}
                                                        >
                                                            {unit.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {item.unit === 'other' && (
                                            <Input
                                                className="mt-2"
                                                onChange={(event) =>
                                                    update(
                                                        index,
                                                        'custom_unit',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Өлшемді жазыңыз"
                                                value={item.custom_unit}
                                            />
                                        )}
                                        <ErrorText
                                            value={
                                                fieldError(index, 'unit') ||
                                                fieldError(index, 'custom_unit')
                                            }
                                        />
                                    </Field>

                                    <Field label="Жоспарлы сома, ₸">
                                        <Input
                                            inputMode="decimal"
                                            min="0"
                                            onChange={(event) =>
                                                update(
                                                    index,
                                                    'planned_amount',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="0"
                                            step="0.01"
                                            type="number"
                                            value={item.planned_amount}
                                        />
                                        <ErrorText
                                            value={fieldError(
                                                index,
                                                'planned_amount',
                                            )}
                                        />
                                    </Field>

                                    <Field label="Есептеу кезеңі">
                                        <Select
                                            onValueChange={(period) =>
                                                update(
                                                    index,
                                                    'period',
                                                    period as ProductionPeriod,
                                                )
                                            }
                                            value={item.period}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PRODUCTION_PERIODS.map(
                                                    (period) => (
                                                        <SelectItem
                                                            key={period.value}
                                                            value={period.value}
                                                        >
                                                            {period.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <ErrorText
                                            value={fieldError(index, 'period')}
                                        />
                                    </Field>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <Label className="mb-1.5 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                {label}
            </Label>
            {children}
        </div>
    );
}

function ErrorText({ value }: { value?: string }) {
    return value ? <p className="mt-1 text-xs text-red-600">{value}</p> : null;
}
