import { Head } from '@inertiajs/react';
import { Landmark } from 'lucide-react';

import ZonePortfolioIndex from '@/components/zone-portfolio-index';
import type {
    ZoneFilters,
    ZonePortfolioItem,
    ZonePortfolioSummary,
    ZoneRegion,
} from '@/components/zone-portfolio-index';
import AppLayout from '@/layouts/app-layout';
import * as sezs from '@/routes/sezs';
import type { PaginatedData } from '@/types';

interface Props {
    sezs: PaginatedData<ZonePortfolioItem>;
    summary: ZonePortfolioSummary;
    regions: ZoneRegion[];
    filters: Partial<ZoneFilters>;
}

export default function Index({
    sezs: zones,
    summary,
    regions,
    filters,
}: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'АЭА', href: sezs.index.url() }]}>
            <Head title="Арнайы экономикалық аймақтар" />
            <ZonePortfolioIndex
                zones={zones}
                summary={summary}
                regions={regions}
                filters={filters}
                routes={{
                    index: sezs.index.url(),
                    create: sezs.create.url(),
                    deleted: sezs.deleted.url(),
                    show: (id) => sezs.show.url(id),
                    edit: (id) => sezs.edit.url(id),
                    destroy: (id) => sezs.destroy.url(id),
                }}
                config={{
                    eyebrow: 'Инвестициялық инфрақұрылым',
                    title: 'Арнайы экономикалық аймақтар',
                    description:
                        'АЭА аумағы, жоба портфелі, резервтер, инфрақұрылым жүктемесі және ашық мәселелердің бірыңғай көрінісі.',
                    singular: 'АЭА',
                    createLabel: 'АЭА қосу',
                    emptyTitle: 'АЭА нысандары табылмады',
                    emptyDescription:
                        'Сүзгіні өзгертіңіз немесе жаңа арнайы экономикалық аймақты қосыңыз.',
                    icon: Landmark,
                }}
            />
        </AppLayout>
    );
}
