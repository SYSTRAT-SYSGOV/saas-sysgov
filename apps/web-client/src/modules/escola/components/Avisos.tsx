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

/**
 * Cartão claro com faixa lateral na cor do tipo (paleta GOV.BR do painel). Título e texto têm cor explícita:
 * o estilo global de h4 (azul-escuro) deixava o título ilegível sobre o fundo escuro antigo.
 */
const ESTILO: Record<string, { faixa: string; icone: string }> = {
  success: { faixa: 'border-l-status-success', icone: 'text-status-success' },
  warning: { faixa: 'border-l-status-warning', icone: 'text-status-warning' },
  error: { faixa: 'border-l-status-danger', icone: 'text-status-danger' },
  info: { faixa: 'border-l-status-info', icone: 'text-status-info' },
};

export const Avisos: React.FC<{ avisos: Aviso[] }> = ({ avisos }) => (
  <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none print:hidden" aria-live="polite">
    {avisos.map((t) => (
      <div
        key={t.id}
        role={t.type === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-gov-border border-l-4 bg-white p-4 shadow-xl dark:bg-slate-900 ${(ESTILO[t.type] ?? ESTILO.info).faixa}`}
      >
        <div className={`mt-0.5 shrink-0 ${(ESTILO[t.type] ?? ESTILO.info).icone}`}>
          {t.type === 'success' && <ShieldCheck className="w-5 h-5" />}
          {(t.type === 'warning' || t.type === 'error') && <AlertTriangle className="w-5 h-5" />}
          {t.type !== 'success' && t.type !== 'warning' && t.type !== 'error' && <BookOpen className="w-5 h-5" />}
        </div>
        <div className="flex-1 space-y-0.5">
          <h4 className="text-sm font-bold leading-tight text-gov-text-primary dark:text-white">{t.title}</h4>
          <p className="text-xs leading-normal text-gov-text-secondary dark:text-slate-300">{t.message}</p>
        </div>
      </div>
    ))}
  </div>
);
