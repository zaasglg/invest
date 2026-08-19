import { Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    ArrowLeft,
    Clock3,
    FilePlus2,
    Images,
    Info,
    LandPlot,
    Layers,
    MapPin,
    Sprout,
} from 'lucide-react';

import DetailSectionNav from '@/components/detail-section-nav';
import ProjectGallerySlider from '@/components/project-gallery-slider';
import PublicInfrastructureGrid from '@/components/public-infrastructure-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ZoneTerritoryMapCard from '@/components/zone-territory-map-card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import * as applicant from '@/routes/applicant';
import * as applications from '@/routes/applicant/applications';
import * as zones from '@/routes/applicant/zones';
import type { ApplicantZone } from '@/types';

const areaFormatter = new Intl.NumberFormat('kk-KZ', {
    maximumFractionDigits: 2,
});

const formatArea = (value: number) => `${areaFormatter.format(value)} га`;

const statusMap: Record<string, { label: string; className: string }> = {
    active: {
        label: 'Белсенді',
        className: 'bg-green-100 text-green-800',
    },
    developing: {
        label: 'Дамушы',
        className: 'bg-amber-100 text-amber-800',
    },
};

const fullTypeLabels: Record<ApplicantZone['type'], string> = {
    sez: 'Арнайы экономикалық аймақ',
    'industrial-zone': 'Индустриялық аймақ',
    'prom-zone': 'Өндірістік аймақ',
};

