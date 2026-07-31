import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-slate-200 file:text-foreground placeholder:text-slate-400 selection:bg-primary selection:text-primary-foreground flex h-10 w-full min-w-0 rounded-lg border bg-white px-3.5 py-2 text-base shadow-[0_1px_2px_rgba(15,27,61,0.03)] transition-[color,border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 md:text-sm",
        "hover:border-slate-300 focus-visible:border-gold focus-visible:ring-gold/15 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
