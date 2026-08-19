import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, ClipboardList, LandPlot, Search } from 'lucide-react';
import type { FormEvent } from 'react';

import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer, PageHeader, StatCard } from '@/components/ui/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ZoneAreaSummary from '@/components/zone-area-summary';
import AppLayout from '@/layouts/app-layout';
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

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Аймақтарды таңдау', href: applicant.portal.url() },
            ]}
        >
            <Head title="Инвестициялық аймақтар" />
            <PageContainer width="standard">
                <PageHeader
                    eyebrow="Өтінім беруші порталы"
                    title="Инвестициялық аймақты таңдаңыз"
                    subtitle="АЭА, индустриялық және өндірістік аймақтардың бос гектары мен қолжетімді инфрақұрылымын көріңіз. Жобалар туралы мәліметтер көрсетілмейді."
                    action={
                        <Link href={applications.index.url()}>
                            <Button variant="outline">
                                <ClipboardList data-icon="inline-start" />
                                Менің өтінімдерім
                            </Button>
                        </Link>
                    }
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Барлық өтінім"
                        value={applicationStats.total}
                    />
                    <StatCard
                        label="Қаралуда"
                        value={applicationStats.in_progress}
                    />
                    <StatCard
                        label="Резервте"
                        value={applicationStats.approved}
                    />
                    <StatCard
                        label="Жобаға айналды"
                        value={applicationStats.converted}
                    />
                </div>

                <form
                    onSubmit={submit}
                    className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4"
                >
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="search">Іздеу</Label>
                        <div className="relative">
                            <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
                            <Input
                                id="search"
                                value={data.search}
                                onChange={(event) =>
                                    setData('search', event.target.value)
                                }
                                placeholder="Аймақ немесе аудан атауы"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Аймақ түрі</Label>
                        <Select
                            value={data.type || 'all'}
                            onValueChange={(value) =>
                                setData('type', value === 'all' ? '' : value)
                            }
                        >
                            <SelectTrigger>
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
                            <SelectTrigger>
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
                    <div className="flex flex-wrap gap-2 md:col-span-4 md:justify-end">
                        <Button
                            type="button"
                            variant={
                                data.has_available_area ? 'default' : 'outline'
                            }
                            onClick={() =>
                                setData(
                                    'has_available_area',
                                    data.has_available_area ? '' : '1',
                                )
                            }
                        >
                            Тек бос жері бар
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => router.get(applicant.portal.url())}
                        >
                            Тазалау
                        </Button>
                        <Button type="submit">Қолдану</Button>
                    </div>
                </form>

                {zonePage.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
                        <LandPlot className="mx-auto size-10 text-slate-300" />
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
                            <article
                                key={`${zone.type}-${zone.id}`}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Badge variant="outline">
                                            {zone.type_label}
                                        </Badge>
                                        <h2 className="mt-3 text-xl font-bold text-navy">
                                            {zone.name}
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {zone.region?.name ??
                                                'Аймақ көрсетілмеген'}
                                        </p>
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-700">
                                        {zone.status === 'active'
                                            ? 'Белсенді'
                                            : 'Дамушы'}
                                    </Badge>
                                </div>
                                <div className="mt-5">
                                    <ZoneAreaSummary area={zone.area} />
                                </div>
                                <div className="mt-5 flex justify-end">
                                    <Link
                                        href={zones.show.url({
                                            zoneType: zone.type,
                                            zone: zone.id,
                                        })}
                                    >
                                        <Button>
                                            Толығырақ
                                            <ArrowRight data-icon="inline-end" />
                                        </Button>
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <Pagination paginator={zonePage} />
            </PageContainer>
        </AppLayout>
    );
}
