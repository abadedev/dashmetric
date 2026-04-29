import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-h-[80px] rounded-xl border border-input bg-background/75 px-3 py-2 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-[background-color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:disabled:bg-input/80 resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
