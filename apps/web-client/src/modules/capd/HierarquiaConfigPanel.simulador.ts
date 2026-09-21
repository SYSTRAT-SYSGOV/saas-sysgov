/**
 * Utilitários e funções puras para o Painel de Configuração de Hierarquia do CAPD.
 *
 * Consolidação de KPIs executivos, validação de integridade da árvore e
 * simulador interativo de resolução avaliativa ("Quem avalia quem?").
 *
 * Em conformidade com o regramento de ascensão hierárquica e substituição legal
 * do SAPDS / CAPD.
 */

export interface NivelHierarquiaItem {
  id: number;
  nivel: number;
  nome: string;
  cargo_referencia?: string | null;
  regra_substituicao: 'substituto_legal' | 'superior_hierarquico';
  is_topo: boolean;
  avaliador_topo_user_id?: number | null;
  avaliador_topo_role?: string | null;
  ativo: boolean;
}

export interface KpisHierarquia {
  totalNiveis: number;
  niveisAtivos: number;
  temNivelTopo: boolean;
  nivelTopoNome: string | null;
  nivelTopoNumero: number | null;
  prevalenciaSubstituicao: 'superior_hierarquico' | 'substituto_legal' | 'mista' | 'nenhuma';
  totalSuperiorHierarquico: number;
  totalSubstitutoLegal: number;
  statusIntegridade: 'conforme' | 'alerta' | 'critico';
  mensagemIntegridade: string;
}

export interface IntegridadeHierarquia {
  valida: boolean;
  problemas: string[];
  avisos: string[];
  niveisOrdenados: NivelHierarquiaItem[];
}

export interface PassoCadeiaSimulada {
  ordem: number;
  nivelNumero: number;
  nivelNome: string;
  cargoReferencia: string;
  papel: 'avaliador_imediato' | 'superior_hierarquico' | 'substituto_legal' | 'topo_orgao';
  nomeAvaliadorSimulado: string;
  regraAplicada?: string;
  status: 'ativo' | 'afastado' | 'acionado_por_regra' | 'homologador_final';
  justificativa: string;
}

export interface CenarioSimulacao {
  nivelBaseId: number;
  chefiaImediataAfastada: boolean;
  motivoAfastamento?: string;
}

export interface ResultadoSimulacao {
  avaliadorDesignado: string;
  papelAvaliador: string;
  passos: PassoCadeiaSimulada[];
  regraSubstituicaoAcionada: boolean;
  fundamentacaoRegimental: string;
}

/**
 * Consolida métricas executivas dos níveis hierárquicos cadastrados.
 */
export function calcularKpisHierarquia(niveis: NivelHierarquiaItem[]): KpisHierarquia {
  const totalNiveis = niveis.length;
  const ativos = niveis.filter((n) => n.ativo);
  const topos = ativos.filter((n) => n.is_topo);

  const temNivelTopo = topos.length > 0;
  const topo = topos[0] || null;

  let totalSuperiorHierarquico = 0;
  let totalSubstitutoLegal = 0;

  ativos.forEach((n) => {
    if (n.regra_substituicao === 'superior_hierarquico') {
      totalSuperiorHierarquico++;
    } else if (n.regra_substituicao === 'substituto_legal') {
      totalSubstitutoLegal++;
    }
  });

  let prevalenciaSubstituicao: KpisHierarquia['prevalenciaSubstituicao'] = 'nenhuma';
  if (totalSuperiorHierarquico > 0 && totalSubstitutoLegal === 0) {
    prevalenciaSubstituicao = 'superior_hierarquico';
  } else if (totalSubstitutoLegal > 0 && totalSuperiorHierarquico === 0) {
    prevalenciaSubstituicao = 'substituto_legal';
  } else if (totalSuperiorHierarquico > 0 && totalSubstitutoLegal > 0) {
    prevalenciaSubstituicao = 'mista';
  }

  // Avaliação de integridade
  let statusIntegridade: KpisHierarquia['statusIntegridade'] = 'conforme';
  let mensagemIntegridade = 'Cadeia de comando homologada';

  if (totalNiveis === 0) {
    statusIntegridade = 'critico';
    mensagemIntegridade = 'Nenhum nível hierárquico cadastrado';
  } else if (!temNivelTopo) {
    statusIntegridade = 'critico';
    mensagemIntegridade = 'Nível topo da hierarquia não definido';
  } else if (topos.length > 1) {
    statusIntegridade = 'alerta';
    mensagemIntegridade = 'Múltiplos níveis marcados como topo';
  }

  return {
    totalNiveis,
    niveisAtivos: ativos.length,
    temNivelTopo,
    nivelTopoNome: topo?.nome || null,
    nivelTopoNumero: topo ? topo.nivel : null,
    prevalenciaSubstituicao,
    totalSuperiorHierarquico,
    totalSubstitutoLegal,
    statusIntegridade,
    mensagemIntegridade,
  };
}

