import * as React from "react";

import { cn } from "@/shared/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-fd-border bg-fd-background/85 px-3 py-2 text-base text-fd-foreground placeholder:text-fd-muted-foreground/65 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] focus-visible:border-brand focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-fd-secondary/70 disabled:text-fd-muted-foreground disabled:opacity-100 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
