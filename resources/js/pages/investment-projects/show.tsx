import React, { useState, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Calendar, Building2, MapPin, Users, Activity, FileText, ImageIcon, Download, AlertTriangle, Eye, Plus, X, Flag, CheckCircle2, Trash2, Search, Upload, XCircle } from 'lucide-react';
import ProjectGallerySlider from '@/components/project-gallery-slider';
import { useCanModify } from '@/hooks/use-can-modify';
import type { SharedData } from '@/types';

interface ProjectType {
    id: number;
    name: string;
}

interface Region {
    id: number;
    name: string;
}

interface User {
    id: number;
    name?: string;
    full_name?: string;
}

interface Photo {
    id: number;
    file_path: string;
    description?: string | null;
    gallery_date?: string | null;
    created_at?: string | null;
}

interface SectorEntity {
    id: number;
    name: string;
}

interface InvestmentProject {
    id: number;
    name: string;
    company_name?: string;
    description?: string;
    region_id: number;
    region?: Region;
    project_type_id: number;
    project_type?: ProjectType;
    sezs?: SectorEntity[];
    industrial_zones?: SectorEntity[];
    subsoil_users?: SectorEntity[];
    total_investment?: number;
    status: 'plan' | 'implementation' | 'launched' | 'suspended';
    start_date?: string;
    end_date?: string;
    creator?: User;
    executors?: User[];
    documents?: Array<{ id: number; name: string }>;
    issues?: Array<{ id: number; title: string; description?: string; status?: string; severity?: string }>;
    tasks?: ProjectTaskItem[];
    photos_count?: { photos_count: number } | number;
    geometry?: { lat: number; lng: number }[];
    created_at: string;
}

interface CompletionFile {
    id: number;
    file_path: string;
    file_name: string;
    type: 'document' | 'photo';
}

interface TaskCompletionItem {
    id: number;
    task_id: number;
    submitted_by: number;
    comment?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewer_comment?: string;
    reviewed_by?: number;
    reviewed_at?: string;
    created_at: string;
    submitter?: { id: number; full_name?: string };
    reviewer?: { id: number; full_name?: string };
    files: CompletionFile[];
}

interface ProjectTaskItem {
    id: number;
    title: string;
    description?: string;
    assigned_to: number;
    assignee?: {
        id: number;
        full_name?: string;
        name?: string;
        baskarma_type?: string | null;
        position?: string | null;
        role_model?: { id: number; display_name?: string };
    };
    start_date?: string;
    due_date?: string;
    status: 'new' | 'in_progress' | 'done' | 'rejected';
    completions?: TaskCompletionItem[];
    created_at: string;
}

interface UserOption {
    id: number;
    full_name?: string;
    role_model?: { id: number; name?: string; display_name?: string };
    baskarma_type?: string | null;
    region_id?: number | null;
    position?: string | null;
}

interface Props {
    project: InvestmentProject;
    mainGallery?: Photo[];
    renderPhotos?: Photo[];
    users?: UserOption[];
}

