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

interface Props {
    regions: Region[];
    regionStats: {
        investments: Record<number, number>;
        izProjects: Record<number, number>;
        sezProjects: Record<number, number>;
        subsoilUsers: Record<number, number>;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Статистика',
        href: dashboard().url,
    },
];

export default function Dashboard({ regions, regionStats }: Props) {

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Статистика" />
            <Map
                className="h-[100vh] w-full"
                center={[43.65, 68.5]}
                zoom={7}
                regions={regions}
                regionStats={regionStats}
            />
        </AppLayout>
    );
}
