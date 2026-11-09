export const ATTRACTION_STAGES = [
    { value: 'potential', label: 'Әлеуетті инвестициялық жоба' },
    { value: 'negotiation', label: 'Инвестормен келіссөздер' },
    { value: 'conditions', label: 'Іске асыру шарттарын пысықтау' },
    {
        value: 'land_infrastructure',
        label: 'Жер учаскесі мен инфрақұрылымды іріктеу',
    },
    { value: 'agreements', label: 'Уағдаластықтарға қол жеткізу' },
    { value: 'handover', label: 'Сүйемелдеуге беру' },
    {
        value: 'declined',
        label: 'Инвестордың бас тартуы',
    },
    { value: 'paused', label: 'Уақытша тоқтату' },
] as const;

export type AttractionStage = (typeof ATTRACTION_STAGES)[number]['value'];

export function attractionStageDetailErrors(
    stage: string,
    value: {
        attraction_handover_to_id: string;
        attraction_decline_reason: string;
        attraction_resume_on: string;
    },
): Record<string, string> {
    if (stage === 'handover' && !value.attraction_handover_to_id) {
        return {
            attraction_handover_to_id: 'Қабылдайтын жауапты адамды таңдаңыз',
        };
    }
    if (stage === 'declined' && !value.attraction_decline_reason.trim()) {
        return {
            attraction_decline_reason:
                'Инвестордың бас тарту себебін енгізіңіз',
        };
    }
    if (stage === 'paused' && !value.attraction_resume_on) {
        return { attraction_resume_on: 'Қайта байланысу күнін енгізіңіз' };
    }
    return {};
}

export function attractionStageLabel(stage: string | null | undefined): string {
    return (
        ATTRACTION_STAGES.find((option) => option.value === stage)?.label ??
        'Кезең таңдалмаған'
    );
}
