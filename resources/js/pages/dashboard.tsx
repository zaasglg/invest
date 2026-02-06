import { Head } from '@inertiajs/react';
import Map from '@/components/map';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

interface Region {
    id: number;
    name: string;
    geometry: { lat: number, lng: number }[] | null;
}

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
    regions: Region[];
    regionStats: {
        investments: Record<number, number>;
        izProjects: Record<number, number>;
        sezProjects: Record<number, number>;
        subsoilUsers: Record<number, number>;
    };
    sectorSummary: SectorSummary;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Статистика',
        href: dashboard().url,
    },
];

export default function Dashboard({ regions, regionStats, sectorSummary }: Props) {

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Статистика" />
            <Map
                className="h-[calc(100vh-64px)] w-full"
                center={[43.65, 68.5]}
                zoom={7}
                regions={regions}
                regionStats={regionStats}
                sectorSummary={sectorSummary}
            />
        </AppLayout>
    );
}
