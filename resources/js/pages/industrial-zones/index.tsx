import { Head } from '@inertiajs/react';
import { Factory } from 'lucide-react';

import ZonePortfolioIndex from '@/components/zone-portfolio-index';
import type {
    ZoneFilters,
    ZonePortfolioItem,
    ZonePortfolioSummary,
    ZoneRegion,
} from '@/components/zone-portfolio-index';
import AppLayout from '@/layouts/app-layout';
import * as industrialZones from '@/routes/industrial-zones';
import type { PaginatedData } from '@/types';

interface Props {
    industrialZones: PaginatedData<ZonePortfolioItem>;
    summary: ZonePortfolioSummary;
    regions: ZoneRegion[];
    filters: Partial<ZoneFilters>;
}

export default function Index({
    industrialZones: zones,
    summary,
    regions,
    filters,
}: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Индустриялық аймақтар',
                    href: industrialZones.index.url(),
                },
            ]}
        >
            <Head title="Индустриялық аймақтар" />
            <ZonePortfolioIndex
                zones={zones}
                summary={summary}
                regions={regions}
                filters={filters}
                routes={{
                    index: industrialZones.index.url(),
                    create: industrialZones.create.url(),
                    deleted: industrialZones.deleted.url(),
                    show: (id) => industrialZones.show.url(id),
                    edit: (id) => industrialZones.edit.url(id),
                    destroy: (id) => industrialZones.destroy.url(id),
                }}
                config={{
                    eyebrow: 'Өндірістік инфрақұрылым',
                    title: 'Индустриялық аймақтар',
                    description:
                        'Өндірістік алаңдардың жүктемесі, бос аумағы, инвестициялық жобалары және инженерлік тәуекелдері.',
                    singular: 'индустриялық аймақ',
                    createLabel: 'ИА қосу',
                    emptyTitle: 'Индустриялық аймақ табылмады',
                    emptyDescription:
                        'Сүзгіні өзгертіңіз немесе жаңа индустриялық аймақ паспортын ашыңыз.',
                    icon: Factory,
                    supportsPlanned: true,
                }}
            />
        </AppLayout>
    );
}
