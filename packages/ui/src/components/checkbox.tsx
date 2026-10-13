"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon } from "lucide-react"
import { cn } from "../lib/utils"

export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  /** Texto ao lado da caixa; clicar nele também marca/desmarca. */
  label?: React.ReactNode
}

/** Caixa de seleção (shadcn/ui sobre Radix). Com `label`, já vem com o rótulo clicável. */
function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  const automatico = React.useId()
  const campoId = id ?? automatico

  const caixa = (
    <CheckboxPrimitive.Root
      id={campoId}
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex items-center justify-center text-current">
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )

  if (label === undefined) return caixa

  return (
    <div className="flex items-center gap-2">
      {caixa}
      <label htmlFor={campoId} className="cursor-pointer text-sm leading-tight text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
        {label}
      </label>
    </div>
  )
}

export { Checkbox }
