import { router } from '@inertiajs/react';
import { FileText, Upload, X, Download } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
            return (
                <div
                    className={`${iconClass} flex flex-shrink-0 items-center justify-center rounded bg-red-100 text-xs font-bold text-red-600`}
                >
                    PDF
                </div>
            );
        } else if (['doc', 'docx'].includes(typeLower)) {
            return (
                <div
                    className={`${iconClass} flex flex-shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600`}
                >
                    DOC
                </div>
            );
        } else if (['xls', 'xlsx'].includes(typeLower)) {
            return (
                <div
                    className={`${iconClass} flex flex-shrink-0 items-center justify-center rounded bg-green-100 text-xs font-bold text-green-600`}
                >
                    XLS
                </div>
            );
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(typeLower)) {
            return (
                <div
                    className={`${iconClass} flex flex-shrink-0 items-center justify-center rounded bg-purple-100 text-xs font-bold text-purple-600`}
                >
                    IMG
                </div>
            );
        }

        return (
            <FileText className={`${iconClass} flex-shrink-0 text-gray-400`} />
        );
    };

    const handleDeleteExisting = (documentId: number) => {
        if (confirm('Бұл құжатты жоюға сенімдісіз бе?')) {
            router.delete(
                `/investment-projects/${projectId}/documents/${documentId}`,
            );
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Existing Documents */}
            {existingDocuments.length > 0 && (
                <div className="flex flex-col gap-2">
                    <Label className="font-normal text-neutral-500">
                        Жүктелген құжаттар
                    </Label>
                    <div className="space-y-2 rounded-md border border-neutral-200 p-3">
                        {existingDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center gap-3 rounded bg-gray-50 p-2"
                            >
                                {getFileIcon(doc.type)}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {doc.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {doc.type.toUpperCase()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <a
                                        href={`/storage/${doc.file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                                        title="Жүктеу"
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            handleDeleteExisting(doc.id)
                                        }
                                        className="h-8 w-8 text-gray-500 hover:bg-red-50 hover:text-red-600"
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
                    <Label className="font-normal text-neutral-500">
                        {projectId
                            ? 'Құжаттар қосу'
                            : 'Құжаттар (сақтағаннан кейін жүктеледі)'}
                    </Label>
                    <div className="rounded-md border border-dashed border-neutral-200 p-4">
                        <div className="mb-3 flex items-center justify-center gap-3">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                                <Upload className="h-4 w-4" />
                                <span>Файл таңдау</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                                />
                            </label>
                            <span className="text-xs text-gray-400">
                                PDF, DOC, XLS, суреттер 10MB дейін
                            </span>
                        </div>

                        {documents.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {documents.map((doc, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 rounded border border-gray-200 bg-gray-50 p-3"
                                    >
                                        {getFileIcon(doc.type || 'file')}
                                        <div className="grid flex-1 grid-cols-2 gap-2">
                                            <div>
                                                <Label
                                                    htmlFor={`doc-name-${index}`}
                                                    className="text-xs text-gray-500"
                                                >
                                                    Атауы
                                                </Label>
                                                <Input
                                                    id={`doc-name-${index}`}
                                                    value={doc.name}
                                                    onChange={(e) =>
                                                        updateDocumentName(
                                                            index,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-8 text-sm"
                                                    placeholder="Құжат атауы"
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    htmlFor={`doc-type-${index}`}
                                                    className="text-xs text-gray-500"
                                                >
                                                    Түрі (қосымша)
                                                </Label>
                                                <Input
                                                    id={`doc-type-${index}`}
                                                    value={doc.type || ''}
                                                    onChange={(e) =>
                                                        updateDocumentType(
                                                            index,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-8 text-sm"
                                                    placeholder="Мысалы: келісімшарт"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                removeDocument(index)
                                            }
                                            className="h-8 w-8 flex-shrink-0 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {documents.length === 0 &&
                            existingDocuments.length === 0 && (
                                <p className="py-2 text-center text-sm text-gray-400">
                                    Жүктелген құжаттар жоқ
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
