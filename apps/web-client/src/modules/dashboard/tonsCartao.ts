/** Cor de cada um dos quatro cards básicos: nome vindo da API -> classes do KpiCard (barra à esquerda e valor). */
export interface TomCartao {
  accent: string;
  valor: string;
}

// Classes escritas por extenso para o Tailwind enxergá-las.
export const TONS_CARTAO: Record<string, TomCartao> = {
  blue: { accent: 'border-l-blue-500', valor: 'text-blue-600 dark:text-blue-400' },
  emerald: { accent: 'border-l-emerald-500', valor: 'text-emerald-600 dark:text-emerald-400' },
  amber: { accent: 'border-l-amber-500', valor: 'text-amber-600 dark:text-amber-400' },
  violet: { accent: 'border-l-violet-500', valor: 'text-violet-600 dark:text-violet-400' },
};

export const tomCartao = (nome: string | undefined): TomCartao => TONS_CARTAO[nome ?? ''] ?? TONS_CARTAO.blue;
