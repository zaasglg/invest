export type IspolnitelType = 'oblast' | 'district' | 'additional';

export const ISPOLNITEL_TYPE_LABELS: Record<IspolnitelType, string> = {
    oblast: 'Басқармалар',
    district: 'Аудандық әкімдіктер',
    additional: 'Қосымша инстанциялар',
};

export const ISPOLNITEL_TYPE_SHORT_LABELS: Record<IspolnitelType, string> = {
    oblast: 'Басқарма',
    district: 'Аудандық',
    additional: 'Қосымша инстанциялар',
};

export function getIspolnitelTypeLabel(
    type: string | null | undefined,
    short = false,
): string {
    if (type !== 'oblast' && type !== 'district' && type !== 'additional') {
        return '';
    }

    return short
        ? ISPOLNITEL_TYPE_SHORT_LABELS[type]
        : ISPOLNITEL_TYPE_LABELS[type];
}
