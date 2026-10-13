import React from 'react';
import { cn } from '../lib/utils';
import { Check } from 'lucide-react';

export interface StepItem {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && index <= currentStep;

          return (
            <React.Fragment key={index}>
              {/* Conector antes do step (exceto o primeiro) */}
              {index > 0 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 transition-colors duration-200',
                    index <= currentStep ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}

              {/* Botão/Indicador do Step */}
              <div
                onClick={() => isClickable && onStepClick?.(index)}
                className={cn(
                  'flex flex-col items-center group relative px-2',
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                )}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border',
                    isCompleted &&
                      'bg-primary border-primary text-primary-foreground shadow-sm',
                    isCurrent &&
                      'bg-primary/10 border-primary text-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background font-bold',
                    !isCompleted &&
                      !isCurrent &&
                      'bg-muted/50 border-border text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : step.icon ? (
                    step.icon
                  ) : (
                    <span className="font-mono tabular-nums">{index + 1}</span>
                  )}
                </div>

                <div className="mt-2 text-center">
                  <span
                    className={cn(
                      'text-xs font-medium block whitespace-nowrap',
                      isCurrent && 'text-primary font-semibold',
                      isCompleted && 'text-foreground',
                      !isCompleted && !isCurrent && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[11px] text-muted-foreground block max-w-[120px] truncate">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
