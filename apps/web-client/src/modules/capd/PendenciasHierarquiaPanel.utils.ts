import type { ApiPendenciaHierarquia } from '@sysgov/sdk';

export interface KpisPendencias {
  totalAbertas: number;
  totalResolvidas: number;
  totalGeral: number;
  taxaSaneamento: string;
  taxaSaneamentoNumero: number;
  porTipo: {
    sem_superior: number;
    afastamento_sem_substituto: number;
    topo_sem_config: number;
    outros: number;
  };
}

export interface FiltrosPendencias {
  busca?: string;
  status?: 'aberta' | 'resolvida' | '';
  tipo?: string;
  cicloId?: string | number | '';
}

export interface TipoPendenciaInfo {
  label: string;
  descricao: string;
  badgeVariant: 'warning' | 'info' | 'secondary' | 'outline' | 'default';
  corTexto: string;
}

export const TIPOS_PENDENCIA_CONFIG: Record<string, TipoPendenciaInfo> = {
  sem_superior: {
    label: 'Sem superior resolvido',
    descricao: 'Servidor sem chefia imediata associada no organograma institucional.',
    badgeVariant: 'warning',
    corTexto: 'text-amber-500',
  },
  afastamento_sem_substituto: {
    label: 'Afastamento sem substituto',
    descricao: 'Chefia imediata em licença ou férias e sem substituto legal cadastrado.',
    badgeVariant: 'info',
    corTexto: 'text-sky-500',
  },
  topo_sem_config: {
    label: 'Topo da hierarquia sem configuração',
    descricao: 'Unidade máxima de escalão sem gestor ou papel avaliador homologado.',
    badgeVariant: 'secondary',
    corTexto: 'text-indigo-400',
  },
};

export function obterConfigTipoPendencia(tipo: string): TipoPendenciaInfo {
  return (
    TIPOS_PENDENCIA_CONFIG[tipo] ?? {
      label: tipo.replace(/_/g, ' '),
      descricao: 'Inconsistência identificada pelo motor de resolução de hierarquia.',
      badgeVariant: 'outline',
      corTexto: 'text-muted-foreground',
    }
  );
}

export function calcularKpisPendencias(pendencias: ApiPendenciaHierarquia[]): KpisPendencias {
  const totalGeral = pendencias.length;
  let totalAbertas = 0;
  let totalResolvidas = 0;
  const porTipo = {
    sem_superior: 0,
    afastamento_sem_substituto: 0,
    topo_sem_config: 0,
    outros: 0,
  };

  for (const p of pendencias) {
    if (p.status === 'aberta') {
      totalAbertas++;
    } else if (p.status === 'resolvida') {
      totalResolvidas++;
    }

    if (p.tipo_pendencia === 'sem_superior') {
      porTipo.sem_superior++;
    } else if (p.tipo_pendencia === 'afastamento_sem_substituto') {
      porTipo.afastamento_sem_substituto++;
    } else if (p.tipo_pendencia === 'topo_sem_config') {
      porTipo.topo_sem_config++;
    } else {
      porTipo.outros++;
    }
  }

  const taxaNumero = totalGeral > 0 ? (totalResolvidas / totalGeral) * 100 : 100;
  const taxaSaneamento = taxaNumero.toFixed(1).replace('.', ',') + '%';

  return {
    totalAbertas,
    totalResolvidas,
    totalGeral,
    taxaSaneamento,
    taxaSaneamentoNumero: Number(taxaNumero.toFixed(1)),
    porTipo,
  };
}

export function filtrarPendencias(
  pendencias: ApiPendenciaHierarquia[],
  filtros: FiltrosPendencias
): ApiPendenciaHierarquia[] {
  const buscaNormalizada = (filtros.busca || '').trim().toLowerCase();
  const statusFiltro = filtros.status || '';
  const tipoFiltro = filtros.tipo || '';
  const cicloFiltro = filtros.cicloId ? String(filtros.cicloId) : '';

  return pendencias.filter((p) => {
    // Filtro por status
    if (statusFiltro && p.status !== statusFiltro) {
      return false;
    }

    // Filtro por tipo
    if (tipoFiltro && p.tipo_pendencia !== tipoFiltro) {
      return false;
    }

    // Filtro por ciclo
    if (cicloFiltro && p.ciclo_id !== null && p.ciclo_id !== undefined && String(p.ciclo_id) !== cicloFiltro) {
      return false;
    }

    // Busca textual livre
    if (buscaNormalizada) {
      const nomeServidor = (p.servidor?.nome_completo || '').toLowerCase();
      const matricula = (p.servidor?.matricula || '').toLowerCase();
      const motivo = (p.motivo || '').toLowerCase();
      const tipoRotulo = obterConfigTipoPendencia(p.tipo_pendencia).label.toLowerCase();
      const cicloNome = (p.ciclo?.nome || '').toLowerCase();

      const match =
        nomeServidor.includes(buscaNormalizada) ||
        matricula.includes(buscaNormalizada) ||
        motivo.includes(buscaNormalizada) ||
        tipoRotulo.includes(buscaNormalizada) ||
        cicloNome.includes(buscaNormalizada);

      if (!match) return false;
    }

    return true;
  });
}

export function formatarDataHoraBr(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const data = new Date(isoString);
    if (isNaN(data.getTime())) return isoString;
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch {
    return isoString;
  }
}

export function gerarCsvPendencias(pendencias: ApiPendenciaHierarquia[]): string {
  const cabecalhos = [
    'ID',
    'Servidor',
    'Matricula',
    'Ciclo',
    'Tipo Pendencia',
    'Diagnostico / Motivo',
    'Status',
    'ID Avaliador Designado',
    'Resolvido Em',
    'Criado Em',
  ];

  const escapeCsv = (valor: string | number | null | undefined): string => {
    if (valor === null || valor === undefined) return '""';
    const str = String(valor).replace(/"/g, '""');
    return `"${str}"`;
  };

  const linhas = pendencias.map((p) => {
    const tipo = obterConfigTipoPendencia(p.tipo_pendencia).label;
    const ciclo = p.ciclo ? `${p.ciclo.nome} (${p.ciclo.ano_referencia})` : '';
    const status = p.status === 'aberta' ? 'Aberta' : 'Resolvida';

    return [
      escapeCsv(p.id),
      escapeCsv(p.servidor?.nome_completo ?? `#${p.servidor_id}`),
      escapeCsv(p.servidor?.matricula ?? ''),
      escapeCsv(ciclo),
      escapeCsv(tipo),
      escapeCsv(p.motivo),
      escapeCsv(status),
      escapeCsv(p.avaliador_designado_id ?? ''),
      escapeCsv(formatarDataHoraBr(p.resolvido_em)),
      escapeCsv(formatarDataHoraBr(p.created_at)),
    ].join(';');
  });

  return '\uFEFF' + [cabecalhos.map((c) => `"${c}"`).join(';'), ...linhas].join('\r\n');
}
