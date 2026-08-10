import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Factory,
    Calendar,
    Building2,
    MapPin,
    Users,
    Activity,
    FileText,
    ImageIcon,
    Download,
    AlertTriangle,
    Eye,
    Plus,
    X,
    Flag,
    CheckCircle2,
    Trash2,
    Search,
    Upload,
    XCircle,
    Presentation,
    Archive,
    ScrollText,
    Edit,
    MessageCircle,
} from 'lucide-react';
import React, { useState, useRef } from 'react';
import DetailSectionNav from '@/components/detail-section-nav';
import ProductionMonitoringCard from '@/components/investment-projects/production-monitoring-card';
import ProjectPassportOverview from '@/components/investment-projects/project-passport-overview';
import type { ProjectPassportSummary } from '@/components/investment-projects/project-passport-overview';
import ProjectGallerySlider from '@/components/project-gallery-slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/ui/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCanModify } from '@/hooks/use-can-modify';
import AppLayout from '@/layouts/app-layout';
import {
    formatInfrastructureValue,
    normalizeProjectInfrastructure,
    PROJECT_INFRASTRUCTURE_FIELDS,
} from '@/lib/infrastructure';
import { getIspolnitelTypeLabel } from '@/lib/ispolnitel-types';
import type { ProductionPlanInput } from '@/lib/production';
import { formatProjectTypeNames } from '@/lib/project-types';
import { formatMoneyCompact } from '@/lib/utils';
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
    position?: string | null;
    avatar_url?: string | null;
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

interface CompanySummary {
    id: number;
    display_name: string;
    bin: string | null;
    activity_type: string | null;
    director_full_name: string | null;
    phone: string | null;
    region?: { id: number; name: string } | null;
}

interface InvestmentProject {
    id: number;
    name: string;
    company_id?: number | null;
    company_name?: string;
    company?: CompanySummary | null;
    description?: string;
    current_status?: string | null;
    region_id: number;
    region?: Region;
    project_type_id: number;
    project_type?: ProjectType;
    project_types?: ProjectType[];
    sezs?: SectorEntity[];
    industrial_zones?: SectorEntity[];
    prom_zones?: SectorEntity[];
    subsoil_users?: SectorEntity[];
    total_investment?: number;
    jobs_count?: number | null;
    production_not_applicable?: boolean;
    production_plans?: ProductionPlanInput[];
    status: 'plan' | 'implementation' | 'launched' | 'suspended';
    start_date?: string;
    end_date?: string;
    creator?: User;
    deleter?: User | null;
    curators?: User[];
    investors?: User[];
    executors?: User[];
    documents?: Array<{ id: number; name: string }>;
    issues?: Array<{
        id: number;
        title: string;
        description?: string;
        status?: string;
        severity?: string;
        creator?: { id: number; full_name: string } | null;
    }>;
    tasks?: ProjectTaskItem[];
    photos_count?: { photos_count: number } | number;
    geometry?: { lat: number; lng: number }[];
    infrastructure?: Record<string, Record<string, unknown>> | null;
    created_at: string;
    updated_at?: string;
    is_deleted?: boolean;
    deleted_at?: string | null;
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
    creator?: { id: number; full_name?: string; name?: string } | null;
    start_date?: string;
    due_date?: string;
    status: 'new' | 'in_progress' | 'done' | 'rejected';
    approval_status?: 'pending' | 'approved' | 'rejected';
    approval_comment?: string | null;
    approver?: { id: number; full_name?: string } | null;
    approved_at?: string | null;
    viewed_at?: string | null;
    events?: Array<{
        id: number;
        type:
            | 'created'
            | 'dispatched'
            | 'approved'
            | 'rejected'
            | 'viewed'
            | 'edited'
            | 'completion_submitted'
            | 'completion_approved'
            | 'completion_rejected';
        comment?: string | null;
        created_at: string;
        user?: { id: number; full_name?: string } | null;
    }>;
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
    canDownload: boolean;
    canAccessChat?: boolean;
    canReportProduction?: boolean;
    isInvolved?: boolean;
    isOwnDistrict?: boolean;
    passportSummary?: ProjectPassportSummary | null;
}

