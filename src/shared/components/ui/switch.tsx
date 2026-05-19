"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/shared/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-fd-border bg-fd-secondary shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] transition-[background-color,border-color,box-shadow] duration-200 outline-none data-[state=checked]:border-brand/80 data-[state=checked]:bg-brand focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-fd-card ring-0 transition-transform duration-200 data-[state=checked]:translate-x-[20px] data-[state=checked]:bg-brand-foreground data-[state=unchecked]:translate-x-[2px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
