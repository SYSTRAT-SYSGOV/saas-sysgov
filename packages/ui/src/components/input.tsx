import * as React from "react"
import { cn } from "../lib/utils"

function InputPrimitive({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

/**
 * Input composto (label + helper/error + ícones) usado nas ~2 telas que
 * ainda não migraram pro padrão <Field><Input/></Field>. Por baixo, usa o
 * InputPrimitive real do shadcn/ui.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 shrink-0 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          <InputPrimitive
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            className={cn(
              'h-11',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 shrink-0 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs sm:text-sm font-medium text-destructive">{error}</p>
        ) : helperText ? (
          <p className="text-xs sm:text-sm text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { InputPrimitive }
export default Input
