import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold tracking-normal transition-[background-color,color,border-color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-brand/70 bg-brand text-brand-foreground shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] hover:border-brand hover:bg-brand-200",
        destructive:
          "border border-destructive/60 bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-fd-border bg-fd-card text-fd-foreground shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] hover:border-brand/50 hover:bg-fd-secondary",
        secondary:
          "border border-fd-border bg-fd-secondary text-fd-secondary-foreground hover:border-brand/40 hover:bg-fd-accent",
        ghost:
          "border border-transparent bg-transparent text-fd-foreground hover:bg-fd-secondary/75",
        link: "rounded-none border-0 p-0 text-fd-muted-foreground underline-offset-4 hover:text-brand hover:underline active:translate-y-0",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-3.5 text-sm has-[>svg]:px-3",
        lg: "h-14 px-8 text-lg has-[>svg]:px-6",
        ghost: "h-8 px-2 text-sm",
        icon: "size-10 p-0",
        "icon-sm": "size-8 p-0",
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
