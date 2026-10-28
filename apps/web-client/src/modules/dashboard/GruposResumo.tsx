import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { cn } from '@/lib/utils';
import { tomCartao } from './tonsCartao';
import type { GrupoResumo } from './tipos';

export const GRUPOS_RECOLHIDOS_KEY = 'sysgov:dashboard:grupos-recolhidos';

function lerRecolhidos(): string[] {
  try {
    const valor = JSON.parse(localStorage.getItem(GRUPOS_RECOLHIDOS_KEY) || '[]');
    return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Cards de resumo agrupados por área; cada grupo pode ser recolhido e a escolha fica salva neste navegador. */
export const GruposResumo: React.FC<{ grupos: GrupoResumo[] }> = ({ grupos }) => {
  const [recolhidos, setRecolhidos] = useState<string[]>(lerRecolhidos);

  const alternar = (chave: string) => {
    const proximo = recolhidos.includes(chave) ? recolhidos.filter((k) => k !== chave) : [...recolhidos, chave];
    setRecolhidos(proximo);
    try { localStorage.setItem(GRUPOS_RECOLHIDOS_KEY, JSON.stringify(proximo)); } catch { /* sem armazenamento: vale só nesta sessão */ }
  };

  return (
    <div className="space-y-4">
      {grupos.map((g) => {
        const aberto = !recolhidos.includes(g.key);
        const idPainel = `grupo-resumo-${g.key}`;
        return (
          <section key={g.key}>
            <button
              type="button"
              onClick={() => alternar(g.key)}
              aria-expanded={aberto}
              aria-controls={idPainel}
              className="mb-3 flex w-full items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', !aberto && '-rotate-90')} />
              <h2 className="text-base font-bold text-foreground">{g.label}</h2>
              <span className="text-xs text-muted-foreground">({g.cards.length})</span>
            </button>
            {aberto && (
              <div id={idPainel} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {g.cards.map((c) => (
                  <KpiCard
                    key={c.module}
                    title={c.label}
                    value={c.value.toLocaleString('pt-BR')}
                    subtitle={c.caption}
                    accentClassName={tomCartao(c.tone).accent}
                    valueClassName={tomCartao(c.tone).valor}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
