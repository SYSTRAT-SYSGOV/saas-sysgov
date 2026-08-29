import React from 'react';
import { AccessStatus } from '../AccessApi';

/**
 * Badge visual de status/vigência de um acesso (RN-ACC-001).
 */
export const AccessBadge: React.FC<{ status: AccessStatus; expiring?: boolean; validTo?: string | null }> = ({
  status,
  expiring,
  validTo,
}) => {
  if (status === 'revoked') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
        REVOGADO
      </span>
    );
  }

  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
        EXPIRADO
      </span>
    );
  }

  if (expiring || (validTo && new Date(validTo).getTime() < Date.now() + 30 * 86400000)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
        EXPIRANDO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
      ATIVO
    </span>
  );
};

/**
 * Formata data ISO para exibição local (dd/mm/aaaa).
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}
