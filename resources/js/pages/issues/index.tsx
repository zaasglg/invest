import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ExternalLink, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';

import type { BreadcrumbItem } from '@/types';

interface Region {
    id: number;
    name: string;
}

interface Issue {
    id: number;
    type: string;
    type_label: string;
    title: string;
    description: string;
    category: string | null;
    severity: string;
    status: string;
    entity_id: number;
    entity_name: string;
    region_name: string | null;
    created_at: string;
}

interface Filters {
    sector: string | null;
    region_id: number | null;
}

interface Props {
    issues: Issue[];
    regions: Region[];
    filters: Filters;
    sectorLabels: Record<string, string>;
}

const severityMap: Record<string, { label: string; color: string }> = {
    low: { label: 'Төмен', color: 'bg-blue-100 text-blue-800' },
    medium: { label: 'Орта', color: 'bg-amber-100 text-amber-800' },
    high: { label: 'Жоғары', color: 'bg-red-100 text-red-800' },
    critical: { label: 'Сыни жағдай', color: 'bg-red-200 text-red-900' },
};

const statusMap: Record<string, { label: string; color: string }> = {
    open: { label: 'Ашық', color: 'bg-red-100 text-red-800' },
    in_progress: { label: 'Орындалуда', color: 'bg-amber-100 text-amber-800' },
    resolved: { label: 'Шешілді', color: 'bg-green-100 text-green-800' },
};

const typeColorMap: Record<string, string> = {
    invest: 'bg-indigo-100 text-indigo-800',
    sez: 'bg-purple-100 text-purple-800',
    iz: 'bg-cyan-100 text-cyan-800',
    nedro: 'bg-orange-100 text-orange-800',
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Статистика',
        href: dashboard().url,
    },
    {
        title: 'Проблемалық мәселелер',
        href: '/issues',
    },
];

function getEntityLink(type: string, entityId: number): string {
    switch (type) {
        case 'invest':
            return `/investment-projects/${entityId}/issues`;
        case 'sez':
            return `/sezs/${entityId}/issues`;
        case 'iz':
            return `/industrial-zones/${entityId}/issues`;
        case 'nedro':
            return `/subsoil-users/${entityId}/issues`;
        default:
            return '#';
    }
}

export default function IssuesIndex({
    issues,
    regions,
    filters,
    sectorLabels,
}: Props) {
    const handleFilterChange = (key: string, value: string | null) => {
        const params: Record<string, string | null> = {
            sector: filters.sector,
            region_id: filters.region_id?.toString() ?? null,
        };
        params[key] = value;

        // Remove null/empty values
        const cleanParams: Record<string, string> = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v && v !== 'all') {
                cleanParams[k] = v;
            }
        });

        router.get('/issues', cleanParams, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Проблемалық мәселелер" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={dashboard().url}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">
                                Проблемалық мәселелер
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Барлық секторлардағы проблемалық мәселелер (
                                {issues.length})
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Filter className="h-4 w-4" />
                            Сүзгілер
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            <div className="w-full sm:w-48">
                                <Select
                                    value={filters.sector ?? 'all'}
                                    onValueChange={(value) =>
                                        handleFilterChange(
                                            'sector',
                                            value === 'all' ? null : value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Секторды таңдаңыз" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Барлық секторлар
                                        </SelectItem>
                                        {Object.entries(sectorLabels).map(
                                            ([key, label]) => (
                                                <SelectItem
                                                    key={key}
                                                    value={key}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full sm:w-56">
                                <Select
                                    value={filters.region_id?.toString() ?? 'all'}
                                    onValueChange={(value) =>
                                        handleFilterChange(
                                            'region_id',
                                            value === 'all' ? null : value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Аймақты таңдаңыз" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Барлық аймақтар
                                        </SelectItem>
                                        {regions.map((region) => (
                                            <SelectItem
                                                key={region.id}
                                                value={region.id.toString()}
                                            >
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Issues List */}
                <div className="space-y-3">
                    {issues.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <AlertTriangle className="text-muted-foreground mb-4 h-12 w-12" />
                                <p className="text-muted-foreground text-lg">
                                    Проблемалық мәселелер табылмады
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        issues.map((issue) => (
                            <Card key={`${issue.type}-${issue.id}`}>
                                <CardContent className="p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <Badge
                                                    className={
                                                        typeColorMap[
                                                            issue.type
                                                        ] ?? 'bg-gray-100'
                                                    }
                                                >
                                                    {issue.type_label}
                                                </Badge>
                                                <Badge
                                                    className={
                                                        severityMap[
                                                            issue.severity
                                                        ]?.color ??
                                                        'bg-gray-100'
                                                    }
                                                >
                                                    {severityMap[issue.severity]
                                                        ?.label ??
                                                        issue.severity}
                                                </Badge>
                                                <Badge
                                                    className={
                                                        statusMap[issue.status]
                                                            ?.color ??
                                                        'bg-gray-100'
                                                    }
                                                >
                                                    {statusMap[issue.status]
                                                        ?.label ?? issue.status}
                                                </Badge>
                                            </div>
                                            <h3 className="font-semibold">
                                                {issue.title}
                                            </h3>
                                            <p className="text-muted-foreground mt-1 text-sm line-clamp-2">
                                                {issue.description}
                                            </p>
                                            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-xs">
                                                <span>
                                                    <strong>Объект:</strong>{' '}
                                                    {issue.entity_name}
                                                </span>
                                                {issue.region_name && (
                                                    <span>
                                                        <strong>Аймақ:</strong>{' '}
                                                        {issue.region_name}
                                                    </span>
                                                )}
                                                {issue.category && (
                                                    <span>
                                                        <strong>
                                                            Категория:
                                                        </strong>{' '}
                                                        {issue.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={getEntityLink(
                                                    issue.type,
                                                    issue.entity_id,
                                                )}
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <ExternalLink className="mr-1 h-4 w-4" />
                                                    Көру
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
