import type { ApiServidor } from '@sysgov/sdk';

export interface FiltrosQuadroServidores {
  termoBusca: string;
  secretaria: string;
  departamento: string;
  regime: 'todos' | 'estatutario' | 'comissionado';
  condicaoEstagio: 'todos' | 'estagio' | 'estavel';
  faseEstagio: 'todas' | '1' | '2' | '3';
  situacao: 'todos' | 'ativo' | 'afastado';
  avaliacaoCiclo: 'todos' | 'com_avaliacao' | 'sem_avaliacao';
}

export const FILTROS_INICIAIS_QUADRO: FiltrosQuadroServidores = {
  termoBusca: '',
  secretaria: '',
  departamento: '',
  regime: 'todos',
  condicaoEstagio: 'todos',
  faseEstagio: 'todas',
  situacao: 'todos',
  avaliacaoCiclo: 'todos',
};

export interface KpisQuadroServidores {
  total: number;
  totalEstagio: number;
  percentualEstagio: number;
  totalEstaveis: number;
  percentualEstaveis: number;
  totalAlocados: number;
  totalNaoClassificados: number;
  totalComAvaliacao: number;
}

/**
 * Função pura de filtragem composta do Quadro Geral de Servidores.
 * Aplica conjunção lógica (AND) entre busca textual e os critérios administrativos.
 */
export function filtrarServidoresQuadro(
  servidores: ApiServidor[],
  filtros: FiltrosQuadroServidores,
  classificacaoPorServidor: Map<number, { secretaria: string; departamento: string }>,
  ultimaAvaliacaoPorServidor?: Map<number, unknown>,
): ApiServidor[] {
  const buscaNormalizada = filtros.termoBusca.trim().toLowerCase();

  return servidores.filter((s) => {
    // 1. Busca textual (Nome, Matrícula, CPF, Cargo, Secretaria ou Departamento)
    if (buscaNormalizada) {
      const nome = (s.nome_completo || '').toLowerCase();
      const matricula = (s.matricula || '').toLowerCase();
      const cpf = (s.cpf || '').replace(/\D/g, '');
      const buscaCpf = buscaNormalizada.replace(/\D/g, '');
      const cargo = (s.cargo_efetivo || '').toLowerCase();
      const lotacao = classificacaoPorServidor.get(s.id);
      const secretaria = (lotacao?.secretaria || '').toLowerCase();
      const depto = (lotacao?.departamento || '').toLowerCase();

      const bateTexto =
        nome.includes(buscaNormalizada) ||
        matricula.includes(buscaNormalizada) ||
        cargo.includes(buscaNormalizada) ||
        secretaria.includes(buscaNormalizada) ||
        depto.includes(buscaNormalizada);

      const bateCpf = buscaCpf.length >= 3 && cpf.includes(buscaCpf);

      if (!bateTexto && !bateCpf) return false;
    }

    const lotacao = classificacaoPorServidor.get(s.id);

    // 2. Secretaria
    if (filtros.secretaria) {
      if (filtros.secretaria === '__sem_lotacao__') {
        if (lotacao && lotacao.secretaria) return false;
      } else {
        if (!lotacao || lotacao.secretaria !== filtros.secretaria) return false;
      }
    }

    // 3. Departamento
    if (filtros.departamento) {
      if (!lotacao || lotacao.departamento !== filtros.departamento) return false;
    }

    // 4. Regime Jurídico
    if (filtros.regime !== 'todos') {
      const regimeServidor = (s.regime_juridico || '').toLowerCase();
      if (filtros.regime === 'estatutario') {
        // Estatutário se regime_juridico for estatutario ou não estiver como comissionado/celetista
        const isComissionado = regimeServidor.includes('comis') || Boolean(s.funcao_gratificada && !regimeServidor);
        if (isComissionado) return false;
      } else if (filtros.regime === 'comissionado') {
        const isComissionado = regimeServidor.includes('comis') || Boolean(s.funcao_gratificada);
        if (!isComissionado) return false;
      }
    }

    // 5. Condição Probatória (Estágio vs Estável)
    const isEstagio = Boolean(s.estagio_probatorio);
    if (filtros.condicaoEstagio === 'estagio' && !isEstagio) return false;
    if (filtros.condicaoEstagio === 'estavel' && isEstagio) return false;

    // 6. Fase do Estágio
    if (filtros.faseEstagio !== 'todas') {
      if (!isEstagio) return false;
      const faseEsperada = Number(filtros.faseEstagio);
      if (s.estagio_fase_atual !== faseEsperada) return false;
    }

    // 7. Situação Funcional
    if (filtros.situacao !== 'todos') {
      const isAtivo = s.situacao_funcional === 'ativo';
      if (filtros.situacao === 'ativo' && !isAtivo) return false;
      if (filtros.situacao === 'afastado' && isAtivo) return false;
    }

    // 8. Avaliação no Ciclo Vigente
    if (filtros.avaliacaoCiclo !== 'todos' && ultimaAvaliacaoPorServidor) {
      const userId = s.user_id || s.id;
      const temAvaliacao = ultimaAvaliacaoPorServidor.has(userId);
      if (filtros.avaliacaoCiclo === 'com_avaliacao' && !temAvaliacao) return false;
      if (filtros.avaliacaoCiclo === 'sem_avaliacao' && temAvaliacao) return false;
    }

    return true;
  });
}

