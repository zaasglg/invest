export const ATTRACTION_ACTIVITY_STATUSES = [
    { value: 'planned', label: 'Жоспарланған' },
    { value: 'in_progress', label: 'Орындалуда' },
    { value: 'pending_review', label: 'Растауды күтуде' },
    { value: 'completed', label: 'Орындалған' },
    { value: 'cancelled', label: 'Бас тартылған' },
] as const;

export type AttractionActivityStatus =
    (typeof ATTRACTION_ACTIVITY_STATUSES)[number]['value'];

export const ACTIVITY_STATUS_STYLES: Record<AttractionActivityStatus, string> =
    {
        planned: 'border-slate-200 bg-slate-100 text-slate-600',
        in_progress: 'border-blue-200 bg-blue-50 text-blue-700',
        pending_review: 'border-amber-200 bg-amber-50 text-amber-800',
        completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        cancelled: 'border-red-200 bg-red-50 text-red-700',
    };

export function attractionActivityStatusLabel(
    status: AttractionActivityStatus = 'planned',
): string {
    return (
        ATTRACTION_ACTIVITY_STATUSES.find((item) => item.value === status)
            ?.label ?? 'Жоспарланған'
    );
}

export function isAttractionActivityOverdue(
    status: AttractionActivityStatus,
    dueDate: string,
    now = new Date(),
): boolean {
    if (status === 'completed' || status === 'cancelled') return false;

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Qyzylorda',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const part = (type: string) =>
        parts.find((value) => value.type === type)?.value;
    const today = `${part('year')}-${part('month')}-${part('day')}`;

    return dueDate.slice(0, 10) < today;
}
