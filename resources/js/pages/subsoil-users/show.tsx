import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    MapPin,
    Activity,
    FileText,
    AlertTriangle,
    Calendar,
    ImageIcon,
    Layers,
    Eye,
    Download,
    Flag,
    Plus,
    Trash2,
} from 'lucide-react';
import ProjectGallerySlider from '@/components/project-gallery-slider';
import { useCanModify } from '@/hooks/use-can-modify';

interface Region {
    id: number;
    name: string;
}

interface Issue {
    id: number;
    description?: string;
    severity?: string;
    status?: string;
}

interface AssignableUser {
    id: number;
    full_name?: string;
    position?: string;
    baskarma_type?: string;
}

interface SubsoilTaskItem {
    id: number;
    title: string;
    description?: string;
    start_date?: string;
    due_date?: string;
    status: 'new' | 'in_progress' | 'done' | 'rejected';
    assignee?: AssignableUser;
}

interface Photo {
    id: number;
    file_path: string;
    description?: string | null;
    gallery_date?: string | null;
    created_at?: string | null;
}

interface SubsoilUser {
    id: number;
    name: string;
    bin?: string;
    region_id: number;
    region?: Region;
    mineral_type?: string;
    total_area?: number;
    description?: string;
    license_status?: 'active' | 'expired' | 'suspended' | 'illegal';
    license_start?: string;
    license_end?: string;
    issues?: Issue[];
    tasks?: SubsoilTaskItem[];
    documents?: Array<{ id: number; name: string }>;
    photos_count?: number;
    created_at: string;
}

interface Props {
    subsoilUser: SubsoilUser;
    mainGallery?: Photo[];
    renderPhotos?: Photo[];
    assignableUsers?: AssignableUser[];
}