function DescriptionTabs({
    description,
    currentStatus,
    showCurrentStatus = true,
    canEditStatus = false,
    appendOnlyStatus = false,
    projectId,
}: {
    description?: string;
    currentStatus?: string | null;
    showCurrentStatus?: boolean;
    canEditStatus?: boolean;
    appendOnlyStatus?: boolean;
    projectId?: number;
}) {
    const [activeTab, setActiveTab] = useState<
        'description' | 'current_status'
    >('description');
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(
        appendOnlyStatus ? '' : currentStatus || '',
    );
    const [isSaving, setIsSaving] = useState(false);
    const statusEntries = (currentStatus || '')
        .split(/\n\s*\n/)
        .map((status) => status.trim())
        .filter(Boolean);

    const handleSaveStatus = () => {
        if (!projectId || (appendOnlyStatus && !editValue.trim())) return;
        setIsSaving(true);
        router.put(
            `/investment-projects/${projectId}/update-status`,
            { current_status: editValue },
            {
                onSuccess: () => {
                    setIsEditing(false);
                    if (appendOnlyStatus) {
                        setEditValue('');
                    }
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            },
        );
    };

    return (
        <div>
            <div className="mb-4 inline-flex rounded-full bg-gray-100 p-1">
                <button
                    onClick={() => setActiveTab('description')}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                        activeTab === 'description'
                            ? 'bg-[#c8a44e] text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    Сипаттама
                </button>
                {showCurrentStatus && (
                    <button
                        onClick={() => setActiveTab('current_status')}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                            activeTab === 'current_status'
                                ? 'bg-[#c8a44e] text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Ағымдағы жағдайы
                    </button>
                )}
            </div>
            {activeTab === 'description' || !showCurrentStatus ? (
                <div className="leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-700">
                    {description || 'Сипаттама жоқ.'}
                </div>
            ) : (
                <div>
                    {isEditing ? (
                        <div className="space-y-3">
                            {appendOnlyStatus && statusEntries.length > 0 && (
                                <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                                    {statusEntries.map((status, index) => (
                                        <div
                                            key={`${status}-${index}`}
                                            className="border-l-2 border-[#c8a44e]/50 pl-3 leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-700"
                                        >
                                            {status}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {appendOnlyStatus && (
                                <label className="block text-sm font-medium text-gray-700">
                                    Жаңа ағымдағы жағдай
                                </label>
                            )}
                            <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder={
                                    appendOnlyStatus
                                        ? 'Жаңа ақпаратты жазыңыз. Бұрынғы жазбалар өзгеріссіз сақталады.'
                                        : undefined
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#c8a44e] focus:ring-1 focus:ring-[#c8a44e] focus:outline-none"
                                rows={4}
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleSaveStatus}
                                    disabled={
                                        isSaving ||
                                        (appendOnlyStatus && !editValue.trim())
                                    }
                                    className="rounded-md bg-[#c8a44e] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#b8943e] disabled:opacity-50"
                                >
                                    {isSaving
                                        ? 'Сақталуда...'
                                        : appendOnlyStatus
                                          ? 'Жаңа жазбаны қосу'
                                          : 'Сақтау'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditValue(
                                            appendOnlyStatus
                                                ? ''
                                                : currentStatus || '',
                                        );
                                    }}
                                    className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Болдырмау
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {statusEntries.length > 0 ? (
                                <div className="space-y-3">
                                    {statusEntries.map((status, index) => (
                                        <div
                                            key={`${status}-${index}`}
                                            className="border-l-2 border-[#c8a44e]/50 pl-3 leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-700"
                                        >
                                            {status}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    Ағымдағы жағдайы жоқ.
                                </div>
                            )}
                            {canEditStatus && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="mt-2 text-sm font-medium text-[#c8a44e] hover:text-[#b8943e]"
                                >
                                    {appendOnlyStatus
                                        ? 'Жаңа жағдай қосу'
                                        : 'Өзгерту'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Show({
    project,
    mainGallery = [],
    renderPhotos = [],
    users = [],
    canDownload,
    canAccessChat = false,
    canReportProduction = false,
    isInvolved = true,
    passportSummary,
}: Props) {
    const canModify = useCanModify();
    const { auth } = usePage<SharedData>().props;
    const currentUserId = auth.user?.id;
    const currentRoleName = (auth.user?.role_model?.name || '').toLowerCase();
    const isIspolnitel = currentRoleName === 'ispolnitel';
    const isInvestor = currentRoleName === 'investor';
    const isSuperAdmin = currentRoleName === 'superadmin';
    const isInvest = currentRoleName === 'invest';
    const isAkim = currentRoleName === 'akim';
    const isModerator = currentRoleName === 'moderator';
    const deletedAtLabel = project.deleted_at
        ? new Date(project.deleted_at).toLocaleString('kk-KZ')
        : null;
    const isProkuror = currentRoleName === 'prokuror';
    const canViewCompanyDetails = [
        'superadmin',
        'prokuror',
        'akim',
        'zamakim',
    ].includes(currentRoleName);
    const canApproveTasks = isModerator || isSuperAdmin;
    const canManageTasks = isSuperAdmin || isInvest || isModerator;
    const canCreateTasks = canManageTasks || isProkuror;
    const canEditProject = canModify || isModerator;
    const isExecutorParticipant = isIspolnitel || isInvestor;
    const isRestrictedView = isExecutorParticipant && !isInvolved;
    // Ispolnitel and investor have the same project-interior permissions.
    const participantCanWrite = isExecutorParticipant && isInvolved;
    const photosCount =
        typeof project.photos_count === 'number'
            ? project.photos_count
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (project.photos_count as any)?.photos_count || 0;
    const projectInfrastructure = normalizeProjectInfrastructure(
        project.infrastructure,
    );

    const statusMap: Record<string, { label: string; color: string }> = {
        plan: { label: 'Жоспарлау', color: 'bg-blue-100 text-blue-800' },
        implementation: {
            label: 'Іске асыру',
            color: 'bg-amber-100 text-amber-800',
        },
        launched: {
            label: 'Іске қосылған',
            color: 'bg-green-100 text-green-800',
        },
        suspended: { label: 'Тоқтатылған', color: 'bg-red-100 text-red-800' },
    };

    const getSectorDetails = () => {
        const details: string[] = [];

        const sezList = project.sezs?.length ? project.sezs : [];
        if (sezList.length > 0) {
            details.push(`АЭА: ${sezList.map((item) => item.name).join(', ')}`);
        }

        const industrialZonesList = project.industrial_zones?.length
            ? project.industrial_zones
            : [];
        if (industrialZonesList.length > 0) {
            details.push(
                `Индустриялық аймақтар: ${industrialZonesList
                    .map((item) => item.name)
                    .join(', ')}`,
            );
        }

        const promZonesList = project.prom_zones?.length
            ? project.prom_zones
            : [];
        if (promZonesList.length > 0) {
            details.push(
                `Пром зоналар: ${promZonesList
                    .map((item) => item.name)
                    .join(', ')}`,
            );
        }

        const subsoilUsersList = project.subsoil_users?.length
            ? project.subsoil_users
            : [];
        if (subsoilUsersList.length > 0) {
            details.push(
                `Жер қойнауын пайдалану: ${subsoilUsersList
                    .map((item) => item.name)
                    .join(', ')}`,
            );
        }

        return details;
    };

    const sectorDetails = getSectorDetails();

    const formatCurrency = (amount: number) => {
        return formatMoneyCompact(amount);
    };

    // Roadmap state
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
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
    const isTaskOverdue = (task: ProjectTaskItem): boolean => {
        if (task.status === 'done') return false;
        if (!task.due_date) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(task.due_date);
        due.setHours(0, 0, 0, 0);
        return due < now;
    };

    const effectivePassportSummary: ProjectPassportSummary =
        passportSummary ?? {
            health: {
                level: 'warning',
                label: 'Деректер жаңартылуда',
                reasons: ['Жобаның жиынтық көрсеткіштері әлі есептелмеген'],
            },
            progress_percent: 0,
            timeline: {
                elapsed_percent: 0,
                days_remaining: null,
                is_overdue: false,
                has_dates: Boolean(project.start_date && project.end_date),
            },
            tasks: {
                total: tasks.length,
                completed: tasks.filter((task) => task.status === 'done')
                    .length,
                in_progress: tasks.filter(
                    (task) => task.status === 'in_progress',
                ).length,
                overdue: tasks.filter(isTaskOverdue).length,
                pending_approval: tasks.filter(
                    (task) => task.approval_status === 'pending',
                ).length,
            },
            issues: {
                total: project.issues?.length ?? 0,
                open:
                    project.issues?.filter(
                        (issue) => issue.status !== 'resolved',
                    ).length ?? 0,
                critical:
                    project.issues?.filter(
                        (issue) =>
                            issue.status !== 'resolved' &&
                            ['critical', 'high'].includes(issue.severity ?? ''),
                    ).length ?? 0,
                resolved:
                    project.issues?.filter(
                        (issue) => issue.status === 'resolved',
                    ).length ?? 0,
            },
            documents_count: project.documents?.length ?? 0,
            photos_count: photosCount,
            completeness: {
                percent: 0,
                completed: 0,
                total: 14,
                missing: [],
            },
            next_milestone: null,
            last_updated_at: project.updated_at ?? project.created_at,
        };

    const getTaskDotColor = (task: ProjectTaskItem): string => {
        if (task.status === 'done') return 'bg-green-500';
        if (isTaskOverdue(task)) return 'bg-red-500';
        return 'bg-amber-500';
    };

    const filteredTasks = tasks.filter((task) => {
        // Defensive frontend filter — backend already strips non-approved
        // tasks for ispolnitels, but keep this so a refresh isn't required.
        if (
            isExecutorParticipant &&
            task.approval_status &&
            task.approval_status !== 'approved'
        ) {
            return false;
        }
        if (taskFilter === 'all') return true;
        if (taskFilter === 'overdue') return isTaskOverdue(task);
        if (taskFilter === 'pending_approval') {
            return task.approval_status === 'pending';
        }
        if (taskFilter === 'approval_rejected') {
            return task.approval_status === 'rejected';
        }
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const taskStatusMap: Record<string, { label: string; dotColor: string }> = {
        new: { label: 'Жаңа', dotColor: 'bg-amber-500' },
        in_progress: { label: 'Орындалуда', dotColor: 'bg-amber-500' },
        done: { label: 'Орындалды', dotColor: 'bg-green-500' },
        rejected: { label: 'Қабылданбады', dotColor: 'bg-red-500' },
    };

    // Tasks can be assigned to regular executors or this project's investors.
    const taskAssignableUsers = users.filter((u) => {
        const roleName = (u.role_model?.name || '').toLowerCase();
        return roleName === 'ispolnitel' || roleName === 'investor';
    });

    const filteredUsers = taskAssignableUsers.filter((u) => {
        if (!userSearch.trim()) return true;
        const name = (u.full_name || '').toLowerCase();
        const role = (u.role_model?.display_name || '').toLowerCase();
        const q = userSearch.toLowerCase();
        return name.includes(q) || role.includes(q);
    });

    const getTaskAssigneeTypeLabel = (user: UserOption) =>
        user.role_model?.name === 'investor'
            ? 'Инвестор'
            : getIspolnitelTypeLabel(user.baskarma_type, true);

    const handleTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle || !taskAssignedTo) return;
        setIsSubmittingTask(true);

        const payload = {
            title: taskTitle,
            description: taskDescription || null,
            start_date: taskStartDate || null,
            due_date: taskDueDate || null,
            assigned_to: taskAssignedTo,
        };

        const onSuccess = () => {
            setTaskTitle('');
            setTaskDescription('');
            setTaskStartDate('');
            setTaskDueDate('');
            setTaskAssignedTo(null);
            setUserSearch('');
            setIsSubmittingTask(false);
            setEditingTaskId(null);
            setShowTaskModal(false);
        };

        const onError = () => setIsSubmittingTask(false);

        if (editingTaskId) {
            router.put(
                `/investment-projects/${project.id}/tasks/${editingTaskId}`,
                payload,
                { onSuccess, onError },
            );
        } else {
            router.post(`/investment-projects/${project.id}/tasks`, payload, {
                onSuccess,
                onError,
            });
        }
    };

    const handleEditTask = (task: ProjectTaskItem) => {
        setEditingTaskId(task.id);
        setTaskTitle(task.title || '');
        setTaskDescription(task.description || '');
        setTaskStartDate(
            task.start_date ? task.start_date.substring(0, 10) : '',
        );
        setTaskDueDate(task.due_date ? task.due_date.substring(0, 10) : '');
        setTaskAssignedTo(task.assigned_to);
        setShowTaskModal(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleTaskStatusToggle = (task: ProjectTaskItem) => {
        const nextStatus = task.status === 'done' ? 'new' : 'done';
        router.put(`/investment-projects/${project.id}/tasks/${task.id}`, {
            status: nextStatus,
        });
    };

    const handleTaskDelete = (taskId: number) => {
        if (confirm('Осы кезеңді жоюға сенімдісіз бе?')) {
            router.delete(`/investment-projects/${project.id}/tasks/${taskId}`);
        }
    };

    const selectedUser = users.find((u) => u.id === taskAssignedTo);

    // Completion submission state (for ispolnitel)
    const MAX_COMPLETION_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file (matches backend)
    const MAX_COMPLETION_TOTAL_SIZE = 45 * 1024 * 1024; // 45MB total
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

    // Review modal state (for исполнитель)
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewCompletion, setReviewCompletion] =
        useState<TaskCompletionItem | null>(null);
    const [reviewTask, setReviewTask] = useState<ProjectTaskItem | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);

    const getReviewFileUrl = (
        fileId: number,
        action: 'preview' | 'download',
    ): string => {
        if (!reviewTask || !reviewCompletion) return '#';

        return `/investment-projects/${project.id}/tasks/${reviewTask.id}/completions/${reviewCompletion.id}/files/${fileId}/${action}`;
    };

    const handleOpenCompletionModal = (taskId: number) => {
        setCompletionTaskId(taskId);
        setCompletionComment('');
        setCompletionDocuments([]);
        setCompletionPhotos([]);
        setCompletionFileError(null);
        setShowCompletionModal(true);

        // Mark the task viewed on the server if this is the assigned
        // ispolnitel opening it for the first time.
        const task = (project.tasks || []).find((t) => t.id === taskId);
        if (
            task &&
            isExecutorParticipant &&
            task.assigned_to === currentUserId &&
            !task.viewed_at &&
            (task.approval_status ?? 'approved') === 'approved'
        ) {
            router.post(
                `/investment-projects/${project.id}/tasks/${task.id}/view`,
                {},
                { preserveScroll: true, preserveState: true },
            );
        }
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

        if (completionDocuments.length === 0) {
            setCompletionFileError(
                'Тапсырманы орындауға жіберу үшін кемінде бір құжат тіркеу міндетті.',
            );
            completionDocRef.current?.focus();
            return;
        }

        // Check total size of all files
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
                onError: (errors) => {
                    setIsSubmittingCompletion(false);
                    const fileError =
                        errors.documents ??
                        errors['documents.0'] ??
                        errors.photos ??
                        errors['photos.0'];

                    if (fileError) setCompletionFileError(fileError);
                },
            },
        );
    };

    const handleOpenReview = (
        task: ProjectTaskItem,
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

    // Task info modal state (eye button)
    const [infoTask, setInfoTask] = useState<ProjectTaskItem | null>(null);

    const handleOpenTaskInfo = (task: ProjectTaskItem) => {
        setInfoTask(task);
        // If the current user is the assigned ispolnitel and hasn't viewed
        // the task yet, mark it viewed on the server. We do this silently
        // (preserveScroll) so the modal stays open.
        if (
            isExecutorParticipant &&
            task.assigned_to === currentUserId &&
            !task.viewed_at &&
            (task.approval_status ?? 'approved') === 'approved'
        ) {
            router.post(
                `/investment-projects/${project.id}/tasks/${task.id}/view`,
                {},
                { preserveScroll: true, preserveState: true },
            );
        }
    };

    // Moderator approval state
    const [approvalModalTask, setApprovalModalTask] =
        useState<ProjectTaskItem | null>(null);
    const [approvalDecision, setApprovalDecision] = useState<
        'approved' | 'rejected'
    >('approved');
    const [approvalComment, setApprovalComment] = useState('');
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

    const handleOpenApproval = (
        task: ProjectTaskItem,
        decision: 'approved' | 'rejected',
    ) => {
        setApprovalModalTask(task);
        setApprovalDecision(decision);
        setApprovalComment('');
    };

    const handleSubmitApproval = (e: React.FormEvent) => {
        e.preventDefault();
        if (!approvalModalTask) return;
        setIsSubmittingApproval(true);
        const url =
            approvalDecision === 'approved'
                ? `/investment-projects/${project.id}/tasks/${approvalModalTask.id}/approve`
                : `/investment-projects/${project.id}/tasks/${approvalModalTask.id}/reject`;
        router.post(
            url,
            { approval_comment: approvalComment || null },
            {
                onSuccess: () => {
                    setApprovalModalTask(null);
                    setApprovalComment('');
                    setIsSubmittingApproval(false);
                },
                onError: () => setIsSubmittingApproval(false),
            },
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: project.region?.name || 'Аудан',
                    href: `/regions/${project.region_id}`,
                },
                { title: project.name || 'Жоба', href: '' },
            ]}
        >
            <Head title={project.name} />

            <PageContainer
                width="wide"
                className="project-print-document print:max-w-none print:p-0"
            >
                {project.is_deleted && isSuperAdmin && (
                    <div
                        className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-900 sm:flex-row sm:items-center sm:justify-between"
                        role="status"
                    >
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="font-bold">Бұл жоба өшірілген</p>
                                <p className="mt-0.5 text-sm text-red-700">
                                    Барлық деректер сақталған. Өшірген:{' '}
                                    {project.deleter?.full_name ||
                                        'пайдаланушы көрсетілмеген'}
                                    {deletedAtLabel
                                        ? ` • ${deletedAtLabel}`
                                        : ''}
                                </p>
                            </div>
                        </div>
                        <Badge className="w-fit border-0 bg-red-600 text-white hover:bg-red-600">
                            Өшірілген жоба
                        </Badge>
                    </div>
                )}

                <ProjectPassportOverview
                    project={{
                        id: project.id,
                        name: project.name,
                        statusLabel:
                            statusMap[project.status]?.label ?? project.status,
                        statusClassName:
                            statusMap[project.status]?.color ??
                            'bg-gray-100 text-gray-800',
                        regionName:
                            project.region?.name ?? 'Аймақ көрсетілмеген',
                        projectTypeName: formatProjectTypeNames(
                            project,
                            'Жоба түрі көрсетілмеген',
                        ),
                    }}
                    summary={effectivePassportSummary}
                    canEdit={canEditProject}
                    canDownload={
                        canDownload &&
                        ((!isRestrictedView && !isExecutorParticipant) ||
                            isAkim)
                    }
                    canSeeOperationalDetails={!isRestrictedView}
                />

                <DetailSectionNav
                    ariaLabel="Жоба бөлімдері"
                    items={[
                        {
                            label: 'Паспорт',
                            href: '#passport-overview',
                            icon: Presentation,
                        },
                        {
                            label: 'Негізгі мәлімет',
                            href: '#project-details',
                            icon: FileText,
                        },
                        {
                            label: 'Жол картасы',
                            href: '#project-roadmap',
                            icon: Activity,
                            count: tasks.length,
                        },
                        {
                            label: 'Команда',
                            href: '#project-team',
                            icon: Users,
                            count:
                                (project.curators?.length ?? 0) +
                                (project.investors?.length ?? 0) +
                                (project.executors?.length ?? 0),
                        },
                    ]}
                />

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] print:block">
                    {/* Main Content */}
                    <div className="min-w-0 space-y-6">
                        {/* Project Banner + Info */}
                        <Card
                            id="project-details"
                            className="scroll-mt-24 overflow-hidden py-0 shadow-none"
                        >
                            {/* Banner Header */}
                            <div className="border-b border-slate-200 bg-white px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[#0f1b3d]">
                                        <FileText className="h-5 w-5 text-[#c8a44e]" />
                                        <h2 className="text-lg font-bold">
                                            Жоба туралы негізгі мәлімет
                                        </h2>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {
                                            effectivePassportSummary.documents_count
                                        }{' '}
                                        құжат ·{' '}
                                        {effectivePassportSummary.photos_count}{' '}
                                        фото
                                    </span>
                                </div>
                            </div>

                            {/* Photo + Info Cards */}
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                    {/* Photo */}
                                    <div className="overflow-hidden rounded-lg md:col-span-2">
                                        {mainGallery.length > 0 &&
                                            mainGallery[0]?.gallery_date && (
                                                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>
                                                        {new Date(
                                                            mainGallery[0]
                                                                .gallery_date,
                                                        ).toLocaleDateString(
                                                            'kk-KZ',
                                                            {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric',
                                                            },
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        <ProjectGallerySlider
                                            photos={mainGallery}
                                        />
                                    </div>

                                    {/* Info Cards */}
                                    <div className="grid grid-cols-2 gap-3 md:col-span-3">
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <MapPin className="h-3.5 w-3.5" />{' '}
                                                Аймақ
                                            </p>
                                            <p className="min-w-0 text-sm font-bold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                                {project.region?.name ||
                                                    'Көрсетілмеген'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <FileText className="h-3.5 w-3.5" />{' '}
                                                Жоба түрі
                                            </p>
                                            <p className="min-w-0 text-sm font-bold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                                {formatProjectTypeNames(
                                                    project,
                                                    'Көрсетілмеген',
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Building2 className="h-3.5 w-3.5" />{' '}
                                                Инвестиция сомасы
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {project.total_investment
                                                    ? formatCurrency(
                                                          project.total_investment,
                                                      )
                                                    : 'Көрсетілмеген'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Calendar className="h-3.5 w-3.5" />{' '}
                                                Іске асыру мерзімдері
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {project.start_date
                                                    ? new Date(
                                                          project.start_date,
                                                      ).getFullYear()
                                                    : '...'}
                                                {' — '}
                                                {project.end_date
                                                    ? new Date(
                                                          project.end_date,
                                                      ).getFullYear()
                                                    : '...'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Users className="h-3.5 w-3.5" />{' '}
                                                Жұмыс орындары
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {project.jobs_count
                                                    ? `${project.jobs_count} адам`
                                                    : 'Көрсетілмеген'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                <Factory className="h-3.5 w-3.5" />{' '}
                                                Жоспарлы өндіріс
                                            </p>
                                            <p className="text-sm font-bold text-[#0f1b3d]">
                                                {project.production_not_applicable
                                                    ? 'Қолданылмайды'
                                                    : project.production_plans
                                                            ?.length
                                                      ? `${project.production_plans.length} өнім/нәтиже`
                                                      : 'Көрсетілмеген'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            {/* Company */}
                            <div
                                id="project-description"
                                className="scroll-mt-6 border-t border-gray-200 px-6 py-5"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="rounded-lg bg-[#fff8e7] p-2.5">
                                        <Building2 className="h-5 w-5 text-[#a9842f]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                            Жоба бастамашысы
                                        </p>
                                        <h2 className="mt-1 min-w-0 text-lg font-semibold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                            {project.company?.display_name ||
                                                project.company_name ||
                                                'Компания көрсетілмеген'}
                                        </h2>
                                        {project.company && (
                                            <div className="mt-2 flex min-w-0 flex-wrap gap-x-5 gap-y-1 text-xs [overflow-wrap:anywhere] break-words text-gray-500">
                                                {project.company.bin && (
                                                    <span>
                                                        БСН/БИН:{' '}
                                                        {project.company.bin}
                                                    </span>
                                                )}
                                                {project.company.region && (
                                                    <span>
                                                        Өңір:{' '}
                                                        {
                                                            project.company
                                                                .region.name
                                                        }
                                                    </span>
                                                )}
                                                {project.company
                                                    .activity_type && (
                                                    <span>
                                                        Қызметі:{' '}
                                                        {
                                                            project.company
                                                                .activity_type
                                                        }
                                                    </span>
                                                )}
                                                {project.company
                                                    .director_full_name && (
                                                    <span>
                                                        Басшысы:{' '}
                                                        {
                                                            project.company
                                                                .director_full_name
                                                        }
                                                    </span>
                                                )}
                                                {project.company.phone && (
                                                    <span>
                                                        Телефон:{' '}
                                                        {project.company.phone}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {project.company &&
                                            canViewCompanyDetails && (
                                                <Link
                                                    href={`/companies/${project.company.id}`}
                                                    className="mt-3 inline-flex text-sm font-semibold text-[#a9842f] hover:text-[#80631f]"
                                                >
                                                    Компанияның толық
                                                    карточкасын ашу →
                                                </Link>
                                            )}
                                    </div>
                                </div>
                            </div>

                            {sectorDetails.length > 0 && (
                                <div className="border-t border-gray-200 px-6 py-5">
                                    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[#0f1b3d]">
                                        <MapPin className="h-5 w-5 text-[#c8a44e]" />
                                        Арнайы аумақтар мен салалық байланыс
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {sectorDetails.map((detail) => (
                                            <span
                                                key={detail}
                                                className="max-w-full rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium [overflow-wrap:anywhere] break-words text-blue-900"
                                            >
                                                {detail}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Инфрақұрылымға қажеттілік */}
                            {PROJECT_INFRASTRUCTURE_FIELDS.some(
                                ({ key }) => projectInfrastructure[key].needed,
                            ) && (
                                <div className="border-t border-gray-200 px-6 py-5">
                                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0f1b3d]">
                                        <Building2 className="h-5 w-5 text-gray-500" />
                                        Инфрақұрылымға қажеттілік
                                    </h2>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {PROJECT_INFRASTRUCTURE_FIELDS.map(
                                            (item) => {
                                                const infra =
                                                    projectInfrastructure[
                                                        item.key
                                                    ];
                                                if (!infra.needed) return null;

                                                return (
                                                    <div
                                                        key={item.key}
                                                        className="rounded-lg border border-gray-200 p-3"
                                                    >
                                                        <p className="mb-1 text-xs font-medium text-gray-500">
                                                            {item.label}
                                                        </p>
                                                        <div className="mt-2 grid grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-[10px] font-medium tracking-wide text-gray-400 uppercase">
                                                                    Қажетті
                                                                </p>
                                                                <p className="mt-1 text-sm font-bold text-[#0f1b3d]">
                                                                    {formatInfrastructureValue(
                                                                        infra.required_capacity,
                                                                        item.key,
                                                                    ) || '—'}
                                                                </p>
                                                            </div>
                                                            <div className="border-l border-gray-100 pl-3">
                                                                <p className="text-[10px] font-medium tracking-wide text-gray-400 uppercase">
                                                                    Пайдалануда
                                                                </p>
                                                                <p className="mt-1 text-sm font-bold text-emerald-700">
                                                                    {formatInfrastructureValue(
                                                                        infra.used_capacity,
                                                                        item.key,
                                                                    ) || '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Description & Current Status Tabs */}
                            <div className="border-t border-gray-200 px-6 py-5">
                                <DescriptionTabs
                                    description={project.description}
                                    currentStatus={project.current_status}
                                    showCurrentStatus={!isRestrictedView}
                                    canEditStatus={
                                        (isIspolnitel && isInvolved) ||
                                        isModerator
                                    }
                                    appendOnlyStatus={isIspolnitel}
                                    projectId={project.id}
                                />
                            </div>

                            {/* Проблемалық мәселелер */}
                            {!isRestrictedView &&
                                project.issues &&
                                project.issues.length > 0 && (
                                    <div className="border-t border-gray-200 px-6 py-5">
                                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0f1b3d]">
                                            <AlertTriangle className="h-5 w-5 text-red-500" />
                                            Проблемалық мәселелер
                                            <span className="ml-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-100 px-2 text-xs font-bold text-red-700">
                                                {project.issues.length}
                                            </span>
                                        </h2>
                                        <div className="space-y-3">
                                            {project.issues
                                                .slice(0, 3)
                                                .map((issue) => {
                                                    const severityStyles: Record<
                                                        string,
                                                        string
                                                    > = {
                                                        high: 'border-red-200 bg-red-50',
                                                        medium: 'border-amber-200 bg-amber-50',
                                                        low: 'border-blue-200 bg-blue-50',
                                                        critical:
                                                            'border-red-300 bg-red-100',
                                                    };
                                                    const severityLabels: Record<
                                                        string,
                                                        string
                                                    > = {
                                                        high: 'Жоғары',
                                                        medium: 'Орта',
                                                        low: 'Төмен',
                                                        critical: 'Сыни жағдай',
                                                    };
                                                    const severityDot: Record<
                                                        string,
                                                        string
                                                    > = {
                                                        high: 'bg-red-500',
                                                        medium: 'bg-amber-500',
                                                        low: 'bg-blue-500',
                                                        critical: 'bg-red-600',
                                                    };
                                                    const statusLabels: Record<
                                                        string,
                                                        string
                                                    > = {
                                                        open: 'Ашық',
                                                        in_progress:
                                                            'Орындалуда',
                                                        resolved: 'Шешілді',
                                                    };
                                                    const style =
                                                        severityStyles[
                                                            issue.severity || ''
                                                        ] ||
                                                        'border-gray-200 bg-gray-50';
                                                    return (
                                                        <div
                                                            key={issue.id}
                                                            className={`rounded-lg border p-4 ${style}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex min-w-0 items-start gap-3">
                                                                    <div
                                                                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[issue.severity || ''] || 'bg-gray-400'}`}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <p className="min-w-0 font-semibold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                                                            {
                                                                                issue.title
                                                                            }
                                                                        </p>
                                                                        {issue.description && (
                                                                            <p className="mt-1 line-clamp-2 min-w-0 text-sm [overflow-wrap:anywhere] break-words text-gray-600">
                                                                                {
                                                                                    issue.description
                                                                                }
                                                                            </p>
                                                                        )}
                                                                        {issue.creator && (
                                                                            <p className="mt-1 text-xs text-gray-500">
                                                                                Қосқан:{' '}
                                                                                {
                                                                                    issue
                                                                                        .creator
                                                                                        .full_name
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex shrink-0 items-center gap-2">
                                                                    {issue.severity && (
                                                                        <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                            {severityLabels[
                                                                                issue
                                                                                    .severity
                                                                            ] ||
                                                                                issue.severity}
                                                                        </span>
                                                                    )}
                                                                    {issue.status && (
                                                                        <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                            {statusLabels[
                                                                                issue
                                                                                    .status
                                                                            ] ||
                                                                                issue.status}
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
                                                className="inline-flex items-center gap-1 text-sm font-medium text-[#0f1b3d] transition-colors hover:text-[#c8a44e]"
                                            >
                                                Барлық проблемалық мәселелер →
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            {!isRestrictedView &&
                                (!project.issues ||
                                    project.issues.length === 0) && (
                                    <div className="border-t border-gray-200 px-6 py-5">
                                        <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-emerald-100 p-2">
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-emerald-900">
                                                        Ашық мәселе жоқ
                                                    </p>
                                                    <p className="text-sm text-emerald-700">
                                                        Жоба бойынша тіркелген
                                                        белсенді тәуекелдер
                                                        анықталмады.
                                                    </p>
                                                </div>
                                            </div>
                                            {(canModify ||
                                                participantCanWrite ||
                                                isAkim ||
                                                isModerator) && (
                                                <Link
                                                    href={`/investment-projects/${project.id}/issues`}
                                                    className="shrink-0 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
                                                >
                                                    Мәселе қосу
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}
                        </Card>

                        {!isRestrictedView && (
                            <ProductionMonitoringCard
                                canReport={canReportProduction}
                                notApplicable={Boolean(
                                    project.production_not_applicable,
                                )}
                                plans={project.production_plans ?? []}
                                projectId={project.id}
                                projectStatus={project.status}
                            />
                        )}

                        {/* Roadmap / Дорожная карта */}
                        {!isRestrictedView && (
                            <Card
                                id="project-roadmap"
                                className="scroll-mt-24 overflow-hidden py-0 shadow-none"
                            >
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
                                                    {!isExecutorParticipant && (
                                                        <>
                                                            <SelectItem value="pending_approval">
                                                                Растауды күтуде
                                                            </SelectItem>
                                                            <SelectItem value="approval_rejected">
                                                                Растау
                                                                қабылданбады
                                                            </SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {canCreateTasks && (
                                                <Button
                                                    size="icon"
                                                    className="h-9 w-9 border border-white/30 bg-white/20 text-white hover:bg-white/30"
                                                    onClick={() => {
                                                        setEditingTaskId(null);
                                                        setTaskTitle('');
                                                        setTaskDescription('');
                                                        setTaskStartDate('');
                                                        setTaskDueDate('');
                                                        setTaskAssignedTo(null);
                                                        setShowTaskModal(true);
                                                    }}
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
                                                            c.status ===
                                                            'pending',
                                                    );
                                                const latestCompletion = task
                                                    .completions?.length
                                                    ? task.completions[
                                                          task.completions
                                                              .length - 1
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
                                                            <p className="min-w-0 font-semibold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
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
                                                                    {getIspolnitelTypeLabel(
                                                                        task
                                                                            .assignee
                                                                            .baskarma_type,
                                                                        true,
                                                                    )}
                                                                    {getIspolnitelTypeLabel(
                                                                        task
                                                                            .assignee
                                                                            .baskarma_type,
                                                                        true,
                                                                    )
                                                                        ? ': '
                                                                        : ''}
                                                                    {task
                                                                        .assignee
                                                                        .full_name ||
                                                                        task
                                                                            .assignee
                                                                            .name ||
                                                                        '—'}
                                                                    {task
                                                                        .assignee
                                                                        .position &&
                                                                        ` — ${task.assignee.position}`}
                                                                </p>
                                                            )}
                                                            {/* Overdue badge */}
                                                            {isTaskOverdue(
                                                                task,
                                                            ) && (
                                                                <Badge className="mt-1 mr-1 border-0 bg-red-100 text-xs text-red-700">
                                                                    Мерзімі
                                                                    өткен
                                                                </Badge>
                                                            )}
                                                            {/* Approval status badge (visible to non-ispolnitel) */}
                                                            {!isExecutorParticipant &&
                                                                task.approval_status &&
                                                                task.approval_status !==
                                                                    'approved' && (
                                                                    <div>
                                                                        <Badge
                                                                            className={`mt-1 mr-1 border-0 text-xs ${
                                                                                task.approval_status ===
                                                                                'pending'
                                                                                    ? 'bg-amber-100 text-amber-700'
                                                                                    : 'bg-red-100 text-red-700'
                                                                            }`}
                                                                        >
                                                                            {task.approval_status ===
                                                                            'pending'
                                                                                ? 'Растауды күтуде'
                                                                                : 'Растау қабылданбады'}
                                                                        </Badge>
                                                                        {task.approval_status ===
                                                                            'rejected' &&
                                                                            task.approval_comment && (
                                                                                <p className="mt-1 text-xs [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-red-600">
                                                                                    <span className="font-semibold">
                                                                                        Себебі:
                                                                                    </span>{' '}
                                                                                    {
                                                                                        task.approval_comment
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                    </div>
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
                                                                            <p className="mt-1 text-xs [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-red-600">
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
                                                            {/* Info: open read-only task details modal */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400 hover:bg-cyan-50 hover:text-cyan-600"
                                                                onClick={() =>
                                                                    handleOpenTaskInfo(
                                                                        task,
                                                                    )
                                                                }
                                                                title="Толық ақпарат"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            {/* Moderator/Superadmin: approve or reject pending tasks */}
                                                            {canApproveTasks &&
                                                                task.approval_status ===
                                                                    'pending' && (
                                                                    <>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-8 border-emerald-300 text-xs text-emerald-700 hover:bg-emerald-50"
                                                                            onClick={() =>
                                                                                handleOpenApproval(
                                                                                    task,
                                                                                    'approved',
                                                                                )
                                                                            }
                                                                        >
                                                                            Қабылдау
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-8 border-red-300 text-xs text-red-700 hover:bg-red-50"
                                                                            onClick={() =>
                                                                                handleOpenApproval(
                                                                                    task,
                                                                                    'rejected',
                                                                                )
                                                                            }
                                                                        >
                                                                            Қабылдамау
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            {/* Ispolnitel: submit completion (when task is new or rejected) */}
                                                            {isExecutorParticipant &&
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
                                                            {/* Invest: review pending completion */}
                                                            {canManageTasks &&
                                                                !isExecutorParticipant &&
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
                                                            {canManageTasks && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                                                                        onClick={() =>
                                                                            handleEditTask(
                                                                                task,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
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
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar Information */}
                    <div className="space-y-6">
                        {/* Render Photos Card */}
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

                        {/* Executors Card */}
                        <Card
                            id="project-team"
                            className="scroll-mt-24 shadow-none"
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Users className="h-5 w-5 text-gray-500" />
                                    Қатысушылар
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                        {project.curators &&
                                        project.curators.length > 1
                                            ? 'Жауаптылар'
                                            : 'Жауапты'}
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        {(project.curators &&
                                        project.curators.length > 0
                                            ? project.curators
                                            : project.creator
                                              ? [project.creator]
                                              : []
                                        ).map((curator) => (
                                            <div
                                                key={curator.id}
                                                className="flex items-center gap-3"
                                            >
                                                {curator.avatar_url ? (
                                                    <img
                                                        src={curator.avatar_url}
                                                        alt={
                                                            curator.full_name ||
                                                            curator.name ||
                                                            ''
                                                        }
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#0f1b3d]">
                                                        {(
                                                            curator.full_name ||
                                                            curator.name
                                                        )
                                                            ?.slice(0, 2)
                                                            .toUpperCase() ||
                                                            'NA'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-[#0f1b3d]">
                                                        {curator.full_name ||
                                                            curator.name ||
                                                            'Көрсетілмеген'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Жоба кураторы
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!project.curators ||
                                            project.curators.length === 0) &&
                                            !project.creator && (
                                                <p className="text-sm text-gray-500">
                                                    Көрсетілмеген
                                                </p>
                                            )}
                                    </div>
                                </div>

                                {project.investors &&
                                    project.investors.length > 0 && (
                                        <div>
                                            <div className="my-4 h-px bg-gray-100"></div>
                                            <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                                Инвестор
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                {project.investors.map(
                                                    (investor) => (
                                                        <div
                                                            key={investor.id}
                                                            className="flex items-center gap-3"
                                                        >
                                                            {investor.avatar_url ? (
                                                                <img
                                                                    src={
                                                                        investor.avatar_url
                                                                    }
                                                                    alt={
                                                                        investor.full_name ||
                                                                        investor.name ||
                                                                        ''
                                                                    }
                                                                    className="h-7 w-7 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                                                                    {(
                                                                        investor.full_name ||
                                                                        investor.name
                                                                    )
                                                                        ?.slice(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .toUpperCase() ||
                                                                        'IN'}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm text-gray-700">
                                                                    {investor.full_name ||
                                                                        investor.name ||
                                                                        'Көрсетілмеген'}
                                                                </p>
                                                                <p className="text-xs text-gray-400">
                                                                    Жоба
                                                                    инвесторы
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {project.executors &&
                                    project.executors.length > 0 && (
                                        <div>
                                            <div className="my-4 h-px bg-gray-100"></div>
                                            <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                                Орындаушылар
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                {project.executors.map(
                                                    (executor) => (
                                                        <div
                                                            key={executor.id}
                                                            className="flex items-center gap-3"
                                                        >
                                                            {executor.avatar_url ? (
                                                                <img
                                                                    src={
                                                                        executor.avatar_url
                                                                    }
                                                                    alt={
                                                                        executor.full_name ||
                                                                        executor.name ||
                                                                        ''
                                                                    }
                                                                    className="h-7 w-7 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                                                                    {(
                                                                        executor.full_name ||
                                                                        executor.name
                                                                    )
                                                                        ?.slice(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .toUpperCase() ||
                                                                        'NA'}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm text-gray-700">
                                                                    {executor.position ||
                                                                        'Орындаушы'}
                                                                </p>
                                                                <p className="text-xs text-gray-400">
                                                                    (
                                                                    {executor.full_name ||
                                                                        executor.name ||
                                                                        '—'}
                                                                    )
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {canAccessChat && (
                                    <div className="border-t border-gray-100 pt-4">
                                        <Link
                                            href={`/chats/${project.id}`}
                                            className="block w-full"
                                        >
                                            <Button className="w-full bg-[#0f1b3d] shadow-none hover:bg-[#1a2d5e]">
                                                <MessageCircle className="mr-2 h-4 w-4" />
                                                Чатқа өту
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {effectivePassportSummary.completeness.percent <
                            100 && (
                            <Card className="border-amber-200 bg-amber-50/60 shadow-none print:hidden">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base text-amber-950">
                                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                                        Паспортты толықтыру қажет
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="mb-3 text-sm text-amber-800">
                                        Толтырылуы:{' '}
                                        <span className="font-bold">
                                            {
                                                effectivePassportSummary
                                                    .completeness.percent
                                            }
                                            %
                                        </span>
                                    </p>
                                    <ul className="space-y-2">
                                        {effectivePassportSummary.completeness.missing
                                            .slice(0, 5)
                                            .map((field) => (
                                                <li
                                                    key={field}
                                                    className="flex items-center gap-2 text-sm text-amber-900"
                                                >
                                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                                    {field}
                                                </li>
                                            ))}
                                    </ul>
                                    {effectivePassportSummary.completeness
                                        .missing.length > 5 && (
                                        <p className="mt-2 text-xs text-amber-700">
                                            Тағы{' '}
                                            {effectivePassportSummary
                                                .completeness.missing.length -
                                                5}{' '}
                                            бөлім толтырылмаған
                                        </p>
                                    )}
                                    {canEditProject && (
                                        <Link
                                            href={`/investment-projects/${project.id}/edit?return_to=${encodeURIComponent(`/investment-projects/${project.id}`)}`}
                                            className="mt-4 block"
                                        >
                                            <Button
                                                variant="outline"
                                                className="w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Жетіспейтін деректерді толтыру
                                            </Button>
                                        </Link>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Actions */}
                        <Card
                            id="project-actions"
                            className="scroll-mt-6 shadow-none xl:sticky xl:top-6 print:hidden"
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base text-[#0f1b3d]">
                                    Жылдам әрекеттер
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 p-4">
                                {canEditProject && (
                                    <Link
                                        href={`/investment-projects/${project.id}/edit?return_to=${encodeURIComponent(`/investment-projects/${project.id}`)}`}
                                        className="w-full"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <Activity className="mr-2 h-4 w-4" />{' '}
                                            Жобаны өңдеу
                                        </Button>
                                    </Link>
                                )}
                                {(canModify ||
                                    participantCanWrite ||
                                    isAkim ||
                                    isModerator) && (
                                    <Link
                                        href={`/investment-projects/${project.id}/documents`}
                                        className="w-full"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            Құжаттар
                                            {project.documents &&
                                                project.documents.length >
                                                    0 && (
                                                    <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                        {
                                                            project.documents
                                                                .length
                                                        }
                                                    </span>
                                                )}
                                        </Button>
                                    </Link>
                                )}
                                {(canModify ||
                                    participantCanWrite ||
                                    isAkim ||
                                    isModerator) && (
                                    <Link
                                        href={`/investment-projects/${project.id}/gallery`}
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
                                )}
                                {(!isRestrictedView || participantCanWrite) && (
                                    <Link
                                        href={`/investment-projects/${project.id}/issues`}
                                        className="w-full"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <AlertTriangle className="mr-2 h-4 w-4" />
                                            Проблемалық мәселелер
                                            {project.issues &&
                                                project.issues.length > 0 && (
                                                    <span className="ml-auto rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                                                        {project.issues.length}
                                                    </span>
                                                )}
                                        </Button>
                                    </Link>
                                )}
                                {(isSuperAdmin || isProkuror) && (
                                    <Link
                                        href={`/investment-projects/${project.id}/logs`}
                                        className="w-full"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <ScrollText className="mr-2 h-4 w-4" />
                                            Әрекеттер тарихы
                                        </Button>
                                    </Link>
                                )}
                                {(!isRestrictedView &&
                                    !isExecutorParticipant) ||
                                isAkim ? (
                                    <a
                                        href={`/investment-projects/${project.id}/passport`}
                                        className="w-full"
                                    >
                                        <Button
                                            className="w-full bg-[#c8a44e] shadow-none hover:bg-[#b8943e]"
                                            disabled={!canDownload}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Жоба паспортын жүктеу
                                        </Button>
                                    </a>
                                ) : null}
                                {(!isRestrictedView || isAkim) && (
                                    <a
                                        href={`/investment-projects/${project.id}/presentation`}
                                        className="w-full"
                                    >
                                        <Button
                                            className="w-full bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2d5a]"
                                            disabled={!canDownload}
                                        >
                                            <Presentation className="mr-2 h-4 w-4" />
                                            Презентацияны жүктеу
                                        </Button>
                                    </a>
                                )}
                                {(isSuperAdmin || isInvest || isModerator) && (
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start border-amber-200 text-amber-700 hover:bg-amber-50"
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    'Бұл жобаны архивке жіберу керек пе?',
                                                )
                                            ) {
                                                router.post(
                                                    `/investment-projects/${project.id}/archive`,
                                                );
                                            }
                                        }}
                                    >
                                        <Archive className="mr-2 h-4 w-4" />
                                        Архивке жіберу
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Task Modal */}
                {showTaskModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
                            <div className="flex items-center justify-between rounded-t-xl bg-[#0f1b3d] px-6 py-4">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                    <Flag className="h-5 w-5" />
                                    {editingTaskId
                                        ? 'Кезеңді өңдеу'
                                        : 'Жобаға кезең қосу'}
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
                                        Тақырыптың (модульдің) атауы
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
                                                        {getTaskAssigneeTypeLabel(
                                                            u,
                                                        )}
                                                        {getTaskAssigneeTypeLabel(
                                                            u,
                                                        )
                                                            ? ': '
                                                            : ''}
                                                        {u.full_name || '—'}
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
                                    onClick={() =>
                                        setShowCompletionModal(false)
                                    }
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
                                            <h4 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                                {task.title}
                                            </h4>
                                            {task.description && (
                                                <p className="mt-1 text-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-600">
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
                                        Құжаттар (міндетті)
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                        <span className="ml-1 font-normal text-gray-400">
                                            (макс.{' '}
                                            {MAX_COMPLETION_FILE_SIZE /
                                                1024 /
                                                1024}
                                            MB)
                                        </span>
                                    </Label>
                                    <input
                                        ref={completionDocRef}
                                        type="file"
                                        multiple
                                        required
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                                        onChange={handleCompletionDocChange}
                                        className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-cyan-50 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-cyan-700 hover:file:bg-cyan-100"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Кемінде бір құжат тіркеңіз. Сурет
                                        құжаттың орнын алмастырмайды.
                                    </p>
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
                                        Суреттер (міндетті емес)
                                        <span className="ml-1 font-normal text-gray-400">
                                            (макс.{' '}
                                            {MAX_COMPLETION_FILE_SIZE /
                                                1024 /
                                                1024}
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
                                            {completionPhotos.length} сурет
                                            таңдалды
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
                                            !!completionFileError ||
                                            completionDocuments.length === 0
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

                {/* Review Completion Modal (for invest) */}
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
                                {/* Task info */}
                                {reviewTask && (
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                            Тапсырма
                                        </p>
                                        <p className="mt-1 min-w-0 font-semibold [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                            {reviewTask.title}
                                        </p>
                                        {reviewTask.description && (
                                            <p className="mt-1 text-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-600">
                                                {reviewTask.description}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Who submitted */}
                                <div className="rounded-lg border border-gray-200 p-4">
                                    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                        Отправил
                                    </p>
                                    <p className="mt-1 font-medium text-[#0f1b3d]">
                                        {reviewCompletion.submitter
                                            ?.full_name || '—'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(
                                            reviewCompletion.created_at,
                                        ).toLocaleString('kk-KZ')}
                                    </p>
                                </div>

                                {/* Comment */}
                                {reviewCompletion.comment && (
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                            Пікір
                                        </p>
                                        <p className="mt-1 text-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-700">
                                            {reviewCompletion.comment}
                                        </p>
                                    </div>
                                )}

                                {/* Files */}
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
                                                                        src={getReviewFileUrl(
                                                                            file.id,
                                                                            'preview',
                                                                        )}
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
                                                                <p
                                                                    className="truncate text-sm font-medium text-[#0f1b3d]"
                                                                    title={
                                                                        file.file_name
                                                                    }
                                                                >
                                                                    {
                                                                        file.file_name
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-gray-400">
                                                                    {file.type ===
                                                                    'photo'
                                                                        ? 'Сурет'
                                                                        : 'Құжат'}
                                                                </p>
                                                            </div>
                                                            <a
                                                                href={getReviewFileUrl(
                                                                    file.id,
                                                                    'download',
                                                                )}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={`text-[#0f1b3d] hover:text-[#c8a44e] ${!canDownload ? 'pointer-events-none opacity-40' : ''}`}
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    if (
                                                                        !canDownload
                                                                    )
                                                                        e.preventDefault();
                                                                }}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Review form */}
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
                                            onClick={() =>
                                                handleReview('approved')
                                            }
                                            className="bg-emerald-500 px-8 hover:bg-emerald-600"
                                            disabled={isReviewing}
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Иә
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                handleReview('rejected')
                                            }
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

                {/* Task Approval Modal (moderator/superadmin) */}
                {approvalModalTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-2xl">
                            <div className="flex items-center justify-between rounded-t-xl bg-[#0f1b3d] px-6 py-4">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                    {approvalDecision === 'approved'
                                        ? 'Тапсырманы қабылдау'
                                        : 'Тапсырманы қабылдамау'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setApprovalModalTask(null)}
                                    className="text-white/80 transition-colors hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form
                                onSubmit={handleSubmitApproval}
                                className="space-y-5 p-6"
                            >
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                        Тапсырма
                                    </p>
                                    <p className="mt-1 min-w-0 font-medium [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                        {approvalModalTask.title}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold text-[#0f1b3d]">
                                        Пікір
                                        {approvalDecision === 'rejected' && (
                                            <span className="text-red-500">
                                                {' '}
                                                *
                                            </span>
                                        )}
                                    </Label>
                                    <textarea
                                        value={approvalComment}
                                        onChange={(e) =>
                                            setApprovalComment(e.target.value)
                                        }
                                        placeholder={
                                            approvalDecision === 'rejected'
                                                ? 'Қабылдамау себебі...'
                                                : 'Пікір (міндетті емес)...'
                                        }
                                        className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                                        rows={4}
                                        required={
                                            approvalDecision === 'rejected'
                                        }
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className={
                                            approvalDecision === 'approved'
                                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                                : 'bg-red-500 hover:bg-red-600'
                                        }
                                        disabled={isSubmittingApproval}
                                    >
                                        {approvalDecision === 'approved'
                                            ? 'Қабылдау'
                                            : 'Қабылдамау'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setApprovalModalTask(null)
                                        }
                                    >
                                        Болдырмау
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Task Info Modal (read-only, opened by Eye button) */}
                {infoTask &&
                    (() => {
                        const t = infoTask;
                        const fmtDate = (v?: string | null) => {
                            if (!v) return null;
                            const d = new Date(v);
                            if (isNaN(d.getTime())) return null;
                            return d.toLocaleDateString('kk-KZ', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            });
                        };
                        const fmtDateTime = (v?: string | null) => {
                            if (!v) return null;
                            const d = new Date(v);
                            if (isNaN(d.getTime())) return null;
                            return d.toLocaleString('kk-KZ', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                        };
                        const creatorName =
                            t.creator?.full_name || t.creator?.name || '—';
                        const assigneeName =
                            t.assignee?.full_name || t.assignee?.name || '—';
                        const periodStart = fmtDate(t.start_date);
                        const periodEnd = fmtDate(t.due_date);
                        const period =
                            periodStart && periodEnd
                                ? `${periodStart} — ${periodEnd}`
                                : periodEnd || periodStart || 'Көрсетілмеген';
                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                                <div className="mx-4 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
                                    <div className="flex items-center justify-between bg-[#0f1b3d] px-6 py-4">
                                        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                            <Eye className="h-5 w-5" />
                                            Тапсырма туралы
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setInfoTask(null)}
                                            className="text-white/80 transition-colors hover:text-white"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                                Тапсырманы берген
                                            </p>
                                            <p className="mt-1 min-w-0 font-medium [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                                {creatorName}
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                                Тақырып
                                            </p>
                                            <p className="mt-1 min-w-0 font-medium [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                                {t.title}
                                            </p>
                                            {t.description && (
                                                <p className="mt-2 text-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-700">
                                                    {t.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                                Тапсырма мерзімі
                                            </p>
                                            <p className="mt-1 text-sm text-gray-700">
                                                {period}
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                                Жауапты (исполнитель)
                                            </p>
                                            <p className="mt-1 min-w-0 font-medium [overflow-wrap:anywhere] break-words text-[#0f1b3d]">
                                                {assigneeName}
                                            </p>
                                            {t.assignee?.position && (
                                                <p className="text-xs text-gray-500">
                                                    {t.assignee.position}
                                                </p>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-gray-200">
                                            <p className="border-b border-gray-200 px-3 py-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                                Оқиғалар тарихы
                                            </p>
                                            <div className="max-h-64 overflow-y-auto p-3">
                                                {(() => {
                                                    const events = (
                                                        t.events || []
                                                    )
                                                        .slice()
                                                        .sort(
                                                            (a, b) =>
                                                                new Date(
                                                                    a.created_at,
                                                                ).getTime() -
                                                                new Date(
                                                                    b.created_at,
                                                                ).getTime(),
                                                        );
                                                    if (events.length === 0) {
                                                        return (
                                                            <p className="text-sm text-gray-500">
                                                                Оқиғалар жоқ
                                                            </p>
                                                        );
                                                    }
                                                    const labelMap: Record<
                                                        string,
                                                        string
                                                    > = {
                                                        created:
                                                            'Тапсырма берілді',
                                                        dispatched:
                                                            'Орындаушыға тікелей жіберілді',
                                                        approved:
                                                            'Модератор қабылдады',
                                                        rejected:
                                                            'Модератор қабылдамады',
                                                        edited: 'Тапсырма өзгертілді',
                                                        viewed: 'Исполнитель көрді',
                                                        completion_submitted:
                                                            'Исполнитель орындап жіберді',
                                                        completion_approved:
                                                            'Invest орындалуды қабылдады',
                                                        completion_rejected:
                                                            'Invest орындалуды қабылдамады',
                                                    };
                                                    const dotMap: Record<
                                                        string,
                                                        string
                                                    > = {
                                                        created: 'bg-blue-500',
                                                        dispatched:
                                                            'bg-cyan-500',
                                                        approved:
                                                            'bg-emerald-500',
                                                        rejected: 'bg-red-500',
                                                        edited: 'bg-amber-500',
                                                        viewed: 'bg-cyan-500',
                                                        completion_submitted:
                                                            'bg-indigo-500',
                                                        completion_approved:
                                                            'bg-green-600',
                                                        completion_rejected:
                                                            'bg-rose-600',
                                                    };
                                                    return (
                                                        <ol className="relative space-y-3 border-l border-gray-200 pl-4">
                                                            {events.map(
                                                                (ev) => (
                                                                    <li
                                                                        key={
                                                                            ev.id
                                                                        }
                                                                        className="relative"
                                                                    >
                                                                        <span
                                                                            className={`absolute top-1.5 -left-[21px] h-3 w-3 rounded-full ring-2 ring-white ${dotMap[ev.type] || 'bg-gray-400'}`}
                                                                        />
                                                                        <p className="text-sm font-medium text-[#0f1b3d]">
                                                                            {ev.type ===
                                                                                'approved' &&
                                                                            ev
                                                                                .user
                                                                                ?.id ===
                                                                                t
                                                                                    .creator
                                                                                    ?.id &&
                                                                            t
                                                                                .approver
                                                                                ?.id ===
                                                                                t
                                                                                    .creator
                                                                                    ?.id
                                                                                ? 'Орындаушыға тікелей жіберілді'
                                                                                : labelMap[
                                                                                      ev
                                                                                          .type
                                                                                  ] ||
                                                                                  ev.type}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            {fmtDateTime(
                                                                                ev.created_at,
                                                                            ) ||
                                                                                '—'}
                                                                            {ev
                                                                                .user
                                                                                ?.full_name && (
                                                                                <>
                                                                                    {
                                                                                        ' · '
                                                                                    }
                                                                                    {
                                                                                        ev
                                                                                            .user
                                                                                            .full_name
                                                                                    }
                                                                                </>
                                                                            )}
                                                                        </p>
                                                                        {ev.comment && (
                                                                            <p className="mt-1 text-xs [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-600">
                                                                                {
                                                                                    ev.comment
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </li>
                                                                ),
                                                            )}
                                                        </ol>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setInfoTask(null)}
                                        >
                                            Жабу
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
            </PageContainer>
        </AppLayout>
    );
}
