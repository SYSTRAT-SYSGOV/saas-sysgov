import type {
  CriticidadeOrdemServico,
  StatusOrdemServico,
  TipoAcaoOrdemServico,
  TipoLocalFiscalizavel,
} from './api';
import type { StatusVariant } from '@sysgov/ui';

export const TIPO_LOCAL_LABELS: Record<TipoLocalFiscalizavel, string> = {
  propriedade_rural: 'Propriedade Rural',
  estabelecimento_comercial: 'Estabelecimento Comercial',
  feira: 'Feira',
  evento: 'Evento',
  outro: 'Outro',
};

export const TIPO_LOCAL_OPTIONS = (Object.entries(TIPO_LOCAL_LABELS) as [TipoLocalFiscalizavel, string][]).map(
  ([value, label]) => ({ value, label }),
);

export const TIPO_ACAO_LABELS: Record<TipoAcaoOrdemServico, string> = {
  vistoria_rotina: 'Vistoria de Rotina',
  inspecao_sanitaria: 'Inspeção Sanitária',
  atendimento_denuncia: 'Atendimento de Denúncia',
  reinspecao: 'Reinspeção',
  autuacao: 'Autuação',
};

export const TIPO_ACAO_OPTIONS = (Object.entries(TIPO_ACAO_LABELS) as [TipoAcaoOrdemServico, string][]).map(
  ([value, label]) => ({ value, label }),
);

export const CRITICIDADE_LABELS: Record<CriticidadeOrdemServico, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const CRITICIDADE_VARIANTS: Record<CriticidadeOrdemServico, StatusVariant> = {
  baixa: 'neutral',
  media: 'info',
  alta: 'warning',
  urgente: 'danger',
};

export const CRITICIDADE_OPTIONS = (Object.entries(CRITICIDADE_LABELS) as [CriticidadeOrdemServico, string][]).map(
  ([value, label]) => ({ value, label }),
);

export const STATUS_ORDEM_LABELS: Record<StatusOrdemServico, string> = {
  agendada: 'Agendada',
  em_execucao: 'Em Execução',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const STATUS_ORDEM_VARIANTS: Record<StatusOrdemServico, StatusVariant> = {
  agendada: 'info',
  em_execucao: 'warning',
  concluida: 'success',
  cancelada: 'neutral',
};

export const STATUS_ORDEM_OPTIONS = (Object.entries(STATUS_ORDEM_LABELS) as [StatusOrdemServico, string][]).map(
  ([value, label]) => ({ value, label }),
);
