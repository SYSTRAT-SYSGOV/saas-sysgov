/* Formatação monetária e de datas compartilhada pelos módulos (pura — testada no vitest). */

/** Centavos inteiros → "R$ 1.234,56" (sem float na conversão). */
export function formatarCentavos(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.trunc(centavos));
  const reais = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${reais},${String(abs % 100).padStart(2, '0')}`;
}

/**
 * "1.234,56" | "1234.56" | "1.234" → centavos; null se inválido ou com mais de 2 casas.
 * Ponto só é separador de milhar em grupos válidos ("1.234", "12.345.678"): "0.555" é recusado, nunca vira R$ 555,00.
 */
export function paraCentavos(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/, '');
  const milhar = /^[1-9]\d{0,2}(\.\d{3})+/;
  let normal: string;
  if (limpo.includes(',')) {
    const partes = limpo.split(',');
    if (partes.length !== 2) return null;
    const [inteiro, decimal] = partes;
    if (inteiro.includes('.') && !new RegExp(`${milhar.source}$`).test(inteiro)) return null;
    normal = `${inteiro.replace(/\./g, '')}.${decimal}`;
  } else if (new RegExp(`${milhar.source}$`).test(limpo)) {
    normal = limpo.replace(/\./g, '');
  } else {
    normal = limpo;
  }
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normal)) return null;
  const [reais, cents = '0'] = normal.split('.');
  return Number(reais) * 100 + Number(cents.padEnd(2, '0'));
}

/** "2026-09-22" | ISO → "22/09/2026". */
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [data] = valor.split('T');
  const [a, m, d] = data.split('-');
  return d && m && a ? `${d}/${m}/${a}` : valor;
}
