import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Eye, Plus } from 'lucide-react';

import ApplicationStatusBadge from '@/components/application-status-badge';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { EmptyState, PageContainer, PageHeader } from '@/components/ui/page';
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
    applications: PaginatedData<InvestmentApplication>;
    statuses: Record<string, string>;
    filter: string;
};

export default function ApplicationsIndex({
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
            <PageContainer width="standard">
                <PageHeader
                    eyebrow="Өтінім беруші порталы"
                    title="Менің өтінімдерім"
                    subtitle="Өтінімдердің қаралу күйін, ескертулерді және резерв мерзімін бақылаңыз."
                    action={
                        <Link href={applicant.portal.url()}>
                            <Button>
                                <Plus /> Жаңа өтінім
                            </Button>
                        </Link>
                    }
                />

                <div className="flex justify-end">
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
                        <SelectTrigger className="w-full sm:w-64">
                            <SelectValue placeholder="Барлық күйлер" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Барлық күйлер</SelectItem>
                            {Object.entries(statuses).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {applications.data.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardList className="size-7" />}
                            title="Өтінімдер жоқ"
                            description="Алдымен бос жері бар аймақты таңдап, өтінім беріңіз."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Нөмірі</TableHead>
                                    <TableHead>Жоба</TableHead>
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
                                        <TableCell className="font-semibold text-navy">
                                            {application.project_name}
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
                                                href={applicationsRoutes.show.url(
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
