import {
    getInfrastructureUnit,
    normalizeStandardNumber,
} from '@/lib/infrastructure';
import type { ZoneInfrastructureKey } from '@/lib/infrastructure';
import type { InfrastructureRequirement } from '@/types';

export function normalizeApplicationRequirement(
    value: InfrastructureRequirement | undefined,
    resource: ZoneInfrastructureKey,
): { value: string; unit: string } {
    const details = value !== null && typeof value === 'object' ? value : null;

    return {
        value: normalizeStandardNumber(
            details ? details.value : value,
            resource,
        ),
        unit: getInfrastructureUnit(resource, details?.unit).code,
    };
}
