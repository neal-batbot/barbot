import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold tracking-tight transition-[background-color,color,border-color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#ece673]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-[#f2eb94]/70 bg-[#ece673] text-[#0d0d0f] shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset] hover:border-[#fff4b0] hover:bg-[#f2eb94]",
        destructive:
          "border border-destructive/60 bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-zinc-700 bg-zinc-900/80 text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] hover:border-zinc-600 hover:bg-zinc-800/90",
        secondary:
          "border border-zinc-700/80 bg-zinc-850 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800",
        ghost:
          "border border-transparent bg-transparent text-zinc-100 hover:bg-zinc-900/70",
        link: "rounded-none border-0 p-0 text-zinc-300 underline-offset-4 hover:text-zinc-100 hover:underline active:translate-y-0",
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
