import React, { useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FAVORITOS_RECOLHIDO_KEY = 'sysgov:welcome:favoritos-recolhido';

function lerRecolhido(): boolean {
  try {
    return localStorage.getItem(FAVORITOS_RECOLHIDO_KEY) === '1';
  } catch {
    return false;
  }
}

/** Favoritos da home: o único bloco recolhível da página. Abre aberto; o estado recolhido fica salvo no navegador. */
export const FavoritosAccordion: React.FC<{ total: number; children: React.ReactNode }> = ({ total, children }) => {
  const [recolhido, setRecolhido] = useState<boolean>(lerRecolhido);

  const alternar = () => {
    const proximo = !recolhido;
    setRecolhido(proximo);
    try { localStorage.setItem(FAVORITOS_RECOLHIDO_KEY, proximo ? '1' : '0'); } catch { /* vale só nesta sessão */ }
  };

  return (
    <section>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={!recolhido}
        aria-controls="favoritos-painel"
        className="mb-3 flex w-full items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', recolhido && '-rotate-90')} />
        <Star className="h-5 w-5 fill-warning text-warning" />
        <h2 className="text-base font-bold text-foreground">Favoritos</h2>
        <span className="text-xs text-muted-foreground">({total} atalho(s))</span>
      </button>
      {!recolhido && <div id="favoritos-painel">{children}</div>}
    </section>
  );
};
