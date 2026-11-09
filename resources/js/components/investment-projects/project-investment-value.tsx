import { formatMoneyCompact } from '@/lib/utils';

export default function ProjectInvestmentValue({
    value,
}: {
    value?: number | string | null;
}) {
    if (
        value === null ||
        value === undefined ||
        value === '' ||
        !Number.isFinite(Number(value))
    ) {
        return <span>—</span>;
    }

    return <span>{formatMoneyCompact(Number(value))}</span>;
}
