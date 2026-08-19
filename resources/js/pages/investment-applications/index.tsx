import { Head, Link, router, useForm } from '@inertiajs/react';
import { ClipboardCheck, Eye, Search } from 'lucide-react';
import type { FormEvent } from 'react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    EmptyState,
    PageContainer,
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
                { title: 'Инвестор өтінімдері', href: routes.index.url() },
            ]}
        >
            <Head title="Инвестор өтінімдері" />
            <PageContainer width="wide">
                <PageHeader
                    eyebrow="Сарапшы кабинеті"
                    title="Инвестор өтінімдері"
                    subtitle="Өтінімді тексеріңіз, толықтыруға қайтарыңыз, гектарды резервтеңіз немесе инвестициялық жобаға айналдырыңыз."
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Жаңа" value={stats.submitted} />
                    <StatCard label="Қаралуда" value={stats.under_review} />
                    <StatCard
                        label="Толықтыруда"
                        value={stats.needs_clarification}
                    />
                    <StatCard label="Резервте" value={stats.approved} />
                </div>

                <form
                    onSubmit={submit}
                    className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-4"
                >
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="review-search">Іздеу</Label>
                        <div className="relative">
                            <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
                            <Input
                                id="review-search"
                                className="pl-9"
                                value={data.search}
                                onChange={(e) =>
                                    setData('search', e.target.value)
                                }
                                placeholder="Нөмір, жоба, компания немесе өтінім беруші"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Күйі</Label>
                        <Select
                            value={data.status || 'all'}
                            onValueChange={(value) =>
                                setData('status', value === 'all' ? '' : value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Барлығы</SelectItem>
                                {Object.entries(statuses).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
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
                    <div className="flex gap-2 md:col-span-4 md:justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => router.get(routes.index.url())}
                        >
                            Тазалау
                        </Button>
                        <Button type="submit">Қолдану</Button>
                    </div>
                </form>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {applications.data.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardCheck className="size-7" />}
                            title="Өтінімдер табылмады"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Нөмірі</TableHead>
                                    <TableHead>Жоба / компания</TableHead>
                                    <TableHead>Өтінім беруші</TableHead>
                                    <TableHead>Аймақ</TableHead>
                                    <TableHead>Гектар</TableHead>
                                    <TableHead>Күйі</TableHead>
                                    <TableHead className="text-right">
                                        Әрекет
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.data.map((application) => (
                                    <TableRow key={application.id}>
                                        <TableCell className="font-mono text-xs">
                                            {application.application_number}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-semibold text-navy">
                                                {application.project_name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {application.company_name}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <p>
                                                {
                                                    application.applicant
                                                        ?.full_name
                                                }
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {application.applicant?.phone}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            {application.zone_type_label} ·{' '}
                                            {application.zoneable?.name}
                                        </TableCell>
                                        <TableCell>
                                            {application.requested_area} га
                                        </TableCell>
                                        <TableCell>
                                            <ApplicationStatusBadge
                                                status={application.status}
                                                label={application.status_label}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link
                                                href={routes.show.url(
                                                    application.id,
                                                )}
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Eye /> Ашу
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
                <Pagination paginator={applications} />
            </PageContainer>
        </AppLayout>
    );
}
