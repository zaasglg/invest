import { Head, Link, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    CircleDollarSign,
    Eye,
    Inbox,
    Pencil,
} from 'lucide-react';

import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/ui/page';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { investorCountryLabel } from '@/lib/investor-countries';
import { formatProjectTypeNames } from '@/lib/project-types';
import { formatMoneyCompact } from '@/lib/utils';
import * as investmentProjects from '@/routes/investment-projects';
import * as projectReserves from '@/routes/project-reserves';
import type { PaginatedData } from '@/types';

interface NamedEntity {
    id: number;
    name: string;
}

type ProjectType = NamedEntity;

interface ReserveProject {
    id: number;
    name: string;
    can_manage?: boolean;
    company_name?: string | null;
    company?: { display_name?: string | null } | null;
    region?: NamedEntity | null;
    project_type?: ProjectType | null;
    project_types?: ProjectType[];
    total_investment?: number | string | null;
    investor_country_code?: string | null;
    sezs?: NamedEntity[];
    industrial_zones?: NamedEntity[];
    prom_zones?: NamedEntity[];
    subsoil_users?: NamedEntity[];
}

interface Props {
    projects: PaginatedData<ReserveProject>;
    stats: {
        total_projects: number;
        total_investment: number;
    };
}

function formatInvestment(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return String(value);

    return formatMoneyCompact(amount, { maxFractionDigits: 2 });
}

function sectorLabel(project: ReserveProject): string {
    const sectors: string[] = [];

    sectors.push(...(project.sezs ?? []).map((item) => `АЭА: ${item.name}`));
    sectors.push(
        ...(project.industrial_zones ?? []).map((item) => `ИА: ${item.name}`),
    );
    sectors.push(
        ...(project.prom_zones ?? []).map((item) => `Пром зона: ${item.name}`),
    );
    sectors.push(
        ...(project.subsoil_users ?? []).map(
            (item) => `Жер қойнауын пайдалану: ${item.name}`,
        ),
    );

    return sectors.length > 0 ? sectors.join(', ') : '—';
}

function projectNumber(
    projects: PaginatedData<ReserveProject>,
    index: number,
): number {
    return (projects.current_page - 1) * projects.per_page + index + 1;
}

export default function Reserves({ projects, stats }: Props) {
    const { url } = usePage();

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Резервтер',
                    href: projectReserves.index.url(),
                },
            ]}
        >
            <Head title="Резервтер" />

            <PageContainer width="wide">
                <PageHeader
                    eyebrow="Turkistan Invest · Сүйемелдеу"
                    title="Резервтер"
                    subtitle="Инвестор тарту бағыты сүйемелдеуге берген жобаларды қарап, жоба ішінен қабылдаңыз немесе себебін көрсетіп кері қайтарыңыз."
                    icon={<Inbox className="size-5" />}
                />

                <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="metric-panel flex items-center justify-between gap-4 p-5 sm:p-6">
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase">
                                Резервтегі жобалар саны
                            </h2>
                            <p className="mt-2 text-3xl font-extrabold text-navy tabular-nums">
                                {stats.total_projects}
                            </p>
                        </div>
                        <div className="flex size-11 items-center justify-center rounded-md bg-navy text-white shadow-lg shadow-navy/15">
                            <BriefcaseBusiness className="size-5" />
                        </div>
                    </div>

                    <div className="metric-panel flex items-center justify-between gap-4 p-5 sm:p-6">
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase">
                                Инвестиция көлемі
                            </h2>
                            <p className="mt-2 text-3xl font-extrabold text-gold-dark tabular-nums">
                                {formatInvestment(stats.total_investment)}
                            </p>
                        </div>
                        <div className="flex size-11 items-center justify-center rounded-md border border-gold/20 bg-gold/10 text-gold-dark">
                            <CircleDollarSign className="size-5" />
                        </div>
                    </div>
                </section>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Table className="[&_td]:px-3 [&_th]:px-3">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-14 text-center">
                                    №
                                </TableHead>
                                <TableHead>Атауы / Ел / Компания</TableHead>
                                <TableHead>Аймақ</TableHead>
                                <TableHead>Жоба түрі</TableHead>
                                <TableHead>Сектор</TableHead>
                                <TableHead>Инвестиция</TableHead>
                                <TableHead>Мәртебесі</TableHead>
                                <TableHead className="text-right">
                                    Әрекеттер
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-56 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <span className="flex size-12 items-center justify-center rounded-full bg-slate-100">
                                                <Inbox className="size-6" />
                                            </span>
                                            <p className="mt-3 font-semibold text-slate-600">
                                                Резервте жоба жоқ
                                            </p>
                                            <p className="mt-1 text-sm">
                                                Сүйемелдеуге берілген жаңа жоба
                                                осы жерде пайда болады.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                projects.data.map((project, index) => (
                                    <TableRow
                                        key={project.id}
                                        className="hover:bg-slate-50/70"
                                    >
                                        <TableCell className="text-center font-semibold text-slate-500 tabular-nums">
                                            {projectNumber(projects, index)}
                                        </TableCell>
                                        <TableCell className="[overflow-wrap:anywhere]">
                                            <div className="flex flex-col">
                                                <Link
                                                    href={investmentProjects.show.url(
                                                        project.id,
                                                    )}
                                                    className="font-semibold text-[#0f1b3d] hover:text-[#c8a44e] hover:underline"
                                                >
                                                    {project.name}
                                                </Link>
                                                <span className="mt-0.5 text-xs font-medium text-cyan-700">
                                                    Ел:{' '}
                                                    {investorCountryLabel(
                                                        project.investor_country_code,
                                                    )}
                                                </span>
                                                <span className="mt-0.5 text-xs text-slate-400">
                                                    {project.company
                                                        ?.display_name ??
                                                        project.company_name ??
                                                        'Компания көрсетілмеген'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {project.region?.name ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            {formatProjectTypeNames(project)}
                                        </TableCell>
                                        <TableCell className="max-w-64 [overflow-wrap:anywhere]">
                                            {sectorLabel(project)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatInvestment(
                                                project.total_investment,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="border-amber-200 bg-amber-50 text-amber-800"
                                            >
                                                Қабылдауды күтуде
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                    title="Қарау"
                                                >
                                                    <Link
                                                        href={investmentProjects.show.url(
                                                            project.id,
                                                        )}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                                {project.can_manage !==
                                                    false && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                        className="h-8 w-8 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                        title="Өңдеу"
                                                    >
                                                        <Link
                                                            href={`${investmentProjects.edit.url(project.id)}?return_to=${encodeURIComponent(url)}`}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination paginator={projects} locale="kk" />
            </PageContainer>
        </AppLayout>
    );
}
