/**
 * Utilitários puros para a sub-aba Classificação Oficial & Desempate Art. 39
 * do Portal de RH e Secretaria Municipal de Gestão de Pessoas.
 *
 * Regramento legal: Art. 39 da Lei Municipal nº 1.704/2006
 * Critérios sucessivos de desempate:
 * 1º Maior pontuação consolidada (NFC);
 * 2º Maior tempo de serviço público efetivo em Araucária (em dias);
 * 3º Maior idade civil (em anos).
 */

export interface ItemRankingDesempate {
  posicao: number;
  servidor_id: number;
  nome: string;
  matricula: string;
  cpf?: string;
  cargo?: string;
  secretaria?: string;
  departamento?: string;
  chefia?: string;
  nfc: string;
  nfc_num: number;
  dias_servico: number;
  idade_anos: number;
  conceito: 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente (PMD)' | string;
  elegivel: boolean;
  possuiEmpatePontuacao: boolean;
  criterioDesempate?: 'pontuacao' | 'dias_servico' | 'idade' | 'empate_total';
  salario_atual_cents?: number;
  salario_projetado_cents?: number;
}

export type FaixaConceitoDesempate = 'todos' | 'excelente' | 'bom' | 'regular' | 'pmd';
export type ElegibilidadeDesempate = 'todos' | 'elegivel' | 'nao_elegivel';

export interface FiltrosRankingDesempate {
  termoBusca: string;
  secretaria: string;
  departamento: string;
  cargo: string;
  faixaConceito: FaixaConceitoDesempate;
  elegibilidade: ElegibilidadeDesempate;
  apenasEmpates: boolean;
}

export const FILTROS_INICIAIS_DESEMPATE: FiltrosRankingDesempate = {
  termoBusca: '',
  secretaria: '',
  departamento: '',
  cargo: '',
  faixaConceito: 'todos',
  elegibilidade: 'todos',
  apenasEmpates: false,
};

export interface KpisRankingDesempate {
  totalRanqueados: number;
  aptosProgressao: number;
  percentualAptos: number;
  emPmd: number;
  mediaNfc: number;
  totalEmpatesDesempatados: number;
}

export interface ServidorBaseDesempate {
  servidor_id: number;
  nome: string;
  matricula: string;
  cpf?: string;
  cargo?: string;
  secretaria?: string;
  departamento?: string;
  chefia?: string;
  nfc: string;
  dias_servico: number;
  idade_anos: number;
  conceito?: string;
  elegivel?: boolean;
  salario_atual_cents?: number;
  salario_projetado_cents?: number;
}

/**
 * Ordena e identifica os empates segundo o Art. 39 da Lei Municipal nº 1.704/2006.
 */
