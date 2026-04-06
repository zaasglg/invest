import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Map from '@/components/map';
import { RegionSidebar } from '@/components/region-sidebar';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

interface Region {
    id: number;
    name: string;
    color?: string | null;
    icon?: string | null;
    subtype?: string | null;
    geometry: { lat: number; lng: number }[] | null;
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

export default function Dashboard({
    regions,
    regionStats,
    sectorSummary,
}: Props) {
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleRegionSelect = (region: Region) => {
        setSelectedRegion(region);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Статистика" />
            <div className="relative">
                <Map
                    className="h-[calc(100vh-64px)] w-full"
                    center={[42, 68.5]}
                    zoom={7}
                    regions={regions}
                    regionStats={regionStats}
                    sectorSummary={sectorSummary}
                    showRegionIconsDemo
                    showOutsideRegionClouds
                    interactive
                    selectedRegion={selectedRegion}
                />
                <RegionSidebar
                    regions={regions}
                    activeRegionId={selectedRegion?.id ?? null}
                    onRegionSelect={handleRegionSelect}
                    open={sidebarOpen}
                    onOpenChange={setSidebarOpen}
                />
            </div>
        </AppLayout>
    );
}
