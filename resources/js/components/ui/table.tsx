import type { LucideIcon } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

type TableProps = React.HTMLAttributes<HTMLTableElement>;
type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>;

const Table = React.forwardRef<HTMLTableElement, TableProps>(
    ({ className, ...props }, ref) => (
        <div className="relative w-full overflow-auto rounded-lg border border-slate-200/80 bg-white">
            <table
                ref={ref}
                className={cn(
                    'w-full caption-bottom border-collapse text-sm',
                    className,
                )}
                {...props}
            />
        </div>
    ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
    HTMLTableSectionElement,
    TableSectionProps
>(({ className, ...props }, ref) => (
    <thead
        ref={ref}
        className={cn(
            'border-b border-slate-200/80 bg-[#f4f6f8] [&_tr]:hover:bg-transparent',
            className,
        )}
        {...props}
    />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(
    ({ className, ...props }, ref) => (
        <tbody
            ref={ref}
            className={cn(
                '[&_tr]:border-b [&_tr]:border-slate-100 [&_tr:last-child]:border-0',
                className,
            )}
            {...props}
        />
    ),
);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
    HTMLTableSectionElement,
    TableSectionProps
>(({ className, ...props }, ref) => (
    <tfoot
        ref={ref}
        className={cn(
            'border-t border-slate-200/80 bg-slate-50/80 font-medium text-navy',
            className,
        )}
        {...props}
    />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
    ({ className, ...props }, ref) => (
        <tr
            ref={ref}
            className={cn(
                'transition-colors duration-150 hover:bg-[#f8f7f3] data-[state=selected]:bg-gold/10',
                className,
            )}
            {...props}
        />
    ),
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
    ({ className, ...props }, ref) => (
        <th
            ref={ref}
            className={cn(
                'h-12 px-5 text-left align-middle text-[11px] font-bold whitespace-nowrap text-slate-500 uppercase [&:has([role=checkbox])]:pr-0',
                className,
            )}
            {...props}
        />
    ),
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
    ({ className, ...props }, ref) => (
        <td
            ref={ref}
            className={cn(
                'px-5 py-4 align-middle text-sm text-navy [&:has([role=checkbox])]:pr-0',
                className,
            )}
            {...props}
        />
    ),
);
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
    HTMLTableCaptionElement,
    TableCaptionProps
>(({ className, ...props }, ref) => (
    <caption
        ref={ref}
        className={cn('mt-4 text-sm font-medium text-slate-500', className)}
        {...props}
    />
));
TableCaption.displayName = 'TableCaption';

type TableEmptyProps = {
    colSpan: number;
    title: string;
    description?: string;
    icon?: LucideIcon;
};

/** Unified empty state for table bodies. */
function TableEmpty({ colSpan, title, description, icon: Icon }: TableEmptyProps) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="py-14 text-center">
                {Icon && (
                    <Icon
                        className="mx-auto h-9 w-9 text-slate-300"
                        strokeWidth={1.5}
                    />
                )}
                <p className="mt-3 text-sm font-medium text-slate-600">
                    {title}
                </p>
                {description && (
                    <p className="mt-1 text-sm text-slate-400">{description}</p>
                )}
            </TableCell>
        </TableRow>
    );
}

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
    TableEmpty,
};
