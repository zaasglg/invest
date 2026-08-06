import { Archive, Clock3, UserRound } from 'lucide-react';

interface DeletedEntityNoticeProps {
    isDeleted?: boolean;
    deletedAt?: string | null;
    deleter?: { id: number; full_name: string } | null;
}

function formatDateTime(value?: string | null): string {
    if (!value) return 'Уақыты белгісіз';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Уақыты белгісіз';

    return new Intl.DateTimeFormat('kk-KZ', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export default function DeletedEntityNotice({
    isDeleted = false,
    deletedAt,
    deleter,
}: DeletedEntityNoticeProps) {
    if (!isDeleted) return null;

    return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-900 shadow-sm sm:px-5">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 ring-1 ring-rose-100">
                    <Archive className="h-5 w-5" />
                </span>
                <div>
                    <p className="font-bold">Бұл нысан өшірілген</p>
                    <p className="mt-1 text-sm text-rose-700">
                        Нысан физикалық жойылмаған. Бұл бет және оның барлық
                        бөлімдері тек супер әкімшіге қолжетімді.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-rose-700">
                        <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5" />
                            {deleter?.full_name || 'Өшірген адам белгісіз'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateTime(deletedAt)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
