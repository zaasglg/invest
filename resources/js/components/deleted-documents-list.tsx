import { Archive, Clock3, Download, FileText, UserRound } from 'lucide-react';
import DocumentDetailsDialog, {
    type AuditableDocument,
} from '@/components/document-details-dialog';
import { Card, CardContent } from '@/components/ui/card';

interface DeletedDocumentsListProps {
    documents: AuditableDocument[];
    downloadUrl: (document: AuditableDocument) => string;
}

function formatDate(value?: string | null): string {
    if (!value) return 'Күні белгісіз';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Күні белгісіз';

    return date.toLocaleDateString('kk-KZ');
}

export default function DeletedDocumentsList({
    documents,
    downloadUrl,
}: DeletedDocumentsListProps) {
    if (documents.length === 0) {
        return (
            <Card className="rounded-3xl border-dashed border-slate-200 bg-slate-50/50 shadow-none">
                <CardContent className="py-20 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-100">
                        <Archive className="h-6 w-6" />
                    </div>
                    <p className="font-medium text-slate-700">
                        Өшірілген құжаттар жоқ
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
                        Өшірілген құжаттар физикалық жойылмай, осы жерде
                        сақталады.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {documents.map((document) => (
                <Card
                    key={document.id}
                    className="group overflow-hidden rounded-2xl border-slate-200/80 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.55)] transition-all hover:border-rose-200 hover:shadow-[0_18px_45px_-30px_rgba(225,29,72,0.35)]"
                >
                    <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-800">
                                {document.name}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500 uppercase">
                                    {document.type || 'Белгісіз'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Clock3 className="h-3 w-3" />
                                    {formatDate(document.deleted_at)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-rose-500">
                                    <UserRound className="h-3 w-3" />
                                    {document.deleter?.full_name ||
                                        'Өшірген адам белгісіз'}
                                </span>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center rounded-xl border border-slate-100 bg-slate-50/80 p-1">
                            <DocumentDetailsDialog document={document} />
                            <a
                                href={downloadUrl(document)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-sky-700 hover:shadow-sm"
                                title="Жүктеу"
                                aria-label={`${document.name} құжатын жүктеу`}
                            >
                                <Download className="h-4 w-4" />
                            </a>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