export default function ZoneShow({ zone }: { zone: ApplicantZone }) {
    const showUrl = zones.show.url({ zoneType: zone.type, zone: zone.id });
    const applicationUrl = applications.create.url({
        zoneType: zone.type,
        zone: zone.id,
    });
    const status = statusMap[zone.status] ?? {
        label: zone.status,
        className: 'bg-slate-100 text-slate-700',
    };
    const mapEntityType =
        zone.type === 'industrial-zone'
            ? 'iz'
            : zone.type === 'prom-zone'
              ? 'prom'
              : 'sez';
    const mainGallery = zone.main_gallery ?? [];
    const renderPhotos = zone.render_photos ?? [];
    const canApply = zone.area.available > 0;

    const overviewMetrics: {
        label: string;
        value: string;
        icon: LucideIcon;
        accent?: boolean;
    }[] = [
        {
            label: 'Аудан',
            value: zone.region?.name ?? 'Көрсетілмеген',
            icon: MapPin,
        },
        {
            label: 'Күйі',
            value: status.label,
            icon: Activity,
        },
        {
            label: 'Жалпы аумақ',
            value: formatArea(zone.area.total),
            icon: LandPlot,
        },
        {
            label: 'Бос аумақ',
            value: formatArea(zone.area.available),
            icon: Sprout,
            accent: true,
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Аймақтар', href: applicant.portal.url() },
                { title: zone.name, href: showUrl },
            ]}
        >
            <Head title={zone.name} />

            <div className="page-surface flex h-full flex-1 flex-col gap-5 sm:gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={applicant.portal.url()}
                        className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-navy"
                    >
                        <span className="flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white transition-transform group-hover:-translate-x-0.5">
                            <ArrowLeft className="size-4" />
                        </span>
                        Аймақтар тізіміне қайту
                    </Link>

                    {canApply ? (
                        <Link href={applicationUrl}>
                            <Button>
                                <FilePlus2 data-icon="inline-start" />
                                Өтінім беру
                            </Button>
                        </Link>
                    ) : (
                        <Button disabled>
                            <FilePlus2 data-icon="inline-start" />
                            Бос жер жоқ
                        </Button>
                    )}
                </div>

                <DetailSectionNav
                    ariaLabel={`${zone.name} бөлімдері`}
                    items={[
                        { label: 'Шолу', href: '#zone-overview', icon: Layers },
                        {
                            label: 'Инфрақұрылым',
                            href: '#zone-infrastructure',
                            icon: Activity,
                        },
                        { label: 'Карта', href: '#zone-map', icon: MapPin },
                        {
                            label: 'Өтінім',
                            href: '#zone-application',
                            icon: FilePlus2,
                        },
                    ]}
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="flex min-w-0 flex-col gap-6">
                        <Card
                            id="zone-overview"
                            className="scroll-mt-24 overflow-hidden border-slate-200/80 py-0 shadow-none"
                        >
                            <div className="relative overflow-hidden border-b border-white/10 bg-navy px-6 py-6 text-white">
                                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-gold/10 to-transparent" />
                                <div className="relative flex items-center justify-between gap-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gold">
                                            <Layers className="size-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="mb-1 text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
                                                {fullTypeLabels[zone.type]}
                                            </p>
                                            <h1 className="text-xl font-extrabold text-balance text-white sm:text-2xl">
                                                {zone.name}
                                            </h1>
                                        </div>
                                    </div>
                                    <Badge
                                        className={cn(
                                            'shrink-0 border-0 px-3 py-1 text-sm font-medium',
                                            status.className,
                                        )}
                                    >
                                        {status.label}
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                    <div className="overflow-hidden rounded-lg md:col-span-2">
                                        <ProjectGallerySlider
                                            photos={mainGallery}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/60 md:col-span-3">
                                        {overviewMetrics.map(
                                            (metric, index) => (
                                                <div
                                                    key={metric.label}
                                                    className={cn(
                                                        'group relative min-h-32 p-5 sm:p-6',
                                                        index % 2 === 0 &&
                                                            'border-r border-slate-200',
                                                        index < 2 &&
                                                            'border-b border-slate-200',
                                                        metric.accent &&
                                                            'bg-emerald-50/65',
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                                                            {metric.label}
                                                        </p>
                                                        <metric.icon
                                                            className={cn(
                                                                'size-4 transition-transform duration-200 group-hover:scale-110',
                                                                metric.accent
                                                                    ? 'text-emerald-600'
                                                                    : 'text-gold-dark/70',
                                                            )}
                                                        />
                                                    </div>
                                                    <p
                                                        className={cn(
                                                            'mt-5 text-lg leading-tight font-extrabold tracking-tight sm:text-xl',
                                                            metric.accent
                                                                ? 'text-emerald-700'
                                                                : 'text-navy',
                                                        )}
                                                    >
                                                        {metric.value}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>

                                <div
                                    id="zone-infrastructure"
                                    className="mt-8 scroll-mt-24"
                                >
                                    <PublicInfrastructureGrid
                                        infrastructure={zone.infrastructure}
                                    />
                                </div>
                            </CardContent>

                            <div className="border-t border-slate-200 px-6 py-5">
                                <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                    Аймақ туралы
                                </p>
                                <p className="mt-3 leading-relaxed whitespace-pre-wrap text-slate-700">
                                    {zone.description ||
                                        'Бұл аймақ бойынша сипаттама әлі енгізілмеген.'}
                                </p>
                            </div>
                        </Card>

                        <section id="zone-map" className="scroll-mt-24">
                            <ZoneTerritoryMapCard
                                entity={{
                                    id: zone.id,
                                    name: zone.name,
                                    status: zone.status,
                                    total_area: zone.area.total,
                                    location: zone.location,
                                }}
                                entityType={mapEntityType}
                            />
                        </section>
                    </div>

                    <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
                        <Card
                            id="zone-application"
                            className="scroll-mt-24 overflow-hidden border-navy/10 py-0 shadow-none"
                        >
                            <div className="bg-navy px-5 py-5 text-white">
                                <p className="text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
                                    Инвестициялық мүмкіндік
                                </p>
                                <p className="mt-2 text-3xl font-extrabold tracking-tight text-white tabular-nums">
                                    {formatArea(zone.area.available)}
                                </p>
                                <p className="mt-1 text-xs text-white/60">
                                    Қазір қолжетімді бос аумақ
                                </p>
                            </div>
                            <CardContent className="space-y-4 p-5">
                                {canApply ? (
                                    <>
                                        <p className="text-sm leading-6 text-slate-600">
                                            Қажетті гектар мен жобаңыз туралы
                                            мәліметті көрсетіп, электрондық
                                            өтінім беріңіз.
                                        </p>
                                        <Link
                                            href={applicationUrl}
                                            className="block"
                                        >
                                            <Button className="w-full">
                                                <FilePlus2 data-icon="inline-start" />
                                                Өтінім толтыру
                                            </Button>
                                        </Link>
                                    </>
                                ) : (
                                    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">
                                        <Info className="mt-0.5 size-4 shrink-0" />
                                        Бұл аймақта қазір бос жер жоқ. Бос аумақ
                                        пайда болғанда көрсеткіш автоматты
                                        жаңарады.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <AreaBreakdown zone={zone} />

                        {renderPhotos.length > 0 && (
                            <Card className="overflow-hidden py-0 shadow-none">
                                <CardHeader className="border-b border-slate-200 px-5 py-4">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Images className="size-4 text-gold-dark" />
                                        Болашақтағы көрініс
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 [&>div]:mb-0 [&>div]:rounded-none">
                                    <ProjectGallerySlider
                                        photos={renderPhotos}
                                    />
                                </CardContent>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}

function AreaBreakdown({ zone }: { zone: ApplicantZone }) {
    const values = [
        {
            label: 'Бос аумақ',
            value: zone.area.available,
            icon: Sprout,
            color: 'text-emerald-700',
            dot: 'bg-emerald-500',
        },
        {
            label: 'Резервте',
            value: zone.area.reserved,
            icon: Clock3,
            color: 'text-amber-700',
            dot: 'bg-amber-500',
        },
        {
            label: 'Бос емес',
            value: zone.area.occupied,
            icon: LandPlot,
            color: 'text-slate-700',
            dot: 'bg-navy',
        },
    ];
    const total = Math.max(0, zone.area.total);

    return (
        <Card className="shadow-none">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Аумақ құрылымы</CardTitle>
                <p className="text-xs text-slate-500">
                    Жалпы {formatArea(total)}
                </p>
            </CardHeader>
            <CardContent>
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                    {values.map((item) => (
                        <span
                            key={item.label}
                            className={item.dot}
                            style={{
                                width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                            }}
                        />
                    ))}
                </div>
                <div className="mt-5 divide-y divide-slate-100">
                    {values.map((item) => (
                        <div
                            key={item.label}
                            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <item.icon className="size-4" />
                                {item.label}
                            </div>
                            <span
                                className={cn(
                                    'text-sm font-bold tabular-nums',
                                    item.color,
                                )}
                            >
                                {formatArea(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
