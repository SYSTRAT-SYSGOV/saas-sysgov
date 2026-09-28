import type { EstadoSucessao } from '../api';
import type { StatusVariant } from '@/components/ui';

export const TRANSICOES_VALIDAS: Record<EstadoSucessao, EstadoSucessao[]> = {
  solicitada: ['em_analise'],
  em_analise: ['aguardando_documentos', 'validada', 'indeferida'],
  aguardando_documentos: ['em_analise', 'arquivada'],
  validada: ['sucedida', 'indeferida'],
  indeferida: ['arquivada'],
  sucedida: [],
  arquivada: [],
};

export const ESTADO_LABELS: Record<EstadoSucessao, string> = {
  solicitada: 'Solicitada',
  em_analise: 'Em Análise',
  aguardando_documentos: 'Aguardando Documentos',
  validada: 'Validada',
  sucedida: 'Sucedida',
  indeferida: 'Indeferida',
  arquivada: 'Arquivada',
};

export const ESTADO_BADGE_VARIANT: Record<EstadoSucessao, StatusVariant> = {
  solicitada: 'warning',
  em_analise: 'info',
  aguardando_documentos: 'warning',
  validada: 'success',
  sucedida: 'success',
  indeferida: 'danger',
  arquivada: 'neutral',
};

export const TRANSICAO_LABELS: Partial<Record<EstadoSucessao, Partial<Record<EstadoSucessao, string>>>> = {
  solicitada: { em_analise: 'Homologar' },
  em_analise: {
    aguardando_documentos: 'Solicitar Documentos',
    validada: 'Validar',
    indeferida: 'Indeferir',
  },
  aguardando_documentos: {
    em_analise: 'Retomar Análise',
    arquivada: 'Arquivar',
  },
  validada: {
    sucedida: 'Concluir / Transferir',
    indeferida: 'Indeferir',
  },
  indeferida: {
    arquivada: 'Arquivar',
  },
};

export function transicoesValidas(estado: EstadoSucessao): EstadoSucessao[] {
  return TRANSICOES_VALIDAS[estado] ?? [];
}

export function podeTransicionar(de: EstadoSucessao, para: EstadoSucessao): boolean {
  return TRANSICOES_VALIDAS[de]?.includes(para) ?? false;
}

export function isEstadoTerminal(estado: EstadoSucessao): boolean {
  return TRANSICOES_VALIDAS[estado]?.length === 0;
}
