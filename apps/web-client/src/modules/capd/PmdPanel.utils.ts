export interface AcaoPmd {
  descricao: string;
  prazo?: string;
  status?: 'pendente' | 'em_andamento' | 'concluido' | string;
}

export interface ServidorResumo {
  id: number;
  nome_completo: string;
  matricula: string;
  cargo_efetivo?: string | null;
  orgao_lotacao?: string | null;
}

export interface PlanoMelhoriaItem {
  id: number;
  servidor_id: number;
  ciclo_id: number;
  ciclo_verificacao_id?: number | null;
  nfc_gatilho: string;
  objetivos: string;
  acoes?: AcaoPmd[] | null;
  prazo: string;
  status: 'aberto' | 'em_andamento' | 'concluido' | 'verificado' | 'cancelado';
  conceito_atingido?: string | null;
  responsavel_id?: number | null;
  concluido_em?: string | null;
  verificado_em?: string | null;
  verificado_por?: number | null;
  observacoes_verificacao?: string | null;
  ciclo?: { id: number; nome: string; ano_competencia?: number; ano_referencia?: number } | null;
  ciclo_verificacao?: { id: number; nome: string; ano_competencia?: number; ano_referencia?: number } | null;
  servidor?: ServidorResumo | null;
  created_at?: string;
}

export interface KpisPmd {
  totalAtivos: number;
  totalConcluidosAcoes: number;
  totalVerificados: number;
  totalCancelados: number;
  totalGeral: number;
  taxaRecuperacao: string;
  taxaRecuperacaoNumero: number;
  totalVencidos: number;
  totalVencendoEmBreve: number;
  mediaNfcGatilho: string;
}

export interface UrgenciaPrazoInfo {
  tipo: 'vencido' | 'vence_em_breve' | 'regular' | 'concluido';
  label: string;
  diasRestantes: number;
  badgeVariant: 'destructive' | 'warning' | 'outline' | 'default';
  corTexto: string;
}

export interface FiltrosPmd {
  busca?: string;
  status?: string;
  urgencia?: 'todos' | 'vencidos' | 'vencendo_em_breve' | 'no_prazo';
  cicloId?: string | number;
}

export interface DeltaEvolucaoInfo {
  delta: number;
  deltaTexto: string;
  evoluiu: boolean;
  superouCorte: boolean;
  statusSuperacao: 'apto' | 'insuficiente';
}

export const STATUS_PMD_LABEL: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  concluido: 'Ações Concluídas',
  verificado: 'Verificado / Superado',
  cancelado: 'Cancelado',
};

export const STATUS_PMD_VARIANT: Record<string, 'primary' | 'warning' | 'success' | 'neutral'> = {
  aberto: 'primary',
  em_andamento: 'warning',
  concluido: 'primary',
  verificado: 'success',
  cancelado: 'neutral',
};

export function calcularUrgenciaPrazo(
  prazoIso: string,
  status: string,
  dataReferencia: Date = new Date()
): UrgenciaPrazoInfo {
  if (status === 'verificado' || status === 'cancelado') {
    return {
      tipo: 'concluido',
      label: status === 'verificado' ? 'Concluído' : 'Cancelado',
      diasRestantes: 0,
      badgeVariant: 'outline',
      corTexto: 'text-muted-foreground',
    };
  }

  if (!prazoIso) {
    return {
      tipo: 'regular',
      label: 'Sem prazo',
      diasRestantes: 999,
      badgeVariant: 'outline',
      corTexto: 'text-muted-foreground',
    };
  }

  const dataRef = new Date(dataReferencia);
  dataRef.setHours(0, 0, 0, 0);

  const prazo = new Date(prazoIso);
  prazo.setHours(0, 0, 0, 0);

  const diffMs = prazo.getTime() - dataRef.getTime();
  const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    const diasVencido = Math.abs(diasRestantes);
    return {
      tipo: 'vencido',
      label: `Vencido há ${diasVencido} ${diasVencido === 1 ? 'dia' : 'dias'}`,
      diasRestantes,
      badgeVariant: 'destructive',
      corTexto: 'text-red-500',
    };
  }

  if (diasRestantes <= 30) {
    return {
      tipo: 'vence_em_breve',
      label: diasRestantes === 0 ? 'Vence hoje' : `Vence em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`,
      diasRestantes,
      badgeVariant: 'warning',
      corTexto: 'text-amber-500',
    };
  }

  return {
    tipo: 'regular',
    label: `No prazo (${diasRestantes} dias)`,
    diasRestantes,
    badgeVariant: 'outline',
    corTexto: 'text-muted-foreground',
  };
}

