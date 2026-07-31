import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[96px] w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-[0_1px_2px_rgba(15,27,61,0.03)] placeholder:text-slate-400 transition-[border-color,box-shadow] hover:border-slate-300 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-gold/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }
