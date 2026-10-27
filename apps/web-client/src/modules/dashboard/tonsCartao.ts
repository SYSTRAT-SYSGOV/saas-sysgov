/** Cor de cada cartão da home: nome vindo da API -> classes do KpiCard (barra à esquerda e valor). */
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
  rose: { accent: 'border-l-rose-500', valor: 'text-rose-600 dark:text-rose-400' },
  cyan: { accent: 'border-l-cyan-500', valor: 'text-cyan-600 dark:text-cyan-400' },
  orange: { accent: 'border-l-orange-500', valor: 'text-orange-600 dark:text-orange-400' },
  indigo: { accent: 'border-l-indigo-500', valor: 'text-indigo-600 dark:text-indigo-400' },
  teal: { accent: 'border-l-teal-500', valor: 'text-teal-600 dark:text-teal-400' },
  fuchsia: { accent: 'border-l-fuchsia-500', valor: 'text-fuchsia-600 dark:text-fuchsia-400' },
  lime: { accent: 'border-l-lime-500', valor: 'text-lime-600 dark:text-lime-400' },
  sky: { accent: 'border-l-sky-500', valor: 'text-sky-600 dark:text-sky-400' },
  red: { accent: 'border-l-red-500', valor: 'text-red-600 dark:text-red-400' },
  pink: { accent: 'border-l-pink-500', valor: 'text-pink-600 dark:text-pink-400' },
  yellow: { accent: 'border-l-yellow-500', valor: 'text-yellow-600 dark:text-yellow-400' },
  green: { accent: 'border-l-green-500', valor: 'text-green-600 dark:text-green-400' },
  purple: { accent: 'border-l-purple-500', valor: 'text-purple-600 dark:text-purple-400' },
  stone: { accent: 'border-l-stone-500', valor: 'text-stone-600 dark:text-stone-400' },
  slate: { accent: 'border-l-slate-500', valor: 'text-slate-600 dark:text-slate-400' },
};

export const tomCartao = (nome: string | undefined): TomCartao => TONS_CARTAO[nome ?? ''] ?? TONS_CARTAO.blue;