export function obterProgressoAcoes(acoes?: AcaoPmd[] | null): {
  concluidas: number;
  total: number;
  percentual: number;
  texto: string;
} {
  if (!acoes || !Array.isArray(acoes) || acoes.length === 0) {
    return { concluidas: 0, total: 0, percentual: 0, texto: 'Sem ações' };
  }

  const total = acoes.length;
  const concluidas = acoes.filter((a) => a.status === 'concluido').length;
  const percentual = Math.round((concluidas / total) * 100);

  return {
    concluidas,
    total,
    percentual,
    texto: `${concluidas}/${total} (${percentual}%)`,
  };
}

export function calcularDeltaEvolucao(
  nfcGatilho: string | number,
  nfcNova: string | number
): DeltaEvolucaoInfo {
  const gatilho = typeof nfcGatilho === 'number' ? nfcGatilho : parseFloat(nfcGatilho) || 0;
  const nova = typeof nfcNova === 'number' ? nfcNova : parseFloat(nfcNova) || 0;

  const delta = Number((nova - gatilho).toFixed(2));
  const sinal = delta > 0 ? '+' : '';
  const deltaTexto = `${sinal}${delta.toFixed(2).replace('.', ',')} pts`;
  const evoluiu = delta > 0;
  const superouCorte = nova >= 70.0;

  return {
    delta,
    deltaTexto,
    evoluiu,
    superouCorte,
    statusSuperacao: superouCorte ? 'apto' : 'insuficiente',
  };
}

export function calcularKpisPmd(
  pmds: PlanoMelhoriaItem[],
  dataReferencia: Date = new Date()
): KpisPmd {
  const totalGeral = pmds.length;
  let totalAtivos = 0;
  let totalConcluidosAcoes = 0;
  let totalVerificados = 0;
  let totalCancelados = 0;
  let totalVencidos = 0;
  let totalVencendoEmBreve = 0;
  let somaNfcGatilho = 0;

  for (const p of pmds) {
    const gatilhoNum = parseFloat(p.nfc_gatilho) || 0;
    somaNfcGatilho += gatilhoNum;

    if (p.status === 'aberto' || p.status === 'em_andamento') {
      totalAtivos++;
      const urgencia = calcularUrgenciaPrazo(p.prazo, p.status, dataReferencia);
      if (urgencia.tipo === 'vencido') {
        totalVencidos++;
      } else if (urgencia.tipo === 'vence_em_breve') {
        totalVencendoEmBreve++;
      }
    } else if (p.status === 'concluido') {
      totalConcluidosAcoes++;
    } else if (p.status === 'verificado') {
      totalVerificados++;
    } else if (p.status === 'cancelado') {
      totalCancelados++;
    }
  }

  const finalizados = totalVerificados + totalCancelados;
  const taxaNumero =
    totalGeral > 0
      ? (totalVerificados / (totalGeral - totalCancelados || 1)) * 100
      : 100;
  const taxaRecuperacao =
    (totalGeral === 0 ? 100 : Math.min(100, Math.max(0, taxaNumero))).toFixed(1).replace('.', ',') + '%';

  const mediaGatilho =
    totalGeral > 0 ? (somaNfcGatilho / totalGeral).toFixed(2).replace('.', ',') : '0,00';

  return {
    totalAtivos,
    totalConcluidosAcoes,
    totalVerificados,
    totalCancelados,
    totalGeral,
    taxaRecuperacao,
    taxaRecuperacaoNumero: Number(taxaNumero.toFixed(1)),
    totalVencidos,
    totalVencendoEmBreve,
    mediaNfcGatilho: mediaGatilho,
  };
}

