import { Head, usePage } from '@inertiajs/react';
import AttractionWorldMap, {
    type AttractionCountry,
} from '@/components/dashboard/attraction-world-map';
import InMapApp from '@/components/inmap/App';
import AppLayout from '@/layouts/app-layout';
import { isTurkistanInvestAttractionSubRole } from '@/lib/invest-sub-role';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, SharedData } from '@/types';

interface Region {
    id: number;
    name: string;
    color?: string | null;
    icon?: string | null;
    subtype?: 'district' | 'city' | null;
    sort_order?: number | null;
    geometry:
        | { lat: number; lng: number }[]
        | { lat: number; lng: number }[][]
        | null;
}

interface SectorRow {
    investment: number;
    projectCount: number | null;
    problemCount: number;
    jobCount: number | null;
}

interface SectorData {
    sez: SectorRow;
    iz: SectorRow;
    prom: SectorRow;
    nedro: SectorRow;
    invest: SectorRow;
    all_projects?: SectorRow;
}

interface SectorSummary {
    total: SectorData;
    byRegion: Record<number, SectorData>;
}

interface RegionYearlySeries {
    investment: number[];
    projects: number[];
    jobs: number[];
}

interface RegionYearly {
    years: number[];
    total: RegionYearlySeries;
    byRegion: Record<number, RegionYearlySeries>;
}

interface Props {
    regions: Region[];
    sectorSummary: SectorSummary;
    regionYearly: RegionYearly;
    attractionCountries?: AttractionCountry[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Басқару тақтасы',
        href: dashboard().url,
    },
];

export default function Dashboard({
    regions,
    sectorSummary,
    regionYearly,
    attractionCountries = [],
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const isInvestor = auth.user.role_model?.name === 'investor';
    const isAttractionAccount = isTurkistanInvestAttractionSubRole(
        auth.user.invest_sub_role,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Басқару тақтасы" />
            <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden">
                {isAttractionAccount ? (
                    <AttractionWorldMap countries={attractionCountries} />
                ) : (
                    <InMapApp
                        regions={regions}
                        sectorSummary={sectorSummary}
                        regionYearly={regionYearly}
                        canOpenIssues
                        showSubsoil={!isInvestor}
                    />
                )}
            </div>
        </AppLayout>
    );
}
