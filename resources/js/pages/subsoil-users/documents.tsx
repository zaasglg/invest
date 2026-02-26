import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Upload,
    FileText,
    Trash2,
    Download,
} from 'lucide-react';
import { useCanModify } from '@/hooks/use-can-modify';

interface Region {
    id: number;
    name: string;
}

interface SubsoilUser {
    id: number;
    name: string;
    region?: Region;
}

interface SubsoilDocument {
    id: number;
    name: string;
    file_path: string;
    type: string;
    created_at: string;
}

interface Props {
    subsoilUser: SubsoilUser;
    documents: SubsoilDocument[];
}

export default function Documents({ subsoilUser, documents }: Props) {
    const canModify = useCanModify();
    const [file, setFile] = useState<File | null>(null);
    const [documentName, setDocumentName] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!documentName) {
                setDocumentName(selectedFile.name.split('.')[0]);
            }
        }
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !documentName) return;

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', documentName);
        if (documentType) {
            formData.append('type', documentType);
        }

        router.post(
            `/subsoil-users/${subsoilUser.id}/documents`,
            formData,
            {
                onSuccess: () => {
                    setFile(null);
                    setDocumentName('');
                    setDocumentType('');
                    setIsUploading(false);
                },
                onError: () => {
                    setIsUploading(false);
                },
            },
        );
    };

    const handleDelete = (documentId: number) => {
        if (confirm('Вы уверены, что хотите удалить этот документ?')) {
            router.delete(
                `/subsoil-users/${subsoilUser.id}/documents/${documentId}`,
            );
        }
    };

    const getFileIcon = (type: string) => {
        const iconClass = 'h-10 w-10';
        const typeLower = type.toLowerCase();

        if (typeLower === 'pdf') {
            return (
                <div
                    className={`${iconClass} flex items-center justify-center rounded-lg bg-red-100 text-sm font-bold text-red-600`}
                >
                    PDF
                </div>
            );
        } else if (['doc', 'docx'].includes(typeLower)) {
            return (
                <div
                    className={`${iconClass} flex items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-[#0f1b3d]`}
                >
                    DOC
                </div>
            );
        } else if (['xls', 'xlsx'].includes(typeLower)) {
            return (
                <div
                    className={`${iconClass} flex items-center justify-center rounded-lg bg-green-100 text-sm font-bold text-green-600`}
                >
                    XLS
                </div>
            );
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(typeLower)) {
            return (
                <div
                    className={`${iconClass} flex items-center justify-center rounded-lg bg-purple-100 text-sm font-bold text-purple-600`}
                >
                    IMG
                </div>
            );
        }

        return <FileText className={`${iconClass} text-gray-400`} />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Недропользователи',
                    href: '/subsoil-users',
                },
                {
                    title: subsoilUser.name,
                    href: `/subsoil-users/${subsoilUser.id}`,
                },
                { title: 'Документы', href: '' },
            ]}
        >
            <Head title={`Документы - ${subsoilUser.name}`} />

            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link
                            href={`/subsoil-users/${subsoilUser.id}`}
                            className="mb-2 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[#0f1b3d]"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Назад
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-[#0f1b3d]">
                            Документы
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {subsoilUser.name}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Upload Form */}
                    {canModify && (
                        <div className="lg:col-span-1">
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Upload className="h-5 w-5 text-gray-500" />
                                        Загрузить документ
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={handleUpload}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <Label htmlFor="file">
                                                Файл
                                            </Label>
                                            <Input
                                                id="file"
                                                type="file"
                                                onChange={handleFileChange}
                                                className="mt-1"
                                                required
                                            />
                                            {file && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Выбрано: {file.name} (
                                                    {formatFileSize(
                                                        file.size,
                                                    )}
                                                    )
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="name">
                                                Название документа
                                            </Label>
                                            <Input
                                                id="name"
                                                type="text"
                                                value={documentName}
                                                onChange={(e) =>
                                                    setDocumentName(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Введите название"
                                                className="mt-1"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="type">
                                                Тип документа (опционально)
                                            </Label>
                                            <Input
                                                id="type"
                                                type="text"
                                                value={documentType}
                                                onChange={(e) =>
                                                    setDocumentType(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Например: лицензия, отчет"
                                                className="mt-1"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={
                                                !file ||
                                                !documentName ||
                                                isUploading
                                            }
                                        >
                                            {isUploading
                                                ? 'Загрузка...'
                                                : 'Загрузить'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Info */}
                            <Card className="mt-4 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium text-gray-500">
                                        Информация
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">
                                            Регион:
                                        </span>{' '}
                                        <span className="font-medium">
                                            {subsoilUser.region?.name ||
                                                'Не указан'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Documents List */}
                    <div
                        className={
                            canModify
                                ? 'lg:col-span-2'
                                : 'lg:col-span-3'
                        }
                    >
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    Загруженные документы
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({documents.length})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {documents.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                                        <p className="text-gray-500">
                                            Нет загруженных документов
                                        </p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Загрузите первый документ,
                                            используя форму слева
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {documents.map((document) => (
                                            <div
                                                key={document.id}
                                                className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                                            >
                                                {getFileIcon(document.type)}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium text-[#0f1b3d]">
                                                        {document.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {document.type.toUpperCase()}{' '}
                                                        •{' '}
                                                        {new Date(
                                                            document.created_at,
                                                        ).toLocaleDateString(
                                                            'ru-RU',
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`/storage/${document.file_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                        title="Скачать"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                    {canModify && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    document.id,
                                                                )
                                                            }
                                                            className="text-gray-500 hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
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
