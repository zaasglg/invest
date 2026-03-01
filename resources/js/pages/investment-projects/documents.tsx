import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, FileText, Trash2, Download, CheckCircle2 } from 'lucide-react';
import { useCanModify } from '@/hooks/use-can-modify';

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
}

export default function Documents({ project, completedDocuments, documents, canDownload }: Props) {
    const canModify = useCanModify();
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
        if (confirm('Вы уверены, что хотите удалить этот документ?')) {
            router.delete(`/investment-projects/${project.id}/documents/${documentId}`);
        }
    };

    const getFileIcon = (type: string) => {
        const iconClass = 'h-10 w-10';

        const typeLower = type.toLowerCase();
        if (typeLower === 'pdf') {
            return <div className={`${iconClass} bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-bold text-sm`}>PDF</div>;
        } else if (['doc', 'docx'].includes(typeLower)) {
            return <div className={`${iconClass} bg-blue-100 text-[#0f1b3d] rounded-lg flex items-center justify-center font-bold text-sm`}>DOC</div>;
        } else if (['xls', 'xlsx'].includes(typeLower)) {
            return <div className={`${iconClass} bg-green-100 text-green-600 rounded-lg flex items-center justify-center font-bold text-sm`}>XLS</div>;
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(typeLower)) {
            return <div className={`${iconClass} bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold text-sm`}>IMG</div>;
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
                { title: 'Проекты', href: '/investment-projects' },
                { title: project.name, href: `/investment-projects/${project.id}` },
                { title: 'Документы', href: '' },
            ]}
        >
            <Head title={`Документы - ${project.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 w-full max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href={`/investment-projects/${project.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-[#0f1b3d] mb-2 transition-colors">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Назад к проекту
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-[#0f1b3d]">Документы проекта</h1>
                        <p className="text-sm text-gray-500 mt-1">{project.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upload Form */}
                    {canModify && (
                    <div className="lg:col-span-1">
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Upload className="h-5 w-5 text-gray-500" />
                                    Загрузить документ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpload} className="space-y-4">
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
                                            <p className="text-xs text-gray-500 mt-1">
                                                Выбрано: {file.name} ({formatFileSize(file.size)})
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="name">Название документа</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={documentName}
                                            onChange={(e) => setDocumentName(e.target.value)}
                                            placeholder="Введите название"
                                            className="mt-1"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="type">Тип документа (опционально)</Label>
                                        <Input
                                            id="type"
                                            type="text"
                                            value={documentType}
                                            onChange={(e) => setDocumentType(e.target.value)}
                                            placeholder="Например: договор, отчет"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            id="is_completed"
                                            type="checkbox"
                                            checked={isCompleted}
                                            onChange={(e) => setIsCompleted(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <Label htmlFor="is_completed" className="text-sm font-medium text-gray-700 cursor-pointer">
                                            Законченный документ
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={!file || !documentName || isUploading}
                                    >
                                        {isUploading ? 'Загрузка...' : 'Загрузить'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Project Info */}
                        <Card className="shadow-none mt-4">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-gray-500">Информация о проекте</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-500">Регион:</span>{' '}
                                    <span className="font-medium">{project.region?.name || 'Не указан'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Тип:</span>{' '}
                                    <span className="font-medium">{project.project_type?.name || 'Не указан'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    )}

                    {/* Documents List */}
                    <div className={canModify ? 'lg:col-span-2 space-y-6' : 'lg:col-span-3 space-y-6'}>
                        {/* Completed Documents - shown first */}
                        <Card className="shadow-none border-green-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <span className="text-green-800">Законченные документы</span>
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                        ({completedDocuments.length})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {completedDocuments.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm">Нет законченных документов</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {completedDocuments.map((document) => (
                                            <div
                                                key={document.id}
                                                className="flex items-center gap-4 p-4 border border-green-200 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors"
                                            >
                                                {getFileIcon(document.type)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-[#0f1b3d] truncate">
                                                        {document.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {document.type.toUpperCase()} • {new Date(document.created_at).toLocaleDateString('ru-RU')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {canDownload && (
                                                        <a
                                                            href={`/investment-projects/${project.id}/documents/${document.id}/download`}
                                                            className="p-2 text-gray-500 hover:text-[#0f1b3d] hover:bg-[#0f1b3d]/5 rounded-lg transition-colors"
                                                            title="Скачать"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    {canModify && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(document.id)}
                                                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
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
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    Загруженные документы
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                        ({documents.length})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {documents.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">Нет загруженных документов</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Загрузите первый документ, используя форму слева
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {documents.map((document) => (
                                            <div
                                                key={document.id}
                                                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                {getFileIcon(document.type)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-[#0f1b3d] truncate">
                                                        {document.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {document.type.toUpperCase()} • {new Date(document.created_at).toLocaleDateString('ru-RU')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {canDownload && (
                                                        <a
                                                            href={`/investment-projects/${project.id}/documents/${document.id}/download`}
                                                            className="p-2 text-gray-500 hover:text-[#0f1b3d] hover:bg-[#0f1b3d]/5 rounded-lg transition-colors"
                                                            title="Скачать"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    {canModify && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(document.id)}
                                                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
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
