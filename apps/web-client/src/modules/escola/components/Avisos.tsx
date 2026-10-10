import React, { useCallback, useState } from 'react';
import { AlertTriangle, BookOpen, ShieldCheck } from 'lucide-react';

import type { Toast } from './AdminModal';

type Aviso = { id: string; type: string; title: string; message: string };

/** Avisos flutuantes (canto inferior direito) usados pelo Cadastro Escolar. */
export function useAvisos(): { avisos: Aviso[]; avisar: Toast } {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const avisar = useCallback<Toast>((aviso) => {
    const id = Math.random().toString(36).substring(2, 9);
    setAvisos((atual) => [...atual, { ...aviso, id }]);
    setTimeout(() => setAvisos((atual) => atual.filter((a) => a.id !== id)), 4500);
  }, []);
  return { avisos, avisar };
}

const ESTILO: Record<string, string> = {
  success: 'bg-emerald-950/90 border-emerald-500/50',
  warning: 'bg-amber-950/90 border-amber-500/50',
  error: 'bg-rose-950/90 border-rose-500/50',
};

export const Avisos: React.FC<{ avisos: Aviso[] }> = ({ avisos }) => (
  <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none print:hidden" aria-live="polite">
    {avisos.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md text-white ${ESTILO[t.type] ?? 'bg-slate-900/90 border-slate-700/50'}`}
      >
        <div className="mt-0.5 shrink-0">
          {t.type === 'success' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
          {(t.type === 'warning' || t.type === 'error') && <AlertTriangle className={`w-5 h-5 ${t.type === 'error' ? 'text-rose-400' : 'text-amber-400'}`} />}
          {t.type === 'info' && <BookOpen className="w-5 h-5 text-sky-400" />}
        </div>
        <div className="flex-1 space-y-0.5">
          <h4 className="text-xs font-bold leading-tight">{t.title}</h4>
          <p className="text-[11px] text-slate-200 leading-normal">{t.message}</p>
        </div>
      </div>
    ))}
  </div>
);
