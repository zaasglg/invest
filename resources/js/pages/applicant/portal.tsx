import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    ClipboardList,
    Clock3,
    Factory,
    LandPlot,
    Landmark,
    MapPin,
    Rocket,
    Search,
    SlidersHorizontal,
    Sparkles,
    Warehouse,
} from 'lucide-react';
import type { FormEvent } from 'react';

import {
    ApplicantHero,
    ApplicantMetricCard,
} from '@/components/applicant/applicant-ui';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/ui/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import * as applicant from '@/routes/applicant';
import * as applications from '@/routes/applicant/applications';
import * as zones from '@/routes/applicant/zones';
import type { ApplicantZone, PaginatedData } from '@/types';

type Props = {
    zones: PaginatedData<ApplicantZone>;
    filters: {
        search: string;
        type: string;
        region_id: string;
        has_available_area: boolean;
    };
    regions: { id: number; name: string }[];
    applicationStats: {
        total: number;
        in_progress: number;
        approved: number;
        converted: number;
    };
};

const zonePresentation = {
    sez: {
        label: 'Арнайы экономикалық аймақ',
        icon: Landmark,
        iconClass: 'bg-violet-50 text-violet-700 ring-violet-100',
        lineClass: 'from-violet-600 via-indigo-500 to-violet-300',
    },
    'industrial-zone': {
        label: 'Индустриялық аймақ',
        icon: Factory,
        iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
        lineClass: 'from-amber-500 via-gold to-amber-300',
    },
    'prom-zone': {
        label: 'Өндірістік аймақ',
        icon: Warehouse,
        iconClass: 'bg-sky-50 text-sky-700 ring-sky-100',
        lineClass: 'from-sky-600 via-cyan-500 to-sky-300',
    },
} as const;

const areaFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 2,
});

