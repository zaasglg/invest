import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarDays,
    ClipboardList,
    Eye,
    Filter,
    FolderKanban,
    LandPlot,
    MapPin,
    Plus,
    UserRound,
} from 'lucide-react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    DataCard,
    EmptyState,
    PageHeader,
    StatCard,
} from '@/components/ui/page';
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
import * as applicant from '@/routes/applicant';
import * as applicationsRoutes from '@/routes/applicant/applications';
import type { InvestmentApplication, PaginatedData } from '@/types';

type Props = {
    accountRole: 'applicant' | 'investor';
    applications: PaginatedData<InvestmentApplication>;
    statuses: Record<string, string>;
    filter: string;
};

export default function ApplicationsIndex({
    accountRole,
    applications,
    statuses,
    filter,
}: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Аймақтар', href: applicant.portal.url() },
                {
                    title: 'Менің өтінімдерім',
                    href: applicationsRoutes.index.url(),
                },
            ]}
        >
            <Head title="Менің өтінімдерім" />
            <div className="page-surface flex h-full flex-col gap-5 sm:gap-6">
                <PageHeader
                    eyebrow={
                        accountRole === 'investor'
                            ? 'Инвестор порталы'
                            : 'Өтінім беруші порталы'
                    }
                    title="Менің өтінімдерім"
                    subtitle="Өтінімдердің қаралу күйін, ескертулерді және резерв мерзімін бақылаңыз."
                    icon={<FolderKanban className="size-5" />}
                    action={
                        <Link href={applicant.portal.url()}>
                            <Button className="bg-gold text-white shadow-[0_10px_24px_-12px_rgba(154,125,53,0.9)] hover:bg-gold-dark">
                                <Plus /> Жаңа өтінім
                            </Button>
                        </Link>
                    }
                />

                <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <StatCard
                        label="Барлық өтінім"
                        value={applications.total}
                        description="Барлық уақыттағы өтінімдер"
                        icon={<ClipboardList className="size-5" />}
                    />
                    <StatCard
                        label="Осы бетте"
                        value={applications.data.length}
                        description="Көрсетіліп тұрған өтінімдер"
                        icon={<FolderKanban className="size-5" />}
                    />
                    <StatCard
                        label="Ағымдағы сүзгі"
                        value={
                            filter ? (statuses[filter] ?? filter) : 'Барлығы'
                        }
                        description={
                            accountRole === 'investor'
                                ? 'Инвестор кабинеті'
                                : 'Өтінім беруші кабинеті'
                        }
                        icon={<UserRound className="size-5" />}
                    />
                </section>

                <DataCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-navy/5 text-navy">
                            <Filter className="size-[18px]" />
                        </span>
                        <div>
                            <p className="text-sm font-bold text-navy">
                                Өтінім мәртебесі
                            </p>
                            <p className="text-xs text-slate-500">
                                Тізімді қажетті мәртебе бойынша сүзу
                            </p>
                        </div>
                    </div>
                    <Select
                        value={filter || 'all'}
                        onValueChange={(value) =>
                            router.get(
                                applicationsRoutes.index.url(),
                                value === 'all' ? {} : { status: value },
                                { preserveState: true, replace: true },
                            )
                        }
                    >
                        <SelectTrigger className="h-11 w-full bg-slate-50/70 sm:w-72">
                            <SelectValue placeholder="Барлық мәртебелер" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                Барлық мәртебелер
                            </SelectItem>
                            {Object.entries(statuses).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </DataCard>

                <DataCard noPadding>
                    {applications.data.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardList className="size-7" />}
                            title="Өтінімдер жоқ"
                            description="Алдымен бос жері бар аймақты таңдап, өтінім беріңіз."
                        />
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader className="bg-slate-50/90">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6">
                                                Нөмірі
                                            </TableHead>
                                            <TableHead>Жоба</TableHead>
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
                                                    className="group hover:bg-sand-light/40"
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
                                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy transition-colors group-hover:bg-navy group-hover:text-white">
                                                                <FolderKanban className="size-4" />
                                                            </span>
                                                            <div>
                                                                <p className="font-bold text-navy">
                                                                    {application.project_name ||
                                                                        'Атауы енгізілмеген жоба'}
                                                                </p>
                                                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                                                    <CalendarDays className="size-3" />
                                                                    {new Date(
                                                                        application.created_at,
                                                                    ).toLocaleDateString(
                                                                        'kk-KZ',
                                                                    )}
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
                                                        <p className="font-medium text-slate-700">
                                                            {
                                                                application
                                                                    .zoneable
                                                                    ?.name
                                                            }
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            {
                                                                application.zone_type_label
                                                            }
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-navy tabular-nums">
                                                        {application.requested_area !==
                                                        null
                                                            ? `${application.requested_area} га`
                                                            : '—'}
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
                                                            href={applicationsRoutes.show.url(
                                                                application.id,
                                                            )}
                                                        >
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="group-hover:border-navy/20 group-hover:bg-white"
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

                            <div className="divide-y divide-slate-100 md:hidden">
                                {applications.data.map((application) => (
                                    <article
                                        key={application.id}
                                        className="p-5 transition-colors hover:bg-slate-50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">
                                                {application.application_number}
                                            </span>
                                            <ApplicationStatusBadge
                                                status={application.status}
                                                label={application.status_label}
                                            />
                                        </div>
                                        <h2 className="mt-4 text-lg font-extrabold text-navy">
                                            {application.project_name ||
                                                'Атауы енгізілмеген жоба'}
                                        </h2>
                                        <p className="mt-1 text-xs font-semibold text-sky-700">
                                            {application.application_kind_label}
                                        </p>
                                        <div className="mt-3 grid gap-2 text-sm text-slate-500">
                                            <p className="flex items-center gap-2">
                                                <MapPin className="size-4 text-gold-dark" />
                                                {application.zone_type_label} ·{' '}
                                                {application.zoneable?.name}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <LandPlot className="size-4 text-emerald-600" />
                                                {application.requested_area !==
                                                null
                                                    ? `${application.requested_area} га`
                                                    : '—'}
                                            </p>
                                        </div>
                                        <Link
                                            href={applicationsRoutes.show.url(
                                                application.id,
                                            )}
                                            className="mt-4 block"
                                        >
                                            <Button
                                                className="w-full"
                                                variant="outline"
                                            >
                                                <Eye /> Өтінімді ашу
                                            </Button>
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </DataCard>
                <Pagination paginator={applications} />
            </div>
        </AppLayout>
    );
}