export function filtrarPmds(
  pmds: PlanoMelhoriaItem[],
  filtros: FiltrosPmd,
  dataReferencia: Date = new Date()
): PlanoMelhoriaItem[] {
  const busca = (filtros.busca || '').trim().toLowerCase();
  const statusFiltro = filtros.status || '';
  const urgenciaFiltro = filtros.urgencia || 'todos';
  const cicloFiltro = filtros.cicloId ? String(filtros.cicloId) : '';

  return pmds.filter((p) => {
    // Filtro por status
    if (statusFiltro && p.status !== statusFiltro) {
      return false;
    }

    // Filtro por ciclo
    if (cicloFiltro && String(p.ciclo_id) !== cicloFiltro) {
      return false;
    }

    // Filtro por urgência do prazo
    if (urgenciaFiltro !== 'todos') {
      const urgencia = calcularUrgenciaPrazo(p.prazo, p.status, dataReferencia);
      if (urgenciaFiltro === 'vencidos' && urgencia.tipo !== 'vencido') {
        return false;
      }
      if (urgenciaFiltro === 'vencendo_em_breve' && urgencia.tipo !== 'vence_em_breve') {
        return false;
      }
      if (urgenciaFiltro === 'no_prazo' && (urgencia.tipo === 'vencido' || urgencia.tipo === 'vence_em_breve')) {
        return false;
      }
    }

    // Busca textual
    if (busca) {
      const nomeServidor = (p.servidor?.nome_completo || '').toLowerCase();
      const matricula = (p.servidor?.matricula || '').toLowerCase();
      const cargo = (p.servidor?.cargo_efetivo || '').toLowerCase();
      const objetivos = (p.objetivos || '').toLowerCase();
      const cicloNome = (p.ciclo?.nome || '').toLowerCase();
      const idStr = String(p.id);
      const servidorIdStr = String(p.servidor_id);

      const match =
        nomeServidor.includes(busca) ||
        matricula.includes(busca) ||
        cargo.includes(busca) ||
        objetivos.includes(busca) ||
        cicloNome.includes(busca) ||
        idStr.includes(busca) ||
        servidorIdStr.includes(busca);

      if (!match) return false;
    }

    return true;
  });
}

export function gerarCsvPmd(pmds: PlanoMelhoriaItem[]): string {
  const cabecalhos = [
    'ID',
    'Servidor',
    'Matricula',
    'Cargo',
    'Ciclo de Origem',
    'NFC Gatilho',
    'Objetivos do Plano',
    'Prazo Limite',
    'Status',
    'Progresso Acoes',
    'Parecer de Verificacao',
    'Data de Conclusao',
  ];

  const escapeCsv = (valor: string | number | null | undefined): string => {
    if (valor === null || valor === undefined) return '""';
    const str = String(valor).replace(/"/g, '""');
    return `"${str}"`;
  };

  const linhas = pmds.map((p) => {
    const servidorNome = p.servidor?.nome_completo ?? `#${p.servidor_id}`;
    const matricula = p.servidor?.matricula ?? '';
    const cargo = p.servidor?.cargo_efetivo ?? '';
    const ciclo = p.ciclo?.nome ?? `Ciclo #${p.ciclo_id}`;
    const status = STATUS_PMD_LABEL[p.status] ?? p.status;
    const progresso = obterProgressoAcoes(p.acoes).texto;
    const prazoFmt = p.prazo ? new Date(p.prazo).toLocaleDateString('pt-BR') : '';
    const conclusaoFmt = p.concluido_em ? new Date(p.concluido_em).toLocaleDateString('pt-BR') : '';

    return [
      escapeCsv(p.id),
      escapeCsv(servidorNome),
      escapeCsv(matricula),
      escapeCsv(cargo),
      escapeCsv(ciclo),
      escapeCsv(p.nfc_gatilho),
      escapeCsv(p.objetivos),
      escapeCsv(prazoFmt),
      escapeCsv(status),
      escapeCsv(progresso),
      escapeCsv(p.observacoes_verificacao ?? ''),
      escapeCsv(conclusaoFmt),
    ].join(';');
  });

  return '\uFEFF' + [cabecalhos.map((c) => `"${c}"`).join(';'), ...linhas].join('\r\n');
}
