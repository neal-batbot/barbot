import * as React from "react";

import { cn } from "@/shared/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-fd-foreground selection:bg-brand selection:text-brand-foreground placeholder:text-fd-muted-foreground/65",
        "flex h-11 w-full min-w-0 rounded-xl border border-fd-border bg-fd-background/85 px-3 text-sm text-fd-foreground shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] transition-[border-color,box-shadow,background-color,color] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-fd-secondary/70 disabled:text-fd-muted-foreground disabled:opacity-100",
        "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-0",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
