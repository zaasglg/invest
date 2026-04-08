import { Head, Link, router, usePage } from '@inertiajs/react';
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
    Search,
    Trash2,
    X,
    Upload,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import React, { useState, useMemo, useRef } from 'react';
import ProjectGallerySlider from '@/components/project-gallery-slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';

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
    name?: string;
    position?: string;
    baskarma_type?: string;
    role_model?: { name: string; display_name?: string };
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
    files: CompletionFile[];
}

interface SubsoilTaskItem {
    id: number;
    title: string;
    description?: string;
    assigned_to?: number;
    start_date?: string;
    due_date?: string;
    status: 'new' | 'in_progress' | 'done' | 'rejected';
    assignee?: AssignableUser;
    completions?: TaskCompletionItem[];
    created_at?: string;
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
    const page = usePage<{
        auth: { user: { id: number; role_model?: { name: string } } };
    }>();
    const { auth } = page.props;
    const currentUserId = auth.user?.id;
    const url = page.url;
    const isIspolnitel =
        (auth.user.role_model?.name || '').toLowerCase() === 'ispolnitel';
    const photosCount =
        typeof subsoilUser.photos_count === 'number'
            ? subsoilUser.photos_count
            : 0;

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskFilter, setTaskFilter] = useState('all');

    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskStartDate, setTaskStartDate] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskAssignedTo, setTaskAssignedTo] = useState<number | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);

    // Completion submission state (for ispolnitel)
    const MAX_COMPLETION_FILE_SIZE = 20 * 1024 * 1024;
    const MAX_COMPLETION_TOTAL_SIZE = 45 * 1024 * 1024;
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionTaskId, setCompletionTaskId] = useState<number | null>(
        null,
    );
    const [completionComment, setCompletionComment] = useState('');
    const [completionDocuments, setCompletionDocuments] = useState<File[]>([]);
    const [completionPhotos, setCompletionPhotos] = useState<File[]>([]);
    const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
    const [completionFileError, setCompletionFileError] = useState<
        string | null
    >(null);
    const completionDocRef = useRef<HTMLInputElement>(null);
    const completionPhotoRef = useRef<HTMLInputElement>(null);

    // Review modal state (for curator/superadmin)
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewCompletion, setReviewCompletion] =
        useState<TaskCompletionItem | null>(null);
    const [reviewTask, setReviewTask] = useState<SubsoilTaskItem | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);

    const filteredUsers = useMemo(() => {
        const ispolnitelUsers = assignableUsers.filter((u) => {
            const roleName = (u.role_model?.name || '').toLowerCase();
            return roleName === 'ispolnitel';
        });
        if (!userSearch.trim()) return ispolnitelUsers;
        const q = userSearch.toLowerCase();
        return ispolnitelUsers.filter((u) => {
            const name = (u.full_name || '').toLowerCase();
            const pos = (u.position || '').toLowerCase();
            return name.includes(q) || pos.includes(q);
        });
    }, [assignableUsers, userSearch]);

    const selectedUser =
        assignableUsers.find((u) => u.id === taskAssignedTo) || null;

    const tasks = subsoilUser.tasks ?? [];

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

    const isTaskOverdue = (task: SubsoilTaskItem): boolean => {
        if (task.status === 'done') return false;
        if (!task.due_date) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(task.due_date);
        due.setHours(0, 0, 0, 0);
        return due < now;
    };

    const filteredTasks = tasks.filter((t) => {
        if (taskFilter === 'all') return true;
        if (taskFilter === 'overdue') return isTaskOverdue(t);
        if (taskFilter === 'in_progress') {
            return getTaskDotColor(t) === 'bg-amber-500';
        }
        return t.status === taskFilter;
    });

    // Ensure tasks are displayed in creation order (oldest first).
    const displayedTasks = filteredTasks.slice().sort((a, b) => {
        const ta = new Date(a.created_at || '').getTime();
        const tb = new Date(b.created_at || '').getTime();
        return ta - tb;
    });

    const handleTaskDelete = (taskId: number) => {
        if (confirm('Осы кезеңді жоюға сенімдісіз бе?')) {
            router.delete(`/subsoil-users/${subsoilUser.id}/tasks/${taskId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle || !taskAssignedTo) return;
        setIsSubmittingTask(true);
        router.post(
            `/subsoil-users/${subsoilUser.id}/tasks`,
            {
                title: taskTitle,
                description: taskDescription,
                assigned_to: taskAssignedTo,
                start_date: taskStartDate,
                due_date: taskDueDate,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTaskTitle('');
                    setTaskDescription('');
                    setTaskStartDate('');
                    setTaskDueDate('');
                    setTaskAssignedTo(null);
                    setUserSearch('');
                    setShowTaskModal(false);
                },
                onFinish: () => setIsSubmittingTask(false),
            },
        );
    };

    const handleOpenCompletionModal = (taskId: number) => {
        setCompletionTaskId(taskId);
        setCompletionComment('');
        setCompletionDocuments([]);
        setCompletionPhotos([]);
        setCompletionFileError(null);
        setShowCompletionModal(true);
    };

    const handleCompletionDocChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const oversized = files.find(
                (f) => f.size > MAX_COMPLETION_FILE_SIZE,
            );
            if (oversized) {
                setCompletionFileError(
                    `"${oversized.name}" файлы өте үлкен (${(oversized.size / 1024 / 1024).toFixed(1)}MB). Максимум ${MAX_COMPLETION_FILE_SIZE / 1024 / 1024}MB.`,
                );
                setCompletionDocuments([]);
                if (completionDocRef.current)
                    completionDocRef.current.value = '';
                return;
            }
            setCompletionFileError(null);
            setCompletionDocuments(files);
        }
    };

    const handleCompletionPhotoChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const oversized = files.find(
                (f) => f.size > MAX_COMPLETION_FILE_SIZE,
            );
            if (oversized) {
                setCompletionFileError(
                    `"${oversized.name}" файлы өте үлкен (${(oversized.size / 1024 / 1024).toFixed(1)}MB). Максимум ${MAX_COMPLETION_FILE_SIZE / 1024 / 1024}MB.`,
                );
                setCompletionPhotos([]);
                if (completionPhotoRef.current)
                    completionPhotoRef.current.value = '';
                return;
            }
            setCompletionFileError(null);
            setCompletionPhotos(files);
        }
    };

    const handleCompletionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!completionTaskId) return;

        const allFiles = [...completionDocuments, ...completionPhotos];
        const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > MAX_COMPLETION_TOTAL_SIZE) {
            setCompletionFileError(
                `Файлдардың жалпы көлемі (${(totalSize / 1024 / 1024).toFixed(1)}MB) шектен асып кетті (${MAX_COMPLETION_TOTAL_SIZE / 1024 / 1024}MB). Кішірек файлдарды таңдаңыз.`,
            );
            return;
        }

        setIsSubmittingCompletion(true);

        const formData = new FormData();
        if (completionComment) formData.append('comment', completionComment);
        completionDocuments.forEach((file) =>
            formData.append('documents[]', file),
        );
        completionPhotos.forEach((file) => formData.append('photos[]', file));

        router.post(
            `/subsoil-users/${subsoilUser.id}/tasks/${completionTaskId}/completions`,
            formData,
            {
                forceFormData: true,
                preserveScroll: true,
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

    const handleOpenReview = (
        task: SubsoilTaskItem,
        completion: TaskCompletionItem,
    ) => {
        setReviewTask(task);
        setReviewCompletion(completion);
        setReviewComment('');
        setShowReviewModal(true);
    };

    const handleReview = (status: 'approved' | 'rejected') => {
        if (!reviewCompletion || !reviewTask) return;
        setIsReviewing(true);
        router.put(
            `/subsoil-users/${subsoilUser.id}/tasks/${reviewTask.id}/completions/${reviewCompletion.id}/review`,
            {
                status,
                reviewer_comment: reviewComment || null,
            },
            {
                preserveScroll: true,
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

    const licenseStatusMap: Record<string, { label: string; color: string }> = {
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
                    title: subsoilUser.region?.name || 'Аймақ',
                    href: `/regions/${subsoilUser.region?.id}`,
                },
                { title: subsoilUser.name, href: '' },
            ]}
        >
            <Head title={subsoilUser.name} />

            <div className="flex h-full w-full flex-1 flex-col gap-6 p-6">
                {/* Back link */}
                <Link
                    href={`/subsoil-users`}
                    className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[#0f1b3d]"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Тізімге қайту
                </Link>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Banner + Info */}
                        <Card className="overflow-hidden py-0 shadow-none">
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
                                                {subsoilUser.bin ||
                                                    'Көрсетілмеген'}
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
                                                Number(subsoilUser.total_area) >
                                                    0
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
                                <p className="leading-relaxed whitespace-pre-wrap text-gray-700">
                                    {subsoilUser.description ||
                                        'Сипаттама жоқ.'}
                                </p>
                            </div>

                            {/* Проблемалық мәселелер */}
                            <div className="border-t border-gray-200 px-6 py-5">
                                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#0f1b3d]">
                                    <AlertTriangle className="h-5 w-5 text-gray-500" />
                                    Проблемалық мәселелер
                                    {issues.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-2"
                                        >
                                            {issues.length}
                                        </Badge>
                                    )}
                                </h2>
                                {issues.length > 0 ? (
                                    <div className="space-y-3">
                                        {issues.map((issue) => {
                                            const severityMap: Record<
                                                string,
                                                { label: string; color: string }
                                            > = {
                                                low: {
                                                    label: 'Төмен',
                                                    color: 'bg-blue-100 text-blue-800',
                                                },
                                                medium: {
                                                    label: 'Орта',
                                                    color: 'bg-amber-100 text-amber-800',
                                                },
                                                high: {
                                                    label: 'Жоғары',
                                                    color: 'bg-red-100 text-red-800',
                                                },
                                            };
                                            const issueStatusMap: Record<
                                                string,
                                                { label: string; color: string }
                                            > = {
                                                open: {
                                                    label: 'Ашық',
                                                    color: 'bg-red-100 text-red-800',
                                                },
                                                in_progress: {
                                                    label: 'Жұмыста',
                                                    color: 'bg-amber-100 text-amber-800',
                                                },
                                                resolved: {
                                                    label: 'Шешілді',
                                                    color: 'bg-green-100 text-green-800',
                                                },
                                            };
                                            return (
                                                <div
                                                    key={issue.id}
                                                    className="rounded-lg border p-3"
                                                >
                                                    <div className="mb-1 flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-[#0f1b3d]">
                                                            {issue.description}
                                                        </p>
                                                        <div className="flex gap-1">
                                                            {issue.severity && (
                                                                <Badge
                                                                    className={`${severityMap[issue.severity]?.color || 'bg-gray-100 text-gray-800'} border-0 text-[10px]`}
                                                                >
                                                                    {severityMap[
                                                                        issue
                                                                            .severity
                                                                    ]?.label ||
                                                                        issue.severity}
                                                                </Badge>
                                                            )}
                                                            {issue.status && (
                                                                <Badge
                                                                    className={`${issueStatusMap[issue.status]?.color || 'bg-gray-100 text-gray-800'} border-0 text-[10px]`}
                                                                >
                                                                    {issueStatusMap[
                                                                        issue
                                                                            .status
                                                                    ]?.label ||
                                                                        issue.status}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <Link
                                            href={`/subsoil-users/${subsoilUser.id}/issues`}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-[#0f1b3d] transition-colors hover:text-[#c8a44e]"
                                        >
                                            Барлық проблемалық мәселелер →
                                        </Link>
                                    </div>
                                ) : (
                                    <p className="py-2 text-center text-sm text-gray-500">
                                        Проблемалық мәселелер жоқ
                                    </p>
                                )}
                            </div>
                        </Card>

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
                                        <Select
                                            value={taskFilter}
                                            onValueChange={setTaskFilter}
                                        >
                                            <SelectTrigger className="h-9 w-[160px] border-white/30 bg-white/20 text-sm text-white focus:ring-white/50 [&>svg]:text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Барлық кезеңдер
                                                </SelectItem>
                                                <SelectItem value="new">
                                                    Жаңа
                                                </SelectItem>
                                                <SelectItem value="in_progress">
                                                    Орындалуда
                                                </SelectItem>
                                                <SelectItem value="done">
                                                    Орындалды
                                                </SelectItem>
                                                <SelectItem value="rejected">
                                                    Қабылданбады
                                                </SelectItem>
                                                <SelectItem value="overdue">
                                                    Мерзімі өткен
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {canModify && !isIspolnitel && (
                                            <Button
                                                size="icon"
                                                className="h-9 w-9 border border-white/30 bg-white/20 text-white hover:bg-white/30"
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
                                            Кезеңдер жоқ
                                        </p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Жаңа кезең қосу үшін + басыңыз
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {displayedTasks.map((task) => {
                                            const isAssignedToMe =
                                                task.assigned_to ===
                                                currentUserId;
                                            const pendingCompletion =
                                                task.completions?.find(
                                                    (c) =>
                                                        c.status === 'pending',
                                                );
                                            const latestCompletion = task
                                                .completions?.length
                                                ? task.completions[
                                                      task.completions.length -
                                                          1
                                                  ]
                                                : null;

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
                                                >
                                                    <div
                                                        className={`h-3 w-3 flex-shrink-0 rounded-full ${getTaskDotColor(task)}`}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-[#0f1b3d]">
                                                            {task.title}:
                                                        </p>
                                                        {/* {task.description && (
                                                        <p className="mt-0.5 text-sm text-gray-600">
                                                            {task.description}
                                                        </p>
                                                    )} */}
                                                        <p className="text-sm text-gray-500">
                                                            {task.start_date && (
                                                                <>
                                                                    {new Date(
                                                                        task.start_date,
                                                                    ).toLocaleDateString(
                                                                        'kk-KZ',
                                                                        {
                                                                            day: 'numeric',
                                                                            month: 'long',
                                                                            year: 'numeric',
                                                                        },
                                                                    )}
                                                                    {' — '}
                                                                </>
                                                            )}
                                                            {task.due_date
                                                                ? new Date(
                                                                      task.due_date,
                                                                  ).toLocaleDateString(
                                                                      'kk-KZ',
                                                                      {
                                                                          day: 'numeric',
                                                                          month: 'long',
                                                                          year: 'numeric',
                                                                      },
                                                                  )
                                                                : 'Мерзімі көрсетілмеген'}
                                                        </p>
                                                        {task.assignee && (
                                                            <p className="mt-1 text-sm text-gray-500">
                                                                {task.assignee
                                                                    .baskarma_type ===
                                                                'oblast'
                                                                    ? 'Облыстық:'
                                                                    : task
                                                                            .assignee
                                                                            .baskarma_type ===
                                                                        'district'
                                                                      ? 'Аудандық:'
                                                                      : ''}{' '}
                                                                {task.assignee
                                                                    .full_name ||
                                                                    task
                                                                        .assignee
                                                                        .name ||
                                                                    '—'}
                                                                {task.assignee
                                                                    .position &&
                                                                    ` — ${task.assignee.position}`}
                                                            </p>
                                                        )}
                                                        {/* Overdue badge */}
                                                        {isTaskOverdue(
                                                            task,
                                                        ) && (
                                                            <Badge className="mt-1 mr-1 border-0 bg-red-100 text-xs text-red-700">
                                                                Мерзімі өткен
                                                            </Badge>
                                                        )}
                                                        {/* Status badge for completion */}
                                                        {latestCompletion && (
                                                            <div>
                                                                <Badge
                                                                    className={`mt-1 border-0 text-xs ${
                                                                        latestCompletion.status ===
                                                                        'approved'
                                                                            ? 'bg-green-100 text-green-700'
                                                                            : latestCompletion.status ===
                                                                                'rejected'
                                                                              ? 'bg-red-100 text-red-700'
                                                                              : 'bg-amber-100 text-amber-700'
                                                                    }`}
                                                                >
                                                                    {latestCompletion.status ===
                                                                    'approved'
                                                                        ? 'Қабылданды'
                                                                        : latestCompletion.status ===
                                                                            'rejected'
                                                                          ? 'Қабылданбады'
                                                                          : 'Тексеруде'}
                                                                </Badge>
                                                                {latestCompletion.status ===
                                                                    'rejected' &&
                                                                    latestCompletion.reviewer_comment && (
                                                                        <p className="mt-1 text-xs text-red-600">
                                                                            <span className="font-semibold">
                                                                                Себебі:
                                                                            </span>{' '}
                                                                            {
                                                                                latestCompletion.reviewer_comment
                                                                            }
                                                                        </p>
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isIspolnitel &&
                                                            isAssignedToMe &&
                                                            (task.status ===
                                                                'new' ||
                                                                task.status ===
                                                                    'rejected') && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 border-cyan-300 text-xs text-cyan-700 hover:bg-cyan-50"
                                                                    onClick={() =>
                                                                        handleOpenCompletionModal(
                                                                            task.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <Upload className="mr-1 h-3.5 w-3.5" />
                                                                    Жіберу
                                                                </Button>
                                                            )}
                                                        {canModify &&
                                                            !isIspolnitel &&
                                                            pendingCompletion && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 border-amber-300 text-xs text-amber-700 hover:bg-amber-50"
                                                                    onClick={() =>
                                                                        handleOpenReview(
                                                                            task,
                                                                            pendingCompletion,
                                                                        )
                                                                    }
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    Тексеру
                                                                </Button>
                                                            )}
                                                        {canModify &&
                                                            !isIspolnitel && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
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
                                        href={`/subsoil-users/${subsoilUser.id}/edit?return_to=${encodeURIComponent(url)}`}
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
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between rounded-t-xl bg-[#0f1b3d] px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                <Flag className="h-5 w-5" />
                                Жаңа кезең қосу
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowTaskModal(false)}
                                className="text-white/80 transition-colors hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={handleTaskSubmit}
                            className="space-y-5 p-6"
                        >
                            <div>
                                <Label className="text-sm font-semibold text-[#0f1b3d]">
                                    Тақырып
                                </Label>
                                <Input
                                    value={taskTitle}
                                    onChange={(e) =>
                                        setTaskTitle(e.target.value)
                                    }
                                    placeholder="Тақырып"
                                    className="mt-1.5"
                                    required
                                />
                            </div>

                            <div>
                                <Label className="text-sm font-semibold text-[#0f1b3d]">
                                    Сипаттама
                                </Label>
                                <textarea
                                    value={taskDescription}
                                    onChange={(e) =>
                                        setTaskDescription(e.target.value)
                                    }
                                    placeholder="Сипаттама"
                                    className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-semibold text-[#0f1b3d]">
                                        Басталу күні
                                    </Label>
                                    <Input
                                        type="date"
                                        value={taskStartDate}
                                        onChange={(e) =>
                                            setTaskStartDate(e.target.value)
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold text-[#0f1b3d]">
                                        Аяқталу күні
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
                                <Label className="text-sm font-semibold text-[#0f1b3d]">
                                    Жауаптыны тағайындау
                                </Label>
                                <div className="relative mt-1.5">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        value={userSearch}
                                        onChange={(e) =>
                                            setUserSearch(e.target.value)
                                        }
                                        placeholder="Іздеу"
                                        className="pl-9"
                                    />
                                </div>
                                <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200">
                                    {filteredUsers.length === 0 ? (
                                        <p className="px-4 py-3 text-sm text-gray-400">
                                            Пайдаланушылар табылмады
                                        </p>
                                    ) : (
                                        filteredUsers.map((u, idx) => (
                                            <div
                                                key={u.id}
                                                className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 ${
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
                                                        ? 'Облыстық'
                                                        : u.baskarma_type ===
                                                            'district'
                                                          ? 'Аудандық'
                                                          : ''}
                                                    {u.baskarma_type
                                                        ? ': '
                                                        : ''}
                                                    {u.full_name || '—'}
                                                    {u.position &&
                                                        ` — ${u.position}`}
                                                </span>
                                                {taskAssignedTo === u.id && (
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
                                        : 'Сақтау'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-gray-600 bg-gray-600 text-white hover:bg-gray-700 hover:text-white"
                                    onClick={() => setShowTaskModal(false)}
                                >
                                    Болдырмау
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Completion Submission Modal (for ispolnitel) */}
            {showCompletionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between rounded-t-xl bg-[#0f1b3d] px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                <Upload className="h-5 w-5" />
                                Тапсырманың орындалуын растаңыз!
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCompletionModal(false)}
                                className="text-white/80 transition-colors hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={handleCompletionSubmit}
                            className="space-y-5 p-6"
                        >
                            {(() => {
                                const task = tasks.find(
                                    (t) => t.id === completionTaskId,
                                );
                                return task ? (
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                        <h4 className="text-sm font-semibold text-[#0f1b3d]">
                                            {task.title}
                                        </h4>
                                        {task.description && (
                                            <p className="mt-1 text-sm whitespace-pre-wrap text-gray-600">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>
                                ) : null;
                            })()}
                            {completionFileError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <AlertTriangle className="mr-1.5 inline h-4 w-4" />
                                    {completionFileError}
                                </div>
                            )}
                            <div>
                                <Label className="text-sm font-semibold text-[#0f1b3d]">
                                    <FileText className="mr-1 inline h-4 w-4" />
                                    Құжаттар (файлдар)
                                    <span className="ml-1 font-normal text-gray-400">
                                        (макс.{' '}
                                        {MAX_COMPLETION_FILE_SIZE / 1024 / 1024}
                                        MB)
                                    </span>
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
                                        {completionDocuments.length} құжат
                                        таңдалды
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm font-semibold text-[#0f1b3d]">
                                    <ImageIcon className="mr-1 inline h-4 w-4" />
                                    Суреттер
                                    <span className="ml-1 font-normal text-gray-400">
                                        (макс.{' '}
                                        {MAX_COMPLETION_FILE_SIZE / 1024 / 1024}
                                        MB)
                                    </span>
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
                                        {completionPhotos.length} сурет таңдалды
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm font-semibold text-[#0f1b3d]">
                                    Пікір
                                </Label>
                                <textarea
                                    value={completionComment}
                                    onChange={(e) =>
                                        setCompletionComment(e.target.value)
                                    }
                                    placeholder="Пікір енгізіңіз..."
                                    className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                                    rows={4}
                                />
                            </div>

                            <div className="flex justify-center gap-3 pt-2">
                                <Button
                                    type="submit"
                                    className="bg-emerald-500 px-8 hover:bg-emerald-600"
                                    disabled={
                                        isSubmittingCompletion ||
                                        !!completionFileError
                                    }
                                >
                                    {isSubmittingCompletion
                                        ? 'Жіберілуде...'
                                        : 'Иә'}
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-red-500 px-8 hover:bg-red-600"
                                    onClick={() =>
                                        setShowCompletionModal(false)
                                    }
                                >
                                    Нет
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Completion Modal (for curator/superadmin) */}
            {showReviewModal && reviewCompletion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between bg-[#0f1b3d] px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                <Eye className="h-5 w-5" />
                                Тапсырманы тексеру
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
                            {reviewTask && (
                                <div className="rounded-lg border border-gray-200 p-4">
                                    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                        Тапсырма
                                    </p>
                                    <p className="mt-1 font-semibold text-[#0f1b3d]">
                                        {reviewTask.title}
                                    </p>
                                    {reviewTask.description && (
                                        <p className="mt-1 text-sm text-gray-600">
                                            {reviewTask.description}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="rounded-lg border border-gray-200 p-4">
                                <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                    Жіберуші
                                </p>
                                <p className="mt-1 font-medium text-[#0f1b3d]">
                                    {reviewCompletion.submitter?.full_name ||
                                        '—'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date(
                                        reviewCompletion.created_at,
                                    ).toLocaleString('kk-KZ')}
                                </p>
                            </div>

                            {reviewCompletion.comment && (
                                <div className="rounded-lg border border-gray-200 p-4">
                                    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                        Пікір
                                    </p>
                                    <p className="mt-1 text-sm whitespace-pre-wrap text-gray-700">
                                        {reviewCompletion.comment}
                                    </p>
                                </div>
                            )}

                            {reviewCompletion.files &&
                                reviewCompletion.files.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                            Файлдар
                                        </p>
                                        <div className="space-y-2">
                                            {reviewCompletion.files.map(
                                                (file) => (
                                                    <div
                                                        key={file.id}
                                                        className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                                                    >
                                                        {file.type ===
                                                        'photo' ? (
                                                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                                                                <img
                                                                    src={`/storage/${file.file_path}`}
                                                                    alt={
                                                                        file.file_name
                                                                    }
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                                                <FileText className="h-5 w-5 text-gray-500" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium text-[#0f1b3d]">
                                                                {file.file_name}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                {file.type ===
                                                                'photo'
                                                                    ? 'Сурет'
                                                                    : 'Құжат'}
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={`/storage/${file.file_path}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[#0f1b3d] hover:text-[#c8a44e]"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

                            <div className="space-y-4 border-t border-gray-200 pt-4">
                                <div>
                                    <label className="text-sm font-semibold text-[#0f1b3d]">
                                        Пікір
                                    </label>
                                    <textarea
                                        value={reviewComment}
                                        onChange={(e) =>
                                            setReviewComment(e.target.value)
                                        }
                                        placeholder="Пікір жазыңыз..."
                                        className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                                        rows={3}
                                    />
                                </div>
                                <div className="flex justify-center gap-3">
                                    <Button
                                        onClick={() => handleReview('approved')}
                                        className="bg-emerald-500 px-8 hover:bg-emerald-600"
                                        disabled={isReviewing}
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Иә
                                    </Button>
                                    <Button
                                        onClick={() => handleReview('rejected')}
                                        className="bg-red-500 px-8 hover:bg-red-600"
                                        disabled={isReviewing}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Жоқ
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
