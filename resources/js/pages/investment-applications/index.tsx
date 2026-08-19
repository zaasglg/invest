import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    Eye,
    FileSearch,
    Filter,
    LandPlot,
    MessageSquareWarning,
    Search,
    ShieldCheck,
} from 'lucide-react';
import type { FormEvent } from 'react';

import {
    ApplicantHero,
    ApplicantMetricCard,
    ApplicantSectionCard,
} from '@/components/applicant/applicant-ui';
import ApplicationStatusBadge from '@/components/application-status-badge';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, PageContainer } from '@/components/ui/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import * as routes from '@/routes/investment-applications';
import type { InvestmentApplication, PaginatedData } from '@/types';

type Props = {
    applications: PaginatedData<InvestmentApplication>;
    statuses: Record<string, string>;
    filters: { search: string; status: string; type: string };
    stats: {
        submitted: number;
        under_review: number;
        approved: number;
        needs_clarification: number;
    };
};

export default function ReviewIndex({
    applications,
    statuses,
    filters,
    stats,
}: Props) {
    const { data, setData, get } = useForm(filters);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        get(routes.index.url(), { preserveState: true, replace: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Инвестор өтінімдері',
                    href: routes.index.url(),
                },
            ]}
        >
            <Head title="Инвестор өтінімдері" />

            <PageContainer width="wide">
                <ApplicantHero
                    eyebrow="Сарапшы кабинеті"
                    title="Инвестор өтінімдерін басқару"
                    subtitle="Жаңа өтінімдерді тексеріңіз, толықтыруға қайтарыңыз, жер көлемін резервтеңіз және мақұлданған бастаманы инвестициялық жобаға айналдырыңыз."
                    icon={ShieldCheck}
                    badge={
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                            {applications.total} өтінім
                        </span>
                    }
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ApplicantMetricCard
                        label="Жаңа"
                        value={stats.submitted}
                        description="Сарапшы қарауын күтіп тұр"
                        icon={FileSearch}
                        tone="navy"
                    />
                    <ApplicantMetricCard
                        label="Қаралуда"
                        value={stats.under_review}
                        description="Қазір сараптама жүргізілуде"
                        icon={Clock3}
                        tone="sky"
                    />
                    <ApplicantMetricCard
                        label="Толықтыруда"
                        value={stats.needs_clarification}
                        description="Өтінім берушінің жауабы күтілуде"
                        icon={MessageSquareWarning}
                        tone="amber"
                    />
                    <ApplicantMetricCard
                        label="Резервте"
                        value={stats.approved}
                        description="Жер уақытша бекітілген"
                        icon={CheckCircle2}
                        tone="emerald"
                    />
                </div>

                <ApplicantSectionCard
                    title="Өтінімдерді сүзу"
                    description="Нөмірі, жоба немесе компания атауы бойынша қажетті өтінімді табыңыз"
                    icon={Filter}
                    tone="navy"
                    action={
                        <span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-bold text-navy ring-1 ring-navy/10">
                            {applications.total} нәтиже
                        </span>
                    }
                >
                    <form
                        onSubmit={submit}
                        className="grid gap-4 lg:grid-cols-[minmax(20rem,2fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] lg:items-end"
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="review-search">Іздеу</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="review-search"
                                    className="h-11 bg-slate-50/70 pl-10"
                                    value={data.search}
                                    onChange={(event) =>
                                        setData('search', event.target.value)
                                    }
                                    placeholder="Нөмірі, жоба, компания немесе өтінім беруші"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Күйі</Label>
                            <Select
                                value={data.status || 'all'}
                                onValueChange={(value) =>
                                    setData(
                                        'status',
                                        value === 'all' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger className="h-11 bg-slate-50/70">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Барлығы</SelectItem>
                                    {Object.entries(statuses).map(
                                        ([value, label]) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                            >
                                                {label}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
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
                                <SelectTrigger className="h-11 bg-slate-50/70">
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

                        <div className="flex gap-2 lg:justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.get(routes.index.url())}
                            >
                                Тазалау
                            </Button>
                            <Button
                                type="submit"
                                className="bg-navy text-white shadow-[0_12px_26px_-14px_rgba(15,27,61,0.9)] hover:bg-navy-light"
                            >
                                Қолдану
                            </Button>
                        </div>
                    </form>
                </ApplicantSectionCard>

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_55px_-44px_rgba(15,27,61,0.75)]">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sand-light/70 via-white to-white px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-gold text-white shadow-sm">
                                <ClipboardCheck className="size-[18px]" />
                            </span>
                            <div>
                                <h2 className="font-bold text-navy">
                                    Өтінімдер тізімі
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Соңғы өтінімдер және олардың ағымдағы күйі
                                </p>
                            </div>
                        </div>
                    </div>

                    {applications.data.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardCheck className="size-7" />}
                            title="Өтінімдер табылмады"
                            description="Сүзгі параметрлерін өзгертіп көріңіз."
                        />
                    ) : (
                        <>
                            <div className="hidden lg:block">
                                <Table>
                                    <TableHeader className="bg-slate-50/90">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6">
                                                Нөмірі
                                            </TableHead>
                                            <TableHead>
                                                Жоба / компания
                                            </TableHead>
                                            <TableHead>Өтінім беруші</TableHead>
                                            <TableHead>Аймақ</TableHead>
                                            <TableHead>Гектар</TableHead>
                                            <TableHead>Күйі</TableHead>
                                            <TableHead className="pr-6 text-right">
                                                Әрекет
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {applications.data.map(
                                            (application) => (
                                                <TableRow
                                                    key={application.id}
                                                    className="group hover:bg-sand-light/35"
                                                >
                                                    <TableCell className="pl-6">
                                                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                                            {
                                                                application.application_number
                                                            }
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy transition-colors group-hover:bg-navy group-hover:text-white">
                                                                <LandPlot className="size-[18px]" />
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="max-w-72 truncate font-bold text-navy">
                                                                    {
                                                                        application.project_name
                                                                    }
                                                                </p>
                                                                <p className="max-w-72 truncate text-xs text-slate-500">
                                                                    {
                                                                        application.company_name
                                                                    }
                                                                </p>
                                                                <p className="mt-1 text-[11px] font-semibold text-sky-700">
                                                                    {
                                                                        application.application_kind_label
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium text-navy">
                                                            {
                                                                application
                                                                    .applicant
                                                                    ?.full_name
                                                            }
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {
                                                                application
                                                                    .applicant
                                                                    ?.phone
                                                            }
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium text-navy">
                                                            {
                                                                application.zone_type_label
                                                            }
                                                        </p>
                                                        <p className="max-w-52 truncate text-xs text-slate-500">
                                                            {
                                                                application
                                                                    .zoneable
                                                                    ?.name
                                                            }
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-navy tabular-nums">
                                                        {
                                                            application.requested_area
                                                        }{' '}
                                                        га
                                                    </TableCell>
                                                    <TableCell>
                                                        <ApplicationStatusBadge
                                                            status={
                                                                application.status
                                                            }
                                                            label={
                                                                application.status_label
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right">
                                                        <Link
                                                            href={routes.show.url(
                                                                application.id,
                                                            )}
                                                        >
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-navy/15 text-navy hover:bg-navy hover:text-white"
                                                            >
                                                                <Eye /> Ашу
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="divide-y divide-slate-100 lg:hidden">
                                {applications.data.map((application) => (
                                    <article
                                        key={application.id}
                                        className="space-y-4 p-5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                                    {
                                                        application.application_number
                                                    }
                                                </span>
                                                <h3 className="mt-3 font-bold text-navy">
                                                    {application.project_name}
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    {application.company_name}
                                                </p>
                                            </div>
                                            <ApplicationStatusBadge
                                                status={application.status}
                                                label={application.status_label}
                                            />
                                        </div>

                                        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                                            <div>
                                                <dt className="text-xs text-slate-400">
                                                    Аймақ
                                                </dt>
                                                <dd className="mt-1 font-medium text-navy">
                                                    {
                                                        application.zone_type_label
                                                    }{' '}
                                                    ·{' '}
                                                    {application.zoneable?.name}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-slate-400">
                                                    Сұралған жер
                                                </dt>
                                                <dd className="mt-1 font-bold text-navy">
                                                    {application.requested_area}{' '}
                                                    га
                                                </dd>
                                            </div>
                                        </dl>

                                        <Link
                                            href={routes.show.url(
                                                application.id,
                                            )}
                                            className="block"
                                        >
                                            <Button
                                                variant="outline"
                                                className="w-full border-navy/15 text-navy"
                                            >
                                                <Eye /> Өтінімді ашу
                                            </Button>
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </section>

                <Pagination paginator={applications} />
            </PageContainer>
        </AppLayout>
    );
}
