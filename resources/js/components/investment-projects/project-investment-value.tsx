import { formatMoneyCompact } from '@/lib/utils';

export default function ProjectInvestmentValue({
    value,
    amountType,
}: {
    value?: number | string | null;
    amountType?: 'exact' | 'estimated' | 'unknown';
}) {
    if (
        amountType === 'unknown' ||
        value === null ||
        value === undefined ||
        value === '' ||
        !Number.isFinite(Number(value))
    ) {
        return <span>Әзірге белгісіз</span>;
    }

    return (
        <span>
            {formatMoneyCompact(Number(value))}
            {amountType === 'estimated' && (
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                    Болжамды сома
                </span>
            )}
        </span>
    );
}
