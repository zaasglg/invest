import unitsConfigRaw from '../../data/infrastructure-units.json?raw';

export const ZONE_INFRASTRUCTURE_FIELDS = [
    {
        key: 'electricity',
        label: 'Электрмен жабдықтау',
        detailLabel: 'Қуаттылық',
        unit: 'кВт',
        placeholder: '0',
    },
    {
        key: 'water',
        label: 'Сумен жабдықтау',
        detailLabel: 'Қуаттылық',
        unit: 'м³/тәу',
        placeholder: '0',
    },
    {
        key: 'gas',
        label: 'Газбен жабдықтау',
        detailLabel: 'Қуаттылық',
        unit: 'м³/сағ',
        placeholder: '0',
    },
    {
        key: 'roads',
        label: 'Автомобиль жолы',
        detailLabel: 'Ұзындығы',
        unit: 'км',
        placeholder: '0',
    },
    {
        key: 'railway',
        label: 'Теміржол тұйығы',
        detailLabel: 'Ұзындығы',
        unit: 'км',
        placeholder: '0',
    },
    {
        key: 'internet',
        label: 'Интернет',
        detailLabel: 'Жылдамдығы',
        unit: 'Мбит/с',
        placeholder: '0',
    },
] as const;

export const PROJECT_INFRASTRUCTURE_FIELDS = [
    ...ZONE_INFRASTRUCTURE_FIELDS,
    {
        key: 'land',
        label: 'Жер учаскесі',
        detailLabel: 'Аумағы',
        unit: 'га',
        placeholder: '0',
    },
] as const;

export type ZoneInfrastructureKey =
    (typeof ZONE_INFRASTRUCTURE_FIELDS)[number]['key'];
export type ProjectInfrastructureKey =
    (typeof PROJECT_INFRASTRUCTURE_FIELDS)[number]['key'];

export interface InfrastructureDetails {
    available?: boolean;
    capacity?: string;
    unit?: string;
    distance?: string;
    type?: string;
}

export type InfrastructureData = Partial<
    Record<ZoneInfrastructureKey, InfrastructureDetails>
>;

export interface ProjectInfrastructureDetails {
    needed: boolean;
    use_required_capacity?: boolean;
    required_capacity: string;
    used_capacity: string;
    unit?: string;
    capacity?: string;
}

export type ProjectInfrastructureData = Record<
    ProjectInfrastructureKey,
    ProjectInfrastructureDetails
>;

export interface InfrastructureUnit {
    code: string;
    label: string;
    numerator: number;
    denominator: number;
}

interface InfrastructureUnitConfig {
    month_days: number;
    year_days: number;
    resources: Record<
        ProjectInfrastructureKey,
        { base_unit: string; units: InfrastructureUnit[] }
    >;
}

const unitsConfig: InfrastructureUnitConfig = JSON.parse(unitsConfigRaw);

export const INFRASTRUCTURE_PERIOD_NOTE = `Есептік ай — ${unitsConfig.month_days} тәулік, жыл — ${unitsConfig.year_days} тәулік.`;

export function getInfrastructureUnits(
    key: ProjectInfrastructureKey,
): InfrastructureUnit[] {
    return unitsConfig.resources[key].units;
}

export function getDefaultInfrastructureUnit(
    key: ProjectInfrastructureKey,
): string {
    return unitsConfig.resources[key].base_unit;
}

export function getInfrastructureUnit(
    key: ProjectInfrastructureKey,
    unit?: string | null,
): InfrastructureUnit {
    const resource = unitsConfig.resources[key];

    return (
        resource.units.find((item) => item.code === unit) ??
        resource.units.find((item) => item.code === resource.base_unit)!
    );
}

function rawNumericValue(value: unknown): string {
    if (typeof value === 'number') return formatNumericValue(value);
    if (typeof value !== 'string' || value.trim() === '') return '';

    const compact = value.replace(/\s/g, '').replace(',', '.');
    if (Number.isFinite(Number(compact))) {
        return formatNumericValue(Number(compact));
    }

    const match = value.match(/[+-]?(?:\d[\d\s.,]*|\.\d+)(?:[eE][+-]?\d+)?/u);
    if (!match) return '';

    const number = Number(match[0].replace(/\s/g, '').replace(',', '.'));

    return Number.isFinite(number) ? formatNumericValue(number) : '';
}

export function toBaseInfrastructureValue(
    value: unknown,
    key: ProjectInfrastructureKey,
    unit?: string | null,
): number {
    const normalized = unit
        ? rawNumericValue(value)
        : normalizeStandardNumber(value, key);
    const selected = getInfrastructureUnit(key, unit);

    return normalized === ''
        ? 0
        : (Number(normalized) * selected.numerator) / selected.denominator;
}

export function convertInfrastructureValue(
    value: unknown,
    key: ProjectInfrastructureKey,
    from: string | null | undefined,
    to: string,
): string {
    if (rawNumericValue(value) === '') return '';
    const selected = getInfrastructureUnit(key, to);

    return formatNumericValue(
        (toBaseInfrastructureValue(value, key, from) * selected.denominator) /
            selected.numerator,
    );
}

