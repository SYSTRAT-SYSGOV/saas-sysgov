import React, { useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

interface AdminModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-5xl' };

export const AdminModal: React.FC<AdminModalProps> = ({ title, onClose, children, footer, size = 'md' }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${SIZES[size]} max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800">{footer}</div>
        )}
      </div>
    </div>
  );
};

export const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500';

export const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';

export const btnSecondary =
  'px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700';

export const btnPrimary =
  'px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed';

export const btnDanger =
  'px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed';

export default AdminModal;

export type Toast = (toast: { type: string; title: string; message: string }) => void;

/** Estado de carga padrão das abas: spinner enquanto carrega, mensagem + "Tentar de novo" em erro. */
export const EstadoCarga: React.FC<{ carregando: boolean; erro: string | null; onTentar: () => void }> = ({ carregando, erro, onTentar }) => {
  if (erro) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-sm font-medium text-red-700 dark:text-red-300">{erro}</p>
        <button onClick={onTentar} className={btnSecondary}>Tentar de novo</button>
      </div>
    );
  }
  if (carregando) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-500" aria-live="polite">
        <Loader2 className="w-5 h-5 animate-spin" /> Carregando…
      </div>
    );
  }
  return null;
};
