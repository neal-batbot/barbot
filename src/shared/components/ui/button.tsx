import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Cursor Primary Filled Button: Inkwell bg, Canvas Parchment text, 4px radius
        default: "bg-[var(--color-inkwell)] text-[var(--color-canvas-parchment)] hover:bg-[var(--color-deep-shadow)] rounded-[4px]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 rounded-[4px]",
        // Cursor Outlined Accent Button: transparent bg, Onyx Outline border/text
        outline:
          "border border-[var(--color-onyx-outline)] bg-transparent text-[var(--color-onyx-outline)] hover:bg-[var(--color-onyx-outline)]/10 rounded-[4px]",
        secondary:
          "bg-[var(--color-pebble-gray)] text-[var(--color-inkwell)] hover:bg-[var(--color-highlight-beige)] rounded-[4px]",
        // Cursor Ghost Action Button: transparent bg, Inkwell text, minimal padding
        ghost:
          "bg-transparent text-[var(--color-inkwell)] hover:bg-[var(--color-pebble-gray)] rounded-[4px]",
        link: "text-[var(--color-onyx-outline)] underline-offset-4 hover:underline",
      },
      size: {
        // Cursor spec: 17.5px padding for filled/outlined buttons
        default: "h-auto px-[17.5px] py-[17.5px] has-[>svg]:px-[14px]",
        sm: "h-auto px-3 py-2 rounded-[4px] gap-1.5 has-[>svg]:px-2.5",
        lg: "h-auto px-6 py-4 rounded-[4px] has-[>svg]:px-4",
        // Cursor Ghost: 6px horizontal, 2px vertical
        ghost: "px-[6px] py-[2px]",
        icon: "size-9 p-0",
        "icon-sm": "size-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
