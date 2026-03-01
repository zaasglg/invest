import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle,
    Clock,
    ExternalLink,
    MapPin,
    Phone,
    User as UserIcon,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface TaskItem {
    id: number;
    title: string;
    project_name?: string;
    project_id: number;
    region?: string;
    start_date?: string;
    due_date?: string;
    status: string;
    completion_status?: string | null;
    completed_at?: string | null;
}

interface UserInfo {
    id: number;
    full_name: string;
    phone?: string | null;
    position?: string | null;
    baskarma_type: string;
    region?: string | null;
    avatar_url?: string | null;
}

interface Props {
    user: UserInfo;
    projectCount: number;
    kpd: number;
    completedTasks: TaskItem[];
    activeTasks: TaskItem[];
    overdueTasks: TaskItem[];
}

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('kk-KZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function TaskTable({
    tasks,
    title,
    icon,
    color,
    emptyText,
}: {
    tasks: TaskItem[];
    title: string;
    icon: React.ReactNode;
    color: string;
    emptyText: string;
}) {
    return (
        <Card className="shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    {icon}
                    {title}
                    <Badge className={`border-0 ${color}`}>
                        {tasks.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {tasks.length === 0 ? (
                    <div className="px-6 pb-6 pt-2 text-center text-sm text-gray-400">
                        {emptyText}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-center">
                                    №
                                </TableHead>
                                <TableHead>Задание</TableHead>
                                <TableHead>Проект</TableHead>
                                <TableHead>Дата начала</TableHead>
                                <TableHead>Срок</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map((task, index) => (
                                <TableRow key={task.id}>
                                    <TableCell className="text-center text-gray-500">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-[#0f1b3d]">
                                            {task.title}
                                        </p>
                                        {task.region && (
                                            <p className="text-xs text-gray-400">
                                                {task.region}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {task.project_name || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                        {formatDate(task.start_date)}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                        {formatDate(task.due_date)}
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/investment-projects/${task.project_id}`}
                                            className="text-gray-400 hover:text-gray-700"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export default function BaskarmaRatingShow({
    user,
    projectCount,
    kpd,
    completedTasks,
    activeTasks,
    overdueTasks,
}: Props) {
    const totalTasks =
        completedTasks.length + activeTasks.length + overdueTasks.length;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Рейтинг управлений', href: '/baskarma-rating' },
                { title: user.full_name, href: '' },
            ]}
        >
            <Head title={`${user.full_name} — Отчет`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Back */}
                <Link
                    href="/baskarma-rating"
                    className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[#0f1b3d]"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Вернуться к рейтингу
                </Link>

                {/* User info header */}
                <Card className="shadow-none">
                    <CardContent className="flex flex-wrap items-center gap-6 p-6">
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="h-16 w-16 rounded-full border border-gray-200 object-cover"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                                <UserIcon className="h-8 w-8 text-gray-400" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-[#0f1b3d]">
                                {user.full_name}
                            </h1>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                {user.position && (
                                    <span>{user.position}</span>
                                )}
                                <Badge className="border-0 bg-blue-100 text-blue-700">
                                    {user.baskarma_type === 'oblast'
                                        ? 'Областное управление'
                                        : 'Районное управление'}
                                </Badge>
                                {user.region && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {user.region}
                                    </span>
                                )}
                                {user.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {user.phone}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Summary stats */}
                        <div className="flex gap-4">
                            <div className="rounded-lg border border-gray-200 px-4 py-2 text-center">
                                <p className="text-2xl font-bold text-[#0f1b3d]">
                                    {projectCount}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Проекты
                                </p>
                            </div>
                            <div className="rounded-lg border border-gray-200 px-4 py-2 text-center">
                                <p className="text-2xl font-bold text-[#0f1b3d]">
                                    {totalTasks}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Задачи
                                </p>
                            </div>
                            <div
                                className={`rounded-lg border px-4 py-2 text-center ${
                                    kpd >= 70
                                        ? 'border-green-200 bg-green-50'
                                        : kpd >= 40
                                          ? 'border-amber-200 bg-amber-50'
                                          : 'border-red-200 bg-red-50'
                                }`}
                            >
                                <p
                                    className={`text-2xl font-bold ${
                                        kpd >= 70
                                            ? 'text-green-600'
                                            : kpd >= 40
                                              ? 'text-amber-600'
                                              : 'text-red-600'
                                    }`}
                                >
                                    {kpd}%
                                </p>
                                <p className="text-xs text-gray-500">КПД</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Task tables */}
                <div className="space-y-6">
                    <TaskTable
                        tasks={activeTasks}
                        title="Активные задачи"
                        icon={<Clock className="h-5 w-5 text-amber-500" />}
                        color="bg-amber-100 text-amber-700"
                        emptyText="Активных задач нет"
                    />

                    <TaskTable
                        tasks={completedTasks}
                        title="Выполненные задачи"
                        icon={
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        }
                        color="bg-green-100 text-green-700"
                        emptyText="Выполненных задач нет"
                    />

                    <TaskTable
                        tasks={overdueTasks}
                        title="Просроченные задачи"
                        icon={
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        }
                        color="bg-red-100 text-red-700"
                        emptyText="Просроченных задач нет"
                    />
                </div>
            </div>
        </AppLayout>
    );
}
