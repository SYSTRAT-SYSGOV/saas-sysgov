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
    ? 'border-rose-500/80 shadow-[0_8px_30px_rgb(244,63,94,0.2)]'
    : isWarning
    ? 'border-amber-500/80 shadow-[0_8px_30px_rgb(245,158,11,0.2)]'
    : isSuccess
    ? 'border-emerald-500/80 shadow-[0_8px_30px_rgb(16,185,129,0.2)]'
    : 'border-blue-500/80 shadow-[0_8px_30px_rgb(59,130,246,0.2)]';

  const iconColor = isDanger
    ? 'text-rose-400 bg-rose-950/80 border-rose-500/40'
    : isWarning
    ? 'text-amber-400 bg-amber-950/80 border-amber-500/40'
    : isSuccess
    ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40'
    : 'text-blue-400 bg-blue-950/80 border-blue-500/40';

  const progressBarColor = isDanger
    ? 'bg-rose-500'
    : isWarning
    ? 'bg-amber-500'
    : isSuccess
    ? 'bg-emerald-500'
    : 'bg-blue-500';

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
      className={`pointer-events-auto w-full bg-slate-900 text-white rounded-sm border ${borderClass} overflow-hidden shadow-2xl relative`}
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
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-100">
                  {toast.title}
                </span>
                {toast.ano && (
                  <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    EXERCÍCIO {toast.ano}
                  </span>
                )}
              </div>
              {toast.limitName && (
                <div className="text-[11px] font-bold text-amber-400 dark:text-amber-300 mt-0.5">
                  {toast.limitName}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            aria-label="Fechar notificação"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <p className="text-xs text-slate-300 mt-2 leading-relaxed font-sans">
          {toast.message}
        </p>

        {/* Metric Badges if provided */}
        {(toast.metricValue || toast.threshold) && (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[10px] font-mono">
            {toast.metricValue && (
              <span className="px-2 py-0.5 rounded-sm bg-slate-800 text-white font-bold border border-slate-700">
                Realizado: <span className="text-amber-300">{toast.metricValue}</span>
              </span>
            )}
            {toast.threshold && (
              <span className="px-2 py-0.5 rounded-sm bg-slate-800/80 text-slate-300 border border-slate-700">
                Referência: <span className="text-slate-200">{toast.threshold}</span>
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        {toast.actionTabId && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">Lei de Responsabilidade Fiscal</span>
            <button
              type="button"
              onClick={() => {
                if (toast.actionTabId && onAction) {
                  onAction(toast.actionTabId);
                }
                onDismiss(toast.id);
              }}
              className="inline-flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 hover:underline transition cursor-pointer"
            >
              <span>{toast.actionLabel || 'Ver no Módulo LRF'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar timer */}
      <div className="h-1 w-full bg-slate-800 overflow-hidden">
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
            className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-sm border border-slate-700 shadow-md transition"
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