export function getEmptyInfrastructure(): InfrastructureData {
    return Object.fromEntries(
        ZONE_INFRASTRUCTURE_FIELDS.map(({ key }) => [
            key,
            {
                available: false,
                capacity: '',
                unit: getDefaultInfrastructureUnit(key),
            },
        ]),
    ) as InfrastructureData;
}

export function getEmptyProjectInfrastructure(): ProjectInfrastructureData {
    return Object.fromEntries(
        PROJECT_INFRASTRUCTURE_FIELDS.map(({ key }) => [
            key,
            {
                needed: false,
                required_capacity: '',
                used_capacity: '0',
                unit: getDefaultInfrastructureUnit(key),
            },
        ]),
    ) as ProjectInfrastructureData;
}

export function withDefaultProjectUsedCapacity(
    infrastructure: ProjectInfrastructureData,
): ProjectInfrastructureData {
    const result = { ...infrastructure };

    for (const { key } of PROJECT_INFRASTRUCTURE_FIELDS) {
        const details = infrastructure[key];

        if (details.needed && details.used_capacity.trim() === '') {
            result[key] = {
                ...details,
                used_capacity: '0',
            };
        }
    }

    return result;
}

export function getProjectInfrastructureErrors(
    infrastructure: ProjectInfrastructureData,
): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const { key } of PROJECT_INFRASTRUCTURE_FIELDS) {
        const details = infrastructure[key];
        if (!details.needed) continue;

        for (const field of ['required_capacity', 'used_capacity'] as const) {
            const value = details[field].trim();
            const label =
                field === 'required_capacity' ? 'Қажетті' : 'Пайдаланудағы';

            if (value === '') {
                errors[`infrastructure.${key}.${field}`] =
                    `${label} мәнді енгізіңіз`;
            } else if (!Number.isFinite(Number(value)) || Number(value) < 0) {
                errors[`infrastructure.${key}.${field}`] =
                    'Нөл немесе одан үлкен сан енгізіңіз';
            } else if (Number(value) > 2000000000) {
                errors[`infrastructure.${key}.${field}`] =
                    'Мән 2 000 000 000 санынан аспауы керек';
            }
        }
    }

    return errors;
}

function formatNumericValue(value: number): string {
    if (!Number.isFinite(value)) return '';

    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(15)));
}

export function normalizeStandardNumber(
    value: unknown,
    key: ProjectInfrastructureKey,
): string {
    const normalized = rawNumericValue(value);
    if (normalized === '') return '';
    const parsed = Number(normalized);

    if (
        key === 'electricity' &&
        typeof value === 'string' &&
        /мвт/iu.test(value)
    ) {
        return formatNumericValue(parsed * 1000);
    }

    if (
        key === 'internet' &&
        typeof value === 'string' &&
        /(гбит|gbps)/iu.test(value)
    ) {
        return formatNumericValue(parsed * 1000);
    }

    return formatNumericValue(parsed);
}

export function normalizeZoneInfrastructure(
    infrastructure?: InfrastructureData | null,
): InfrastructureData {
    const empty = getEmptyInfrastructure();

    for (const { key } of ZONE_INFRASTRUCTURE_FIELDS) {
        const details = infrastructure?.[key];
        if (!details) continue;

        const legacyValue =
            details.capacity ?? details.distance ?? details.type ?? '';

        empty[key] = {
            available: Boolean(details.available),
            capacity: details.unit
                ? rawNumericValue(legacyValue)
                : normalizeStandardNumber(legacyValue, key),
            unit: getInfrastructureUnit(key, details.unit).code,
        };
    }

    return empty;
}

export function normalizeProjectInfrastructure(
    infrastructure?: Record<string, unknown> | null,
): ProjectInfrastructureData {
    const empty = getEmptyProjectInfrastructure();

    for (const { key } of PROJECT_INFRASTRUCTURE_FIELDS) {
        const rawDetails = infrastructure?.[key];
        if (
            !rawDetails ||
            typeof rawDetails !== 'object' ||
            Array.isArray(rawDetails)
        ) {
            continue;
        }
        const details = rawDetails as Record<string, unknown>;

        empty[key] = {
            needed: Boolean(details.needed),
            required_capacity:
                typeof details.unit === 'string'
                    ? rawNumericValue(
                          details.required_capacity ?? details.capacity,
                      )
                    : normalizeStandardNumber(
                          details.required_capacity ?? details.capacity,
                          key,
                      ),
            used_capacity:
                (typeof details.unit === 'string'
                    ? rawNumericValue(details.used_capacity)
                    : normalizeStandardNumber(details.used_capacity, key)) ||
                '0',
            unit: getInfrastructureUnit(
                key,
                typeof details.unit === 'string' ? details.unit : null,
            ).code,
        };
    }

    return empty;
}

export function getInfrastructureField(key: ProjectInfrastructureKey) {
    return PROJECT_INFRASTRUCTURE_FIELDS.find((field) => field.key === key);
}

export function formatInfrastructureValue(
    value: unknown,
    key: ProjectInfrastructureKey,
    unit?: string | null,
): string {
    const field = getInfrastructureField(key);
    const normalized = unit
        ? rawNumericValue(value)
        : normalizeStandardNumber(value, key);

    if (!field || !normalized) return '';

    return `${new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 6,
    }).format(Number(normalized))} ${getInfrastructureUnit(key, unit).label}`;
}
