export type ModalidadeLicitacao =
  | 'pregao_eletronico'
  | 'concorrencia'
  | 'concurso'
  | 'leilao'
  | 'dialogo_competitivo'
  | 'dispensa_eletronica'
  | 'inexigibilidade';

export type CriterioJulgamento =
  | 'menor_preco'
  | 'maior_desconto'
  | 'melhor_tecnica'
  | 'tecnica_e_preco'
  | 'maior_lance'
  | 'maior_retorno_economico';

export type StatusLicitacao =
  | 'rascunho'
  | 'em_fase_interna'
  | 'em_publicacao'
  | 'publicada'
  | 'em_disputa'
  | 'em_julgamento'
  | 'em_habilitacao'
  | 'em_recurso'
  | 'adjudicada'
  | 'homologada'
  | 'deserta'
  | 'fracassada'
  | 'anulada'
  | 'revogada';

export type StatusArtefato = 'rascunho' | 'em_analise' | 'aprovado' | 'reprovado';
export type TipoArtefato = 'dfd' | 'etp' | 'matriz_riscos' | 'pesquisa_mercado' | 'tr' | 'parecer';

export interface ArtefatoFaseInterna {
  id?: number;
  tipo: TipoArtefato;
  status: StatusArtefato;
  conteudo?: Record<string, any>;
  created_by?: number;
  aprovado_por?: number;
  aprovado_em?: string;
  justificativa_reprovacao?: string;
}

export interface FontePreco {
  id: number;
  tipo_fonte: 'banco_precos' | 'pncp' | 'contratacao_similar' | 'cotacao';
  item_descricao: string;
  fornecedor: string;
  cnpj?: string;
  valor_cents: number;
  url_ref?: string;
  status: 'valida' | 'outlier';
  motivo_outlier?: string;
}

export interface EstatisticasPrecos {
  total_sources: number;
  valid_sources_count: number;
  outliers_count: number;
  media_cents: number;
  mediana_cents: number;
  menor_valor_cents: number;
  maior_valor_cents: number;
  threshold_cents: number;
  is_valid: boolean;
}

export interface ParticipanteLicitacao {
  id: number;
  razao_social: string;
  cnpj: string;
  porte_me_epp: boolean;
  status: 'credenciado' | 'classificado' | 'desclassificado' | 'habilitado' | 'inabilitado' | 'vencedor';
}

export interface LanceSala {
  id: number;
  participante_id: number;
  valor_cents: number;
  ordem: number;
  lancado_em: string;
  participante?: ParticipanteLicitacao;
}

export interface ParecerJuridico {
  id: number;
  tipo: 'juridico' | 'controle_interno' | 'tecnico';
  conteudo: string;
  conclusao: 'favoravel' | 'com_ressalvas' | 'desfavoravel';
  status: 'rascunho' | 'emitido' | 'aprovado' | 'rejeitado';
  created_by?: number;
  aprovado_por?: number;
  aprovado_em?: string;
}

export interface ContratoLicitacao {
  id: number;
  numero: string;
  objeto: string;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  valor_inicial_cents: number;
  valor_atualizado_cents: number;
  vigencia_inicio: string;
  vigencia_fim: string;
  garantia_tipo?: string;
  garantia_valor_cents?: number;
  status: 'vigente' | 'suspenso' | 'rescindido' | 'encerrado';
  aditivos?: AditivoContratual[];
  medicoes?: MedicaoContratual[];
  pagamentos?: PagamentoContratual[];
}

export interface AditivoContratual {
  id: number;
  numero: string;
  tipo: 'aditivo_acrescimo' | 'aditivo_supressao' | 'aditivo_prazo' | 'apostilamento';
  valor_cents: number;
  percentual_aditivo: number;
  percentual_acumulado: number;
  nova_vigencia_fim?: string;
  motivo: string;
  status: string;
}

export interface MedicaoContratual {
  id: number;
  numero: string;
  periodo: string;
  valor_cents: number;
  status: 'em_analise' | 'atestado' | 'rejeitado';
  observacoes?: string;
}

export interface PagamentoContratual {
  id: number;
  nota_fiscal: string;
  valor_cents: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'liquidado' | 'pago' | 'em_atraso' | 'cancelado';
  ordem_bancaria?: string;
}

export interface LicitacaoProcesso {
  id: number;
  numero: string;
  ano: number;
  modalidade: ModalidadeLicitacao;
  objeto: string;
  criterio_julgamento: CriterioJulgamento;
  regime_execucao: string;
  valor_estimado_cents: number;
  status: StatusLicitacao;
  fase_interna?: Record<string, any>;
  data_abertura?: string;
  fundamento_legal: string;
  srp: boolean;
  exclusivo_me_epp: boolean;
  created_by?: number;
  homologado_por?: number;
  homologado_em?: string;
  pncp_id?: string;
  created_at?: string;
  artefatos?: ArtefatoFaseInterna[];
  precos?: FontePreco[];
  participantes?: ParticipanteLicitacao[];
  lances?: LanceSala[];
  pareceres?: ParecerJuridico[];
  contratos?: ContratoLicitacao[];
}
