import { Link, router } from '@inertiajs/react';
import {
    Archive,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    CloudUpload,
    Download,
    FileCheck2,
    Files,
    FileText,
    FolderOpen,
    Info,
    LoaderCircle,
    MapPin,
    ShieldCheck,
    Sparkles,
    Trash2,
} from 'lucide-react';
import React, { useId, useRef, useState } from 'react';
import DocumentDetailsDialog, {
    type AuditableDocument,
} from '@/components/document-details-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/ui/page';
import { cn } from '@/lib/utils';

export interface WorkspaceDocument extends AuditableDocument {
    file_path: string;
}

interface DetailItem {
    label: string;
    value: string;
}

interface DocumentWorkspaceProps {
    title: string;
    entityName: string;
    entityLabel: string;
    backLabel: string;
    backUrl: string;
    completedDocuments: WorkspaceDocument[];
    documents: WorkspaceDocument[];
    canEdit: boolean;
    canDelete: boolean;
    canDownload: boolean;
    canMarkAsCompleted: boolean;
    canViewDeleted: boolean;
    deletedDocumentsCount: number;
    deletedUrl: string;
    storeUrl: string;
    downloadUrl: (document: WorkspaceDocument) => string;
    destroyUrl: (document: WorkspaceDocument) => string;
    typePlaceholder: string;
    details: DetailItem[];
}

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Күні белгісіз';

    return new Intl.DateTimeFormat('kk-KZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;

    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function FileBadge({ type }: { type: string | null }) {
    const normalizedType = (type || '').toLowerCase();
    const variants: Record<string, { label: string; className: string }> = {
        pdf: {
            label: 'PDF',
            className: 'bg-rose-50 text-rose-600 ring-rose-100',
        },
        doc: {
            label: 'DOC',
            className: 'bg-blue-50 text-blue-700 ring-blue-100',
        },
        docx: {
            label: 'DOC',
            className: 'bg-blue-50 text-blue-700 ring-blue-100',
        },
        xls: {
            label: 'XLS',
            className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        },
        xlsx: {
            label: 'XLS',
            className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        },
        jpg: {
            label: 'IMG',
            className: 'bg-violet-50 text-violet-700 ring-violet-100',
        },
        jpeg: {
            label: 'IMG',
            className: 'bg-violet-50 text-violet-700 ring-violet-100',
        },
        png: {
            label: 'IMG',
            className: 'bg-violet-50 text-violet-700 ring-violet-100',
        },
        gif: {
            label: 'IMG',
            className: 'bg-violet-50 text-violet-700 ring-violet-100',
        },
    };
    const variant = variants[normalizedType];

    if (!variant) {
        return (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200/70">
                <FileText className="h-5 w-5" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xs font-black tracking-tight ring-1',
                variant.className,
            )}
        >
            {variant.label}
        </div>
    );
}