export default function ApplicantPortal({
    zones: zonePage,
    filters,
    regions,
    applicationStats,
}: Props) {
    const { data, setData, get } = useForm({
        search: filters.search,
        type: filters.type,
        region_id: filters.region_id,
        has_available_area: filters.has_available_area ? '1' : '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        get(applicant.portal.url(), {
            preserveState: true,
            replace: true,
        });
    };
    const activeFilterCount = [
        data.search,
        data.type,
        data.region_id,
        data.has_available_area,
    ].filter(Boolean).length;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Аймақтарды таңдау', href: applicant.portal.url() },
            ]}
        >
            <Head title="Инвестициялық аймақтар" />
            <PageContainer width="standard">
                <ApplicantHero
                    eyebrow="Өтінім беруші порталы"
                    title="Инвестициялық аймақты таңдаңыз"
                    subtitle="АЭА, индустриялық және өндірістік аймақтардың бос гектары мен қолжетімді инфрақұрылымын көріңіз. Жобалар туралы мәліметтер көрсетілмейді."
                    icon={Landmark}
                    className="pb-16"
                    action={
                        <Link href={applications.index.url()}>
                            <Button
                                variant="outline"
                                className="border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                            >
                                <ClipboardList data-icon="inline-start" />
                                Менің өтінімдерім
                            </Button>
                        </Link>
                    }
                />

                <div className="relative z-10 mx-3 -mt-12 grid gap-3 sm:mx-6 sm:grid-cols-2 lg:grid-cols-4">
                    <ApplicantMetricCard
                        label="Барлық өтінім"
                        value={applicationStats.total}
                        description="Барлық уақыттағы өтінімдер"
                        icon={ClipboardList}
                        tone="navy"
                    />
                    <ApplicantMetricCard
                        label="Қаралуда"
                        value={applicationStats.in_progress}
                        description="Сарапшы шешімін күтуде"
                        icon={Clock3}
                        tone="sky"
                    />
                    <ApplicantMetricCard
                        label="Резервте"
                        value={applicationStats.approved}
                        description="Жер уақытша бекітілген"
                        icon={BadgeCheck}
                        tone="amber"
                    />
                    <ApplicantMetricCard
                        label="Жобаға айналды"
                        value={applicationStats.converted}
                        description="CRM жүйесінде жоба құрылды"
                        icon={Rocket}
                        tone="emerald"
                    />
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_55px_-42px_rgba(15,27,61,0.75)]">
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-sand-light via-white to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-navy text-white shadow-sm">
                                <SlidersHorizontal className="size-[18px]" />
                            </span>
                            <div>
                                <h2 className="font-bold text-navy">
                                    Аймақтар каталогы
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Өзіңізге қолайлы аумақты сүзгі арқылы
                                    табыңыз
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeFilterCount > 0 && (
                                <Badge className="border-0 bg-navy text-white">
                                    {activeFilterCount} сүзгі
                                </Badge>
                            )}
                            <Badge
                                variant="outline"
                                className="bg-white text-slate-600"
                            >
                                {zonePage.total} аймақ
                            </Badge>
                        </div>
                    </div>
                    <form
                        onSubmit={submit}
                        className="grid gap-4 p-5 sm:p-6 md:grid-cols-4"
                    >
                        <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="search">Іздеу</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="search"
                                    value={data.search}
                                    onChange={(event) =>
                                        setData('search', event.target.value)
                                    }
                                    placeholder="Аймақ немесе аудан атауы"
                                    className="h-11 bg-slate-50/60 pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Аймақ түрі</Label>
                            <Select
                                value={data.type || 'all'}
                                onValueChange={(value) =>
                                    setData(
                                        'type',
                                        value === 'all' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger className="h-11 bg-slate-50/60">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Барлығы</SelectItem>
                                    <SelectItem value="sez">АЭА</SelectItem>
                                    <SelectItem value="industrial-zone">
                                        ИА
                                    </SelectItem>
                                    <SelectItem value="prom-zone">
                                        Пром зона
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Аудан</Label>
                            <Select
                                value={data.region_id || 'all'}
                                onValueChange={(value) =>
                                    setData(
                                        'region_id',
                                        value === 'all' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger className="h-11 bg-slate-50/60">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Барлығы</SelectItem>
                                    {regions.map((region) => (
                                        <SelectItem
                                            key={region.id}
                                            value={String(region.id)}
                                        >
                                            {region.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 md:col-span-4 md:justify-end">
                            <Button
                                type="button"
                                variant={
                                    data.has_available_area
                                        ? 'default'
                                        : 'outline'
                                }
                                className={cn(
                                    data.has_available_area &&
                                        'bg-emerald-600 hover:bg-emerald-700',
                                )}
                                onClick={() =>
                                    setData(
                                        'has_available_area',
                                        data.has_available_area ? '' : '1',
                                    )
                                }
                            >
                                <Sparkles /> Тек бос жері бар
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                    router.get(applicant.portal.url())
                                }
                            >
                                Тазалау
                            </Button>
                            <Button type="submit">Қолдану</Button>
                        </div>
                    </form>
                </section>

                {zonePage.data.length === 0 ? (
                    <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                            <LandPlot className="size-8 text-slate-300" />
                        </div>
                        <p className="mt-3 font-semibold text-navy">
                            Аймақ табылмады
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Сүзгілерді өзгертіп көріңіз.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {zonePage.data.map((zone) => (
                            <ZoneCard
                                key={`${zone.type}-${zone.id}`}
                                zone={zone}
                            />
                        ))}
                    </div>
                )}

                <Pagination paginator={zonePage} />
            </PageContainer>
        </AppLayout>
    );
}

function ZoneCard({ zone }: { zone: ApplicantZone }) {
    const presentation = zonePresentation[zone.type];
    const Icon = presentation.icon;
    const availablePercent =
        zone.area.total > 0
            ? Math.min(100, (zone.area.available / zone.area.total) * 100)
            : 0;

    return (
        <article className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_55px_-42px_rgba(15,27,61,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_65px_-38px_rgba(15,27,61,0.55)]">
            <div
                className={cn(
                    'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
                    presentation.lineClass,
                )}
            />
            <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3.5">
                        <span
                            className={cn(
                                'flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3',
                                presentation.iconClass,
                            )}
                        >
                            <Icon className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold tracking-[0.12em] text-gold-dark uppercase">
                                {presentation.label}
                            </p>
                            <h2 className="mt-1 text-xl leading-tight font-extrabold text-navy">
                                {zone.name}
                            </h2>
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                                <MapPin className="size-3.5 text-slate-400" />
                                {zone.region?.name ?? 'Аймақ көрсетілмеген'}
                            </p>
                        </div>
                    </div>
                    <Badge
                        className={cn(
                            'shrink-0 border shadow-none',
                            zone.status === 'active'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700',
                        )}
                    >
                        <span
                            className={cn(
                                'mr-1.5 size-1.5 rounded-full',
                                zone.status === 'active'
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500',
                            )}
                        />
                        {zone.status === 'active' ? 'Белсенді' : 'Дамушы'}
                    </Badge>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-700 uppercase">
                                Қолжетімді бос аумақ
                            </p>
                            <p className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-800 tabular-nums">
                                {areaFormatter.format(zone.area.available)}
                                <span className="ml-1 text-base font-bold text-emerald-600">
                                    га
                                </span>
                            </p>
                        </div>
                        <SproutMark />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500"
                            style={{ width: `${availablePercent}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-emerald-700/70">
                        Жалпы аумақтың {Math.round(availablePercent)}%-ы бос
                    </p>
                </div>

                <dl className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70 py-3 text-center">
                    <AreaFact label="Жалпы" value={zone.area.total} />
                    <AreaFact label="Резервте" value={zone.area.reserved} />
                    <AreaFact label="Бос емес" value={zone.area.occupied} />
                </dl>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
                <p className="text-xs text-slate-500">
                    Инфрақұрылым мен карта қолжетімді
                </p>
                <Link
                    href={zones.show.url({
                        zoneType: zone.type,
                        zone: zone.id,
                    })}
                >
                    <Button
                        size="sm"
                        className="shadow-[0_10px_24px_-14px_rgba(15,27,61,0.8)]"
                    >
                        Толығырақ
                        <ArrowRight data-icon="inline-end" />
                    </Button>
                </Link>
            </div>
        </article>
    );
}

function AreaFact({ label, value }: { label: string; value: number }) {
    return (
        <div className="px-2">
            <dt className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                {label}
            </dt>
            <dd className="mt-1 text-sm font-extrabold text-navy tabular-nums">
                {areaFormatter.format(value)} га
            </dd>
        </div>
    );
}

function SproutMark() {
    return (
        <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <Sparkles className="size-5" />
        </span>
    );
}