export default function Show({
    subsoilUser,
    mainGallery = [],
    renderPhotos = [],
    assignableUsers = [],
}: Props) {
    const canModify = useCanModify();
    const { auth } = usePage().props as unknown as { auth: { user: { role_model?: { name: string } } } };
    const isSuperAdmin = auth.user.role_model?.name === 'superadmin';
    const photosCount =
        typeof subsoilUser.photos_count === 'number'
            ? subsoilUser.photos_count
            : 0;

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskFilter, setTaskFilter] = useState('all');

    const taskForm = useForm({
        title: '',
        description: '',
        assigned_to: '',
        start_date: '',
        due_date: '',
    });

    const tasks = subsoilUser.tasks ?? [];

    const filteredTasks = tasks.filter((t) => {
        if (taskFilter === 'all') return true;
        if (taskFilter === 'overdue') {
            return (
                t.due_date &&
                new Date(t.due_date) < new Date() &&
                t.status !== 'done'
            );
        }
        return t.status === taskFilter;
    });

    const handleTaskDelete = (taskId: number) => {
        router.delete(
            `/subsoil-users/${subsoilUser.id}/tasks/${taskId}`,
            { preserveScroll: true },
        );
    };

    const handleTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        taskForm.post(`/subsoil-users/${subsoilUser.id}/tasks`, {
            preserveScroll: true,
            onSuccess: () => {
                taskForm.reset();
                setShowTaskModal(false);
            },
        });
    };

    const getTaskDotColor = (task: SubsoilTaskItem): string => {
        if (
            task.due_date &&
            new Date(task.due_date) < new Date() &&
            task.status !== 'done'
        ) {
            return 'bg-red-500';
        }
        const colors: Record<string, string> = {
            new: 'bg-blue-500',
            in_progress: 'bg-amber-500',
            done: 'bg-green-500',
            rejected: 'bg-gray-400',
        };
        return colors[task.status] ?? 'bg-gray-400';
    };

    const licenseStatusMap: Record<
        string,
        { label: string; color: string }
    > = {
        active: {
            label: 'Белсенді',
            color: 'bg-green-100 text-green-800',
        },
        expired: {
            label: 'Мерзімі өткен',
            color: 'bg-gray-100 text-gray-800',
        },
        suspended: {
            label: 'Тоқтатылған',
            color: 'bg-amber-100 text-amber-800',
        },
        illegal: {
            label: 'Заңсыз',
            color: 'bg-red-600 text-white',
        },
    };

    const issues = subsoilUser.issues ?? [];

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Жер қойнауын пайдаланушылар',
                    href: `/regions/${subsoilUser.region_id}`,
                },
                { title: subsoilUser.name, href: '' },
            ]}
        >
            <Head title={subsoilUser.name} />

            <div className="flex h-full w-full flex-1 flex-col gap-6 p-6">
                {/* Back link */}
                <Link
                    href={`/regions/${subsoilUser.region_id}`}
                    className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[#0f1b3d]"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Тізімге
                    қайту
                </Link>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Banner + Info */}
                        <Card className="overflow-hidden shadow-none py-0">
                            {/* Banner Header */}
                            <div className="bg-[#0f1b3d] px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white">
                                        <Layers className="h-5 w-5" />
                                        <h1 className="text-xl font-bold">
                                            {subsoilUser.name}
                                        </h1>
                                    </div>
                                    {subsoilUser.license_status && (
                                        <Badge
                                            className={`${licenseStatusMap[subsoilUser.license_status]?.color || 'bg-gray-100 text-gray-800'} border-0 px-3 py-1 text-sm font-medium`}
                                        >
                                            {licenseStatusMap[
                                                subsoilUser.license_status
                                            ]?.label ||
                                                subsoilUser.license_status}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Photo + Info Cards */}
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                    {/* Photo */}
                                    <div className="overflow-hidden rounded-lg md:col-span-2">
                                        <ProjectGallerySlider
                                            photos={mainGallery}
                                        />
                                    </div>

                                    {/* Info Cards */}
                                    <div className="grid grid-cols-2 gap-3 md:col-span-3">
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <MapPin className="h-3.5 w-3.5" />{' '}
                                                Аудан
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {subsoilUser.region?.name ||
                                                    'Көрсетілмеген'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <FileText className="h-3.5 w-3.5" />{' '}
                                                БСН
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {subsoilUser.bin || 'Көрсетілмеген'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Layers className="h-3.5 w-3.5" />{' '}
                                                Пайдалы қазба
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {subsoilUser.mineral_type ||
                                                    'Көрсетілмеген'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Activity className="h-3.5 w-3.5" />{' '}
                                                Лицензия күйі
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {subsoilUser.license_status
                                                    ? licenseStatusMap[
                                                          subsoilUser
                                                              .license_status
                                                      ]?.label ||
                                                      subsoilUser.license_status
                                                    : 'Көрсетілмеген'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <MapPin className="h-3.5 w-3.5" />{' '}
                                                Телім аумағы
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {subsoilUser.total_area !=
                                                    null &&
                                                Number(
                                                    subsoilUser.total_area,
                                                ) > 0
                                                    ? `${Number(subsoilUser.total_area).toLocaleString('kk-KZ')} га`
                                                    : 'Көрсетілмеген'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Calendar className="h-3.5 w-3.5" />{' '}
                                                Лицензия мерзімі
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {subsoilUser.license_start
                                                    ? new Date(
                                                          subsoilUser.license_start,
                                                      ).toLocaleDateString()
                                                    : '...'}
                                                {' — '}
                                                {subsoilUser.license_end
                                                    ? new Date(
                                                          subsoilUser.license_end,
                                                      ).toLocaleDateString()
                                                    : '...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            {/* Name & Description */}
                            <div className="border-t border-gray-200 px-6 py-5">
                                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#0f1b3d]">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    {subsoilUser.name}
                                </h2>
                                <p className="whitespace-pre-wrap leading-relaxed text-gray-700">
                                    {subsoilUser.description ||
                                        'Сипаттама жоқ.'}
                                </p>
                            </div>
                        </Card>

                        {/* Проблемалық мәселелер */}
                        {issues.length > 0 && (
                            <Card className="overflow-hidden py-0 shadow-none">
                                <div className="bg-[#0f1b3d] px-6 py-4">
                                    <div className="flex items-center gap-2 text-white">
                                        <AlertTriangle className="h-5 w-5" />
                                        <h2 className="text-lg font-bold">
                                            Проблемалық мәселелер
                                        </h2>
                                        <span className="ml-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white/20 px-2 text-xs font-bold text-white">
                                            {issues.length}
                                        </span>
                                    </div>
                                </div>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-gray-100">
                                        {issues.map((issue) => {
                                            const severityStyles: Record<string, string> = {
                                                high: 'border-red-200 bg-red-50',
                                                medium: 'border-amber-200 bg-amber-50',
                                            };
                                            const severityLabels: Record<string, string> = {
                                                high: 'Жоғары',
                                                medium: 'Орта',
                                            };
                                            const severityDot: Record<string, string> = {
                                                high: 'bg-red-500',
                                                medium: 'bg-amber-500',
                                            };
                                            const statusLabels: Record<string, string> = {
                                                open: 'Ашық',
                                                resolved: 'Шешілді',
                                            };
                                            const style = severityStyles[issue.severity ?? ''] ?? 'border-gray-200 bg-gray-50';
                                            return (
                                                <div key={issue.id} className={`m-4 rounded-lg border p-4 ${style}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 items-start gap-3">
                                                            <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[issue.severity ?? ''] ?? 'bg-gray-400'}`} />
                                                            <p className="min-w-0 text-sm text-gray-700">
                                                                {issue.description}
                                                            </p>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-2">
                                                            {issue.severity && (
                                                                <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                    {severityLabels[issue.severity] ?? issue.severity}
                                                                </span>
                                                            )}
                                                            {issue.status && (
                                                                <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                    {statusLabels[issue.status] ?? issue.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="px-6 pb-4">
                                        <Link
                                            href={`/subsoil-users/${subsoilUser.id}/issues`}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-[#0f1b3d] transition-colors hover:text-[#c8a44e]"
                                        >
                                            Барлық проблемалық мәселелер →
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Жол картасы / Roadmap */}
                        <Card className="overflow-hidden py-0 shadow-none">
                            <div className="bg-[#0f1b3d] px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white">
                                        <Flag className="h-5 w-5" />
                                        <h2 className="text-lg font-bold">
                                            Жол картасы
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={taskFilter}
                                            onChange={(e) => setTaskFilter(e.target.value)}
                                            className="h-9 rounded-md border border-white/30 bg-white/20 px-3 text-sm text-white focus:outline-none"
                                        >
                                            <option value="all" className="text-gray-900">Барлық кезеңдер</option>
                                            <option value="new" className="text-gray-900">Жаңа</option>
                                            <option value="in_progress" className="text-gray-900">Орындалуда</option>
                                            <option value="done" className="text-gray-900">Орындалды</option>
                                            <option value="rejected" className="text-gray-900">Қабылданбады</option>
                                            <option value="overdue" className="text-gray-900">Мерзімі өткен</option>
                                        </select>
                                        {canModify && isSuperAdmin && (
                                            <Button
                                                size="icon"
                                                className="h-9 w-9 border border-white/30 bg-white/20 text-white hover:bg-white/30"
                                                onClick={() => setShowTaskModal(true)}
                                            >
                                                <Plus className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <CardContent className="p-0">
                                {filteredTasks.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Flag className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                                        <p className="text-gray-500">Кезеңдер жоқ</p>
                                        {canModify && isSuperAdmin && (
                                            <p className="mt-1 text-sm text-gray-400">
                                                Жаңа кезең қосу үшін + басыңыз
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {filteredTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
                                            >
                                                <div className={`h-3 w-3 flex-shrink-0 rounded-full ${getTaskDotColor(task)}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-[#0f1b3d]">
                                                        {task.title}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {task.start_date && (
                                                            <>
                                                                {new Date(task.start_date).toLocaleDateString('kk-KZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                {' — '}
                                                            </>
                                                        )}
                                                        {task.due_date
                                                            ? new Date(task.due_date).toLocaleDateString('kk-KZ', { day: 'numeric', month: 'long', year: 'numeric' })
                                                            : 'Мерзімі көрсетілмеген'}
                                                    </p>
                                                    {task.assignee && (
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            {task.assignee.full_name}
                                                            {task.assignee.position && ` — ${task.assignee.position}`}
                                                        </p>
                                                    )}
                                                    {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && (
                                                        <Badge className="mt-1 border-0 bg-red-100 text-xs text-red-700">
                                                            Мерзімі өткен
                                                        </Badge>
                                                    )}
                                                </div>
                                                {canModify && isSuperAdmin && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => handleTaskDelete(task.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Render Photos */}
                        {renderPhotos.length > 0 && (
                            <Card className="overflow-hidden shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Eye className="h-5 w-5 text-gray-500" />
                                        Болашақ көрінісі
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ProjectGallerySlider
                                        photos={renderPhotos}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Actions */}
                        <Card className="shadow-none">
                            <CardContent className="flex flex-col gap-3 p-4">
                                {canModify && (
                                    <Link
                                        href={`/subsoil-users/${subsoilUser.id}/edit`}
                                        className="w-full"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <Activity className="mr-2 h-4 w-4" />{' '}
                                            Өңдеу
                                        </Button>
                                    </Link>
                                )}
                                <Link
                                    href={`/subsoil-users/${subsoilUser.id}/documents`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Құжаттар
                                        {subsoilUser.documents &&
                                            subsoilUser.documents.length >
                                                0 && (
                                                <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                    {
                                                        subsoilUser.documents
                                                            .length
                                                    }
                                                </span>
                                            )}
                                    </Button>
                                </Link>
                                <Link
                                    href={`/subsoil-users/${subsoilUser.id}/gallery`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        Галерея
                                        {photosCount > 0 && (
                                            <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                {photosCount}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <Link
                                    href={`/subsoil-users/${subsoilUser.id}/issues`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Проблемалық мәселелер
                                        {issues.length > 0 && (
                                            <span className="ml-auto rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                                                {issues.length}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <Link
                                    href={`/regions/${subsoilUser.region_id}`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <Layers className="mr-2 h-4 w-4" />{' '}
                                        Ауданға өту
                                    </Button>
                                </Link>
                                <a
                                    href={`/subsoil-users/${subsoilUser.id}/passport`}
                                    className="w-full"
                                >
                                    <Button className="w-full bg-[#c8a44e] shadow-none hover:bg-[#b8943e]">
                                        <Download className="mr-2 h-4 w-4" />
                                        Объект паспортын жүктеу
                                    </Button>
                                </a>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Add Task Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h3 className="mb-4 text-lg font-bold text-[#0f1b3d]">
                            Жаңа кезең қосу
                        </h3>
                        <form onSubmit={handleTaskSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Тақырып *
                                </label>
                                <input
                                    type="text"
                                    value={taskForm.data.title}
                                    onChange={(e) => taskForm.setData('title', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f1b3d] focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Сипаттама
                                </label>
                                <textarea
                                    value={taskForm.data.description}
                                    onChange={(e) => taskForm.setData('description', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f1b3d] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Жауапты
                                </label>
                                <select
                                    value={taskForm.data.assigned_to}
                                    onChange={(e) => taskForm.setData('assigned_to', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f1b3d] focus:outline-none"
                                >
                                    <option value="">— Таңдаңыз —</option>
                                    {assignableUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name}
                                            {u.position ? ` — ${u.position}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Басталу күні
                                    </label>
                                    <input
                                        type="date"
                                        value={taskForm.data.start_date}
                                        onChange={(e) => taskForm.setData('start_date', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f1b3d] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Мерзімі
                                    </label>
                                    <input
                                        type="date"
                                        value={taskForm.data.due_date}
                                        onChange={(e) => taskForm.setData('due_date', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f1b3d] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowTaskModal(false); taskForm.reset(); }}
                                >
                                    Бас тарту
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#0f1b3d] hover:bg-[#1a2d5a]"
                                    disabled={taskForm.processing}
                                >
                                    Қосу
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
