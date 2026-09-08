"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "../lib/utils"

export interface SwitchProps
  extends Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, "size"> {
  size?: "sm" | "default" | "md"
  /** Alias de aria-label — mantido pelo call-site anterior ao real shadcn/ui. */
  label?: string
}

function Switch({ className, size = "default", label, ...props }: SwitchProps) {
  // "md" era o nome antigo do tamanho padrão (Switch hand-rolled) — mapeado
  // pro "default" do shadcn/ui pra não quebrar call-sites existentes.
  const resolvedSize = size === "md" ? "default" : size

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={resolvedSize}
      aria-label={label}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
