import { Head } from '@inertiajs/react';
import { Warehouse } from 'lucide-react';

import ZonePortfolioIndex from '@/components/zone-portfolio-index';
import type {
    ZoneFilters,
    ZonePortfolioItem,
    ZonePortfolioSummary,
    ZoneRegion,
} from '@/components/zone-portfolio-index';
import AppLayout from '@/layouts/app-layout';
import * as promZones from '@/routes/prom-zones';
import type { PaginatedData } from '@/types';

interface Props {
    promZones: PaginatedData<ZonePortfolioItem>;
    summary: ZonePortfolioSummary;
    regions: ZoneRegion[];
    filters: Partial<ZoneFilters>;
}

export default function Index({
    promZones: zones,
    summary,
    regions,
    filters,
}: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Пром аймақтар', href: promZones.index.url() },
            ]}
        >
            <Head title="Пром аймақтар" />
            <ZonePortfolioIndex
                zones={zones}
                summary={summary}
                regions={regions}
                filters={filters}
                routes={{
                    index: promZones.index.url(),
                    create: promZones.create.url(),
                    deleted: promZones.deleted.url(),
                    show: (id) => promZones.show.url(id),
                    edit: (id) => promZones.edit.url(id),
                    destroy: (id) => promZones.destroy.url(id),
                }}
                config={{
                    eyebrow: 'Өнеркәсіптік алаңдар',
                    title: 'Пром аймақтар',
                    description:
                        'Пром аймақтарды іске қосу дайындығы, аумақ резерві, жоба портфелі және инфрақұрылым жағдайы.',
                    singular: 'пром аймақ',
                    createLabel: 'Пром аймақ қосу',
                    emptyTitle: 'Пром аймақтар әлі қосылмаған',
                    emptyDescription:
                        'Алғашқы пром аймақ паспортын ашып, аумақ, орналасу және инженерлік қуаттарды толтырыңыз.',
                    icon: Warehouse,
                    supportsPlanned: true,
                }}
            />
        </AppLayout>
    );
}
