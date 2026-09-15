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

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio];
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

function desvioPadrao(valores: number[], mediaValor: number): number {
  if (valores.length < 2) return 0;
  const somaQuadrados = valores.reduce((soma, v) => soma + (v - mediaValor) ** 2, 0);
  return Math.sqrt(somaQuadrados / (valores.length - 1));
}

function cvPercentual(valores: number[]): number {
  const mediaValor = media(valores);
  if (mediaValor <= 0) return 0;
  return (desvioPadrao(valores, mediaValor) / mediaValor) * 100;
}

const LIMIAR_CV_PERCENTUAL = 25;
const MINIMO_VALORES_RESTANTES = 3;

/**
 * Saneamento estatístico por Coeficiente de Variação (CV%) — mesmo
 * algoritmo do `SaneamentoEstatisticoService` do backend (remove
 * iterativamente o valor mais distante da mediana enquanto o CV% estiver
 * acima do limiar e ainda sobrar mais que o mínimo de cotações do RN-006),
 * replicado aqui para que o valor de referência recalculado ao vivo no
 * formulário bata com o que a IA sugeriu.
 */
export function saneamentoEstatistico(valoresEntrada: number[]): {
  valoresSaneados: number[];
  outliersRemovidos: number[];
  cvPercentual: number;
} {
  let valores = valoresEntrada.filter((v) => v > 0);
  const outliers: number[] = [];

  while (valores.length > MINIMO_VALORES_RESTANTES && cvPercentual(valores) > LIMIAR_CV_PERCENTUAL) {
    const medianaAtual = mediana(valores);
    let indiceMaisDistante = -1;
    let maiorDesvio = -1;

    valores.forEach((valor, indice) => {
      const desvio = Math.abs(valor - medianaAtual);
      if (desvio > maiorDesvio) {
        maiorDesvio = desvio;
        indiceMaisDistante = indice;
      }
    });

    if (indiceMaisDistante === -1) break;

    outliers.push(valores[indiceMaisDistante]);
    valores = valores.filter((_, i) => i !== indiceMaisDistante);
  }

  return { valoresSaneados: valores, outliersRemovidos: outliers, cvPercentual: cvPercentual(valores) };
}

export function valorReferenciaItem(cotacoes: CotacaoItemPesquisaPreco[], metodo: MetodoReferenciaPreco): number | null {
  const validas = cotacoesValidas(cotacoes).map((c) => c.valor_unitario);
  if (validas.length === 0) return null;

  const ordenados = [...validas].sort((a, b) => a - b);

  switch (metodo) {
    case 'menor_valor':
      return ordenados[0];
    case 'media':
      return media(ordenados);
    case 'mediana':
      return mediana(ordenados);
    case 'media_saneada': {
      // Só sanear com folga para manter o mínimo de cotações (RN-006) mesmo
      // removendo pelo menos 1 outlier; com amostra pequena, cai para a média simples.
      if (ordenados.length < MINIMO_VALORES_RESTANTES + 1) return media(ordenados);
      return media(saneamentoEstatistico(ordenados).valoresSaneados);
    }
  }
}

/** Resumo do saneamento estatístico de um item, para exibição no formulário/PDF quando o método é Média Saneada. */
export function descreverSaneamento(cotacoes: CotacaoItemPesquisaPreco[]): { cvPercentual: number; outliersRemovidos: number } | null {
  const validas = cotacoesValidas(cotacoes).map((c) => c.valor_unitario);
  if (validas.length < MINIMO_VALORES_RESTANTES + 1) return null;

  const resultado = saneamentoEstatistico(validas);
  return { cvPercentual: resultado.cvPercentual, outliersRemovidos: resultado.outliersRemovidos.length };
}

export const METODO_REFERENCIA_LABEL: Record<MetodoReferenciaPreco, string> = {
  media: 'Média',
  mediana: 'Mediana',
  menor_valor: 'Menor Valor',
  media_saneada: 'Média Saneada',
};

/** Mínimo de cotações válidas por item exigido para enviar a Pesquisa de Preços para revisão (RN-006, IN SEGES/ME nº 65/2021 — ver PesquisaPrecoService). */
export const MINIMO_COTACOES_POR_ITEM = 3;