/**
 * Calcula os indicadores estatísticos e gerenciais do Quadro de Servidores.
 * Retorna valores quantitativos e percentuais para exibição no cabeçalho executivo.
 */
export function calcularKpisQuadroServidores(
  servidores: ApiServidor[],
  classificacaoPorServidor: Map<number, { secretaria: string; departamento: string }>,
  ultimaAvaliacaoPorServidor?: Map<number, unknown>,
): KpisQuadroServidores {
  const total = servidores.length;
  if (total === 0) {
    return {
      total: 0,
      totalEstagio: 0,
      percentualEstagio: 0,
      totalEstaveis: 0,
      percentualEstaveis: 0,
      totalAlocados: 0,
      totalNaoClassificados: 0,
      totalComAvaliacao: 0,
    };
  }

  let totalEstagio = 0;
  let totalAlocados = 0;
  let totalComAvaliacao = 0;

  for (const s of servidores) {
    if (s.estagio_probatorio) {
      totalEstagio++;
    }

    const lotacao = classificacaoPorServidor.get(s.id);
    if (lotacao && lotacao.secretaria) {
      totalAlocados++;
    }

    if (ultimaAvaliacaoPorServidor) {
      const userId = s.user_id || s.id;
      if (ultimaAvaliacaoPorServidor.has(userId)) {
        totalComAvaliacao++;
      }
    }
  }

  const totalEstaveis = total - totalEstagio;
  const percentualEstagio = Math.round((totalEstagio / total) * 100);
  const percentualEstaveis = Math.round((totalEstaveis / total) * 100);
  const totalNaoClassificados = total - totalAlocados;

  return {
    total,
    totalEstagio,
    percentualEstagio,
    totalEstaveis,
    percentualEstaveis,
    totalAlocados,
    totalNaoClassificados,
    totalComAvaliacao,
  };
}

export interface FiltrosEstagioProbatorio {
  termoBusca: string;
  secretaria: string;
  departamento: string;
  faseEstagio: 'todas' | '1' | '2' | '3';
  statusEstagio: 'todos' | 'em_andamento' | 'aprovado' | 'reprovado' | 'suspenso';
  situacao: 'todos' | 'ativo' | 'afastado';
  avaliacaoCiclo: 'todos' | 'com_avaliacao' | 'sem_avaliacao';
}

export const FILTROS_INICIAIS_ESTAGIO: FiltrosEstagioProbatorio = {
  termoBusca: '',
  secretaria: '',
  departamento: '',
  faseEstagio: 'todas',
  statusEstagio: 'todos',
  situacao: 'todos',
  avaliacaoCiclo: 'todos',
};

export interface KpisEstagioProbatorio {
  totalEstagio: number;
  totalFase1: number;
  percentualFase1: number;
  totalFase2: number;
  percentualFase2: number;
  totalFase3: number;
  percentualFase3: number;
  totalComAvaliacao: number;
  percentualComAvaliacao: number;
}

/**
 * Função pura de filtragem composta do Acompanhamento do Estágio Probatório.
 */
