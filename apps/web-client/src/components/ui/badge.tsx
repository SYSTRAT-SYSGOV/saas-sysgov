import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "border-transparent [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "border-transparent text-primary underline-offset-4 [a&]:hover:underline",

        // Variantes de domínio SYSGOV/GOV.BR (badges "leves", fundo tonal em
        // vez de preenchido) — mantidas do Badge hand-rolled anterior, usadas
        // em ~8 telas do painel do cliente.
        primary: "bg-gov-primary-light text-gov-primary border-gov-primary/20",
        gold: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
        indigo: "bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]",
        cyan: "bg-[#ECFEFF] text-[#0891B2] border-[#A5F3FC]",
        neutral: "bg-[#F0F2F5] text-gov-text-secondary border-gov-border",
        success: "bg-success/10 text-success border-success/30",
        warning: "bg-warning/15 text-[#8D5B00] border-warning/40",
        danger: "bg-destructive/10 text-destructive border-destructive/30",
        info: "bg-status-info-bg text-status-info border-status-info-border",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
  icon?: React.ReactNode
}

function Badge({ className, variant, asChild = false, icon, children, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {icon}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
