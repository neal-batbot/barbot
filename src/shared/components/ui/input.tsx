import * as React from "react";

import { cn } from "@/shared/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Cursor Text Input Field: transparent bg, Muted Stone border, Inkwell text, 0px radius, 8px horizontal padding
        "file:text-foreground placeholder:text-[var(--color-muted-stone)] selection:bg-primary selection:text-primary-foreground",
        "border-[var(--color-muted-stone)] flex h-auto w-full min-w-0 rounded-[0px] border bg-transparent px-[8px] py-[6px] text-base text-[var(--color-inkwell)] transition-[color,box-shadow] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[var(--color-onyx-outline)] focus-visible:ring-[var(--color-onyx-outline)]/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
