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
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-zinc-700 bg-zinc-900/80 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition-[background-color,border-color,box-shadow] duration-200 outline-none data-[state=checked]:border-[#f0e889]/80 data-[state=checked]:bg-[#ece673] focus-visible:ring-2 focus-visible:ring-[#ece673]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-zinc-200 ring-0 transition-transform duration-200 data-[state=checked]:translate-x-[20px] data-[state=checked]:bg-zinc-900 data-[state=unchecked]:translate-x-[2px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
