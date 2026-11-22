import { Head, Link, usePage } from '@inertiajs/react';
import { Globe2, MapPinned } from 'lucide-react';
import AttractionWorldMap, {
    type AttractionCountry,
} from '@/components/dashboard/attraction-world-map';
import InMapApp from '@/components/inmap/App';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
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
    dashboardMode: 'support' | 'attraction';
    canSwitchDashboardMode: boolean;
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
    dashboardMode,
    canSwitchDashboardMode,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const isInvestor = auth.user.role_model?.name === 'investor';
    const isAttractionMode = dashboardMode === 'attraction';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Басқару тақтасы" />
            <div className="relative flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden">
                {canSwitchDashboardMode && (
                    <nav
                        aria-label="Басқару тақтасының режимі"
                        className="flex shrink-0 flex-wrap items-center gap-2 border-b border-cyan-400/15 bg-[#071522] px-4 py-2"
                    >
                        <span className="mr-2 hidden text-xs font-medium text-slate-400 sm:block">
                            Карта режимі
                        </span>
                        {[
                            {
                                mode: 'support',
                                label: 'Сүйемелдеу',
                                icon: MapPinned,
                            },
                            {
                                mode: 'attraction',
                                label: 'Инвестор тарту',
                                icon: Globe2,
                            },
                        ].map(({ mode, label, icon: Icon }) => (
                            <Link
                                key={mode}
                                href={dashboard.url({
                                    query: { dashboard_mode: mode },
                                })}
                                preserveScroll={false}
                                preserveState={false}
                                aria-current={
                                    dashboardMode === mode ? 'page' : undefined
                                }
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none sm:text-sm',
                                    dashboardMode === mode
                                        ? 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white',
                                )}
                            >
                                <Icon className="size-4 shrink-0" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                )}
                <div className="relative min-h-0 flex-1">
                    {isAttractionMode ? (
                        <AttractionWorldMap countries={attractionCountries} />
                    ) : (
                        <InMapApp
                            regions={regions}
                            sectorSummary={sectorSummary}
                            regionYearly={regionYearly}
                            canOpenIssues
                            showSubsoil={!isInvestor}
                            projectIssueStatus={
                                canSwitchDashboardMode ? 'non_plan' : undefined
                            }
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