export function ordenarEIdentificarDesempates(
  servidores: ServidorBaseDesempate[],
): ItemRankingDesempate[] {
  // 1. Enriquecer itens com nfc_num e conceito/elegibilidade caso ausentes
  const itensEnriquecidos = servidores.map((s) => {
    const nfc_num = parseFloat(s.nfc) || 0;
    const elegivel = s.elegivel !== undefined ? s.elegivel : nfc_num >= 70.0;
    let conceito = s.conceito;
    if (!conceito) {
      if (nfc_num >= 90) conceito = 'Excelente';
      else if (nfc_num >= 80) conceito = 'Bom';
      else if (nfc_num >= 70) conceito = 'Regular';
      else conceito = 'Insuficiente (PMD)';
    }

    return {
      servidor_id: s.servidor_id,
      nome: s.nome,
      matricula: s.matricula,
      cpf: s.cpf,
      cargo: s.cargo || 'Cargo não informado',
      secretaria: s.secretaria || 'Não Classificada',
      departamento: s.departamento || 'Sem unidade vinculada',
      chefia: s.chefia || 'Diretoria Geral',
      nfc: s.nfc,
      nfc_num,
      dias_servico: Math.max(0, s.dias_servico || 0),
      idade_anos: Math.max(0, s.idade_anos || 0),
      conceito,
      elegivel,
      salario_atual_cents: s.salario_atual_cents,
      salario_projetado_cents: s.salario_projetado_cents,
    };
  });

  // 2. Ordenação sucessiva (Art. 39)
  itensEnriquecidos.sort((a, b) => {
    // 1º Maior NFC
    if (b.nfc_num !== a.nfc_num) {
      return b.nfc_num - a.nfc_num;
    }
    // 2º Maior tempo de serviço público (dias)
    if (b.dias_servico !== a.dias_servico) {
      return b.dias_servico - a.dias_servico;
    }
    // 3º Maior idade civil (anos)
    if (b.idade_anos !== a.idade_anos) {
      return b.idade_anos - a.idade_anos;
    }
    return a.matricula.localeCompare(b.matricula);
  });

  // 3. Contagem de frequência de notas para detectar empates na NFC
  const contagemNfc = new Map<string, number>();
  itensEnriquecidos.forEach((item) => {
    const chave = item.nfc_num.toFixed(2);
    contagemNfc.set(chave, (contagemNfc.get(chave) || 0) + 1);
  });

  // 4. Identificar critério determinante para servidores que tiveram empate na NFC
  const resultado: ItemRankingDesempate[] = itensEnriquecidos.map((item, index, arr) => {
    const chave = item.nfc_num.toFixed(2);
    const qtdIguais = contagemNfc.get(chave) || 0;
    const possuiEmpatePontuacao = qtdIguais > 1;

    let criterioDesempate: ItemRankingDesempate['criterioDesempate'] = 'pontuacao';

    if (possuiEmpatePontuacao) {
      // Localiza outros servidores com a mesma NFC
      const grupoEmpate = arr.filter((outro) => outro.nfc_num.toFixed(2) === chave && outro.servidor_id !== item.servidor_id);
      
      const haDiferencaDias = grupoEmpate.some((outro) => outro.dias_servico !== item.dias_servico);
      if (haDiferencaDias) {
        criterioDesempate = 'dias_servico';
      } else {
        const haDiferencaIdade = grupoEmpate.some((outro) => outro.idade_anos !== item.idade_anos);
        if (haDiferencaIdade) {
          criterioDesempate = 'idade';
        } else {
          criterioDesempate = 'empate_total';
        }
      }
    }

    return {
      ...item,
      posicao: index + 1,
      possuiEmpatePontuacao,
      criterioDesempate,
    };
  });

  return resultado;
}

/**
 * Filtra a lista de classificação por múltiplos critérios com conjunção lógica (AND).
 */
