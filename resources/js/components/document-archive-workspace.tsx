import { Link } from '@inertiajs/react';
import {
    Archive,
    ArrowLeft,
    FileLock2,
    Files,
    ShieldCheck,
} from 'lucide-react';
import DeletedDocumentsList from '@/components/deleted-documents-list';
import type { AuditableDocument } from '@/components/document-details-dialog';

interface DocumentArchiveWorkspaceProps {
    entityName: string;
    backUrl: string;
    documents: AuditableDocument[];
    downloadUrl: (document: AuditableDocument) => string;
}

export default function DocumentArchiveWorkspace({
    entityName,
    backUrl,
    documents,
    downloadUrl,
}: DocumentArchiveWorkspaceProps) {
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
            <section className="relative overflow-hidden rounded-[28px] bg-[#0b1533] px-5 py-6 text-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.9)] sm:px-8 sm:py-8">
                <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
                <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <Link
                            href={backUrl}
                            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Құжаттарға қайту
                        </Link>
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-rose-300 uppercase">
                            <FileLock2 className="h-4 w-4" />
                            Қауіпсіз архив
                        </div>
                        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                            Өшірілген құжаттар
                        </h1>
                        <p className="mt-2 max-w-2xl truncate text-sm text-slate-300 sm:text-base">
                            {entityName}
                        </p>
                    </div>

                    <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/20">
                            <Archive className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl leading-none font-bold">
                                {documents.length}
                            </p>
                            <p className="mt-1 text-xs text-slate-300">
                                архивтегі құжат
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-emerald-900">
                            Тек супер әкімшіге қолжетімді
                        </p>
                        <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                            Архивтегі мәліметтер басқа рөлдерге көрсетілмейді.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm ring-1 ring-sky-100">
                        <Files className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-sky-950">
                            Файлдар физикалық сақталады
                        </p>
                        <p className="mt-1 text-xs leading-5 text-sky-800/70">
                            Көз белгісінен өшіру тарихын толық тексеруге болады.
                        </p>
                    </div>
                </div>
            </section>

            <DeletedDocumentsList
                documents={documents}
                downloadUrl={downloadUrl}
            />
        </div>
    );
}
