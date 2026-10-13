import type { StatusChipProps } from '@sysgov/ui';
import type { Camada, CategoriaDemanda, Faixas, PontoMapa, Prioridade, RelacaoPrefeito, Situacao, StatusDemanda, TipoCoordenador } from './api';

/** Regras de apresentação da Campanha Política (puras — testadas no vitest). */

type Variante = NonNullable<StatusChipProps['variant']>;

export const SITUACOES: Situacao[] = ['sem_atuacao', 'em_andamento', 'consolidado', 'prioritario', 'risco'];

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  sem_atuacao: 'Sem atuação', em_andamento: 'Em andamento', consolidado: 'Consolidado', prioritario: 'Prioritário', risco: 'Risco',
};

export const VARIANTE_SITUACAO: Record<Situacao, Variante> = {
  sem_atuacao: 'neutral', em_andamento: 'info', consolidado: 'success', prioritario: 'warning', risco: 'danger',
};

export const ROTULO_RELACAO: Record<RelacaoPrefeito, string> = {
  aliado: 'Aliado', neutro: 'Neutro / sem acordo', oposicao: 'Oposição', sem_informacao: 'Sem informação',
};

export const VARIANTE_RELACAO: Record<RelacaoPrefeito, Variante> = { aliado: 'success', neutro: 'warning', oposicao: 'danger', sem_informacao: 'neutral' };

/** A relação com o prefeito usa as cores das situações, como no sistema de referência. */
const RELACAO_COMO_SITUACAO: Record<RelacaoPrefeito, Situacao> = { aliado: 'consolidado', neutro: 'prioritario', oposicao: 'risco', sem_informacao: 'sem_atuacao' };

export const ROTULO_CAMADA: Record<Camada, string> = { situacao: 'Situação Política', apoio_prefeito: 'Apoio de Prefeito', meta_votos: 'Meta de Votos', mapa_calor: 'Mapa de calor (eleitores)' };

/** Gradiente do mapa de calor (leaflet.heat) e a legenda correspondente. */
export const GRADIENTE_CALOR: Record<number, string> = { 0.3: '#3b82f6', 0.55: '#22c55e', 0.75: '#facc15', 1: '#ef4444' };
const COR_FUNDO_CALOR = '#e2e8f0';

export const ROTULO_CATEGORIA: Record<CategoriaDemanda, string> = {
  saude: 'Saúde', infraestrutura: 'Infraestrutura', seguranca: 'Segurança', educacao: 'Educação',
  emenda_parlamentar: 'Emenda parlamentar', oficio: 'Ofício', outra: 'Outra',
};
export const ROTULO_PRIORIDADE: Record<Prioridade, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
export const VARIANTE_PRIORIDADE: Record<Prioridade, Variante> = { alta: 'danger', media: 'warning', baixa: 'neutral' };
export const ROTULO_STATUS_DEMANDA: Record<StatusDemanda, string> = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída' };
export const VARIANTE_STATUS_DEMANDA: Record<StatusDemanda, Variante> = { pendente: 'warning', em_andamento: 'info', concluida: 'success' };

/** Data ISO (aaaa-mm-dd ou com hora) em dd/mm/aaaa. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

/** Data e hora locais (dd/mm/aaaa hh:mm). */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export const ROTULO_TIPO_COORDENADOR: Record<TipoCoordenador, string> = { estadual: 'Estadual', regional: 'Regional', municipal: 'Municipal' };

const numero = new Intl.NumberFormat('pt-BR');

/** 1234567 → "1.234.567"; nulo → "—". */
export function formatarNumero(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : numero.format(valor);
}

/**
 * Faixa da meta: meta 0 = sem meta (índice -1); senão a primeira faixa com meta ≤ limite; acima do último
 * limite, a faixa "acima" (índice = número de faixas).
 */
export function faixaDaMeta(meta: number, faixas: Faixas): number {
  if (meta <= 0) return -1;
  const i = faixas.faixas.findIndex((f) => meta <= f.limite);
  return i === -1 ? faixas.faixas.length : i;
}

/** Cor de preenchimento do município na camada escolhida. */
export function corDoMunicipio(ponto: PontoMapa | undefined, camada: Camada, cores: Record<Situacao, string>, faixas: Faixas): string {
  if (camada === 'mapa_calor') return COR_FUNDO_CALOR;
  if (camada === 'situacao') return cores[ponto?.situacao ?? 'sem_atuacao'];
  if (camada === 'apoio_prefeito') return cores[RELACAO_COMO_SITUACAO[ponto?.relacao_prefeito ?? 'sem_informacao']];
  const i = faixaDaMeta(ponto?.meta_votos ?? 0, faixas);
  if (i === -1) return cores.sem_atuacao;
  return i === faixas.faixas.length ? faixas.cor_acima : faixas.faixas[i].cor;
}

