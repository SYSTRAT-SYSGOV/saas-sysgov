import type { StatusChipProps } from '@sysgov/ui';
import type { PapelSituacao, RegraSorteio, SituacaoDocumento, StatusEntidade, StatusLote, StatusTransferencia, Unidade, UnidadeRef } from './api';

/** Regras de apresentação do módulo Inservível (puras — testadas no vitest). */

type Variante = NonNullable<StatusChipProps['variant']>;

export { formatarCentavos, paraCentavos, formatarData } from '@/lib/formatacao';

export const VARIANTE_PAPEL: Record<PapelSituacao, Variante> = {
  inservivel: 'warning', em_avaliacao: 'info', em_lote: 'primary', doado: 'success', baixado: 'neutral', disponivel: 'success', em_transferencia: 'info',
};

export const ROTULO_STATUS_LOTE: Record<StatusLote, string> = { aberto: 'Aberto', publicado: 'Publicado', sorteado: 'Sorteado', entregue: 'Entregue', baixado: 'Baixado' };
export const VARIANTE_STATUS_LOTE: Record<StatusLote, Variante> = { aberto: 'neutral', publicado: 'info', sorteado: 'primary', entregue: 'success', baixado: 'neutral' };

export const ROTULO_STATUS_ENTIDADE: Record<StatusEntidade, string> = {
  pendente: 'Pendente', em_analise: 'Em Análise', habilitada: 'Habilitada', reprovada: 'Reprovada', desabilitada: 'Desabilitada',
};
export const VARIANTE_STATUS_ENTIDADE: Record<StatusEntidade, Variante> = {
  pendente: 'warning', em_analise: 'info', habilitada: 'success', reprovada: 'danger', desabilitada: 'neutral',
};

export const VARIANTE_TRANSFERENCIA: Record<StatusTransferencia, Variante> = {
  anunciado: 'info', solicitado: 'warning', aceito: 'success', recusado: 'danger', cancelado: 'neutral',
};

export const ROTULO_DOCUMENTO: Record<SituacaoDocumento, string> = { pendente: 'Pendente', aprovado: 'Aprovado', reprovado: 'Reprovado' };
export const VARIANTE_DOCUMENTO: Record<SituacaoDocumento, Variante> = { pendente: 'warning', aprovado: 'success', reprovado: 'danger' };

export const ROTULO_REGRA: Record<RegraSorteio, string> = {
  unica_inscrita: 'Única entidade apta inscrita',
  menos_lotes: 'Menor número de lotes recebidos',
  sorteio_semente: 'Desempate por semente auditável',
};

export const ROTULO_TERMO = { conferencia: 'Termo de conferência', entrega: 'Termo de entrega', doacao: 'Termo de doação com encargo' } as const;

/** "SMAD · Setor de Patrimônio" (ou só a secretaria). */
export function rotuloUnidade(secretaria: UnidadeRef | null, setor?: UnidadeRef | null): string {
  if (!secretaria) return '—';
  const sec = secretaria.sigla || secretaria.nome;
  return setor ? `${sec} · ${setor.nome}` : sec;
}

/** Secretarias do Organograma (tipos aceitos pelo backend) em ordem de nome. */
export function secretarias(unidades: Unidade[]): Unidade[] {
  return unidades.filter((u) => u.secretaria).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Unidades abaixo da secretaria (pelo caminho materializado), indentadas pela profundidade. */
export function setoresDe(unidades: Unidade[], secretariaId: number | null): { value: string; label: string }[] {
  const sec = unidades.find((u) => u.id === secretariaId);
  if (!sec) return [];
  const nivelBase = sec.path.split('.').length;
  return unidades
    .filter((u) => u.path.startsWith(`${sec.path}.`))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
    .map((u) => ({ value: String(u.id), label: `${'— '.repeat(Math.max(0, u.path.split('.').length - nivelBase - 1))}${u.nome}` }));
}

/** 11222333000181 → 11.222.333/0001-81. */
export function formatarCnpj(valor: string | null | undefined): string {
  const d = (valor ?? '').replace(/\D/g, '');
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : (valor ?? '—');
}

/** Data e hora locais (dd/mm/aaaa hh:mm). */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Dias até a data (negativo = vencido), contando a partir de hoje. */
export function diasAte(iso: string, hoje: Date = new Date()): number {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const alvo = Date.UTC(a, m - 1, d);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86_400_000);
}

/** Texto do alerta de validade: "venceu há 3 dias" / "vence hoje" / "vence em 10 dias". */
export function textoValidade(iso: string, hoje: Date = new Date()): string {
  const dias = diasAte(iso, hoje);
  if (dias < 0) return `venceu há ${-dias} dia${dias === -1 ? '' : 's'}`;
  if (dias === 0) return 'vence hoje';
  return `vence em ${dias} dia${dias === 1 ? '' : 's'}`;
}

/** Abre um arquivo (PDF, imagem) baixado da API numa nova aba. */
export function abrirArquivo(arquivo: Blob): void {
  const url = URL.createObjectURL(arquivo);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Campo de texto vazio vira null (a API usa null para "não informado"). */
export function vazioParaNulo(valor: string | null | undefined): string | null {
  const t = (valor ?? '').trim();
  return t === '' ? null : t;
}
