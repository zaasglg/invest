import { useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    RotateCcw,
    Users,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import * as handoverRoutes from '@/routes/investment-projects/attraction-handover';
import * as reserveRoutes from '@/routes/project-reserves';

type HandoverDecisionMode = 'named-attraction' | 'support-reserve';

interface Props {
    projectId: number;
    stage?: string | null;
    handoverTo?: { id: number; full_name: string } | null;
    requestedAt?: string | null;
    acceptedAt?: string | null;
    acceptedBy?: { full_name: string } | null;
    declineReason?: string | null;
    resumeOn?: string | null;
    handoverRejectionReason?: string | null;
    handoverRejectedAt?: string | null;
    handoverRejectedBy?: { full_name: string } | null;
    canAccept?: boolean;
    decisionMode?: HandoverDecisionMode | null;
    canResubmit?: boolean;
    historical?: boolean;
    collapsible?: boolean;
    children?: ReactNode;
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
    handoverRejectionReason,
    handoverRejectedAt,
    handoverRejectedBy,
    canAccept = false,
    decisionMode = null,
    canResubmit = false,
    historical = false,
    collapsible = false,
    children,
}: Props) {
    const acceptanceForm = useForm({});
    const rejectionForm = useForm({ rejection_reason: '' });
    const resubmissionForm = useForm({});
    const [open, setOpen] = useState(false);
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const expanded = !collapsible || open;
    const effectiveDecisionMode =
        decisionMode ?? (canAccept ? 'named-attraction' : null);
    const showHandover =
        stage === 'handover' ||
        Boolean(requestedAt || acceptedAt || handoverRejectionReason);
    const showDecline =
        stage === 'declined' || (historical && Boolean(declineReason));
    const showPause = stage === 'paused' || (historical && Boolean(resumeOn));
    const hasDetails = showHandover || showDecline || showPause;

    const submitAcceptance = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const url =
            effectiveDecisionMode === 'support-reserve'
                ? reserveRoutes.accept.url(projectId)
                : handoverRoutes.accept.url(projectId);

        acceptanceForm.post(url, { preserveScroll: true });
    };

    const submitRejection = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const reason = rejectionForm.data.rejection_reason.trim();

        if (reason.length < 3) {
            rejectionForm.setError(
                'rejection_reason',
                'Кері қайтару себебін кемінде 3 таңбамен жазыңыз.',
            );
            return;
        }

        rejectionForm.transform(() => ({ rejection_reason: reason }));
        rejectionForm.post(handoverRoutes.reject.url(projectId), {
            preserveScroll: true,
            onSuccess: () => {
                rejectionForm.reset();
                setRejectionDialogOpen(false);
            },
        });
    };

    const submitResubmission = () => {
        resubmissionForm.post(handoverRoutes.resubmit.url(projectId), {
            preserveScroll: true,
        });
    };

    useEffect(() => {
        if (!collapsible) return;

        const openLinkedActivities = () => {
            const hash = window.location.hash;
            if (
                hash === '#project-attraction' ||
                /^#attraction-activity-\d+$/.test(hash)
            ) {
                setOpen(true);
                if (hash === '#project-attraction') {
                    requestAnimationFrame(() =>
                        document
                            .getElementById('project-attraction')
                            ?.scrollIntoView({
                                block: 'start',
                                behavior: 'smooth',
                            }),
                    );
                }
            }
        };

        openLinkedActivities();
        window.addEventListener('hashchange', openLinkedActivities);
        return () =>
            window.removeEventListener('hashchange', openLinkedActivities);
    }, [collapsible, projectId]);

    if (!hasDetails && (!collapsible || !children)) return <>{children}</>;

    return (
        <Collapsible open={expanded} onOpenChange={setOpen} asChild>
            <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <CardHeader
                    className={cn(
                        'bg-slate-50 p-0',
                        expanded && 'border-b border-slate-200',
                    )}
                >
                    <h2 className="text-base font-semibold text-[#0f1b3d]">
                        {collapsible ? (
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#c8a44e] focus-visible:outline-none focus-visible:ring-inset"
                                >
                                    <span>
                                        Инвестор тарту кезеңінің мәліметтері
                                    </span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={cn(
                                            'size-4 shrink-0 transition-transform',
                                            expanded && 'rotate-180',
                                        )}
                                    />
                                </button>
                            </CollapsibleTrigger>
                        ) : (
                            <span className="block px-5 py-4">
                                Инвестор тарту кезеңінің мәліметтері
                            </span>
                        )}
                    </h2>
                </CardHeader>
                <CollapsibleContent>
                    {hasDetails && (
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
                                                handoverRejectionReason
                                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                    : acceptedAt
                                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                      : 'border-amber-200 bg-amber-50 text-amber-800'
                                            }
                                        >
                                            {handoverRejectionReason
                                                ? 'Кері қайтарылған'
                                                : acceptedAt
                                                  ? 'Қабылданды'
                                                  : historical
                                                    ? 'Қабылданбаған'
                                                    : 'Қабылдауды күтуде'}
                                        </Badge>
                                    </div>
                                    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[180px_1fr]">
                                        <dt className="text-slate-500">
                                            Қабылдайтын жауапты
                                        </dt>
                                        <dd>
                                            {handoverTo?.full_name ??
                                                (requestedAt
                                                    ? 'Сүйемелдеу резерві'
                                                    : 'Белгіленбеген')}
                                        </dd>
                                        <dt className="text-slate-500">
                                            Берілген күні
                                        </dt>
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
                                    {effectiveDecisionMode && !acceptedAt && (
                                        <form
                                            onSubmit={submitAcceptance}
                                            className="space-y-2 border-t border-slate-200 pt-3"
                                        >
                                            <p className="text-xs leading-relaxed text-slate-500">
                                                {effectiveDecisionMode ===
                                                'support-reserve'
                                                    ? 'Қабылданған жоба резервтен негізгі сүйемелдеу жобаларына өтеді.'
                                                    : 'Қабылданған жоба сүйемелдеу бағытының резервіне жіберіледі.'}
                                            </p>
                                            {Object.values(
                                                acceptanceForm.errors,
                                            )
                                                .filter(
                                                    (error): error is string =>
                                                        typeof error ===
                                                        'string',
                                                )
                                                .map((error) => (
                                                    <InputError
                                                        key={error}
                                                        message={error}
                                                    />
                                                ))}
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        acceptanceForm.processing ||
                                                        rejectionForm.processing
                                                    }
                                                    size="sm"
                                                >
                                                    <CheckCircle2 className="mr-2 size-4" />
                                                    {acceptanceForm.processing
                                                        ? 'Қабылдануда…'
                                                        : 'Қабылдау'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                                    disabled={
                                                        acceptanceForm.processing ||
                                                        rejectionForm.processing
                                                    }
                                                    onClick={() =>
                                                        setRejectionDialogOpen(
                                                            true,
                                                        )
                                                    }
                                                >
                                                    <XCircle className="mr-2 size-4" />
                                                    Кері қайтару
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                    {handoverRejectionReason && (
                                        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                                            <div className="min-w-0 space-y-1">
                                                <p className="font-semibold text-rose-950">
                                                    Кері қайтару себебі
                                                </p>
                                                <p className="break-words whitespace-pre-wrap text-rose-900">
                                                    {handoverRejectionReason}
                                                </p>
                                                <p className="text-xs text-rose-700">
                                                    {handoverRejectedBy?.full_name ??
                                                        'Қайтарған маман көрсетілмеген'}
                                                    {handoverRejectedAt
                                                        ? ` · ${dateLabel(handoverRejectedAt)}`
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {canResubmit && handoverRejectionReason && (
                                        <div className="border-t border-slate-200 pt-3">
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={
                                                    resubmissionForm.processing
                                                }
                                                onClick={submitResubmission}
                                            >
                                                <RotateCcw className="mr-2 size-4" />
                                                {resubmissionForm.processing
                                                    ? 'Жіберілуде…'
                                                    : 'Қайта сүйемелдеуге жіберу'}
                                            </Button>
                                            {Object.values(
                                                resubmissionForm.errors,
                                            )
                                                .filter(
                                                    (error): error is string =>
                                                        typeof error ===
                                                        'string',
                                                )
                                                .map((error) => (
                                                    <InputError
                                                        key={error}
                                                        message={error}
                                                    />
                                                ))}
                                        </div>
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
                    )}
                    {children && (
                        <div className={cn('px-5 pb-5', !hasDetails && 'pt-5')}>
                            {children}
                        </div>
                    )}
                </CollapsibleContent>
                <Dialog
                    open={rejectionDialogOpen}
                    onOpenChange={(nextOpen) => {
                        setRejectionDialogOpen(nextOpen);
                        if (!nextOpen) {
                            rejectionForm.clearErrors();
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Жобаны кері қайтару</DialogTitle>
                            <DialogDescription>
                                Жобаны берген маман түзету себебін көруі үшін
                                нақты түсіндірме жазыңыз.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitRejection} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="handover-rejection-reason">
                                    Кері қайтару себебі{' '}
                                    <span className="text-rose-600">*</span>
                                </Label>
                                <Textarea
                                    id="handover-rejection-reason"
                                    value={rejectionForm.data.rejection_reason}
                                    minLength={3}
                                    maxLength={1000}
                                    required
                                    className="min-h-28"
                                    placeholder="Қандай мәліметті түзету керегін жазыңыз"
                                    onChange={(event) => {
                                        rejectionForm.setData(
                                            'rejection_reason',
                                            event.target.value,
                                        );
                                        rejectionForm.clearErrors(
                                            'rejection_reason',
                                        );
                                    }}
                                />
                                <div className="flex items-start justify-between gap-3">
                                    <InputError
                                        message={
                                            rejectionForm.errors
                                                .rejection_reason
                                        }
                                    />
                                    <span className="ml-auto shrink-0 text-xs text-slate-400">
                                        {
                                            rejectionForm.data.rejection_reason
                                                .length
                                        }
                                        /1000
                                    </span>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setRejectionDialogOpen(false)
                                    }
                                >
                                    Болдырмау
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={rejectionForm.processing}
                                >
                                    {rejectionForm.processing
                                        ? 'Қайтарылуда…'
                                        : 'Кері қайтару'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </Card>
        </Collapsible>
    );
}
