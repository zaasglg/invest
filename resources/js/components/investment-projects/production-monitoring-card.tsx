import { useForm } from '@inertiajs/react';
import { BarChart3, Factory, Plus, X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ProductionPlanInput } from '@/lib/production';
import { productionPeriodLabel, productionUnitLabel } from '@/lib/production';
import { store } from '@/routes/investment-projects/production-facts';

interface Props {
    projectId: number;
    projectStatus: 'plan' | 'implementation' | 'launched' | 'suspended';
    plans: ProductionPlanInput[];
    notApplicable: boolean;
    canReport: boolean;
}

const MONTHS = [
    'Қаңтар',
    'Ақпан',
    'Наурыз',
    'Сәуір',
    'Мамыр',
    'Маусым',
    'Шілде',
    'Тамыз',
    'Қыркүйек',
    'Қазан',
    'Қараша',
    'Желтоқсан',
];

export default function ProductionMonitoringCard({
    projectId,
    projectStatus,
    plans,
    notApplicable,
    canReport,
}: Props) {
    const completePlans = useMemo(
        () => plans.filter((plan) => plan.is_complete),
        [plans],
    );
    const [showForm, setShowForm] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        production_plan_id: completePlans[0]?.id?.toString() ?? '',
        reporting_year: new Date().getFullYear().toString(),
        period_number: defaultPeriodNumber(completePlans[0]),
        actual_quantity: '',
        actual_amount: '',
        notes: '',
    });
    const selectedPlan = completePlans.find(
        (plan) => plan.id?.toString() === data.production_plan_id,
    );
    const reportingAllowed = canReport && projectStatus === 'launched';

    const selectPlan = (planId: string) => {
        const plan = completePlans.find(
            (item) => item.id?.toString() === planId,
        );
        setData((current) => ({
            ...current,
            production_plan_id: planId,
            period_number: defaultPeriodNumber(plan),
        }));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(store.url(projectId), {
            preserveScroll: true,
            onSuccess: () => {
                reset('actual_quantity', 'actual_amount', 'notes');
                setShowForm(false);
            },
        });
    };

    return (
        <Card id="production-monitoring" className="scroll-mt-6 shadow-none">
            <CardHeader className="border-b border-gray-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg text-[#0f1b3d]">
                            <BarChart3 className="size-5 text-[#c8a44e]" />
                            Өндіріс жоспары және нақты көрсеткіш
                        </CardTitle>
                        <p className="mt-1 text-sm text-gray-500">
                            Әр есептік кезеңде жоспар мен нақты көлем және сома
                            автоматты салыстырылады.
                        </p>
                    </div>
                    {reportingAllowed && completePlans.length > 0 && (
                        <Button
                            className="bg-[#0f1b3d] hover:bg-[#1a2d5e]"
                            onClick={() => setShowForm((current) => !current)}
                            type="button"
                        >
                            {showForm ? (
                                <X className="mr-2 size-4" />
                            ) : (
                                <Plus className="mr-2 size-4" />
                            )}
                            {showForm ? 'Жабу' : 'Нақты есеп енгізу'}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
                {notApplicable ? (
                    <EmptyState text="Бұл жобаға жоспарлы өндіріс қолданылмайды." />
                ) : plans.length === 0 ? (
                    <EmptyState text="Жоспарлы өндіріс енгізілмеген." />
                ) : (
                    <>
                        {canReport && projectStatus !== 'launched' && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                Нақты өндіріс есебі жоба «Іске қосылған»
                                мәртебесіне өткеннен кейін енгізіледі.
                            </div>
                        )}

                        {showForm && reportingAllowed && (
                            <ProductionFactForm
                                data={data}
                                errors={errors}
                                onPlanChange={selectPlan}
                                onSubmit={submit}
                                plans={completePlans}
                                processing={processing}
                                selectedPlan={selectedPlan}
                                setData={setData}
                            />
                        )}

                        <div className="space-y-5">
                            {plans.map((plan) => (
                                <ProductionPlanComparison
                                    key={plan.id ?? plan.client_key}
                                    plan={plan}
                                />
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function ProductionPlanComparison({ plan }: { plan: ProductionPlanInput }) {
    const facts = plan.facts ?? [];
    const unit = productionUnitLabel(plan);

    return (
        <section className="overflow-hidden rounded-lg border border-gray-200">
            <div className="flex flex-col gap-3 bg-gray-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <h3 className="flex min-w-0 items-center gap-2 font-semibold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                        <Factory className="size-4 shrink-0 text-[#c8a44e]" />
                        {plan.product_name}
                    </h3>
                    {plan.legacy_value && !plan.is_complete && (
                        <p className="mt-1 text-sm [overflow-wrap:anywhere] break-words text-amber-700">
                            Бұрынғы қуаттылық: {plan.legacy_value}
                        </p>
                    )}
                </div>
                {plan.is_complete && (
                    <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                            Жоспар: {formatNumber(plan.planned_quantity)} {unit}
                        </Badge>
                        <Badge variant="outline">
                            {formatMoney(plan.planned_amount)}
                        </Badge>
                        <Badge variant="secondary">
                            {productionPeriodLabel(plan.period)}
                        </Badge>
                    </div>
                )}
            </div>

            {!plan.is_complete ? (
                <p className="px-4 py-5 text-sm text-gray-500">
                    Салыстыруды бастау үшін жоба өңдеу бетінде өнім көлемін,
                    өлшемін және жоспарлы соманы толықтырыңыз.
                </p>
            ) : facts.length === 0 ? (
                <p className="px-4 py-5 text-sm text-gray-500">
                    Нақты өндіріс есебі әлі енгізілмеген.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-y border-gray-200 bg-white text-left text-xs tracking-wide text-gray-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Кезең</th>
                                <th className="px-4 py-3">Жоспар көлем</th>
                                <th className="px-4 py-3">Нақты көлем</th>
                                <th className="px-4 py-3">Орындалуы</th>
                                <th className="px-4 py-3">Жоспар сома</th>
                                <th className="px-4 py-3">Нақты сома</th>
                                <th className="px-4 py-3">Орындалуы</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {facts.map((fact) => (
                                <tr key={fact.id}>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {fact.period_label}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {formatNumber(plan.planned_quantity)}{' '}
                                        {unit}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {formatNumber(fact.actual_quantity)}{' '}
                                        {unit}
                                    </td>
                                    <td className="px-4 py-3">
                                        <CompletionBadge
                                            actual={fact.actual_quantity}
                                            planned={plan.planned_quantity}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {formatMoney(plan.planned_amount)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {formatMoney(fact.actual_amount)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <CompletionBadge
                                            actual={fact.actual_amount}
                                            planned={plan.planned_amount}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

interface FactFormData {
    production_plan_id: string;
    reporting_year: string;
    period_number: string;
    actual_quantity: string;
    actual_amount: string;
    notes: string;
}

function ProductionFactForm({
    plans,
    selectedPlan,
    data,
    setData,
    errors,
    processing,
    onPlanChange,
    onSubmit,
}: {
    plans: ProductionPlanInput[];
    selectedPlan?: ProductionPlanInput;
    data: FactFormData;
    setData: (
        key: keyof FactFormData | ((data: FactFormData) => FactFormData),
        value?: string,
    ) => void;
    errors: Partial<Record<keyof FactFormData, string>>;
    processing: boolean;
    onPlanChange: (id: string) => void;
    onSubmit: (event: FormEvent) => void;
}) {
    return (
        <form
            className="rounded-lg border border-[#c8a44e]/40 bg-[#fffdf7] p-4"
            onSubmit={onSubmit}
        >
            <h3 className="mb-4 font-semibold text-[#0f1b3d]">
                Нақты өндіріс есебі
            </h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField
                    error={errors.production_plan_id}
                    label="Өнім/нәтиже"
                >
                    <Select
                        onValueChange={onPlanChange}
                        value={data.production_plan_id}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Таңдаңыз" />
                        </SelectTrigger>
                        <SelectContent>
                            {plans.map((plan) => (
                                <SelectItem
                                    key={plan.id}
                                    value={plan.id?.toString() ?? ''}
                                >
                                    {plan.product_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                {selectedPlan?.period !== 'project' && (
                    <FormField
                        error={errors.reporting_year}
                        label="Есептік жыл"
                    >
                        <Input
                            max="2100"
                            min="2000"
                            onChange={(event) =>
                                setData('reporting_year', event.target.value)
                            }
                            type="number"
                            value={data.reporting_year}
                        />
                    </FormField>
                )}

                {selectedPlan?.period === 'month' && (
                    <FormField error={errors.period_number} label="Ай">
                        <Select
                            onValueChange={(value) =>
                                setData('period_number', value)
                            }
                            value={data.period_number}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((month, index) => (
                                    <SelectItem
                                        key={month}
                                        value={(index + 1).toString()}
                                    >
                                        {month}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                )}

                {selectedPlan?.period === 'quarter' && (
                    <FormField error={errors.period_number} label="Тоқсан">
                        <Select
                            onValueChange={(value) =>
                                setData('period_number', value)
                            }
                            value={data.period_number}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4].map((quarter) => (
                                    <SelectItem
                                        key={quarter}
                                        value={quarter.toString()}
                                    >
                                        {quarter}-тоқсан
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                )}

                <FormField error={errors.actual_quantity} label="Нақты көлем">
                    <Input
                        min="0"
                        onChange={(event) =>
                            setData('actual_quantity', event.target.value)
                        }
                        placeholder="0"
                        step="any"
                        type="number"
                        value={data.actual_quantity}
                    />
                </FormField>

                <FormField error={errors.actual_amount} label="Нақты сома, ₸">
                    <Input
                        min="0"
                        onChange={(event) =>
                            setData('actual_amount', event.target.value)
                        }
                        placeholder="0"
                        step="0.01"
                        type="number"
                        value={data.actual_amount}
                    />
                </FormField>
            </div>
            <div className="mt-4">
                <FormField error={errors.notes} label="Ескерту">
                    <Textarea
                        onChange={(event) =>
                            setData('notes', event.target.value)
                        }
                        placeholder="Қажет болса түсіндірме жазыңыз"
                        value={data.notes}
                    />
                </FormField>
            </div>
            <div className="mt-4 flex justify-end">
                <Button
                    className="bg-[#0f1b3d] hover:bg-[#1a2d5e]"
                    disabled={processing || !data.production_plan_id}
                    type="submit"
                >
                    {processing ? 'Сақталуда...' : 'Есепті сақтау'}
                </Button>
            </div>
        </form>
    );
}

function FormField({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <Label className="mb-1.5 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                {label}
            </Label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

function CompletionBadge({
    actual,
    planned,
}: {
    actual: string;
    planned: string;
}) {
    const plannedNumber = Number(planned);
    const percent =
        plannedNumber > 0 ? (Number(actual) / plannedNumber) * 100 : null;

    if (percent === null) return <span className="text-gray-400">—</span>;

    const color =
        percent >= 100
            ? 'bg-green-100 text-green-800'
            : percent >= 80
              ? 'bg-amber-100 text-amber-800'
              : 'bg-red-100 text-red-800';

    return (
        <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}
        >
            {percent.toFixed(1)}%
        </span>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            {text}
        </div>
    );
}

function defaultPeriodNumber(plan?: ProductionPlanInput): string {
    if (plan?.period === 'month') return (new Date().getMonth() + 1).toString();
    if (plan?.period === 'quarter') {
        return (Math.floor(new Date().getMonth() / 3) + 1).toString();
    }

    return '';
}

function formatNumber(value: string): string {
    return new Intl.NumberFormat('kk-KZ', {
        maximumFractionDigits: 3,
    }).format(Number(value));
}

function formatMoney(value: string): string {
    return `${new Intl.NumberFormat('kk-KZ', {
        maximumFractionDigits: 2,
    }).format(Number(value))} ₸`;
}
