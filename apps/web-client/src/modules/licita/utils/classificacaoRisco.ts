/**
 * Nível e classificação de um risco (Probabilidade x Impacto, escala 1-5
 * cada) — espelha `ClassificacaoRisco.php` no backend. Faixas de corte
 * replicadas do modelo de referência já usado pela prefeitura fora do
 * SYSGOV (matriz 5x5): 1-4 Aceitável, 5-14 Moderado, 15-25 Intolerável.
 * Nunca persistido — sempre calculado a partir de probabilidade/impacto.
 */
export type Classificacao = 'aceitavel' | 'moderado' | 'intoleravel';

export function nivelRisco(probabilidade: number, impacto: number): number {
  return probabilidade * impacto;
}

export function classificarRisco(probabilidade: number, impacto: number): Classificacao {
  const nivel = nivelRisco(probabilidade, impacto);
  if (nivel <= 4) return 'aceitavel';
  if (nivel <= 14) return 'moderado';
  return 'intoleravel';
}

export const CLASSIFICACAO_LABEL: Record<Classificacao, string> = {
  aceitavel: 'Aceitável',
  moderado: 'Moderado',
  intoleravel: 'Intolerável',
};

/** Cores do heatmap/badges — mesmas do PDF de referência (verde/amarelo/vermelho). */
export const CLASSIFICACAO_CORES: Record<Classificacao, { bg: string; text: string }> = {
  aceitavel: { bg: '#8bc34a', text: '#1b3d0f' },
  moderado: { bg: '#ffd54f', text: '#5c4400' },
  intoleravel: { bg: '#e53935', text: '#ffffff' },
};
