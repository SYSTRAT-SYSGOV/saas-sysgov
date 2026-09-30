import React from 'react';
import type { PaginaOrgao } from '@sysgov/sdk';

interface Props {
  pagina: PaginaOrgao;
  children: React.ReactNode;
}

/**
 * Casca comum das páginas públicas de inscrição (catálogo, curso, cadastro) — design D7/D14:
 * cabeçalho com a identidade do órgão (nunca embutida no código) e o rodapé com a assinatura do
 * provedor, que o órgão pode esconder (`assinatura_oculta`). Mesmo desenho do portal público de
 * Cemitérios (`BuscaPublicaPage`).
 */
export const PaginaPublicaLayout: React.FC<Props> = ({ pagina, children }) => (
  <div className="min-h-screen bg-gov-page">
    <header className="border-b border-gov-border bg-white px-4 py-5 sm:px-8">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        {pagina.identidade.logo_url && <img src={pagina.identidade.logo_url} alt="" className="h-10 w-10 object-contain" />}
        <div>
          <h1 className="text-lg font-bold text-gov-primary sm:text-xl">{pagina.identidade.titulo}</h1>
          <p className="text-sm text-gov-text-muted">{pagina.nome}</p>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-8">
      {children}

      {!pagina.identidade.assinatura_oculta && <p className="pt-4 text-center text-xs text-gov-text-muted">Portal SYSGOV — SYSTRAT</p>}
    </main>
  </div>
);

export default PaginaPublicaLayout;
