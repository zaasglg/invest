import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Upload,
    FileText,
    Trash2,
    Download,
    CheckCircle2,
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface ProjectDocument {
    id: number;
    name: string;
    file_path: string;
    type: string;
    created_at: string;
}

interface Props {
    project: InvestmentProject;
    completedDocuments: ProjectDocument[];
    documents: ProjectDocument[];
    canDownload: boolean;
    ispolnitelCanWrite?: boolean;
}

export default function Documents({
    project,
    completedDocuments,
    documents,
    canDownload,
    ispolnitelCanWrite = false,
}: Props) {
    const canModify = useCanModify();
    const canEdit = canModify || ispolnitelCanWrite;
    // Ispolnitel can add but cannot delete
    const canDelete = canModify;
    const [file, setFile] = useState<File | null>(null);
    const [documentName, setDocumentName] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
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
        if (isCompleted) {
            formData.append('is_completed', '1');
        }

        router.post(`/investment-projects/${project.id}/documents`, formData, {
            onSuccess: () => {
                setFile(null);
                setDocumentName('');
                setDocumentType('');
                setIsCompleted(false);
                setIsUploading(false);
            },
            onError: () => {
                setIsUploading(false);
            },
        });
    };

    const handleDelete = (documentId: number) => {
        if (confirm('Осы құжатты жоюға сенімдісіз бе?')) {
            router.delete(
                `/investment-projects/${project.id}/documents/${documentId}`,
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
                    title: project.region?.name || 'Аудан',
                    href: project.region ? `/regions/${project.region.id}` : '',
                },
                {
                    title: project.name || 'Жоба',
                    href: `/investment-projects/${project.id}`,
                },
                { title: 'Құжаттар', href: '' },
            ]}
        >
            <Head title={`Құжаттар - ${project.name}`} />

            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link
                            href={`/investment-projects/${project.id}`}
                            className="mb-2 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[#0f1b3d]"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Жобаға қайту
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-[#0f1b3d]">
                            Жоба құжаттары
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {project.name}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Upload Form */}
                    {canEdit && (
                        <div className="lg:col-span-1">
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Upload className="h-5 w-5 text-gray-500" />
                                        Құжат жүктеу
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={handleUpload}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <Label htmlFor="file">Файл</Label>
                                            <Input
                                                id="file"
                                                type="file"
                                                onChange={handleFileChange}
                                                className="mt-1"
                                                required
                                            />
                                            {file && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Таңдалды: {file.name} (
                                                    {formatFileSize(file.size)})
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="name">
                                                Құжат атауы
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
                                                placeholder="Атауын енгізіңіз"
                                                className="mt-1"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="type">
                                                Құжат түрі (қосымша)
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
                                                placeholder="Мысалы: келісімшарт, есеп"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                id="is_completed"
                                                type="checkbox"
                                                checked={isCompleted}
                                                onChange={(e) =>
                                                    setIsCompleted(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                            <Label
                                                htmlFor="is_completed"
                                                className="cursor-pointer text-sm font-medium text-gray-700"
                                            >
                                                Аяқталған құжат
                                            </Label>
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
                                                ? 'Жүктелуде...'
                                                : 'Жүктеу'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Project Info */}
                            <Card className="mt-4 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium text-gray-500">
                                        Жоба туралы ақпарат
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">
                                            Облыс:
                                        </span>{' '}
                                        <span className="font-medium">
                                            {project.region?.name ||
                                                'Көрсетілмеген'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Түрі:
                                        </span>{' '}
                                        <span className="font-medium">
                                            {project.project_type?.name ||
                                                'Көрсетілмеген'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Documents List */}
                    <div
                        className={
                            canEdit
                                ? 'space-y-6 lg:col-span-2'
                                : 'space-y-6 lg:col-span-3'
                        }
                    >
                        {/* Completed Documents - shown first */}
                        <Card className="border-green-200 shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <span className="text-green-800">
                                        Аяқталған құжаттар
                                    </span>
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({completedDocuments.length})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {completedDocuments.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                                        <p className="text-sm text-gray-500">
                                            Аяқталған құжаттар жоқ
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {completedDocuments.map((document) => (
                                            <div
                                                key={document.id}
                                                className="flex items-center gap-4 rounded-lg border border-green-200 bg-green-50/50 p-4 transition-colors hover:bg-green-50"
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
                                                            'kk-KZ',
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {canDownload && (
                                                        <a
                                                            href={`/investment-projects/${project.id}/documents/${document.id}/download`}
                                                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                            title="Жүктеу"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    {canDelete && (
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

                        {/* Regular Documents */}
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    Жүктелген құжаттар
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
                                            Жүктелген құжаттар жоқ
                                        </p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Бірінші құжатты сол жақтағы пішін
                                            арқылы жүктеңіз
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
                                                            'kk-KZ',
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {canDownload && (
                                                        <a
                                                            href={`/investment-projects/${project.id}/documents/${document.id}/download`}
                                                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                                            title="Жүктеу"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    {canDelete && (
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
