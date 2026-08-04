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
    distance?: string;
    type?: string;
}

export type InfrastructureData = Partial<
    Record<ZoneInfrastructureKey, InfrastructureDetails>
>;

export interface ProjectInfrastructureDetails {
    needed: boolean;
    required_capacity: string;
    used_capacity: string;
    capacity?: string;
}

export type ProjectInfrastructureData = Record<
    ProjectInfrastructureKey,
    ProjectInfrastructureDetails
>;

export function getEmptyInfrastructure(): InfrastructureData {
    return Object.fromEntries(
        ZONE_INFRASTRUCTURE_FIELDS.map(({ key }) => [
            key,
            { available: false, capacity: '' },
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
                used_capacity: '',
            },
        ]),
    ) as ProjectInfrastructureData;
}

function formatNumericValue(value: number): string {
    if (!Number.isFinite(value)) return '';

    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toFixed(6)));
}

export function normalizeStandardNumber(
    value: unknown,
    key: ProjectInfrastructureKey,
): string {
    if (typeof value === 'number') return formatNumericValue(value);
    if (typeof value !== 'string' || value.trim() === '') return '';

    const match = value.match(/[\d\s.,]+/u);
    if (!match) return '';

    const parsed = Number(match[0].replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(parsed)) return '';

    if (key === 'electricity' && /мвт/iu.test(value)) {
        return formatNumericValue(parsed * 1000);
    }

    if (key === 'internet' && /(гбит|gbps)/iu.test(value)) {
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
            capacity: normalizeStandardNumber(legacyValue, key),
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
            required_capacity: normalizeStandardNumber(
                details.required_capacity ?? details.capacity,
                key,
            ),
            used_capacity: normalizeStandardNumber(details.used_capacity, key),
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
): string {
    const field = getInfrastructureField(key);
    const normalized = normalizeStandardNumber(value, key);

    if (!field || !normalized) return '';

    return `${new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 6,
    }).format(Number(normalized))} ${field.unit}`;
}