export default function Show({ project, mainGallery = [], renderPhotos = [], users = [] }: Props) {
    const canModify = useCanModify();
    const { auth } = usePage<SharedData>().props;
    const currentUserId = auth.user?.id;
    const isBaskarma = (auth.user?.role_model?.name || '').toLowerCase() === 'baskarma';
    const photosCount = typeof project.photos_count === 'number'
        ? project.photos_count
        : (project.photos_count as any)?.photos_count || 0;

    const statusMap: Record<string, { label: string; color: string }> = {
        plan: { label: 'Планирование', color: 'bg-blue-100 text-blue-800' },
        implementation: { label: 'Реализация', color: 'bg-amber-100 text-amber-800' },
        launched: { label: 'Запущен', color: 'bg-green-100 text-green-800' },
        suspended: { label: 'Приостановлен', color: 'bg-red-100 text-red-800' },
    };

    const getSectorDetails = () => {
        const details: string[] = [];

        const sezList = project.sezs?.length ? project.sezs : [];
        if (sezList.length > 0) {
            details.push(`СЭЗ: ${sezList.map((item) => item.name).join(', ')}`);
        }

        const industrialZonesList = project.industrial_zones?.length
            ? project.industrial_zones
            : [];
        if (industrialZonesList.length > 0) {
            details.push(
                `Индустриальные зоны: ${industrialZonesList
                    .map((item) => item.name)
                    .join(', ')}`
            );
        }

        const subsoilUsersList = project.subsoil_users?.length
            ? project.subsoil_users
            : [];
        if (subsoilUsersList.length > 0) {
            details.push(
                `Недропользование: ${subsoilUsersList
                    .map((item) => item.name)
                    .join(', ')}`
            );
        }

        return details;
    };

    const sectorDetails = getSectorDetails();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('kk-KZ', {
            style: 'currency',
            currency: 'KZT',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Roadmap state
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskStartDate, setTaskStartDate] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskAssignedTo, setTaskAssignedTo] = useState<number | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);
    const [taskFilter, setTaskFilter] = useState('all');

    const tasks = project.tasks || [];

    // Dot color based on deadline: green=done, red=overdue, amber=pending
    const getTaskDotColor = (task: ProjectTaskItem): string => {
        if (task.status === 'done') return 'bg-green-500';
        if (task.due_date) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const due = new Date(task.due_date);
            due.setHours(0, 0, 0, 0);
            if (due < now) return 'bg-red-500'; // overdue
        }
        return 'bg-amber-500';
    };

    const filteredTasks = tasks.filter((task) => {
        if (taskFilter === 'all') return true;
        // When user selects "Исполняется", show all amber (pending) tasks.
        if (taskFilter === 'in_progress') {
            return getTaskDotColor(task) === 'bg-amber-500';
        }
        return task.status === taskFilter;
    });

    // Ensure tasks are displayed in creation order (oldest first).
    // Some backends return newest-first; normalize here to show earliest-added first.
    const displayedTasks = filteredTasks.slice().sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return ta - tb;
    });

    const taskStatusMap: Record<string, { label: string; dotColor: string }> = {
        new: { label: 'Жаңа', dotColor: 'bg-amber-500' },
        in_progress: { label: 'Орындалуда', dotColor: 'bg-amber-500' },
        done: { label: 'Орындалды', dotColor: 'bg-green-500' },
        rejected: { label: 'Қабылданбады', dotColor: 'bg-red-500' },
    };

    // Only show baskarma role users in task assignment
    // Oblast baskarma → available for all projects
    // District baskarma → only for projects in their district
    const baskarmaUsers = users.filter((u) => {
        const roleName = (u.role_model?.name || '').toLowerCase();
        if (roleName !== 'baskarma') return false;
        // Oblast baskarma can be assigned to any project
        if (u.baskarma_type === 'oblast') return true;
        // District baskarma can only be assigned to their own district's projects
        if (u.baskarma_type === 'district' && u.region_id) {
            return u.region_id === project.region_id;
        }
        return true;
    });

    const filteredUsers = baskarmaUsers.filter((u) => {
        if (!userSearch.trim()) return true;
        const name = (u.full_name || '').toLowerCase();
        const role = (u.role_model?.display_name || '').toLowerCase();
        const q = userSearch.toLowerCase();
        return name.includes(q) || role.includes(q);
    });

    const handleTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle || !taskAssignedTo) return;
        setIsSubmittingTask(true);

        router.post(
            `/investment-projects/${project.id}/tasks`,
            {
                title: taskTitle,
                description: taskDescription || null,
                start_date: taskStartDate || null,
                due_date: taskDueDate || null,
                assigned_to: taskAssignedTo,
            },
            {
                onSuccess: () => {
                    setTaskTitle('');
                    setTaskDescription('');
                    setTaskStartDate('');
                    setTaskDueDate('');
                    setTaskAssignedTo(null);
                    setUserSearch('');
                    setIsSubmittingTask(false);
                    setShowTaskModal(false);
                },
                onError: () => setIsSubmittingTask(false),
            },
        );
    };

    const handleTaskStatusToggle = (task: ProjectTaskItem) => {
        const nextStatus = task.status === 'done' ? 'new' : 'done';
        router.put(`/investment-projects/${project.id}/tasks/${task.id}`, {
            status: nextStatus,
        });
    };

    const handleTaskDelete = (taskId: number) => {
        if (confirm('Осы этапты өшіргіңіз келе ме?')) {
            router.delete(
                `/investment-projects/${project.id}/tasks/${taskId}`,
            );
        }
    };

    const selectedUser = users.find((u) => u.id === taskAssignedTo);

    // Completion submission state (for baskarma)
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionTaskId, setCompletionTaskId] = useState<number | null>(null);
    const [completionComment, setCompletionComment] = useState('');
    const [completionDocuments, setCompletionDocuments] = useState<File[]>([]);
    const [completionPhotos, setCompletionPhotos] = useState<File[]>([]);
    const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
    const completionDocRef = useRef<HTMLInputElement>(null);
    const completionPhotoRef = useRef<HTMLInputElement>(null);

    // Review modal state (for исполнитель)
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewCompletion, setReviewCompletion] = useState<TaskCompletionItem | null>(null);
    const [reviewTask, setReviewTask] = useState<ProjectTaskItem | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);

    const handleOpenCompletionModal = (taskId: number) => {
        setCompletionTaskId(taskId);
        setCompletionComment('');
        setCompletionDocuments([]);
        setCompletionPhotos([]);
        setShowCompletionModal(true);
    };

    const handleCompletionDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setCompletionDocuments(Array.from(e.target.files));
        }
    };

    const handleCompletionPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setCompletionPhotos(Array.from(e.target.files));
        }
    };

    const handleCompletionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!completionTaskId) return;
        setIsSubmittingCompletion(true);

        const formData = new FormData();
        if (completionComment) formData.append('comment', completionComment);
        completionDocuments.forEach((file) => formData.append('documents[]', file));
        completionPhotos.forEach((file) => formData.append('photos[]', file));

        router.post(
            `/investment-projects/${project.id}/tasks/${completionTaskId}/completions`,
            formData,
            {
                forceFormData: true,
                onSuccess: () => {
                    setShowCompletionModal(false);
                    setCompletionTaskId(null);
                    setCompletionComment('');
                    setCompletionDocuments([]);
                    setCompletionPhotos([]);
                    setIsSubmittingCompletion(false);
                },
                onError: () => setIsSubmittingCompletion(false),
            },
        );
    };

    const handleOpenReview = (task: ProjectTaskItem, completion: TaskCompletionItem) => {
        setReviewTask(task);
        setReviewCompletion(completion);
        setReviewComment('');
        setShowReviewModal(true);
    };

    const handleReview = (status: 'approved' | 'rejected') => {
        if (!reviewCompletion || !reviewTask) return;
        setIsReviewing(true);
        router.put(
            `/investment-projects/${project.id}/tasks/${reviewTask.id}/completions/${reviewCompletion.id}/review`,
            {
                status,
                reviewer_comment: reviewComment || null,
            },
            {
                onSuccess: () => {
                    setShowReviewModal(false);
                    setReviewCompletion(null);
                    setReviewTask(null);
                    setReviewComment('');
                    setIsReviewing(false);
                },
                onError: () => setIsReviewing(false),
            },
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Проекты', href: '/investment-projects' },
                { title: project.name, href: '' },
            ]}
        >
            <Head title={project.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 w-full">
                {/* Back link */}
                {/* <Link href="/investment-projects" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Назад к списку
                </Link> */}
                  <button
                    type='button'
                    onClick={() => window.history.back()}
                    className='inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors'
                >
                    <ArrowLeft className='h-4 w-4 mr-1' /> Назад к списку
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Project Banner + Info */}
                        <Card className="overflow-hidden shadow-none py-0">
                            {/* Banner Header */}
                            <div className="bg-gray-900 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white">
                                        <Activity className="h-5 w-5" />
                                        <h1 className="text-xl font-bold">
                                            Проект № {project.id} - {project.name}
                                        </h1>
                                    </div>
                                    <Badge className={`${statusMap[project.status]?.color || 'bg-gray-100 text-gray-800'} px-3 py-1 text-sm font-medium border-0`}>
                                        {statusMap[project.status]?.label || project.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Photo + Info Cards */}
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                    {/* Photo */}
                                    <div className="overflow-hidden rounded-lg md:col-span-2">
                                        {mainGallery.length > 0 && mainGallery[0]?.gallery_date && (
                                            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>
                                                    {new Date(mainGallery[0].gallery_date).toLocaleDateString('ru-RU', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                        <ProjectGallerySlider photos={mainGallery} />
                                    </div>

                                    {/* Info Cards */}
                                    <div className="md:col-span-3 grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <MapPin className="h-3.5 w-3.5" /> Район
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {project.region?.name || 'Не указан'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <FileText className="h-3.5 w-3.5" /> Тип проекта
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {project.project_type?.name || 'Не указан'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Building2 className="h-3.5 w-3.5" /> Сумма инвестиций
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {project.total_investment
                                                    ? formatCurrency(project.total_investment)
                                                    : 'Не указана'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Calendar className="h-3.5 w-3.5" /> Даты реализации
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {project.start_date
                                                    ? new Date(project.start_date).toLocaleDateString()
                                                    : '...'}
                                                {' — '}
                                                {project.end_date
                                                    ? new Date(project.end_date).toLocaleDateString()
                                                    : '...'}
                                            </p>
                                        </div>
                                        <div className="col-span-2 rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Users className="h-3.5 w-3.5" /> Куратор
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {project.creator?.full_name || project.creator?.name || 'Не указан'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            {/* Company & Description */}
                            <div className="border-t border-gray-200 px-6 py-5">
                                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                    <Building2 className="h-5 w-5 text-gray-500" />
                                    {project.company_name || 'Компания не указана'}
                                </h2>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {project.description || 'Описание отсутствует.'}
                                </p>
                            </div>

                            {/* Issues / Проблемные вопросы */}
                            {project.issues && project.issues.length > 0 && (
                                <div className="border-t border-gray-200 px-6 py-5">
                                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                        <AlertTriangle className="h-5 w-5 text-red-500" />
                                        Проблемные вопросы
                                        <span className="ml-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-100 px-2 text-xs font-bold text-red-700">
                                            {project.issues.length}
                                        </span>
                                    </h2>
                                    <div className="space-y-3">
                                        {project.issues.map((issue) => {
                                            const severityStyles: Record<string, string> = {
                                                high: 'border-red-200 bg-red-50',
                                                medium: 'border-amber-200 bg-amber-50',
                                                low: 'border-blue-200 bg-blue-50',
                                                critical: 'border-red-300 bg-red-100',
                                            };
                                            const severityLabels: Record<string, string> = {
                                                high: 'Высокий',
                                                medium: 'Средний',
                                                low: 'Низкий',
                                                critical: 'Критический',
                                            };
                                            const severityDot: Record<string, string> = {
                                                high: 'bg-red-500',
                                                medium: 'bg-amber-500',
                                                low: 'bg-blue-500',
                                                critical: 'bg-red-600',
                                            };
                                            const statusLabels: Record<string, string> = {
                                                open: 'Открыт',
                                                in_progress: 'В работе',
                                                resolved: 'Решён',
                                            };
                                            const style = severityStyles[issue.severity || ''] || 'border-gray-200 bg-gray-50';
                                            return (
                                                <div key={issue.id} className={`rounded-lg border p-4 ${style}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[issue.severity || ''] || 'bg-gray-400'}`} />
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-gray-900">{issue.title}</p>
                                                                {issue.description && (
                                                                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{issue.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-2">
                                                            {issue.severity && (
                                                                <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                    {severityLabels[issue.severity] || issue.severity}
                                                                </span>
                                                            )}
                                                            {issue.status && (
                                                                <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                    {statusLabels[issue.status] || issue.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4">
                                        <Link
                                            href={`/investment-projects/${project.id}/issues`}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            Все проблемные вопросы →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Roadmap / Дорожная карта */}
                        <Card className="shadow-none overflow-hidden py-0">
                            <div className="bg-gray-900 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white">
                                        <Flag className="h-5 w-5" />
                                        <h2 className="text-lg font-bold">
                                            Дорожная карта
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={taskFilter}
                                            onValueChange={setTaskFilter}
                                        >
                                            <SelectTrigger className="h-9 w-[160px] border-white/30 bg-white/20 text-white text-sm focus:ring-white/50 [&>svg]:text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Все этапы
                                                </SelectItem>
                                                <SelectItem value="new">
                                                    Новый
                                                </SelectItem>
                                                <SelectItem value="in_progress">
                                                    Исполняется
                                                </SelectItem>
                                                <SelectItem value="done">
                                                    Выполнено
                                                </SelectItem>
                                                <SelectItem value="rejected">
                                                    Отклонено
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {canModify && !isBaskarma && (
                                            <Button
                                                size="icon"
                                                className="h-9 w-9 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                                                onClick={() =>
                                                    setShowTaskModal(true)
                                                }
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
                                        <p className="text-gray-500">
                                            Нет этапов
                                        </p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Нажмите +, чтобы добавить новый этап
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {displayedTasks.map((task) => {
                                            const isAssignedToMe = task.assigned_to === currentUserId;
                                            const pendingCompletion = task.completions?.find(c => c.status === 'pending');
                                            const latestCompletion = task.completions?.length
                                                ? task.completions[task.completions.length - 1]
                                                : null;

                                            return (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                                            >
                                                <div
                                                    className={`h-3 w-3 flex-shrink-0 rounded-full ${getTaskDotColor(task)}`}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-gray-900">
                                                        {task.title}:
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {task.start_date && (
                                                            <>
                                                                {new Date(task.start_date).toLocaleDateString('ru-RU', {
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric',
                                                                })}
                                                                {' — '}
                                                            </>
                                                        )}
                                                        {task.due_date
                                                            ? new Date(
                                                                  task.due_date,
                                                              ).toLocaleDateString(
                                                                  'ru-RU',
                                                                  {
                                                                      day: 'numeric',
                                                                      month: 'long',
                                                                      year: 'numeric',
                                                                  },
                                                              )
                                                            : 'Мерзімі белгіленбеген'}
                                                    </p>
                                                    {task.assignee && (
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {task.assignee.baskarma_type === 'oblast'
                                                                ? 'Областной:'
                                                                : task.assignee.baskarma_type === 'district'
                                                                    ? 'Районная:'
                                                                    : ''}
                                                            {' '}
                                                            {task.assignee.full_name || task.assignee.name || '—'}
                                                            {task.assignee.position && ` — ${task.assignee.position}`}
                                                        </p>
                                                    )}
                                                    {/* Status badge for completion */}
                                                    {latestCompletion && (
                                                        <div>
                                                            <Badge className={`mt-1 text-xs border-0 ${
                                                                latestCompletion.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                latestCompletion.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-amber-100 text-amber-700'
                                                            }`}>
                                                                {latestCompletion.status === 'approved' ? 'Принято' :
                                                                 latestCompletion.status === 'rejected' ? 'Отклонено' :
                                                                 'На проверке'}
                                                            </Badge>
                                                            {latestCompletion.status === 'rejected' && latestCompletion.reviewer_comment && (
                                                                <p className="mt-1 text-xs text-red-600">
                                                                    <span className="font-semibold">Потому что:</span> {latestCompletion.reviewer_comment}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Baskarma: submit completion (when task is new or rejected) */}
                                                    {/* Baskarma: submit completion (when task is new or rejected) */}
                                                    {isBaskarma && isAssignedToMe && (task.status === 'new' || task.status === 'rejected') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-xs border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                                                            onClick={() => handleOpenCompletionModal(task.id)}
                                                        >
                                                            <Upload className="mr-1 h-3.5 w-3.5" />
                                                            Отправить
                                                        </Button>
                                                    )}
                                                    {/* Исполнитель: review pending completion */}
                                                    {canModify && !isBaskarma && pendingCompletion && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                                            onClick={() => handleOpenReview(task, pendingCompletion)}
                                                        >
                                                            <Eye className="mr-1 h-3.5 w-3.5" />
                                                            Проверить
                                                        </Button>
                                                    )}
                                                    {canModify && !isBaskarma && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() =>
                                                                handleTaskDelete(
                                                                    task.id,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Information */}
                    <div className="space-y-6">
                        {/* Render Photos Card */}
                        {renderPhotos.length > 0 && (
                            <Card className="shadow-none overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Eye className="h-5 w-5 text-gray-500" />
                                        Видение будущего
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ProjectGallerySlider photos={renderPhotos} />
                                </CardContent>
                            </Card>
                        )}

                        {/* Executors Card */}
                        <Card className='shadow-none'>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-gray-500" />
                                    Участники
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ответственный</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {(project.creator?.full_name || project.creator?.name)?.slice(0, 2).toUpperCase() || 'NA'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{project.creator?.full_name || project.creator?.name || 'Не указан'}</p>
                                            <p className="text-xs text-gray-500">Куратор проекта</p>
                                        </div>
                                    </div>
                                </div>

                                {project.executors && project.executors.length > 0 && (
                                    <div>
                                        <div className="h-px bg-gray-100 my-4"></div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Исполнители</p>
                                        <div className="flex flex-col gap-3">
                                            {project.executors.map(executor => (
                                                <div key={executor.id} className="flex items-center gap-3">
                                                    <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-[10px]">
                                                        {(executor.full_name || executor.name)?.slice(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <p className="text-sm text-gray-700">{executor.full_name || executor.name || '—'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card className='shadow-none'>
                            <CardContent className="p-4 flex flex-col gap-3">
                                {canModify && (
                                    <Link href={`/investment-projects/${project.id}/edit`} className="w-full">
                                        <Button variant="outline" className="w-full justify-start">
                                            <Activity className="mr-2 h-4 w-4" /> Редактировать проект
                                        </Button>
                                    </Link>
                                )}
                                <Link href={`/investment-projects/${project.id}/documents`} className="w-full">
                                    <Button variant="outline" className="w-full justify-start">
                                        <FileText className="mr-2 h-4 w-4" />
                                        Документы
                                        {project.documents && project.documents.length > 0 && (
                                            <span className="ml-auto bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                                                {project.documents.length}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <Link href={`/investment-projects/${project.id}/gallery`} className="w-full">
                                    <Button variant="outline" className="w-full justify-start">
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        Галерея
                                        {photosCount > 0 && (
                                            <span className="ml-auto bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                                                {photosCount}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <Link href={`/investment-projects/${project.id}/issues`} className="w-full">
                                    <Button variant="outline" className="w-full justify-start">
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Проблемные вопросы
                                        {project.issues && project.issues.length > 0 && (
                                            <span className="ml-auto bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs">
                                                {project.issues.length}
                                            </span>
                                        )}
                                    </Button>
                                </Link>
                                <a
                                    href={`/investment-projects/${project.id}/passport`}
                                    className="w-full"
                                >
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                        <Download className="mr-2 h-4 w-4" />
                                        Скачать паспорт проекта
                                    </Button>
                                </a>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Task Modal */}
                {showTaskModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
                            <div className="flex items-center justify-between rounded-t-xl bg-gray-900 px-6 py-4">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                    <Flag className="h-5 w-5" />
                                    Добавить этап к проекту
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowTaskModal(false)}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form
                                onSubmit={handleTaskSubmit}
                                className="p-6 space-y-5"
                            >
                                <div>
                                    <Label className="text-sm font-semibold text-gray-900">
                                        Название темы (модуля)
                                    </Label>
                                    <Input
                                        value={taskTitle}
                                        onChange={(e) =>
                                            setTaskTitle(e.target.value)
                                        }
                                        placeholder="Тема"
                                        className="mt-1.5"
                                        required
                                    />
                                </div>

                                <div>
                                    <Label className="text-sm font-semibold text-gray-900">
                                        Описание
                                    </Label>
                                    <textarea
                                        value={taskDescription}
                                        onChange={(e) =>
                                            setTaskDescription(e.target.value)
                                        }
                                        placeholder="Описание"
                                        className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-semibold text-gray-900">
                                            Дата начала
                                        </Label>
                                        <Input
                                            type="date"
                                            value={taskStartDate}
                                            onChange={(e) =>
                                                setTaskStartDate(
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1.5"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold text-gray-900">
                                            Дата окончания
                                        </Label>
                                        <Input
                                            type="date"
                                            value={taskDueDate}
                                            onChange={(e) =>
                                                setTaskDueDate(e.target.value)
                                            }
                                            className="mt-1.5"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-semibold text-gray-900">
                                        Назначить ответственного
                                    </Label>
                                    <div className="relative mt-1.5">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            value={userSearch}
                                            onChange={(e) =>
                                                setUserSearch(e.target.value)
                                            }
                                            placeholder="Поиск"
                                            className="pl-9"
                                        />
                                    </div>
                                    <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200">
                                        {filteredUsers.length === 0 ? (
                                            <p className="px-4 py-3 text-sm text-gray-400">
                                               Пользователи не найдены
                                            </p>
                                        ) : (
                                            filteredUsers.map((u, idx) => (
                                                <div
                                                    key={u.id}
                                                    className={`flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer ${
                                                        taskAssignedTo === u.id
                                                            ? 'bg-cyan-50'
                                                            : ''
                                                    } ${
                                                        idx > 0
                                                            ? 'border-t border-gray-100'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        setTaskAssignedTo(u.id)
                                                    }
                                                >
                                                    <span className="text-gray-700">
                                                        <span className="mr-2 text-gray-400">
                                                            {idx + 1}
                                                        </span>
                                                        {u.baskarma_type ===
                                                        'oblast'
                                                            ? 'Областной'
                                                            : 'Районная'}
                                                        : {u.full_name || '—'}
                                                        {u.position &&
                                                            ` — ${u.position}`}
                                                    </span>
                                                    {taskAssignedTo ===
                                                        u.id && (
                                                        <span className="rounded-md bg-cyan-500 px-3 py-1 text-xs font-medium text-white">
                                                            Таңдау
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {selectedUser && (
                                        <p className="mt-2 text-sm text-cyan-600">
                                            Таңдалды:{' '}
                                            <span className="font-medium">
                                                {selectedUser.full_name}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="bg-emerald-500 hover:bg-emerald-600"
                                        disabled={
                                            !taskTitle ||
                                            !taskAssignedTo ||
                                            isSubmittingTask
                                        }
                                    >
                                        {isSubmittingTask
                                            ? 'Сақталуда...'
                                            : 'Сохранить'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-gray-600 bg-gray-600 text-white hover:bg-gray-700 hover:text-white"
                                        onClick={() =>
                                            setShowTaskModal(false)
                                        }
                                    >
                                        Отмена
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Completion Submission Modal (for baskarma) */}
                {showCompletionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
                            <div className="flex items-center justify-between rounded-t-xl bg-gray-900 px-6 py-4">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                    <Upload className="h-5 w-5" />
                                    Подтвердите выполнение задачи!
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowCompletionModal(false)}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCompletionSubmit} className="p-6 space-y-5">
                                <div>
                                    <Label className="text-sm font-semibold text-gray-900">
                                        <FileText className="mr-1 inline h-4 w-4" />
                                        Документы (файлы)
                                    </Label>
                                    <input
                                        ref={completionDocRef}
                                        type="file"
                                        multiple
                                        onChange={handleCompletionDocChange}
                                        className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-cyan-50 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-cyan-700 hover:file:bg-cyan-100"
                                    />
                                    {completionDocuments.length > 0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            {completionDocuments.length} документ выбран
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-sm font-semibold text-gray-900">
                                        <ImageIcon className="mr-1 inline h-4 w-4" />
                                        Изображения
                                    </Label>
                                    <input
                                        ref={completionPhotoRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleCompletionPhotoChange}
                                        className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
                                    />
                                    {completionPhotos.length > 0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            {completionPhotos.length} изображение выбрано
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-sm font-semibold text-gray-900">
                                        Комментарий
                                    </Label>
                                    <textarea
                                        value={completionComment}
                                        onChange={(e) => setCompletionComment(e.target.value)}
                                        placeholder="Введите комментарий..."
                                        className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                        rows={4}
                                    />
                                </div>

                                <div className="flex justify-center gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="bg-emerald-500 hover:bg-emerald-600 px-8"
                                        disabled={isSubmittingCompletion}
                                    >
                                        {isSubmittingCompletion ? 'Отправка...' : 'Да'}
                                    </Button>
                                    <Button
                                        type="button"
                                        className="bg-red-500 hover:bg-red-600 px-8"
                                        onClick={() => setShowCompletionModal(false)}
                                    >
                                        Нет
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Review Completion Modal (for исполнитель) */}
                {showReviewModal && reviewCompletion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="mx-4 w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
                            <div className="flex items-center justify-between bg-gray-900 px-6 py-4">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                    <Eye className="h-5 w-5" />
                                    Проверить задание
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowReviewModal(false);
                                        setReviewCompletion(null);
                                        setReviewTask(null);
                                    }}
                                    className="text-white/80 transition-colors hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
                                {/* Task info */}
                                {reviewTask && (
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Тапсырма
                                        </p>
                                        <p className="mt-1 font-semibold text-gray-900">
                                            {reviewTask.title}
                                        </p>
                                        {reviewTask.description && (
                                            <p className="mt-1 text-sm text-gray-600">
                                                {reviewTask.description}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Who submitted */}
                                <div className="rounded-lg border border-gray-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                        Отправил
                                    </p>
                                    <p className="mt-1 font-medium text-gray-900">
                                        {reviewCompletion.submitter?.full_name || '—'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(reviewCompletion.created_at).toLocaleString('kk-KZ')}
                                    </p>
                                </div>

                                {/* Comment */}
                                {reviewCompletion.comment && (
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Комментарий
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                                            {reviewCompletion.comment}
                                        </p>
                                    </div>
                                )}

                                {/* Files */}
                                {reviewCompletion.files && reviewCompletion.files.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Файлы
                                        </p>
                                        <div className="space-y-2">
                                            {reviewCompletion.files.map((file) => (
                                                <div
                                                    key={file.id}
                                                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                                                >
                                                    {file.type === 'photo' ? (
                                                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                                                            <img
                                                                src={`/storage/${file.file_path}`}
                                                                alt={file.file_name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                                            <FileText className="h-5 w-5 text-gray-500" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-gray-900">
                                                            {file.file_name}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {file.type === 'photo' ? 'Изображение' : 'Документ'}
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={`/storage/${file.file_path}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Review form */}
                                <div className="space-y-4 border-t border-gray-200 pt-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-900">
                                            Комментарий
                                        </label>
                                        <textarea
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            placeholder="Комментарий жазыңыз..."
                                            className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex justify-center gap-3">
                                        <Button
                                            onClick={() => handleReview('approved')}
                                            className="bg-emerald-500 hover:bg-emerald-600 px-8"
                                            disabled={isReviewing}
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Да
                                        </Button>
                                        <Button
                                            onClick={() => handleReview('rejected')}
                                            className="bg-red-500 hover:bg-red-600 px-8"
                                            disabled={isReviewing}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Нет
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
