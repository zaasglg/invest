export const PRODUCTION_UNITS = [
    { value: 'piece', label: 'Дана' },
    { value: 'ton', label: 'Тонна' },
    { value: 'kilogram', label: 'Килограмм' },
    { value: 'gram', label: 'Грамм' },
    { value: 'liter', label: 'Литр' },
    { value: 'cubic_meter', label: 'Текше метр (м³)' },
    { value: 'square_meter', label: 'Шаршы метр (м²)' },
    { value: 'linear_meter', label: 'Қума метр' },
    { value: 'hectare', label: 'Гектар' },
    { value: 'kilometer', label: 'Километр' },
    { value: 'pair', label: 'Жұп' },
    { value: 'set', label: 'Жиынтық' },
    { value: 'package', label: 'Қаптама' },
    { value: 'batch', label: 'Партия' },
    { value: 'head', label: 'Бас (мал саны)' },
    { value: 'apartment', label: 'Пәтер' },
    { value: 'house', label: 'Үй' },
    { value: 'room', label: 'Бөлме' },
    { value: 'place', label: 'Орын' },
    { value: 'person', label: 'Адам' },
    { value: 'visit', label: 'Келуші' },
    { value: 'service', label: 'Қызмет' },
    { value: 'object', label: 'Объект' },
    { value: 'kilowatt_hour', label: 'Киловатт-сағат (кВт·сағ)' },
    { value: 'megawatt_hour', label: 'Мегаватт-сағат (МВт·сағ)' },
    { value: 'gigawatt_hour', label: 'Гигаватт-сағат (ГВт·сағ)' },
    { value: 'other', label: 'Басқа өлшем' },
] as const;

export const PRODUCTION_PERIODS = [
    { value: 'month', label: 'Айына' },
    { value: 'quarter', label: 'Тоқсанына' },
    { value: 'year', label: 'Жылына' },
    { value: 'project', label: 'Жоба бойынша барлығы' },
] as const;

export type ProductionUnit = (typeof PRODUCTION_UNITS)[number]['value'];
export type ProductionPeriod = (typeof PRODUCTION_PERIODS)[number]['value'];

export interface ProductionFact {
    id: number;
    period_key: string;
    period_label: string;
    reporting_year: number | null;
    period_number: number | null;
    actual_quantity: string;
    actual_amount: string;
    notes?: string | null;
    reporter?: { id: number; full_name: string } | null;
    updated_at: string;
}

export interface ProductionPlanInput {
    id?: number;
    client_key?: string;
    product_name: string;
    planned_quantity: string;
    unit: ProductionUnit;
    custom_unit: string;
    planned_amount: string;
    period: ProductionPeriod;
    legacy_value?: string | null;
    facts_count?: number;
    unit_label?: string;
    period_label?: string;
    is_complete?: boolean;
    facts?: ProductionFact[];
}

export function emptyProductionPlan(): ProductionPlanInput {
    return {
        client_key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        product_name: '',
        planned_quantity: '',
        unit: 'piece',
        custom_unit: '',
        planned_amount: '',
        period: 'year',
    };
}

export function normalizeProductionPlans(
    plans?: ProductionPlanInput[] | null,
): ProductionPlanInput[] {
    return (plans ?? []).map((plan) => ({
        id: plan.id,
        client_key: `plan-${plan.id}`,
        product_name: plan.product_name ?? '',
        planned_quantity: plan.planned_quantity ?? '',
        unit: plan.unit ?? 'piece',
        custom_unit: plan.custom_unit ?? '',
        planned_amount: plan.planned_amount ?? '',
        period: plan.period ?? 'year',
        legacy_value: plan.legacy_value,
        facts_count: plan.facts_count ?? plan.facts?.length ?? 0,
    }));
}

export function productionUnitLabel(plan: ProductionPlanInput): string {
    if (plan.unit_label) return plan.unit_label;
    if (plan.unit === 'other') return plan.custom_unit || 'Басқа';

    return (
        PRODUCTION_UNITS.find((unit) => unit.value === plan.unit)?.label ??
        plan.unit
    );
}

export function productionPeriodLabel(period: ProductionPeriod): string {
    return (
        PRODUCTION_PERIODS.find((item) => item.value === period)?.label ??
        period
    );
}