/** Itens da legenda da camada. */
export function legenda(camada: Camada, cores: Record<Situacao, string>, faixas: Faixas): { cor: string; rotulo: string }[] {
  if (camada === 'situacao') return SITUACOES.map((s) => ({ cor: cores[s], rotulo: ROTULO_SITUACAO[s] }));
  if (camada === 'mapa_calor') return [{ cor: '#3b82f6', rotulo: 'Poucos eleitores' }, { cor: '#facc15', rotulo: 'Concentração média' }, { cor: '#ef4444', rotulo: 'Alta concentração' }];
  if (camada === 'apoio_prefeito') {
    return (['aliado', 'neutro', 'oposicao', 'sem_informacao'] as RelacaoPrefeito[]).map((r) => ({ cor: cores[RELACAO_COMO_SITUACAO[r]], rotulo: ROTULO_RELACAO[r] }));
  }
  const itens = faixas.faixas.map((f, i) => ({ cor: f.cor, rotulo: i === 0 ? `Até ${formatarNumero(f.limite)}` : `${formatarNumero(faixas.faixas[i - 1].limite + 1)} a ${formatarNumero(f.limite)}` }));
  const ultimo = faixas.faixas[faixas.faixas.length - 1];
  return [
    { cor: cores.sem_atuacao, rotulo: 'Sem meta' },
    ...itens,
    ...(ultimo ? [{ cor: faixas.cor_acima, rotulo: `Acima de ${formatarNumero(ultimo.limite)}` }] : []),
  ];
}

/** Linhas da dica do mapa para a camada (nome do município é o título). */
export function dicaDoMunicipio(ponto: PontoMapa | undefined, camada: Camada, captados?: number): string[] {
  if (camada === 'mapa_calor') return [`Eleitores captados: ${formatarNumero(captados ?? 0)}`];
  if (!ponto) return ['Sem dados'];
  if (camada === 'situacao') return [ROTULO_SITUACAO[ponto.situacao], ponto.coordenador ? `Coordenador: ${ponto.coordenador}` : 'Sem coordenador'];
  if (camada === 'apoio_prefeito') {
    return [
      ponto.prefeito ? `Prefeito: ${ponto.prefeito}${ponto.partido_prefeito ? ` (${ponto.partido_prefeito})` : ''}` : 'Prefeito: sem informação',
      ...(ponto.vice ? [`Vice: ${ponto.vice}`] : []),
      `Relação: ${ROTULO_RELACAO[ponto.relacao_prefeito]}`,
    ];
  }
  return [`Meta de votos: ${formatarNumero(ponto.meta_votos)}`, ponto.coordenador ? `Coordenador: ${ponto.coordenador}` : 'Sem coordenador', `Cabos eleitorais: ${ponto.cabos}`];
}

/** Décimos de ponto percentual → "14,5%". */
export function formatarDecimos(decimos: number | null | undefined): string {
  if (decimos === null || decimos === undefined) return '—';
  return `${Math.trunc(decimos / 10)},${Math.abs(decimos % 10)}%`;
}

/** "14,5" | "14.5" | "14" → 145 décimos; null se inválido ou acima de 100. */
export function paraDecimos(texto: string): number | null {
  const normal = texto.trim().replace('%', '').replace(',', '.');
  if (!/^\d{1,3}(\.\d)?$/.test(normal)) return null;
  const [inteiro, decimal = '0'] = normal.split('.');
  const valor = Number(inteiro) * 10 + Number(decimal);
  return valor > 1000 ? null : valor;
}

/** Abre um arquivo baixado pela API numa aba nova (comprovante, imagem, foto). */
export function abrirArquivo(arquivo: Blob): void {
  const url = URL.createObjectURL(arquivo);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Salva o arquivo com o nome dado (planilhas). */
export function salvarArquivo(arquivo: Blob, nome: string): void {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/** CPF/CNPJ só com dígitos → 529.982.247-25 / 11.222.333/0001-81. */
export function formatarDocumento(digitos: string | null | undefined): string {
  const d = (digitos ?? '').replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return d || '—';
}
