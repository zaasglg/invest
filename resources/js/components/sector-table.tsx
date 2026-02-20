import { CheckCircle2 } from 'lucide-react';

interface SectorRow {
    investment: number;
    projectCount: number | null;
    problemCount: number;
    orgCount: number | null;
}

interface SectorData {
    sez: SectorRow;
    iz: SectorRow;
    nedro: SectorRow;
    invest: SectorRow;
}

interface SectorSummary {
    total: SectorData;
    byRegion: Record<number, SectorData>;
}

interface Props {
    sectorSummary: SectorSummary;
    activeRegionId?: number | null;
}

const formatInvestment = (value: number) => {
    if (!value) return '0';
    if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(1)} млрд тг`;
    }
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)} млн тг`;
    }
    return `${value.toLocaleString('ru-RU')} тг`;
};

export default function SectorTable({
    sectorSummary,
    activeRegionId,
}: Props) {
    const data =
        activeRegionId && sectorSummary.byRegion[activeRegionId]
            ? sectorSummary.byRegion[activeRegionId]
            : sectorSummary.total;

    const rows: { key: string; label: string; d: SectorRow }[] = [
        { key: 'invest', label: 'Turkistan Invest', d: data.invest },
        { key: 'sez', label: 'СЭЗ', d: data.sez },
        { key: 'iz', label: 'ИЗ', d: data.iz },
        { key: 'nedro', label: 'Недропользование', d: data.nedro },
    ];

    const maxInvestment = Math.max(...rows.map((r) => r.d.investment));

    return (
        <div className="mx-4 mb-4 mt-4 overflow-hidden rounded-xl border border-gray-200 shadow-lg">
            <div className="max-h-[300px] overflow-y-auto bg-white">
                <table className="w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100 shadow-sm">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-3 font-bold text-gray-700">
                                Сектор
                            </th>
                            <th className="whitespace-nowrap px-4 py-3 text-center font-bold text-gray-700">
                                Инвестиции
                            </th>
                            <th className="whitespace-nowrap px-4 py-3 text-center font-bold text-gray-700">
                                Кол-во проектов
                            </th>
                            <th className="whitespace-nowrap px-4 py-3 text-center font-bold text-gray-700">
                                Проблемные вопросы
                            </th>
                            <th className="whitespace-nowrap px-4 py-3 text-center font-bold text-gray-700">
                                Организации
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.map((row, idx) => {
                            const isHighlighted =
                                row.d.investment === maxInvestment &&
                                maxInvestment > 0;

                            return (
                                <tr
                                    key={row.key}
                                    className={`
                                        cursor-pointer text-sm transition-colors
                                        ${
                                            isHighlighted
                                                ? 'bg-[#0056D2] text-white hover:bg-[#004bb5]'
                                                : idx % 2 === 0
                                                  ? 'bg-white text-gray-700 hover:bg-gray-50'
                                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }
                                    `}
                                >
                                    <td className="flex items-center gap-3 px-4 py-3 font-medium">
                                        {isHighlighted ? (
                                            <CheckCircle2 className="h-5 w-5 shrink-0 fill-yellow-400 text-yellow-500" />
                                        ) : (
                                            <span className="inline-block h-5 w-5" />
                                        )}
                                        <span>{row.label}</span>
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-center text-base font-bold ${isHighlighted ? 'text-white' : 'text-[#0056D2]'}`}
                                    >
                                        {formatInvestment(row.d.investment)}
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-center text-base font-bold ${isHighlighted ? 'text-white' : 'text-[#0056D2]'}`}
                                    >
                                        {row.d.projectCount ?? '-'}
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-center text-base font-bold ${isHighlighted ? 'text-white' : 'text-[#0056D2]'}`}
                                    >
                                        {row.d.problemCount}
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-center text-base font-bold ${isHighlighted ? 'text-white' : 'text-[#0056D2]'}`}
                                    >
                                        {row.d.orgCount ?? '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