export function filtrarServidoresEstagio(
  servidores: ApiServidor[],
  filtros: FiltrosEstagioProbatorio,
  classificacaoPorServidor: Map<number, { secretaria: string; departamento: string }>,
  ultimaAvaliacaoPorServidor?: Map<number, unknown>,
): ApiServidor[] {
  const servidoresEstagio = servidores.filter((s) => Boolean(s.estagio_probatorio));
  const buscaNormalizada = filtros.termoBusca.trim().toLowerCase();

  return servidoresEstagio.filter((s) => {
    // 1. Busca textual
    if (buscaNormalizada) {
      const nome = (s.nome_completo || '').toLowerCase();
      const matricula = (s.matricula || '').toLowerCase();
      const cpf = (s.cpf || '').replace(/\D/g, '');
      const buscaCpf = buscaNormalizada.replace(/\D/g, '');
      const cargo = (s.cargo_efetivo || '').toLowerCase();
      const lotacao = classificacaoPorServidor.get(s.id);
      const secretaria = (lotacao?.secretaria || '').toLowerCase();
      const depto = (lotacao?.departamento || '').toLowerCase();

      const bateTexto =
        nome.includes(buscaNormalizada) ||
        matricula.includes(buscaNormalizada) ||
        cargo.includes(buscaNormalizada) ||
        secretaria.includes(buscaNormalizada) ||
        depto.includes(buscaNormalizada);

      const bateCpf = buscaCpf.length >= 3 && cpf.includes(buscaCpf);

      if (!bateTexto && !bateCpf) return false;
    }

    const lotacao = classificacaoPorServidor.get(s.id);

    // 2. Secretaria
    if (filtros.secretaria) {
      if (filtros.secretaria === '__sem_lotacao__') {
        if (lotacao && lotacao.secretaria) return false;
      } else {
        if (!lotacao || lotacao.secretaria !== filtros.secretaria) return false;
      }
    }

    // 3. Departamento
    if (filtros.departamento) {
      if (!lotacao || lotacao.departamento !== filtros.departamento) return false;
    }

    // 4. Fase do Estágio
    if (filtros.faseEstagio !== 'todas') {
      const faseEsperada = Number(filtros.faseEstagio);
      const faseServidor = s.estagio_fase_atual || 1;
      if (faseServidor !== faseEsperada) return false;
    }

    // 5. Status do Estágio
    if (filtros.statusEstagio !== 'todos') {
      const status = s.estagio_status || 'em_andamento';
      if (status !== filtros.statusEstagio) return false;
    }

    // 6. Situação Funcional
    if (filtros.situacao !== 'todos') {
      const isAtivo = s.situacao_funcional === 'ativo';
      if (filtros.situacao === 'ativo' && !isAtivo) return false;
      if (filtros.situacao === 'afastado' && isAtivo) return false;
    }

    // 7. Avaliação no Ciclo Vigente
    if (filtros.avaliacaoCiclo !== 'todos' && ultimaAvaliacaoPorServidor) {
      const userId = s.user_id || s.id;
      const temAvaliacao = ultimaAvaliacaoPorServidor.has(userId);
      if (filtros.avaliacaoCiclo === 'com_avaliacao' && !temAvaliacao) return false;
      if (filtros.avaliacaoCiclo === 'sem_avaliacao' && temAvaliacao) return false;
    }

    return true;
  });
}

/**
 * Calcula os indicadores estatísticos e de cadência do Estágio Probatório.
 */
export function calcularKpisEstagioProbatorio(
  servidores: ApiServidor[],
  ultimaAvaliacaoPorServidor?: Map<number, unknown>,
): KpisEstagioProbatorio {
  const estagiarios = servidores.filter((s) => Boolean(s.estagio_probatorio));
  const totalEstagio = estagiarios.length;

  if (totalEstagio === 0) {
    return {
      totalEstagio: 0,
      totalFase1: 0,
      percentualFase1: 0,
      totalFase2: 0,
      percentualFase2: 0,
      totalFase3: 0,
      percentualFase3: 0,
      totalComAvaliacao: 0,
      percentualComAvaliacao: 0,
    };
  }

  let totalFase1 = 0;
  let totalFase2 = 0;
  let totalFase3 = 0;
  let totalComAvaliacao = 0;

  for (const s of estagiarios) {
    const fase = s.estagio_fase_atual || 1;
    if (fase === 1) totalFase1++;
    else if (fase === 2) totalFase2++;
    else if (fase >= 3) totalFase3++;

    if (ultimaAvaliacaoPorServidor) {
      const userId = s.user_id || s.id;
      if (ultimaAvaliacaoPorServidor.has(userId)) {
        totalComAvaliacao++;
      }
    }
  }

  return {
    totalEstagio,
    totalFase1,
    percentualFase1: Math.round((totalFase1 / totalEstagio) * 100),
    totalFase2,
    percentualFase2: Math.round((totalFase2 / totalEstagio) * 100),
    totalFase3,
    percentualFase3: Math.round((totalFase3 / totalEstagio) * 100),
    totalComAvaliacao,
    percentualComAvaliacao: Math.round((totalComAvaliacao / totalEstagio) * 100),
  };
}

