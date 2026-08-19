import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
    draft: 'border-slate-200 bg-slate-100 text-slate-700',
    submitted: 'border-sky-200 bg-sky-50 text-sky-700',
    under_review: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    needs_clarification: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    converted_to_project: 'border-violet-200 bg-violet-50 text-violet-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
    withdrawn: 'border-slate-200 bg-white text-slate-500',
    expired: 'border-orange-200 bg-orange-50 text-orange-700',
};

export default function ApplicationStatusBadge({
    status,
    label,
    className,
}: {
    status: string;
    label: string;
    className?: string;
}) {
    return (
        <Badge
            variant="outline"
            className={cn(styles[status] ?? styles.draft, className)}
        >
            {label}
        </Badge>
    );
}
