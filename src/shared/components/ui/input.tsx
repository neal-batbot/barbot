import * as React from "react";

import { cn } from "@/shared/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground selection:bg-primary selection:text-primary-foreground placeholder:text-zinc-500",
        "flex h-10 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-900/75 px-3 text-sm text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition-[border-color,box-shadow,background-color,color] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#ece673] focus-visible:ring-2 focus-visible:ring-[#ece673]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
