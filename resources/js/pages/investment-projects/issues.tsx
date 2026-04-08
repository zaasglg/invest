import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Plus,
    AlertTriangle,
    Trash2,
    Pencil,
    X,
    Check,
} from 'lucide-react';
import React, { useState } from 'react';
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
interface Issue {
    id: number;
    title: string;
    description: string;
    category?: string;
    severity: string;
    status: string;
    created_at: string;
}

interface Props {
    project: InvestmentProject;
    issues: Issue[];
    ispolnitelCanWrite?: boolean;
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

export default function Issues({
    project,
    issues,
    ispolnitelCanWrite = false,
}: Props) {
    const canModify = useCanModify();
    const canEdit = canModify || ispolnitelCanWrite;
    // Ispolnitel can add but cannot delete
    const canDelete = canModify;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [severity, setSeverity] = useState('medium');
    const [status, setStatus] = useState('open');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<Issue>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) return;
        setIsSubmitting(true);

        router.post(
            `/investment-projects/${project.id}/issues`,
            {
                title,
                description,
                category: category || null,
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
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            },
        );
    };

    const handleDelete = (issueId: number) => {
        if (confirm('Осы мәселені жоюға сенімдісіз бе?')) {
            router.delete(
                `/investment-projects/${project.id}/issues/${issueId}`,
            );
        }
    };

    const startEdit = (issue: Issue) => {
        setEditingId(issue.id);
        setEditData({
            title: issue.title,
            description: issue.description,
            category: issue.category || '',
            severity: issue.severity,
            status: issue.status,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = (issueId: number) => {
        router.put(
            `/investment-projects/${project.id}/issues/${issueId}`,
            editData,
            {
                onSuccess: () => {
                    setEditingId(null);
                    setEditData({});
                },
            },
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: project.region?.name || 'Аудан',
                    href: project.region ? `/regions/${project.region.id}` : '',
                },
                {
                    title: project.name || 'Жоба',
                    href: `/investment-projects/${project.id}`,
                },
                { title: 'Проблемалық мәселелер', href: '' },
            ]}
        >
            <Head title={`Проблемалық мәселелер - ${project.name}`} />

            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div>
                    <Link
                        href={`/investment-projects/${project.id}`}
                        className="mb-2 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[#0f1b3d]"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> Жобаға қайту
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0f1b3d]">
                        Проблемалық мәселелер
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{project.name}</p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Add form */}
                    {canEdit && (
                        <div className="lg:col-span-1">
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Plus className="h-5 w-5 text-gray-500" />
                                        Мәселе қосу
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={handleSubmit}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <Label htmlFor="title">
                                                Тақырыбы
                                            </Label>
                                            <Input
                                                id="title"
                                                value={title}
                                                onChange={(e) =>
                                                    setTitle(e.target.value)
                                                }
                                                placeholder="Проблеманың қысқаша сипаттамасы"
                                                className="mt-1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="description">
                                                Сипаттама
                                            </Label>
                                            <textarea
                                                id="description"
                                                value={description}
                                                onChange={(e) =>
                                                    setDescription(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Проблеманың толық сипаттамасы"
                                                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                                rows={3}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="category">
                                                Санат (қосымша)
                                            </Label>
                                            <Input
                                                id="category"
                                                value={category}
                                                onChange={(e) =>
                                                    setCategory(e.target.value)
                                                }
                                                placeholder="Мысалы: инфрақұрылым"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>Маңыздылығы</Label>
                                            <Select
                                                value={severity}
                                                onValueChange={setSeverity}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">
                                                        Төмен
                                                    </SelectItem>
                                                    <SelectItem value="medium">
                                                        Орта
                                                    </SelectItem>
                                                    <SelectItem value="high">
                                                        Жоғары
                                                    </SelectItem>
                                                    <SelectItem value="critical">
                                                        Сыни жағдай
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Күйі</Label>
                                            <Select
                                                value={status}
                                                onValueChange={setStatus}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="open">
                                                        Ашық
                                                    </SelectItem>
                                                    <SelectItem value="in_progress">
                                                        Орындалуда
                                                    </SelectItem>
                                                    <SelectItem value="resolved">
                                                        Шешілді
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={
                                                !title ||
                                                !description ||
                                                isSubmitting
                                            }
                                        >
                                            {isSubmitting
                                                ? 'Сақталуда...'
                                                : 'Қосу'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Issues list */}
                    <div
                        className={canEdit ? 'lg:col-span-2' : 'lg:col-span-3'}
                    >
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <AlertTriangle className="h-5 w-5 text-gray-500" />
                                    Проблемалық мәселелер
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({issues.length})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {issues.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                                        <p className="text-gray-500">
                                            Проблемалық мәселелер жоқ
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {issues.map((issue) => (
                                            <div
                                                key={issue.id}
                                                className="rounded-lg border border-gray-200 p-4"
                                            >
                                                {editingId === issue.id ? (
                                                    <div className="space-y-3">
                                                        <Input
                                                            value={
                                                                editData.title ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                setEditData({
                                                                    ...editData,
                                                                    title: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            placeholder="Тақырыбы"
                                                        />
                                                        <textarea
                                                            value={
                                                                editData.description ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                setEditData({
                                                                    ...editData,
                                                                    description:
                                                                        e.target
                                                                            .value,
                                                                })
                                                            }
                                                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                                            rows={2}
                                                        />
                                                        <div className="flex gap-2">
                                                            <Select
                                                                value={
                                                                    editData.severity ||
                                                                    'medium'
                                                                }
                                                                onValueChange={(
                                                                    v,
                                                                ) =>
                                                                    setEditData(
                                                                        {
                                                                            ...editData,
                                                                            severity:
                                                                                v,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="w-36">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="low">
                                                                        Төмен
                                                                    </SelectItem>
                                                                    <SelectItem value="medium">
                                                                        Орта
                                                                    </SelectItem>
                                                                    <SelectItem value="high">
                                                                        Жоғары
                                                                    </SelectItem>
                                                                    <SelectItem value="critical">
                                                                        Сыни
                                                                        жағдай
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Select
                                                                value={
                                                                    editData.status ||
                                                                    'open'
                                                                }
                                                                onValueChange={(
                                                                    v,
                                                                ) =>
                                                                    setEditData(
                                                                        {
                                                                            ...editData,
                                                                            status: v,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="w-36">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="open">
                                                                        Ашық
                                                                    </SelectItem>
                                                                    <SelectItem value="in_progress">
                                                                        Орындалуда
                                                                    </SelectItem>
                                                                    <SelectItem value="resolved">
                                                                        Шешілді
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={
                                                                    cancelEdit
                                                                }
                                                            >
                                                                <X className="mr-1 h-4 w-4" />{' '}
                                                                Болдырмау
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    saveEdit(
                                                                        issue.id,
                                                                    )
                                                                }
                                                            >
                                                                <Check className="mr-1 h-4 w-4" />{' '}
                                                                Сақтау
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="mb-2 flex items-start justify-between">
                                                            <p className="text-sm font-semibold text-[#0f1b3d]">
                                                                {issue.title}
                                                            </p>
                                                            <div className="flex items-center gap-1">
                                                                {issue.severity && (
                                                                    <Badge
                                                                        className={`${severityMap[issue.severity]?.color || 'bg-gray-100 text-gray-800'} border-0 text-[10px]`}
                                                                    >
                                                                        {severityMap[
                                                                            issue
                                                                                .severity
                                                                        ]
                                                                            ?.label ||
                                                                            issue.severity}
                                                                    </Badge>
                                                                )}
                                                                {issue.status && (
                                                                    <Badge
                                                                        className={`${statusMap[issue.status]?.color || 'bg-gray-100 text-gray-800'} border-0 text-[10px]`}
                                                                    >
                                                                        {statusMap[
                                                                            issue
                                                                                .status
                                                                        ]
                                                                            ?.label ||
                                                                            issue.status}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600">
                                                            {issue.description}
                                                        </p>
                                                        {issue.category && (
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                Санат:{' '}
                                                                {issue.category}
                                                            </p>
                                                        )}
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(
                                                                    issue.created_at,
                                                                ).toLocaleDateString(
                                                                    'kk-KZ',
                                                                )}
                                                            </span>
                                                            {canEdit && (
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-gray-400 hover:text-[#0f1b3d]"
                                                                        onClick={() =>
                                                                            startEdit(
                                                                                issue,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    {canDelete && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                                                                            onClick={() =>
                                                                                handleDelete(
                                                                                    issue.id,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
