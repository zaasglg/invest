import { useForm } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, Users } from 'lucide-react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as handoverRoutes from '@/routes/investment-projects/attraction-handover';

interface Props {
    projectId: number;
    stage?: string | null;
    handoverTo?: { id: number; full_name: string } | null;
    requestedAt?: string | null;
    acceptedAt?: string | null;
    acceptedBy?: { full_name: string } | null;
    declineReason?: string | null;
    resumeOn?: string | null;
    canAccept: boolean;
    historical?: boolean;
}

function dateLabel(value: string | null | undefined): string {
    if (!value) return 'Көрсетілмеген';
    if (!value.includes('T')) {
        const [year, month, day] = value.slice(0, 10).split('-');
        return `${day}.${month}.${year}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Көрсетілмеген';
    return new Intl.DateTimeFormat('kk-KZ', {
        timeZone: 'Asia/Qyzylorda',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

export default function AttractionStageDetailsCard({
    projectId,
    stage,
    handoverTo,
    requestedAt,
    acceptedAt,
    acceptedBy,
    declineReason,
    resumeOn,
    canAccept,
    historical = false,
}: Props) {
    const form = useForm({});
    const showHandover =
        stage === 'handover' ||
        Boolean(handoverTo || requestedAt || acceptedAt);
    const showDecline =
        stage === 'declined' || (historical && Boolean(declineReason));
    const showPause = stage === 'paused' || (historical && Boolean(resumeOn));

    if (!showHandover && !showDecline && !showPause) return null;

    return (
        <Card className="gap-0 overflow-hidden py-0 shadow-none">
            <CardHeader className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <CardTitle className="text-base text-[#0f1b3d]">
                    Инвестор тарту кезеңінің мәліметтері
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 text-sm">
                {showHandover && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="flex items-center gap-2 font-semibold text-[#0f1b3d]">
                                <Users className="size-4 text-[#a9842f]" />
                                Сүйемелдеуге беру
                            </p>
                            <Badge
                                variant="outline"
                                className={
                                    acceptedAt
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-amber-200 bg-amber-50 text-amber-800'
                                }
                            >
                                {acceptedAt
                                    ? 'Қабылданды'
                                    : 'Қабылдауды күтуде'}
                            </Badge>
                        </div>
                        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[180px_1fr]">
                            <dt className="text-slate-500">Қабылдайтын адам</dt>
                            <dd>{handoverTo?.full_name ?? 'Белгіленбеген'}</dd>
                            <dt className="text-slate-500">Берілген күні</dt>
                            <dd>{dateLabel(requestedAt)}</dd>
                            {acceptedAt && (
                                <>
                                    <dt className="text-slate-500">
                                        Қабылданған күні
                                    </dt>
                                    <dd>
                                        {dateLabel(acceptedAt)}
                                        {acceptedBy?.full_name
                                            ? ` · ${acceptedBy.full_name}`
                                            : ''}
                                    </dd>
                                </>
                            )}
                        </dl>
                        {canAccept && !acceptedAt && (
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    form.post(
                                        handoverRoutes.accept.url(projectId),
                                        { preserveScroll: true },
                                    );
                                }}
                                className="space-y-2 border-t border-slate-200 pt-3"
                            >
                                <p className="text-xs leading-relaxed text-slate-500">
                                    Қабылдауды растағаннан кейін жоба сізге
                                    сүйемелдеуге берілген болып белгіленеді.
                                </p>
                                {Object.values(form.errors)
                                    .filter(
                                        (error): error is string =>
                                            typeof error === 'string',
                                    )
                                    .map((error) => (
                                        <InputError
                                            key={error}
                                            message={error}
                                        />
                                    ))}
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    size="sm"
                                >
                                    <CheckCircle2 className="mr-2 size-4" />
                                    {form.processing
                                        ? 'Расталуда…'
                                        : 'Сүйемелдеуге қабылдау'}
                                </Button>
                            </form>
                        )}
                    </div>
                )}
                {showDecline && (
                    <div className="space-y-2 border-l-2 border-red-300 pl-3">
                        <p className="font-semibold text-[#0f1b3d]">
                            Инвестордың бас тарту себебі
                        </p>
                        <p className="break-words whitespace-pre-wrap text-slate-600">
                            {declineReason || 'Себеп енгізілмеген'}
                        </p>
                    </div>
                )}
                {showPause && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                        <CalendarClock className="mt-0.5 size-4 shrink-0 text-[#a9842f]" />
                        <div>
                            <p className="font-semibold text-[#0f1b3d]">
                                Қайта байланысу күні
                            </p>
                            <p className="mt-1 text-slate-600">
                                {dateLabel(resumeOn)}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