export function filtrarRankingDesempate(
  itens: ItemRankingDesempate[],
  filtros: FiltrosRankingDesempate,
): ItemRankingDesempate[] {
  const buscaNormalizada = filtros.termoBusca.trim().toLowerCase();
  const buscaNumerica = buscaNormalizada.replace(/\D/g, '');

  return itens.filter((item) => {
    // 1. Busca textual
    if (buscaNormalizada) {
      const nome = (item.nome || '').toLowerCase();
      const matricula = (item.matricula || '').toLowerCase();
      const cargo = (item.cargo || '').toLowerCase();
      const secretaria = (item.secretaria || '').toLowerCase();
      const depto = (item.departamento || '').toLowerCase();
      const cpfLimpo = (item.cpf || '').replace(/\D/g, '');

      const bateTexto =
        nome.includes(buscaNormalizada) ||
        matricula.includes(buscaNormalizada) ||
        cargo.includes(buscaNormalizada) ||
        secretaria.includes(buscaNormalizada) ||
        depto.includes(buscaNormalizada) ||
        (buscaNumerica && cpfLimpo.includes(buscaNumerica));

      if (!bateTexto) return false;
    }

    // 2. Secretaria
    if (filtros.secretaria) {
      if (filtros.secretaria === '__sem_lotacao__') {
        const semLotacao =
          !item.secretaria ||
          item.secretaria === 'Não Classificada' ||
          item.secretaria.toLowerCase().includes('não classificado');
        if (!semLotacao) return false;
      } else if (item.secretaria !== filtros.secretaria) {
        return false;
      }
    }

    // 3. Departamento
    if (filtros.departamento && item.departamento !== filtros.departamento) {
      return false;
    }

    // 4. Cargo
    if (filtros.cargo && item.cargo !== filtros.cargo) {
      return false;
    }

    // 5. Faixa de Conceito
    if (filtros.faixaConceito !== 'todos') {
      switch (filtros.faixaConceito) {
        case 'excelente':
          if (item.nfc_num < 90) return false;
          break;
        case 'bom':
          if (item.nfc_num < 80 || item.nfc_num >= 90) return false;
          break;
        case 'regular':
          if (item.nfc_num < 70 || item.nfc_num >= 80) return false;
          break;
        case 'pmd':
          if (item.nfc_num >= 70) return false;
          break;
      }
    }

    // 6. Elegibilidade
    if (filtros.elegibilidade !== 'todos') {
      if (filtros.elegibilidade === 'elegivel' && !item.elegivel) return false;
      if (filtros.elegibilidade === 'nao_elegivel' && item.elegivel) return false;
    }

    // 7. Apenas Empates Art. 39
    if (filtros.apenasEmpates && !item.possuiEmpatePontuacao) {
      return false;
    }

    return true;
  });
}

/**
 * Calcula os indicadores executivos a partir dos itens atualmente ranqueados/filtrados.
 */
export function calcularKpisRankingDesempate(itens: ItemRankingDesempate[]): KpisRankingDesempate {
  const totalRanqueados = itens.length;
  if (totalRanqueados === 0) {
    return {
      totalRanqueados: 0,
      aptosProgressao: 0,
      percentualAptos: 0,
      emPmd: 0,
      mediaNfc: 0,
      totalEmpatesDesempatados: 0,
    };
  }

  const aptosProgressao = itens.filter((i) => i.elegivel).length;
  const percentualAptos = Math.round((aptosProgressao / totalRanqueados) * 100);
  const emPmd = totalRanqueados - aptosProgressao;
  const somaNfc = itens.reduce((acc, i) => acc + i.nfc_num, 0);
  const mediaNfc = Number((somaNfc / totalRanqueados).toFixed(2));
  const totalEmpatesDesempatados = itens.filter((i) => i.possuiEmpatePontuacao).length;

  return {
    totalRanqueados,
    aptosProgressao,
    percentualAptos,
    emPmd,
    mediaNfc,
    totalEmpatesDesempatados,
  };
}

/**
 * Extrai opções exclusivas para preenchimento dos selects de filtros.
 */
export function extrairOpcoesFiltrosDesempate(itens: ItemRankingDesempate[]) {
  const secretariasSet = new Set<string>();
  const departamentosSet = new Set<string>();
  const cargosSet = new Set<string>();
  const deptosPorSecretaria = new Map<string, Set<string>>();

  itens.forEach((item) => {
    if (item.secretaria && item.secretaria !== 'Não Classificada') {
      secretariasSet.add(item.secretaria);
      if (item.departamento) {
        if (!deptosPorSecretaria.has(item.secretaria)) {
          deptosPorSecretaria.set(item.secretaria, new Set());
        }
        deptosPorSecretaria.get(item.secretaria)?.add(item.departamento);
      }
    }
    if (item.departamento) departamentosSet.add(item.departamento);
    if (item.cargo) cargosSet.add(item.cargo);
  });

  return {
    secretarias: Array.from(secretariasSet).sort((a, b) => a.localeCompare(b.toString())),
    departamentos: Array.from(departamentosSet).sort((a, b) => a.localeCompare(b.toString())),
    cargos: Array.from(cargosSet).sort((a, b) => a.localeCompare(b.toString())),
    deptosPorSecretaria,
  };
}
