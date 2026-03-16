import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ScrollText, User, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import Pagination from '@/components/pagination';
import type { PaginatedData } from '@/types';

interface ProjectType {
    id: number;
    name: string;
}

interface Region {
    id: number;
    name: string;
}

interface InvestmentProject {
    id: number;
    name: string;
    region?: Region;
    project_type?: ProjectType;
}

interface LogUser {
    id: number;
    full_name?: string;
    name?: string;
}

interface KpiLog {
    id: number;
    user_id: number;
    action: string;
    score: number;
    created_at: string;
    user?: LogUser;
}

interface Props {
    project: InvestmentProject;
    logs: PaginatedData<KpiLog>;
}

export default function Logs({ project, logs }: Props) {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('kk-KZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout>
            <Head title={`Логирование — ${project.name}`} />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href={`/investment-projects/${project.id}`}
                        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-[#0f1b3d]"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        {project.name}
                    </Link>
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Логирование
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {project.region?.name} •{' '}
                        {project.project_type?.name}
                    </p>
                </div>

                {/* Logs */}
                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ScrollText className="h-5 w-5 text-gray-500" />
                            Жоба логтары
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                ({logs.total})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {logs.data.length === 0 ? (
                            <div className="py-12 text-center">
                                <ScrollText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                                <p className="text-gray-500">
                                    Логтар жоқ
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {logs.data.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-4 rounded-lg border border-gray-200 p-4"
                                    >
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                                            <User className="h-5 w-5 text-gray-500" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-[#0f1b3d]">
                                                    {log.user?.full_name ||
                                                        log.user?.name ||
                                                        `ID: ${log.user_id}`}
                                                </p>
                                                <Badge
                                                    className={`border-0 text-[10px] ${
                                                        log.score > 0
                                                            ? 'bg-green-100 text-green-800'
                                                            : log.score < 0
                                                              ? 'bg-red-100 text-red-800'
                                                              : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {log.score > 0 ? '+' : ''}
                                                    {log.score}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-600">
                                                {log.action}
                                            </p>
                                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(log.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Pagination paginator={logs} />
            </div>
        </AppLayout>
    );
}
