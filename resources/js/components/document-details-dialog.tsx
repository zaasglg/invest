import {
    CheckCircle2,
    Clock3,
    Eye,
    FileText,
    ListChecks,
    Trash2,
    Upload,
    UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface AuditUser {
    id: number;
    full_name: string;
}

interface AuditTask {
    id: number;
    title: string;
    created_at: string;
}

export interface AuditableDocument {
    id: number;
    name: string;
    type: string | null;
    is_completed: boolean;
    is_deleted?: boolean;
    source?: 'manual' | 'task_completion' | string;
    source_task_title?: string | null;
    task_assigned_at?: string | null;
    submitted_at?: string | null;
    approved_at?: string | null;
    deleted_at?: string | null;
    created_at: string;
    uploader?: AuditUser | null;
    approver?: AuditUser | null;
    task_assigner?: AuditUser | null;
    deleter?: AuditUser | null;
    source_task?: AuditTask | null;
}

interface DocumentDetailsDialogProps {
    document: AuditableDocument;
}

function formatDateTime(value?: string | null): string {
    if (!value) return 'Көрсетілмеген';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Көрсетілмеген';

    return new Intl.DateTimeFormat('kk-KZ', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
}) {
    return (
        <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                    {label}
                </p>
                <div className="mt-0.5 text-sm font-medium break-words text-slate-700">
                    {value}
                </div>
            </div>
        </div>
    );
}

export default function DocumentDetailsDialog({
    document,
}: DocumentDetailsDialogProps) {
    const isTaskDocument = document.source === 'task_completion';
    const taskTitle = document.source_task?.title || document.source_task_title;
    const assignedAt =
        document.task_assigned_at || document.source_task?.created_at;
    const originLabel = isTaskDocument
        ? 'Тапсырма нәтижесінен автоматты қосылған'
        : document.uploader
          ? 'Қолмен жүктелген'
          : 'Бұрын жүктелген құжат (авторы сақталмаған)';

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-500 hover:bg-sky-50 hover:text-sky-700"
                    title="Құжат туралы ақпарат"
                    aria-label={`${document.name} туралы ақпарат`}
                >
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-2xl">
                <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-5 pr-14 text-left text-white">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="truncate text-lg text-white">
                                {document.name}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-slate-300">
                                Құжаттың шығу тегі және әрекеттер тарихы
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="max-h-[calc(90vh-105px)] space-y-5 overflow-y-auto p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <DetailRow
                            icon={<FileText className="h-4 w-4" />}
                            label="Құжат түрі"
                            value={(document.type || 'Белгісіз').toUpperCase()}
                        />
                        <DetailRow
                            icon={<ListChecks className="h-4 w-4" />}
                            label="Құжат көзі"
                            value={originLabel}
                        />
                        <DetailRow
                            icon={<Upload className="h-4 w-4" />}
                            label={
                                isTaskDocument
                                    ? 'Құжаттар бөліміне түскен уақыт'
                                    : 'Жүктелген уақыт'
                            }
                            value={formatDateTime(document.created_at)}
                        />
                        <DetailRow
                            icon={<UserRound className="h-4 w-4" />}
                            label="Жүктеген адам"
                            value={
                                document.uploader?.full_name ||
                                'Мәлімет сақталмаған'
                            }
                        />
                    </div>

                    {isTaskDocument && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-slate-200" />
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    Тапсырма тарихы
                                </p>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <DetailRow
                                    icon={<ListChecks className="h-4 w-4" />}
                                    label="Тапсырма"
                                    value={taskTitle || 'Мәлімет сақталмаған'}
                                />
                                <DetailRow
                                    icon={<Clock3 className="h-4 w-4" />}
                                    label="Тапсырма берілген уақыт"
                                    value={formatDateTime(assignedAt)}
                                />
                                <DetailRow
                                    icon={<UserRound className="h-4 w-4" />}
                                    label="Тапсырманы берген адам"
                                    value={
                                        document.task_assigner?.full_name ||
                                        'Мәлімет сақталмаған'
                                    }
                                />
                                <DetailRow
                                    icon={<Upload className="h-4 w-4" />}
                                    label="Орындауға жіберілген уақыт"
                                    value={formatDateTime(
                                        document.submitted_at,
                                    )}
                                />
                                <DetailRow
                                    icon={<UserRound className="h-4 w-4" />}
                                    label="Қабылдаған адам"
                                    value={
                                        document.approver?.full_name ||
                                        'Мәлімет сақталмаған'
                                    }
                                />
                                <DetailRow
                                    icon={<CheckCircle2 className="h-4 w-4" />}
                                    label="Қабылданған уақыт"
                                    value={formatDateTime(document.approved_at)}
                                />
                            </div>
                        </section>
                    )}

                    {!isTaskDocument && document.is_completed && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <DetailRow
                                icon={<UserRound className="h-4 w-4" />}
                                label="Орындалған деп белгілеген"
                                value={
                                    document.approver?.full_name ||
                                    'Мәлімет сақталмаған'
                                }
                            />
                            <DetailRow
                                icon={<CheckCircle2 className="h-4 w-4" />}
                                label="Белгіленген уақыт"
                                value={formatDateTime(document.approved_at)}
                            />
                        </div>
                    )}

                    {document.is_deleted && (
                        <section className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
                            <div className="mb-3 flex items-center gap-2 font-semibold text-red-700">
                                <Trash2 className="h-4 w-4" />
                                Өшіру туралы ақпарат
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <DetailRow
                                    icon={<UserRound className="h-4 w-4" />}
                                    label="Өшірген адам"
                                    value={
                                        document.deleter?.full_name ||
                                        'Мәлімет сақталмаған'
                                    }
                                />
                                <DetailRow
                                    icon={<Clock3 className="h-4 w-4" />}
                                    label="Өшірілген уақыт"
                                    value={formatDateTime(document.deleted_at)}
                                />
                            </div>
                        </section>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
