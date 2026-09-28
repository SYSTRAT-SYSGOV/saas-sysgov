/**
 * SYSGOV — Inteligência Regulológica Cemiterial (Regras Sanitárias e Concessórias)
 *
 * Funções puras para diagnóstico de conformidade sanitária e prazos legais:
 * 1. Concessões Temporárias (Vencimento iminente < 60 dias ou vencidas)
 * 2. Inumações e Interstício Legal de Exumação (Período mínimo legal sanitário >= 3 anos)
 * 3. Condições Estruturais e Processos de Ruína/Abandono
 */

import type { Concessao, Inumacao, Jazigo, Vistoria, ProcessoAbandono } from './api';

export type TipoAlertaRegulatorio =
  | 'concessao_vencida'
  | 'concessao_a_vencer'
  | 'titular_falecido'
  | 'exumacao_elegivel'
  | 'risco_estrutural'
  | 'processo_abandono';

export type SeveridadeAlerta = 'critico' | 'atencao' | 'info';

export interface AlertaRegulatorio {
  tipo: TipoAlertaRegulatorio;
  severidade: SeveridadeAlerta;
  rotulo: string;
  descricao: string;
  dias?: number;
  dataReferencia?: string;
  detalheTecnico?: string;
}

export interface DiagnosticoConcessao {
  status: 'sem_concessao' | 'perpetua' | 'vencida' | 'a_vencer' | 'vigente';
  dias?: number;
  descricao: string;
  dataTermino?: string | null;
}

export interface DiagnosticoExumacao {
  elegivel: boolean;
  anosDecorridos: number;
  mesesDecorridos: number;
  tempoFormatado: string;
  descricao: string;
}

/**
 * Calcula a diferença em dias entre duas datas (dataAlvo - dataRef).
 */
export function diferencaDias(dataAlvoIso: string, dataRef: Date = new Date()): number {
  const alvo = new Date(dataAlvoIso);
  if (isNaN(alvo.getTime())) return 0;
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((alvo.getTime() - dataRef.getTime()) / msPorDia);
}

/**
 * Avalia o status da concessão do jazigo.
 */
export function calcularStatusConcessao(
  concessao?: Pick<Concessao, 'modalidade' | 'termino' | 'situacao'> | null,
  dataRef: Date = new Date()
): DiagnosticoConcessao {
  if (!concessao) {
    return {
      status: 'sem_concessao',
      descricao: 'Sem concessão ativa vinculada',
    };
  }

  if (concessao.modalidade === 'perpetua') {
    return {
      status: 'perpetua',
      descricao: 'Concessão perpétua sem termo final',
      dataTermino: null,
    };
  }

  if (!concessao.termino) {
    return {
      status: 'vigente',
      descricao: 'Concessão temporária sem termo final cadastrado',
      dataTermino: null,
    };
  }

  const diff = diferencaDias(concessao.termino, dataRef);

  if (diff < 0) {
    const atraso = Math.abs(diff);
    return {
      status: 'vencida',
      dias: atraso,
      descricao: `Concessão vencida há ${atraso} dia(s)`,
      dataTermino: concessao.termino,
    };
  }

  if (diff <= 60) {
    return {
      status: 'a_vencer',
      dias: diff,
      descricao: diff === 0 ? 'Concessão vence hoje' : `Concessão a vencer em ${diff} dia(s)`,
      dataTermino: concessao.termino,
    };
  }

  return {
    status: 'vigente',
    dias: diff,
    descricao: `Concessão vigente por mais ${diff} dia(s)`,
    dataTermino: concessao.termino,
  };
}

/**
 * Avalia se uma inumação completou o interstício legal sanitário para exumação.
 * Prazo padrão municipal brasileiro: 3 anos para adultos (e 2 anos para crianças).
 */
export function calcularStatusExumacao(
  inumacao: Pick<Inumacao, 'sepultado_em'>,
  prazoLegalAnos: number = 3,
  dataRef: Date = new Date()
): DiagnosticoExumacao {
  const dataSepultamento = new Date(inumacao.sepultado_em);
  if (isNaN(dataSepultamento.getTime())) {
    return {
      elegivel: false,
      anosDecorridos: 0,
      mesesDecorridos: 0,
      tempoFormatado: '0m',
      descricao: 'Data de sepultamento inválida',
    };
  }

  const msPorMes = 1000 * 60 * 60 * 24 * 30.4375;
  const mesesTotais = Math.max(0, Math.floor((dataRef.getTime() - dataSepultamento.getTime()) / msPorMes));
  const anosDecorridos = Math.floor(mesesTotais / 12);
  const mesesDecorridos = mesesTotais % 12;

  const tempoFormatado = anosDecorridos > 0 ? `${anosDecorridos}a ${mesesDecorridos}m` : `${mesesDecorridos}m`;
  const elegivel = anosDecorridos >= prazoLegalAnos;

  return {
    elegivel,
    anosDecorridos,
    mesesDecorridos,
    tempoFormatado,
    descricao: elegivel
      ? `Interstício sanitário atingido (${tempoFormatado} decorridos). Apto para translado ao ossuário.`
      : `Em cumprimento de interstício sanitário (${tempoFormatado} de ${prazoLegalAnos} anos).`,
  };
}