/**
 * Valida a integridade lógica da pirâmide hierárquica (lacunas, topos e unicidade).
 */
export function validarIntegridadeHierarquia(niveis: NivelHierarquiaItem[]): IntegridadeHierarquia {
  const problemas: string[] = [];
  const avisos: string[] = [];

  const ativos = niveis.filter((n) => n.ativo);
  const ordenados = [...ativos].sort((a, b) => a.nivel - b.nivel);

  if (ordenados.length === 0) {
    problemas.push('Não há níveis hierárquicos ativos cadastrados.');
    return { valida: false, problemas, avisos, niveisOrdenados: [] };
  }

  // 1. Checa nível topo
  const topos = ordenados.filter((n) => n.is_topo);
  if (topos.length === 0) {
    problemas.push('A hierarquia não possui nenhum nível configurado como Topo do Órgão.');
  } else if (topos.length > 1) {
    avisos.push(`Existem ${topos.length} níveis configurados como Topo. O sistema utilizará o de menor índice como referência primária.`);
  }

  // 2. Checa se o topo é de fato o nível de maior índice numérico
  if (topos.length === 1) {
    const maiorNivel = ordenados[ordenados.length - 1];
    if (topos[0].nivel !== maiorNivel.nivel) {
      avisos.push(`O nível topo (${topos[0].nome}, nível ${topos[0].nivel}) não é o nível mais elevado (${maiorNivel.nome}, nível ${maiorNivel.nivel}).`);
    }
  }

  // 3. Checa números duplicados de nível
  const niveisVistos = new Set<number>();
  ordenados.forEach((n) => {
    if (niveisVistos.has(n.nivel)) {
      problemas.push(`Existe duplicidade no índice de nível numérico: Nível ${n.nivel}.`);
    }
    niveisVistos.add(n.nivel);
  });

  // 4. Checa lacunas na sequência numérica
  for (let i = 0; i < ordenados.length - 1; i++) {
    const atual = ordenados[i].nivel;
    const proximo = ordenados[i + 1].nivel;
    if (proximo - atual > 1) {
      avisos.push(`Existe uma lacuna na sequência numérica entre o Nível ${atual} (${ordenados[i].nome}) e o Nível ${proximo} (${ordenados[i + 1].nome}).`);
    }
  }

  return {
    valida: problemas.length === 0,
    problemas,
    avisos,
    niveisOrdenados: ordenados,
  };
}

/**
 * Simula a resolução prática do avaliador competente considerando cenários de chefia ativa ou afastada.
 */
