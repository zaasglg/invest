import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Upload, X, Download } from 'lucide-react';
import { router } from '@inertiajs/react';

interface DocumentFile {
    file: File;
    name: string;
    type?: string;
}

interface ExistingDocument {
    id: number;
    name: string;
    file_path: string;
    type: string;
}

interface ProjectDocumentsUploadProps {
    projectId?: number;
    existingDocuments?: ExistingDocument[];
    readOnly?: boolean;
}

export default function ProjectDocumentsUpload({
    projectId,
    existingDocuments = [],
    readOnly = false,
}: ProjectDocumentsUploadProps) {
    const [documents, setDocuments] = useState<DocumentFile[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setDocuments([
                ...documents,
                {
                    file,
                    name: file.name.split('.')[0],
                    type: file.name.split('.').pop(),
                },
            ]);
        }
    };

    const removeDocument = (index: number) => {
        setDocuments(documents.filter((_, i) => i !== index));
    };

    const updateDocumentName = (index: number, name: string) => {
        const updated = [...documents];
        updated[index].name = name;
        setDocuments(updated);
    };

    const updateDocumentType = (index: number, type: string) => {
        const updated = [...documents];
        updated[index].type = type;
        setDocuments(updated);
    };

    const getFileIcon = (type: string) => {
        const iconClass = 'h-8 w-8';
        const typeLower = type.toLowerCase();

        if (typeLower === 'pdf') {
            return <div className={`${iconClass} bg-red-100 text-red-600 rounded flex items-center justify-center font-bold text-xs flex-shrink-0`}>PDF</div>;
        } else if (['doc', 'docx'].includes(typeLower)) {
            return <div className={`${iconClass} bg-blue-100 text-blue-600 rounded flex items-center justify-center font-bold text-xs flex-shrink-0`}>DOC</div>;
        } else if (['xls', 'xlsx'].includes(typeLower)) {
            return <div className={`${iconClass} bg-green-100 text-green-600 rounded flex items-center justify-center font-bold text-xs flex-shrink-0`}>XLS</div>;
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(typeLower)) {
            return <div className={`${iconClass} bg-purple-100 text-purple-600 rounded flex items-center justify-center font-bold text-xs flex-shrink-0`}>IMG</div>;
        }

        return <FileText className={`${iconClass} text-gray-400 flex-shrink-0`} />;
    };

    const handleDeleteExisting = (documentId: number) => {
        if (confirm('Вы уверены, что хотите удалить этот документ?')) {
            router.delete(`/investment-projects/${projectId}/documents/${documentId}`);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Existing Documents */}
            {existingDocuments.length > 0 && (
                <div className="flex flex-col gap-2">
                    <Label className="text-neutral-500 font-normal">Загруженные документы</Label>
                    <div className="border border-neutral-200 rounded-md p-3 space-y-2">
                        {existingDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                            >
                                {getFileIcon(doc.type)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.name}</p>
                                    <p className="text-xs text-gray-500">{doc.type.toUpperCase()}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <a
                                        href={`/storage/${doc.file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        title="Скачать"
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteExisting(doc.id)}
                                        className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Documents Upload */}
            {!readOnly && (
                <div className="flex flex-col gap-2">
                    <Label className="text-neutral-500 font-normal">
                        {projectId ? 'Добавить документы' : 'Документы (будут загружены после сохранения)'}
                    </Label>
                    <div className="border border-neutral-200 border-dashed rounded-md p-4">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                                <Upload className="h-4 w-4" />
                                <span>Выбрать файл</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                                />
                            </label>
                            <span className="text-xs text-gray-400">
                                PDF, DOC, XLS, изображения до 10MB
                            </span>
                        </div>

                        {documents.length > 0 && (
                            <div className="space-y-2 mt-3">
                                {documents.map((doc, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-200"
                                    >
                                        {getFileIcon(doc.type || 'file')}
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            <div>
                                                <Label htmlFor={`doc-name-${index}`} className="text-xs text-gray-500">
                                                    Название
                                                </Label>
                                                <Input
                                                    id={`doc-name-${index}`}
                                                    value={doc.name}
                                                    onChange={(e) => updateDocumentName(index, e.target.value)}
                                                    className="h-8 text-sm"
                                                    placeholder="Название документа"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor={`doc-type-${index}`} className="text-xs text-gray-500">
                                                    Тип (опционально)
                                                </Label>
                                                <Input
                                                    id={`doc-type-${index}`}
                                                    value={doc.type || ''}
                                                    onChange={(e) => updateDocumentType(index, e.target.value)}
                                                    className="h-8 text-sm"
                                                    placeholder="Например: договор"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeDocument(index)}
                                            className="flex-shrink-0 h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {documents.length === 0 && existingDocuments.length === 0 && (
                            <p className="text-center text-sm text-gray-400 py-2">
                                Нет загруженных документов
                            </p>
                        )}
                    </div>

                    {/* Hidden inputs for form submission */}
                    {documents.map((doc, index) => (
                        <input
                            key={index}
                            type="file"
                            name={`documents[${index}][file]`}
                            className="hidden"
                            ref={(input) => {
                                if (input) {
                                    const dataTransfer = new DataTransfer();
                                    dataTransfer.items.add(doc.file);
                                    input.files = dataTransfer.files;
                                }
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