function DocumentRow({
    document,
    completed,
    canDownload,
    canDelete,
    downloadUrl,
    onDelete,
}: {
    document: WorkspaceDocument;
    completed: boolean;
    canDownload: boolean;
    canDelete: boolean;
    downloadUrl: string;
    onDelete: () => void;
}) {
    const isTaskDocument = document.source === 'task_completion';

    return (
        <div
            className={cn(
                'group flex items-center gap-3 rounded-2xl border bg-white p-3.5 transition-all duration-200 sm:gap-4 sm:p-4',
                completed
                    ? 'border-emerald-100 hover:border-emerald-200 hover:shadow-[0_12px_35px_-20px_rgba(5,150,105,0.5)]'
                    : 'border-slate-200/80 hover:border-sky-200 hover:shadow-[0_12px_35px_-20px_rgba(14,116,144,0.45)]',
            )}
        >
            <FileBadge type={document.type} />

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 sm:text-[15px]">
                    {document.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500 uppercase">
                        {document.type || 'Белгісіз'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {formatDate(document.created_at)}
                    </span>
                    {isTaskDocument && (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                            <Sparkles className="h-3 w-3" />
                            Тапсырмадан түсті
                        </span>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center rounded-xl border border-slate-100 bg-slate-50/80 p-1">
                <DocumentDetailsDialog document={document} />
                {canDownload && (
                    <a
                        href={downloadUrl}
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-sky-700 hover:shadow-sm"
                        title="Жүктеу"
                        aria-label={`${document.name} құжатын жүктеу`}
                    >
                        <Download className="h-4 w-4" />
                    </a>
                )}
                {canDelete && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="h-8 w-8 text-slate-500 hover:bg-white hover:text-rose-600 hover:shadow-sm"
                        title="Өшірілген құжаттарға жіберу"
                        aria-label={`${document.name} құжатын өшіру`}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

function DocumentSection({
    title,
    description,
    documents,
    completed,
    canDownload,
    canDelete,
    downloadUrl,
    onDelete,
}: {
    title: string;
    description: string;
    documents: WorkspaceDocument[];
    completed: boolean;
    canDownload: boolean;
    canDelete: boolean;
    downloadUrl: (document: WorkspaceDocument) => string;
    onDelete: (document: WorkspaceDocument) => void;
}) {
    return (
        <Card className="overflow-hidden rounded-3xl border-slate-200/80 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.55)]">
            <div
                className={cn(
                    'flex flex-col gap-3 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6',
                    completed
                        ? 'border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50/60'
                        : 'border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/50',
                )}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1',
                            completed
                                ? 'bg-white text-emerald-600 ring-emerald-100'
                                : 'bg-white text-sky-700 ring-slate-200',
                        )}
                    >
                        {completed ? (
                            <FileCheck2 className="h-5 w-5" />
                        ) : (
                            <Files className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">{title}</h2>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                            {description}
                        </p>
                    </div>
                </div>
                <span
                    className={cn(
                        'w-fit rounded-full px-3 py-1 text-xs font-bold ring-1',
                        completed
                            ? 'bg-emerald-100/70 text-emerald-700 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-slate-200',
                    )}
                >
                    {documents.length} құжат
                </span>
            </div>

            <CardContent className="p-4 sm:p-5">
                {documents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-100">
                            {completed ? (
                                <CheckCircle2 className="h-6 w-6" />
                            ) : (
                                <FolderOpen className="h-6 w-6" />
                            )}
                        </div>
                        <p className="text-sm font-semibold text-slate-600">
                            Бұл бөлімде әзірге құжат жоқ
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Жаңа құжаттар осы жерде автоматты түрде көрінеді
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {documents.map((document) => (
                            <DocumentRow
                                key={document.id}
                                document={document}
                                completed={completed}
                                canDownload={canDownload}
                                canDelete={canDelete}
                                downloadUrl={downloadUrl(document)}
                                onDelete={() => onDelete(document)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function DocumentWorkspace({
    title,
    entityName,
    entityLabel,
    backLabel,
    backUrl,
    completedDocuments,
    documents,
    canEdit,
    canDelete,
    canDownload,
    canMarkAsCompleted,
    canViewDeleted,
    deletedDocumentsCount,
    deletedUrl,
    storeUrl,
    downloadUrl,
    destroyUrl,
    typePlaceholder,
    details,
}: DocumentWorkspaceProps) {
    const fileInputId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [documentName, setDocumentName] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const totalDocuments = completedDocuments.length + documents.length;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) return;

        setFile(selectedFile);
        if (!documentName) {
            setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleUpload = (event: React.FormEvent) => {
        event.preventDefault();

        if (!file || !documentName) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', documentName);

        if (documentType) formData.append('type', documentType);
        if (canMarkAsCompleted && isCompleted) {
            formData.append('is_completed', '1');
        }

        setIsUploading(true);
        router.post(storeUrl, formData, {
            onSuccess: () => {
                setFile(null);
                setDocumentName('');
                setDocumentType('');
                setIsCompleted(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onFinish: () => setIsUploading(false),
        });
    };

    const handleDelete = (document: WorkspaceDocument) => {
        if (
            confirm(
                `«${document.name}» құжатын өшірілген құжаттар бөліміне жіберуге сенімдісіз бе?`,
            )
        ) {
            router.delete(destroyUrl(document));
        }
    };

    const stats = [
        {
            label: 'Барлық құжат',
            value: totalDocuments,
            icon: Files,
            iconClass: 'bg-sky-50 text-sky-700 ring-sky-100',
        },
        {
            label: 'Тапсырмадан орындалған',
            value: completedDocuments.length,
            icon: ShieldCheck,
            iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        },
        {
            label: 'Қолмен жүктелген',
            value: documents.length,
            icon: CloudUpload,
            iconClass: 'bg-violet-50 text-violet-700 ring-violet-100',
        },
    ];

    return (
        <PageContainer width="standard">
            <section className="relative overflow-hidden rounded-[28px] bg-[#0b1533] px-5 py-6 text-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.9)] sm:px-8 sm:py-8">
                <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                        <Link
                            href={backUrl}
                            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur transition hover:bg-white/10 hover:text-white"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            {backLabel}
                        </Link>
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-cyan-300 uppercase">
                            <FolderOpen className="h-4 w-4" />
                            Құжаттар орталығы
                        </div>
                        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            {title}
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
                                    <MapPin className="h-3 w-3 text-cyan-300" />
                                    {detail.value}
                                </span>
                            ))}
                        </div>
                    </div>

                    {canViewDeleted && (
                        <Link
                            href={deletedUrl}
                            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                        >
                            <Archive className="h-4 w-4 text-rose-300" />
                            Өшірілген құжаттар
                            {deletedDocumentsCount > 0 && (
                                <span className="rounded-full bg-rose-400/20 px-2 py-0.5 text-xs text-rose-100 ring-1 ring-rose-300/20">
                                    {deletedDocumentsCount}
                                </span>
                            )}
                        </Link>
                    )}
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <div
                            key={stat.label}
                            className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.5)]"
                        >
                            <div
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-xl ring-1',
                                    stat.iconClass,
                                )}
                            >
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl leading-none font-bold text-slate-900">
                                    {stat.value}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {stat.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                {canEdit && (
                    <aside className="space-y-4 lg:sticky lg:top-6">
                        <Card className="overflow-hidden rounded-3xl border-slate-200/80 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.65)]">
                            <div className="border-b border-slate-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50/60 px-5 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1533] text-cyan-300 shadow-lg shadow-slate-900/15">
                                        <CloudUpload className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900">
                                            Жаңа құжат
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Файлды жүйеге жүктеу
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-5">
                                <form
                                    onSubmit={handleUpload}
                                    className="space-y-4"
                                >
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            id={fileInputId}
                                            type="file"
                                            onChange={handleFileChange}
                                            className="sr-only"
                                            required
                                        />
                                        <label
                                            htmlFor={fileInputId}
                                            className={cn(
                                                'flex cursor-pointer flex-col items-center rounded-2xl border border-dashed px-4 py-6 text-center transition',
                                                file
                                                    ? 'border-emerald-300 bg-emerald-50/60'
                                                    : 'border-slate-300 bg-slate-50/70 hover:border-sky-300 hover:bg-sky-50/50',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'mb-3 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ring-1',
                                                    file
                                                        ? 'bg-white text-emerald-600 ring-emerald-100'
                                                        : 'bg-white text-sky-700 ring-slate-200',
                                                )}
                                            >
                                                {file ? (
                                                    <CheckCircle2 className="h-5 w-5" />
                                                ) : (
                                                    <CloudUpload className="h-5 w-5" />
                                                )}
                                            </div>
                                            <span className="max-w-full truncate text-sm font-semibold text-slate-700">
                                                {file
                                                    ? file.name
                                                    : 'Файлды таңдаңыз'}
                                            </span>
                                            <span className="mt-1 text-xs text-slate-400">
                                                {file
                                                    ? formatFileSize(file.size)
                                                    : 'PDF, Word, Excel, сурет · 10 МБ дейін'}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor={`${fileInputId}-name`}
                                            className="text-xs font-semibold text-slate-600"
                                        >
                                            Құжат атауы
                                        </Label>
                                        <Input
                                            id={`${fileInputId}-name`}
                                            value={documentName}
                                            onChange={(event) =>
                                                setDocumentName(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Атауын енгізіңіз"
                                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor={`${fileInputId}-type`}
                                            className="text-xs font-semibold text-slate-600"
                                        >
                                            Құжат түрі
                                            <span className="ml-1 font-normal text-slate-400">
                                                (міндетті емес)
                                            </span>
                                        </Label>
                                        <Input
                                            id={`${fileInputId}-type`}
                                            value={documentType}
                                            onChange={(event) =>
                                                setDocumentType(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder={typePlaceholder}
                                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                                        />
                                    </div>

                                    {canMarkAsCompleted && (
                                        <label
                                            htmlFor={`${fileInputId}-completed`}
                                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"
                                        >
                                            <input
                                                id={`${fileInputId}-completed`}
                                                type="checkbox"
                                                checked={isCompleted}
                                                onChange={(event) =>
                                                    setIsCompleted(
                                                        event.target.checked,
                                                    )
                                                }
                                                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span>
                                                <span className="block text-xs font-semibold text-emerald-800">
                                                    Орындалған құжат
                                                </span>
                                                <span className="mt-0.5 block text-[11px] leading-4 text-emerald-600">
                                                    Тек супер әкімші белгілей
                                                    алады
                                                </span>
                                            </span>
                                        </label>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={
                                            !file ||
                                            !documentName ||
                                            isUploading
                                        }
                                        className="h-11 w-full rounded-xl bg-[#0b1533] text-white shadow-lg shadow-slate-900/10 hover:bg-[#15244e]"
                                    >
                                        {isUploading ? (
                                            <>
                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                Жүктелуде...
                                            </>
                                        ) : (
                                            <>
                                                <CloudUpload className="mr-2 h-4 w-4" />
                                                Құжатты жүктеу
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_-28px_rgba(15,23,42,0.55)]">
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                <Info className="h-4 w-4 text-sky-600" />
                                Нысан туралы
                            </div>
                            <div className="space-y-3">
                                {details.map((detail) => (
                                    <div
                                        key={detail.label}
                                        className="flex items-start justify-between gap-4 text-xs"
                                    >
                                        <span className="text-slate-400">
                                            {detail.label}
                                        </span>
                                        <span className="text-right font-semibold text-slate-700">
                                            {detail.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                )}

                <main className={cn('space-y-6', !canEdit && 'lg:col-span-2')}>
                    <DocumentSection
                        title="Тапсырма бойынша орындалған құжаттар"
                        description="Қабылданған тапсырмалардан автоматты түскен немесе супер әкімші белгілеген құжаттар"
                        documents={completedDocuments}
                        completed
                        canDownload={canDownload}
                        canDelete={canDelete}
                        downloadUrl={downloadUrl}
                        onDelete={handleDelete}
                    />

                    <DocumentSection
                        title="Жүктелген құжаттар"
                        description="Қолмен қосылған жұмыс материалдары мен тіркемелер"
                        documents={documents}
                        completed={false}
                        canDownload={canDownload}
                        canDelete={canDelete}
                        downloadUrl={downloadUrl}
                        onDelete={handleDelete}
                    />
                </main>
            </div>
        </PageContainer>
    );
}