/**
 * Consolida todos os alertas regulatórios de uma unidade de sepultamento.
 */
export function obterAlertasReguloriosJazigo(params: {
  jazigo: Pick<Jazigo, 'estado' | 'tipo' | 'ocupacao'>;
  concessao?: Concessao | null;
  inumacoes?: Inumacao[];
  vistorias?: Vistoria[];
  processoAbandono?: ProcessoAbandono | null;
  prazoExumacaoAnos?: number;
  dataRef?: Date;
}): AlertaRegulatorio[] {
  const {
    jazigo,
    concessao,
    inumacoes = [],
    vistorias = [],
    processoAbandono,
    prazoExumacaoAnos = 3,
    dataRef = new Date(),
  } = params;

  const alertas: AlertaRegulatorio[] = [];

  // 1. Diagnóstico de Concessão
  if (concessao) {
    const diagConcessao = calcularStatusConcessao(concessao, dataRef);
    if (diagConcessao.status === 'vencida') {
      alertas.push({
        tipo: 'concessao_vencida',
        severidade: 'critico',
        rotulo: 'Concessão Vencida',
        descricao: diagConcessao.descricao,
        dias: diagConcessao.dias,
        dataReferencia: diagConcessao.dataTermino ?? undefined,
        detalheTecnico: `Contrato Nº ${concessao.numero}`,
      });
    } else if (diagConcessao.status === 'a_vencer') {
      alertas.push({
        tipo: 'concessao_a_vencer',
        severidade: 'atencao',
        rotulo: 'Concessão a Vencer',
        descricao: diagConcessao.descricao,
        dias: diagConcessao.dias,
        dataReferencia: diagConcessao.dataTermino ?? undefined,
      });
    }

    if (concessao.concessionario?.titular_falecido || (concessao.pendencia_regularizacao && concessao.motivo_pendencia === 'sucessao_hereditaria')) {
      const proc = concessao.concessionario?.processo_inventario;
      alertas.push({
        tipo: 'titular_falecido',
        severidade: 'critico',
        rotulo: 'Titular Falecido (Sucessão Pendente)',
        descricao: `Titular falecido com óbito registrado. Sepultamento de terceiros bloqueado até regularização de inventário/sucessão${proc ? ` (Inventário: ${proc})` : ''}.`,
        detalheTecnico: `Titular: ${concessao.concessionario?.nome ?? 'Concessionário'}`,
      });
    }
  }

  // 2. Diagnóstico de Inumações e Exumação
  const inumacoesElegiveis = inumacoes.filter((i) => {
    const diag = calcularStatusExumacao(i, prazoExumacaoAnos, dataRef);
    return diag.elegivel;
  });

  if (inumacoesElegiveis.length > 0) {
    const plural = inumacoesElegiveis.length > 1;
    alertas.push({
      tipo: 'exumacao_elegivel',
      severidade: 'info',
      rotulo: plural ? `${inumacoesElegiveis.length} Elegíveis p/ Exumação` : 'Elegível p/ Exumação',
      descricao: `${inumacoesElegiveis.length} inumação(ões) com interstício sanitário legal atingido (≥ ${prazoExumacaoAnos} anos).`,
      detalheTecnico: inumacoesElegiveis.map((i) => i.falecido?.nome || `Falecido #${i.deceased_id}`).join(', '),
    });
  }

  // 3. Processo de Ruína / Abandono
  if (processoAbandono && processoAbandono.situacao !== 'arquivado') {
    alertas.push({
      tipo: 'processo_abandono',
      severidade: 'atencao',
      rotulo: 'Processo de Abandono',
      descricao: `Edital/Notificação instaurada em ${processoAbandono.instaurado_em}. Situação: ${processoAbandono.situacao}.`,
      detalheTecnico: processoAbandono.decisao ?? undefined,
    });
  }

  // 4. Risco Estrutural na Vistoria ou Estado em Ruína
  const ultimaVistoria = vistorias[0];
  if (
    jazigo.estado === 'manutencao' ||
    ultimaVistoria?.risco === 'alto' ||
    ultimaVistoria?.estado_conservacao === 'critico'
  ) {
    alertas.push({
      tipo: 'risco_estrutural',
      severidade: 'critico',
      rotulo: 'Risco / Manutenção',
      descricao:
        jazigo.estado === 'manutencao'
          ? 'Unidade interditada por ruína ou manutenção.'
          : 'Laudo de vistoria aponta estado crítico ou alto risco estrutural.',
      detalheTecnico: ultimaVistoria?.observacoes ?? undefined,
    });
  }

  return alertas;
}
