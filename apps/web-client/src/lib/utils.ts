import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma data no formato brasileiro ("DD/MM/AAAA" ou "DD/MM/AAAA
 * HH:mm") para "AAAA-MM-DD[ HH:mm]" — mesmos caracteres, ordem trocada,
 * então ordena cronologicamente como string simples (útil como
 * `accessorFn`/`meta.sortValue` de coluna de data em grids que só guardam a
 * data já formatada para exibição, sem um ISO/timestamp por perto).
 * Entradas que não batem com o formato voltam como vieram, sem lançar erro.
 */
export function paraDataOrdenavel(dataBr: string): string {
  const match = dataBr.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/);
  if (!match) return dataBr;
  const [, dia, mes, ano, resto] = match;
  return `${ano}-${mes}-${dia}${resto}`;
}