import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { ToastMessage } from '../types/fiscal';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  onAction?: (tabId: string) => void;
  onClearAll?: () => void;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
  onAction?: (tabId: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, onAction }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 8000;

  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev <= step) {
          clearInterval(interval);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPaused, duration, toast.id, onDismiss]);

  const isDanger = toast.type === 'danger' || toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isSuccess = toast.type === 'success';

  const borderClass = isDanger
    ? 'border-status-danger-border'
    : isWarning
    ? 'border-status-warning-border'
    : isSuccess
    ? 'border-status-success-border'
    : 'border-status-info-border';

  const iconColor = isDanger
    ? 'text-status-danger bg-status-danger-bg border-status-danger-border'
    : isWarning
    ? 'text-status-warning bg-status-warning-bg border-status-warning-border'
    : isSuccess
    ? 'text-status-success bg-status-success-bg border-status-success-border'
    : 'text-status-info bg-status-info-bg border-status-info-border';

  const progressBarColor = isDanger
    ? 'bg-destructive'
    : isWarning
    ? 'bg-status-warning'
    : isSuccess
    ? 'bg-primary'
    : 'bg-primary';

  const IconComponent = isDanger
    ? AlertOctagon
    : isWarning
    ? AlertTriangle
    : isSuccess
    ? CheckCircle2
    : Info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      id={`toast-notification-${toast.id}`}
      className={`pointer-events-auto w-full bg-card text-foreground rounded-md border ${borderClass} overflow-hidden shadow-lg relative`}
      role="alert"
      aria-live="assertive"
    >
      <div className="p-3.5 sm:p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className={`p-1.5 rounded-sm border shrink-0 mt-0.5 ${iconColor}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                  {toast.title}
                </span>
                {toast.ano && (
                  <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-mono font-bold bg-muted text-foreground border border-border">
                    EXERCÍCIO {toast.ano}
                  </span>
                )}
              </div>
              {toast.limitName && (
                <div className="text-[11px] font-bold text-status-warning mt-0.5">
                  {toast.limitName}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition shrink-0"
            aria-label="Fechar notificação"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-sans">
          {toast.message}
        </p>

        {/* Metric Badges if provided */}
        {(toast.metricValue || toast.threshold) && (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[10px] font-mono">
            {toast.metricValue && (
              <span className="px-2 py-0.5 rounded-sm bg-muted text-foreground font-bold border border-border">
                Realizado: <span className="text-status-warning">{toast.metricValue}</span>
              </span>
            )}
            {toast.threshold && (
              <span className="px-2 py-0.5 rounded-sm bg-muted text-foreground border border-border">
                Referência: <span className="text-muted-foreground">{toast.threshold}</span>
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        {toast.actionTabId && (
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">Lei de Responsabilidade Fiscal</span>
            <button
              type="button"
              onClick={() => {
                if (toast.actionTabId && onAction) {
                  onAction(toast.actionTabId);
                }
                onDismiss(toast.id);
              }}
              className="inline-flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider text-primary hover:text-primary hover:underline transition cursor-pointer"
            >
              <span>{toast.actionLabel || 'Ver no Módulo LRF'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar timer */}
      <div className="h-1 w-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ${progressBarColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onAction,
  onClearAll,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-notification-container"
      className="fixed top-18 sm:top-20 right-3 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
    >
      {toasts.length > 1 && onClearAll && (
        <div className="flex justify-end pointer-events-auto">
          <button
            type="button"
            onClick={onClearAll}
            className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-card hover:bg-accent text-foreground rounded-sm border border-border shadow-md transition"
          >
            Limpar todas ({toasts.length})
          </button>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