export function simularCadeiaAvaliacao(
  niveis: NivelHierarquiaItem[],
  cenario: CenarioSimulacao
): ResultadoSimulacao {
  const ativos = niveis.filter((n) => n.ativo).sort((a, b) => a.nivel - b.nivel);

  if (ativos.length === 0) {
    return {
      avaliadorDesignado: 'Não Definido (Sem Níveis Cadastrados)',
      papelAvaliador: 'Pendente',
      passos: [],
      regraSubstituicaoAcionada: false,
      fundamentacaoRegimental: 'Não há níveis hierárquicos cadastrados para resolver a avaliação.',
    };
  }

  const nivelBaseIndex = ativos.findIndex((n) => n.id === cenario.nivelBaseId);
  const nivelBase = nivelBaseIndex >= 0 ? ativos[nivelBaseIndex] : ativos[0];
  const indexEfetivo = Math.max(0, nivelBaseIndex);

  const passos: PassoCadeiaSimulada[] = [];
  let ordem = 1;

  // Passo 1: Nível Base (Chefia Imediata)
  const chefeImediatoNome = nivelBase.cargo_referencia || `Gestor do(a) ${nivelBase.nome}`;

  if (!cenario.chefiaImediataAfastada) {
    // Fluxo Padrão: Chefe Imediato Ativo
    passos.push({
      ordem: ordem++,
      nivelNumero: nivelBase.nivel,
      nivelNome: nivelBase.nome,
      cargoReferencia: chefeImediatoNome,
      papel: 'avaliador_imediato',
      nomeAvaliadorSimulado: `${chefeImediatoNome} (Titular)`,
      status: 'ativo',
      justificativa: 'Titular da chefia imediata em pleno exercício das funções avaliativas.',
    });

    return {
      avaliadorDesignado: `${chefeImediatoNome} (Titular)`,
      papelAvaliador: `Avaliador Imediato (${nivelBase.nome})`,
      passos,
      regraSubstituicaoAcionada: false,
      fundamentacaoRegimental: 'Resolução direta pelo titular da chefia imediata (Art. 7º do Regimento do CAPD).',
    };
  }

  // Fluxo de Afastamento: Chefe Imediato Impedido/Afastado
  passos.push({
    ordem: ordem++,
    nivelNumero: nivelBase.nivel,
    nivelNome: nivelBase.nome,
    cargoReferencia: chefeImediatoNome,
    papel: 'avaliador_imediato',
    nomeAvaliadorSimulado: `${chefeImediatoNome} (Titular)`,
    status: 'afastado',
    justificativa: cenario.motivoAfastamento || 'Titular afastado por licença, férias ou impedimento regimental.',
  });

  // Aplicação da regra de substituição cadastrada no nível
  if (nivelBase.regra_substituicao === 'substituto_legal') {
    passos.push({
      ordem: ordem++,
      nivelNumero: nivelBase.nivel,
      nivelNome: nivelBase.nome,
      cargoReferencia: `Substituto Legal de ${chefeImediatoNome}`,
      papel: 'substituto_legal',
      nomeAvaliadorSimulado: `Substituto Formalmente Designado (${nivelBase.nome})`,
      regraAplicada: 'Substituto Legal Formal',
      status: 'acionado_por_regra',
      justificativa: 'Ativação do substituto legal formalmente designado por ato administrativo no mesmo escalão.',
    });

    return {
      avaliadorDesignado: `Substituto Legal (${nivelBase.nome})`,
      papelAvaliador: 'Substituto Legal Designado',
      passos,
      regraSubstituicaoAcionada: true,
      fundamentacaoRegimental: 'Substituição formal no mesmo nível funcional para manutenção do acompanhamento direto.',
    };
  }

  // Regra 'superior_hierarquico': sobe a árvore para o próximo nível
  if (indexEfetivo + 1 < ativos.length) {
    const nivelSuperior = ativos[indexEfetivo + 1];
    const superiorNome = nivelSuperior.cargo_referencia || `Titular do(a) ${nivelSuperior.nome}`;

    passos.push({
      ordem: ordem++,
      nivelNumero: nivelSuperior.nivel,
      nivelNome: nivelSuperior.nome,
      cargoReferencia: superiorNome,
      papel: 'superior_hierarquico',
      nomeAvaliadorSimulado: `${superiorNome} (Escalão Superior)`,
      regraAplicada: 'Ascensão Hierárquica (Superior Imediato)',
      status: 'acionado_por_regra',
      justificativa: `Ascensão da competência avaliativa ao escalão imediatamente superior (${nivelSuperior.nome}) em virtude da ausência da chefia base.`,
    });

    return {
      avaliadorDesignado: `${superiorNome} (Superior Imediato)`,
      papelAvaliador: `Superior Hierárquico (${nivelSuperior.nome})`,
      passos,
      regraSubstituicaoAcionada: true,
      fundamentacaoRegimental: `Ascensão avaliativa pelo Art. 9º: chefia ausente transfere a atribuição ao escalão Nível ${nivelSuperior.nivel} (${nivelSuperior.nome}).`,
    };
  }

  // Se já era o nível mais alto ou o topo
  const topo = ativos.find((n) => n.is_topo) || ativos[ativos.length - 1];
  const topoDesignacao = topo.avaliador_topo_role
    ? `Comissão / Papel RBAC [${topo.avaliador_topo_role.toUpperCase()}]`
    : topo.avaliador_topo_user_id
    ? `Avaliador Topo Designado (ID #${topo.avaliador_topo_user_id})`
    : `Gabinete do Prefeito / Controladoria (${topo.nome})`;

  passos.push({
    ordem: ordem++,
    nivelNumero: topo.nivel,
    nivelNome: topo.nome,
    cargoReferencia: 'Gestão Máxima do Órgão',
    papel: 'topo_orgao',
    nomeAvaliadorSimulado: topoDesignacao,
    regraAplicada: 'Resolução Máxima pelo Topo',
    status: 'homologador_final',
    justificativa: 'Esgotamento da cadeia ascendente; avocação da competência pela autoridade máxima ou comissão competente.',
  });

  return {
    avaliadorDesignado: topoDesignacao,
    papelAvaliador: 'Autoridade Máxima / Topo Institucional',
    passos,
    regraSubstituicaoAcionada: true,
    fundamentacaoRegimental: 'Avocação ao topo institucional por ausência de instâncias intermediárias disponíveis.',
  };
}
