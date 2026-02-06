import React from "react"
import { cn } from "@/lib/utils"

interface TableProps extends React.HTMLAttributes<HTMLTableElement> { }
interface TableSectionProps extends React.HTMLAttributes<HTMLTableSectionElement> { }
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> { }
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> { }
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> { }
interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> { }

const Table = React.forwardRef<HTMLTableElement, TableProps>(
    ({ className, ...props }, ref) => (
        <div className="relative w-full overflow-auto rounded-xl bg-white">
            <table
                ref={ref}
                className={cn("w-full caption-bottom border-collapse", className)}
                {...props}
            />
        </div>
    )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(
    ({ className, ...props }, ref) => (
        <thead
            ref={ref}
            className={cn("bg-[#F0F4FA]", className)}
            {...props}
        />
    )
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(
    ({ className, ...props }, ref) => (
        <tbody
            ref={ref}
            className={cn("[&_tr]:border-b [&_tr]:border-[#E2E8F0] [&_tr:last-child]:border-0", className)}
            {...props}
        />
    )
)
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(
    ({ className, ...props }, ref) => (
        <tfoot
            ref={ref}
            className={cn("bg-[#F0F4FA] font-medium", className)}
            {...props}
        />
    )
)
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
    ({ className, ...props }, ref) => (
        <tr
            ref={ref}
            className={cn(
                "transition-colors duration-200 hover:bg-[#F9FAFB] data-[state=selected]:bg-blue-100/70",
                className
            )}
            {...props}
        />
    )
)
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
    ({ className, ...props }, ref) => (
        <th
            ref={ref}
            className={cn(
                "h-14 px-6 text-left align-middle font-semibold text-base text-[#2D3748] [&:has([role=checkbox])]:pr-0",
                className
            )}
            {...props}
        />
    )
)
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
    ({ className, ...props }, ref) => (
        <td
            ref={ref}
            className={cn(
                "px-6 py-4 align-middle text-[#2D3748] [&:has([role=checkbox])]:pr-0",
                className
            )}
            {...props}
        />
    )
)
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
    ({ className, ...props }, ref) => (
        <caption
            ref={ref}
            className={cn("mt-4 text-sm text-neutral-500 font-medium", className)}
            {...props}
        />
    )
)
TableCaption.displayName = "TableCaption"

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
}