import type { StatusChipProps } from '@sysgov/ui';
import type { Configuracao, FormaPagamento, Formando, Periodo } from './api';

/** Regras de apresentação da Formatura (puras — testadas no vitest). */

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  pix: 'Pix', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito', boleto: 'Boleto',
};
export const FORMAS = Object.keys(ROTULO_FORMA) as FormaPagamento[];

type Variante = NonNullable<StatusChipProps['variant']>;
const SITUACAO: Record<Formando['situacao'], { rotulo: string; variante: Variante }> = {
  quitado: { rotulo: 'Quitado', variante: 'success' },
  parcial: { rotulo: 'Parcial', variante: 'warning' },
  pendente: { rotulo: 'Pendente', variante: 'danger' },
};

export function situacaoDoFormando(f: Formando): { rotulo: string; variante: Variante } {
  return f.participa ? SITUACAO[f.situacao] : { rotulo: 'Não participa', variante: 'neutral' };
}

/** Uma chave Pix por linha → lista sem vazias/repetidas, no máximo 5 (limite da API). */
export function chavesPixDeTexto(texto: string): string[] {
  return [...new Set(texto.split('\n').map((l) => l.trim()).filter(Boolean))].slice(0, 5);
}

export function anosLetivos(anosTurmas: number[], anoAtual: number): number[] {
  return [...new Set([...anosTurmas, anoAtual])].sort((a, b) => b - a);
}

export function proximaParcela(pagamentos: { numero_parcela: number }[], max: number): number {
  const maior = pagamentos.reduce((m, p) => Math.max(m, p.numero_parcela), 0);
  return Math.min(Math.max(maior + 1, 1), max);
}

/** Data de hoje (fuso do navegador) em AAAA-MM-DD. */
export function hojeIso(agora: Date = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${m}-${d}`;
}

export function periodoParaApi(inicio: string, fim: string): Periodo {
  return { ...(inicio ? { data_inicio: inicio } : {}), ...(fim ? { data_fim: fim } : {}) };
}

/** Telefone brasileiro (10–13 dígitos) → link do WhatsApp; senão null. */
export function linkWhatsApp(telefone: string | null): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 13) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

/** Centavos → texto para campo editável ("150,50"). */
export function centavosParaTexto(centavos: number): string {
  return `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, '0')}`;
}

/** Recebido pela mesma base do relatório: só pagamentos de quem participa. */
export function recebidoDosParticipantes(pagamentos: { valor_centavos: number; participa: boolean }[]): number {
  return pagamentos.reduce((s, p) => (p.participa ? s + p.valor_centavos : s), 0);
}

/** Data final antes da inicial (a API responderia 422). */
export function periodoInvalido(inicio: string, fim: string): boolean {
  return inicio !== '' && fim !== '' && fim < inicio;
}

/** Dados carregados para outro ano letivo não servem enquanto o novo ano carrega. */
export function dadosDoAno<T extends { ano: number }>(dados: T | null, ano: number): T | null {
  return dados !== null && dados.ano === ano ? dados : null;
}

/** Prévia do valor devido na ficha — mesma fórmula do servidor (D16); o servidor confirma ao salvar. */
export function previaValorDevido(
  config: Pick<Configuracao, 'tipo_calculo' | 'valor_base_centavos' | 'valor_pessoa_extra_centavos'>,
  participa: boolean,
  convidados: number,
): number {
  if (!participa) return 0;
  return config.tipo_calculo === 'por_pessoa'
    ? config.valor_base_centavos * (1 + convidados)
    : config.valor_base_centavos + convidados * config.valor_pessoa_extra_centavos;
}

/** Divide o saldo em `n` parcelas de centavos inteiros; o resto vai para a última (ex.: 2× 333,33 + 1× 333,34). */
export function simularParcelas(saldoCentavos: number, n: number): { quantidade: number; valor: number }[] {
  if (saldoCentavos <= 0 || n < 1) return [];
  const valor = Math.floor(saldoCentavos / n);
  const ultima = saldoCentavos - valor * (n - 1);
  if (ultima === valor) return [{ quantidade: n, valor }];
  return [...(n > 1 ? [{ quantidade: n - 1, valor }] : []), { quantidade: 1, valor: ultima }];
}
