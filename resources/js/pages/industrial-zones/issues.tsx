import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    Plus,
    AlertTriangle,
    Trash2,
    Pencil,
    X,
    Check,
} from 'lucide-react';
import { useCanModify } from '@/hooks/use-can-modify';

interface Region {
    id: number;
    name: string;
}
interface IndustrialZone {
    id: number;
    name: string;
    region?: Region;
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
    industrialZone: IndustrialZone;
    issues: Issue[];
}

const severityMap: Record<string, { label: string; color: string }> = {
    low: { label: 'Низкая', color: 'bg-blue-100 text-blue-800' },
    medium: { label: 'Средняя', color: 'bg-amber-100 text-amber-800' },
    high: { label: 'Высокая', color: 'bg-red-100 text-red-800' },
    critical: { label: 'Критическая', color: 'bg-red-200 text-red-900' },
};

const statusMap: Record<string, { label: string; color: string }> = {
    open: { label: 'Открыт', color: 'bg-red-100 text-red-800' },
    in_progress: { label: 'В работе', color: 'bg-amber-100 text-amber-800' },
    resolved: { label: 'Решен', color: 'bg-green-100 text-green-800' },
};

export default function Issues({ industrialZone, issues }: Props) {
    const canModify = useCanModify();
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
            `/industrial-zones/${industrialZone.id}/issues`,
            { title, description, category: category || null, severity, status },
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
        if (confirm('Вы уверены, что хотите удалить этот вопрос?')) {
            router.delete(
                `/industrial-zones/${industrialZone.id}/issues/${issueId}`,
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
            `/industrial-zones/${industrialZone.id}/issues/${issueId}`,
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
                { title: 'Индустриальные зоны', href: '/industrial-zones' },
                {
                    title: industrialZone.name,
                    href: `/industrial-zones/${industrialZone.id}`,
                },
                { title: 'Проблемные вопросы', href: '' },
            ]}
        >
            <Head
                title={`Проблемные вопросы - ${industrialZone.name}`}
            />

            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 p-6">
                <div>
                    <Link
                        href={`/industrial-zones/${industrialZone.id}`}
                        className="mb-2 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-900"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> Назад к ИЗ
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Проблемные вопросы
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {industrialZone.name}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {canModify && (
                        <div className="lg:col-span-1">
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Plus className="h-5 w-5 text-gray-500" />
                                        Добавить вопрос
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={handleSubmit}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <Label htmlFor="title">
                                                Заголовок
                                            </Label>
                                            <Input
                                                id="title"
                                                value={title}
                                                onChange={(e) =>
                                                    setTitle(e.target.value)
                                                }
                                                placeholder="Краткое описание проблемы"
                                                className="mt-1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="description">
                                                Описание
                                            </Label>
                                            <textarea
                                                id="description"
                                                value={description}
                                                onChange={(e) =>
                                                    setDescription(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Подробное описание проблемы"
                                                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                                rows={3}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="category">
                                                Категория (опционально)
                                            </Label>
                                            <Input
                                                id="category"
                                                value={category}
                                                onChange={(e) =>
                                                    setCategory(e.target.value)
                                                }
                                                placeholder="Например: инфраструктура"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>Важность</Label>
                                            <Select
                                                value={severity}
                                                onValueChange={setSeverity}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">
                                                        Низкая
                                                    </SelectItem>
                                                    <SelectItem value="medium">
                                                        Средняя
                                                    </SelectItem>
                                                    <SelectItem value="high">
                                                        Высокая
                                                    </SelectItem>
                                                    <SelectItem value="critical">
                                                        Критическая
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Статус</Label>
                                            <Select
                                                value={status}
                                                onValueChange={setStatus}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="open">
                                                        Открыт
                                                    </SelectItem>
                                                    <SelectItem value="in_progress">
                                                        В работе
                                                    </SelectItem>
                                                    <SelectItem value="resolved">
                                                        Решен
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
                                                ? 'Сохранение...'
                                                : 'Добавить'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div
                        className={
                            canModify ? 'lg:col-span-2' : 'lg:col-span-3'
                        }
                    >
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <AlertTriangle className="h-5 w-5 text-gray-500" />
                                    Проблемные вопросы
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
                                            Нет проблемных вопросов
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
                                                            placeholder="Заголовок"
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
                                                                        Низкая
                                                                    </SelectItem>
                                                                    <SelectItem value="medium">
                                                                        Средняя
                                                                    </SelectItem>
                                                                    <SelectItem value="high">
                                                                        Высокая
                                                                    </SelectItem>
                                                                    <SelectItem value="critical">
                                                                        Критическая
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
                                                                        Открыт
                                                                    </SelectItem>
                                                                    <SelectItem value="in_progress">
                                                                        В
                                                                        работе
                                                                    </SelectItem>
                                                                    <SelectItem value="resolved">
                                                                        Решен
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
                                                                Отмена
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
                                                                Сохранить
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="mb-2 flex items-start justify-between">
                                                            <p className="text-sm font-semibold text-gray-900">
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
                                                                Категория:{' '}
                                                                {issue.category}
                                                            </p>
                                                        )}
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(
                                                                    issue.created_at,
                                                                ).toLocaleDateString(
                                                                    'ru-RU',
                                                                )}
                                                            </span>
                                                            {canModify && (
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-gray-400 hover:text-blue-600"
                                                                        onClick={() =>
                                                                            startEdit(
                                                                                issue,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
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
