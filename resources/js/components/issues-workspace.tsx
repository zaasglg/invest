import { Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    CheckCircle2,
    CircleDot,
    Clock3,
    LoaderCircle,
    MapPin,
    Pencil,
    Plus,
    ShieldAlert,
    Trash2,
    UserRound,
    X,
} from 'lucide-react';
import React, { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface IssueRecord {
    id: number;
    title?: string | null;
    description: string;
    category?: string | null;
    severity: string;
    status: string;
    created_at: string;
    creator?: { id: number; full_name: string } | null;
}

interface SelectOption {
    value: string;
    label: string;
}

interface DetailItem {
    label: string;
    value: string;
}

interface IssuesWorkspaceProps {
    entityName: string;
    entityLabel: string;
    backLabel: string;
    backUrl: string;
    issues: IssueRecord[];
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    showTitle: boolean;
    showCategory: boolean;
    severityOptions: SelectOption[];
    statusOptions: SelectOption[];
    storeUrl: string;
    updateUrl: (issue: IssueRecord) => string;
    destroyUrl: (issue: IssueRecord) => string;
    details: DetailItem[];
}

const severityStyles: Record<
    string,
    { label: string; badge: string; border: string; icon: string }
> = {
    low: {
        label: 'Төмен',
        badge: 'bg-sky-50 text-sky-700 ring-sky-100',
        border: 'border-l-sky-400',
        icon: 'bg-sky-50 text-sky-700 ring-sky-100',
    },
    medium: {
        label: 'Орташа',
        badge: 'bg-amber-50 text-amber-700 ring-amber-100',
        border: 'border-l-amber-400',
        icon: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    high: {
        label: 'Жоғары',
        badge: 'bg-orange-50 text-orange-700 ring-orange-100',
        border: 'border-l-orange-500',
        icon: 'bg-orange-50 text-orange-700 ring-orange-100',
    },
    critical: {
        label: 'Сыни жағдай',
        badge: 'bg-rose-50 text-rose-700 ring-rose-100',
        border: 'border-l-rose-600',
        icon: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
};

const statusStyles: Record<string, { label: string; className: string }> = {
    open: {
        label: 'Ашық',
        className: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
    in_progress: {
        label: 'Орындалуда',
        className: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    resolved: {
        label: 'Шешілді',
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
};

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Күні белгісіз';

    return new Intl.DateTimeFormat('kk-KZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function IssueCard({
    issue,
    editing,
    editData,
    showTitle,
    showCategory,
    severityOptions,
    statusOptions,
    canUpdate,
    canDelete,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    onEditDataChange,
}: {
    issue: IssueRecord;
    editing: boolean;
    editData: Partial<IssueRecord>;
    showTitle: boolean;
    showCategory: boolean;
    severityOptions: SelectOption[];
    statusOptions: SelectOption[];
    canUpdate: boolean;
    canDelete: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onDelete: () => void;
    onEditDataChange: (data: Partial<IssueRecord>) => void;
}) {
    const severity = severityStyles[issue.severity] || severityStyles.medium;
    const status = statusStyles[issue.status] || statusStyles.open;

    if (editing) {
        return (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/30 p-4 shadow-[0_14px_40px_-30px_rgba(14,116,144,0.45)] sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wide text-sky-700 uppercase">
                    <Pencil className="h-3.5 w-3.5" />
                    Мәселені өңдеу
                </div>
                <div className="space-y-3">
                    {showTitle && (
                        <Input
                            value={editData.title || ''}
                            onChange={(event) =>
                                onEditDataChange({
                                    ...editData,
                                    title: event.target.value,
                                })
                            }
                            placeholder="Мәселе тақырыбы"
                            className="h-11 rounded-xl border-slate-200 bg-white"
                        />
                    )}
                    <Textarea
                        value={editData.description || ''}
                        onChange={(event) =>
                            onEditDataChange({
                                ...editData,
                                description: event.target.value,
                            })
                        }
                        placeholder="Мәселенің толық сипаттамасы"
                        className="min-h-24 resize-none rounded-xl border-slate-200 bg-white"
                    />
                    {showCategory && (
                        <Input
                            value={editData.category || ''}
                            onChange={(event) =>
                                onEditDataChange({
                                    ...editData,
                                    category: event.target.value,
                                })
                            }
                            placeholder="Санат"
                            className="h-11 rounded-xl border-slate-200 bg-white"
                        />
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Select
                            value={editData.severity || 'medium'}
                            onValueChange={(value) =>
                                onEditDataChange({
                                    ...editData,
                                    severity: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {severityOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={editData.status || 'open'}
                            onValueChange={(value) =>
                                onEditDataChange({
                                    ...editData,
                                    status: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancelEdit}
                            className="rounded-xl"
                        >
                            <X className="mr-1.5 h-4 w-4" />
                            Болдырмау
                        </Button>
                        <Button
                            type="button"
                            onClick={onSaveEdit}
                            className="rounded-xl bg-[#0b1533] hover:bg-[#15244e]"
                        >
                            <Check className="mr-1.5 h-4 w-4" />
                            Сақтау
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <article
            className={cn(
                'group rounded-2xl border border-l-4 border-slate-200/80 bg-white p-4 shadow-[0_12px_40px_-34px_rgba(15,23,42,0.55)] transition-all hover:shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)] sm:p-5',
                severity.border,
            )}
        >
            <div className="flex items-start gap-3 sm:gap-4">
                <div
                    className={cn(
                        'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
                        severity.icon,
                    )}
                >
                    <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900">
                                {showTitle
                                    ? issue.title || 'Тақырыпсыз мәселе'
                                    : `Проблемалық мәселе №${issue.id}`}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <span
                                    className={cn(
                                        'rounded-full px-2.5 py-1 text-[10px] font-bold ring-1',
                                        severity.badge,
                                    )}
                                >
                                    {severity.label}
                                </span>
                                <span
                                    className={cn(
                                        'rounded-full px-2.5 py-1 text-[10px] font-bold ring-1',
                                        status.className,
                                    )}
                                >
                                    {status.label}
                                </span>
                                {showCategory && issue.category && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                        {issue.category}
                                    </span>
                                )}
                            </div>
                        </div>

                        {(canUpdate || canDelete) && (
                            <div className="flex shrink-0 items-center rounded-xl border border-slate-100 bg-slate-50/80 p-1">
                                {canUpdate && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={onStartEdit}
                                        className="h-8 w-8 text-slate-500 hover:bg-white hover:text-sky-700 hover:shadow-sm"
                                        title="Өңдеу"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={onDelete}
                                        className="h-8 w-8 text-slate-500 hover:bg-white hover:text-rose-600 hover:shadow-sm"
                                        title="Өшіру"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <p className="mt-3 text-sm leading-6 whitespace-pre-line text-slate-600">
                        {issue.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(issue.created_at)}
                        </span>
                        {issue.creator && (
                            <span className="inline-flex items-center gap-1.5">
                                <UserRound className="h-3.5 w-3.5" />
                                {issue.creator.full_name}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}

export default function IssuesWorkspace({
    entityName,
    entityLabel,
    backLabel,
    backUrl,
    issues,
    canCreate,
    canUpdate,
    canDelete,
    showTitle,
    showCategory,
    severityOptions,
    statusOptions,
    storeUrl,
    updateUrl,
    destroyUrl,
    details,
}: IssuesWorkspaceProps) {
    const fieldId = useId();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [severity, setSeverity] = useState('medium');
    const [status, setStatus] = useState('open');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<IssueRecord>>({});

    const openCount = issues.filter((issue) => issue.status === 'open').length;
    const inProgressCount = issues.filter(
        (issue) => issue.status === 'in_progress',
    ).length;
    const resolvedCount = issues.filter(
        (issue) => issue.status === 'resolved',
    ).length;

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!description || (showTitle && !title)) return;

        setIsSubmitting(true);
        router.post(
            storeUrl,
            {
                ...(showTitle ? { title } : {}),
                description,
                ...(showCategory ? { category: category || null } : {}),
                severity,
                status,
            },
            {
                onSuccess: () => {
                    setTitle('');
                    setDescription('');
                    setCategory('');
                    setSeverity('medium');
                    setStatus('open');
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const startEdit = (issue: IssueRecord) => {
        if (!canUpdate) return;

        setEditingId(issue.id);
        setEditData({
            title: issue.title || '',
            description: issue.description,
            category: issue.category || '',
            severity: issue.severity,
            status: issue.status,
        });
    };

    const saveEdit = (issue: IssueRecord) => {
        if (!canUpdate) return;

        router.put(
            updateUrl(issue),
            {
                ...(showTitle ? { title: editData.title } : {}),
                description: editData.description,
                ...(showCategory ? { category: editData.category } : {}),
                severity: editData.severity,
                status: editData.status,
            },
            {
                onSuccess: () => {
                    setEditingId(null);
                    setEditData({});
                },
            },
        );
    };

    const handleDelete = (issue: IssueRecord) => {
        if (confirm('Осы мәселені жоюға сенімдісіз бе?')) {
            router.delete(destroyUrl(issue));
        }
    };

    const stats = [
        {
            label: 'Барлық мәселе',
            value: issues.length,
            icon: AlertTriangle,
            className: 'bg-slate-100 text-slate-700 ring-slate-200',
        },
        {
            label: 'Ашық',
            value: openCount,
            icon: CircleDot,
            className: 'bg-rose-50 text-rose-700 ring-rose-100',
        },
        {
            label: 'Орындалуда',
            value: inProgressCount,
            icon: Clock3,
            className: 'bg-amber-50 text-amber-700 ring-amber-100',
        },
        {
            label: 'Шешілген',
            value: resolvedCount,
            icon: CheckCircle2,
            className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        },
    ];

    return (
        <PageContainer width="standard">
            <section className="relative overflow-hidden rounded-[28px] bg-[#0b1533] px-5 py-6 text-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.9)] sm:px-8 sm:py-8">
                <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
                <div className="relative">
                    <Link
                        href={backUrl}
                        className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {backLabel}
                    </Link>
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-amber-300 uppercase">
                        <ShieldAlert className="h-4 w-4" />
                        Бақылау орталығы
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        Проблемалық мәселелер
                    </h1>
                    <p className="mt-2 max-w-3xl truncate text-sm text-slate-300 sm:text-base">
                        {entityName}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
                            {entityLabel}
                        </span>
                        {details.slice(0, 2).map((detail) => (
                            <span
                                key={detail.label}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10"
                            >
                                <MapPin className="h-3 w-3 text-amber-300" />
                                {detail.value}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <div
                            key={stat.label}
                            className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.5)]"
                        >
                            <div
                                className={cn(
                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
                                    stat.className,
                                )}
                            >
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-2xl leading-none font-bold text-slate-900">
                                    {stat.value}
                                </p>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                    {stat.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                {canCreate && (
                    <aside className="lg:sticky lg:top-6">
                        <Card className="overflow-hidden rounded-3xl border-slate-200/80 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.65)]">
                            <div className="border-b border-slate-100 bg-gradient-to-br from-amber-50 via-white to-rose-50/50 px-5 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1533] text-amber-300 shadow-lg shadow-slate-900/15">
                                        <Plus className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900">
                                            Жаңа мәселе
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Бақылауға мәселе қосу
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-5">
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-4"
                                >
                                    {showTitle && (
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor={`${fieldId}-title`}
                                                className="text-xs font-semibold text-slate-600"
                                            >
                                                Тақырыбы
                                            </Label>
                                            <Input
                                                id={`${fieldId}-title`}
                                                value={title}
                                                onChange={(event) =>
                                                    setTitle(event.target.value)
                                                }
                                                placeholder="Мәселе тақырыбы"
                                                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor={`${fieldId}-description`}
                                            className="text-xs font-semibold text-slate-600"
                                        >
                                            Толық сипаттамасы
                                        </Label>
                                        <Textarea
                                            id={`${fieldId}-description`}
                                            value={description}
                                            onChange={(event) =>
                                                setDescription(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Проблеманы толық сипаттаңыз"
                                            className="min-h-28 resize-none rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                                            required
                                        />
                                    </div>

                                    {showCategory && (
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor={`${fieldId}-category`}
                                                className="text-xs font-semibold text-slate-600"
                                            >
                                                Санат
                                                <span className="ml-1 font-normal text-slate-400">
                                                    (міндетті емес)
                                                </span>
                                            </Label>
                                            <Input
                                                id={`${fieldId}-category`}
                                                value={category}
                                                onChange={(event) =>
                                                    setCategory(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Мысалы: инфрақұрылым"
                                                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-600">
                                                Маңыздылығы
                                            </Label>
                                            <Select
                                                value={severity}
                                                onValueChange={setSeverity}
                                            >
                                                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {severityOptions.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-600">
                                                Күйі
                                            </Label>
                                            <Select
                                                value={status}
                                                onValueChange={setStatus}
                                            >
                                                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statusOptions.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={
                                            !description ||
                                            (showTitle && !title) ||
                                            isSubmitting
                                        }
                                        className="h-11 w-full rounded-xl bg-[#0b1533] text-white shadow-lg shadow-slate-900/10 hover:bg-[#15244e]"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                Сақталуда...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Мәселе қосу
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </aside>
                )}

                <main
                    className={cn('space-y-3', !canCreate && 'lg:col-span-2')}
                >
                    <div className="mb-4 flex items-center justify-between px-1">
                        <div>
                            <h2 className="font-bold text-slate-900">
                                Мәселелер тізімі
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Маңыздылығы мен орындалу күйі бойынша бақылау
                            </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                            {issues.length} мәселе
                        </span>
                    </div>

                    {issues.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-20 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-sm ring-1 ring-emerald-100">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <p className="font-semibold text-slate-700">
                                Проблемалық мәселелер жоқ
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Қазіргі уақытта барлық көрсеткіш қалыпты
                            </p>
                        </div>
                    ) : (
                        issues.map((issue) => (
                            <IssueCard
                                key={issue.id}
                                issue={issue}
                                editing={editingId === issue.id}
                                editData={editData}
                                showTitle={showTitle}
                                showCategory={showCategory}
                                severityOptions={severityOptions}
                                statusOptions={statusOptions}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                                onStartEdit={() => startEdit(issue)}
                                onCancelEdit={() => {
                                    setEditingId(null);
                                    setEditData({});
                                }}
                                onSaveEdit={() => saveEdit(issue)}
                                onDelete={() => handleDelete(issue)}
                                onEditDataChange={setEditData}
                            />
                        ))
                    )}
                </main>
            </div>
        </PageContainer>
    );
}
