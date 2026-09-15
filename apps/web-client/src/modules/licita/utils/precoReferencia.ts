import type { CotacaoItemPesquisaPreco, MetodoReferenciaPreco } from '@sysgov/sdk';

/**
 * Valor de referência de um item a partir das cotações válidas
 * (valor_unitario > 0) — espelha `PesquisaPrecoService::validarMinimoCotacoes`
 * no backend quanto ao que conta como cotação válida. Nunca persistido —
 * sempre calculado a partir das cotações (mesmo padrão do nível/
 * classificação do Mapa de Riscos, ver classificacaoRisco.ts).
 */
export function cotacoesValidas(cotacoes: CotacaoItemPesquisaPreco[]): CotacaoItemPesquisaPreco[] {
  return cotacoes.filter((c) => c.valor_unitario > 0);
}

export function valorReferenciaItem(cotacoes: CotacaoItemPesquisaPreco[], metodo: MetodoReferenciaPreco): number | null {
  const validas = cotacoesValidas(cotacoes).map((c) => c.valor_unitario);
  if (validas.length === 0) return null;

  const ordenados = [...validas].sort((a, b) => a - b);

  switch (metodo) {
    case 'menor_valor':
      return ordenados[0];
    case 'media':
      return ordenados.reduce((soma, v) => soma + v, 0) / ordenados.length;
    case 'mediana': {
      const meio = Math.floor(ordenados.length / 2);
      return ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio];
    }
  }
}

export const METODO_REFERENCIA_LABEL: Record<MetodoReferenciaPreco, string> = {
  media: 'Média',
  mediana: 'Mediana',
  menor_valor: 'Menor Valor',
};

/** Mínimo de cotações válidas por item exigido para enviar a Pesquisa de Preços para revisão (RN-006, IN SEGES/ME nº 65/2021 — ver PesquisaPrecoService). */
export const MINIMO_COTACOES_POR_ITEM = 3;
