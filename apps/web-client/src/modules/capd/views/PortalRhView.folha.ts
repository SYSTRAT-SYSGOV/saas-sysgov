/**
 * Utilitários puros para a sub-aba Exportação Folha de Pagamento
 * do Portal de RH e Secretaria Municipal de Gestão de Pessoas.
 *
 * Consolidação orçamentária e concessão da evolução funcional (+10%)
 * segundo o Art. 17 da Lei Municipal nº 1.704/2006.
 *
 * Todos os valores monetários são processados estritamente em centavos
 * inteiros (int cents) para garantia de precisão contábil e auditoria.
 */

export interface ItemFolhaExport {
  servidor_id: number;
  matricula: string;
  nome: string;
  cpf?: string;
  cargo: string;
  regime: 'estatutario' | 'comissionado' | string;
  secretaria: string;
  departamento: string;
  nfc: string;
  nfc_num: number;
  elegivel: boolean;
  conceito: string;
  salario_atual_cents: number;
  diferenca_mensal_cents: number;
  salario_projetado_cents: number;
  impacto_anual_cents: number;
  percentual_reajuste: number;
}

export type SituacaoConcessaoFolha = 'todos' | 'elegivel' | 'retido';
export type FaixaImpactoFolha = 'todas' | 'ate_500' | '500_a_1000' | 'acima_1000';

export interface FiltrosFolhaExport {
  termoBusca: string;
  secretaria: string;
  departamento: string;
  cargo: string;
  situacao: SituacaoConcessaoFolha;
  regime: 'todos' | 'estatutario' | 'comissionado';
  faixaImpacto: FaixaImpactoFolha;
}

export const FILTROS_INICIAIS_FOLHA: FiltrosFolhaExport = {
  termoBusca: '',
  secretaria: '',
  departamento: '',
  cargo: '',
  situacao: 'todos',
  regime: 'todos',
  faixaImpacto: 'todas',
};

export interface KpisFolhaExport {
  totalServidores: number;
  totalElegiveis: number;
  totalRetidos: number;
  percentualElegiveis: number;
  folhaAtualMensalCents: number;
  impactoMensalCents: number;
  folhaProjetadaMensalCents: number;
  impactoAnualProjetadoCents: number;
}

export interface ServidorBaseFolha {
  servidor_id: number;
  matricula: string;
  nome: string;
  cpf?: string;
  cargo?: string;
  regime?: string;
  secretaria?: string;
  departamento?: string;
  nfc: string;
  elegivel?: boolean;
  conceito?: string;
  salario_atual_cents?: number;
}

/**
 * Formata um valor em centavos inteiros para a representação monetária oficial brasileira (R$).
 */
export function formatarMoedaBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata um valor em centavos para número decimal simples brasileiro (ex: "1.250,50").
 */
export function formatarNumeroBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Enriquece os dados do servidor com os cálculos orçamentários oficiais da evolução de 10%.
 */
export function calcularItemFolha(base: ServidorBaseFolha): ItemFolhaExport {
  const nfc_num = parseFloat(base.nfc) || 0;
  const elegivel = base.elegivel !== undefined ? base.elegivel : nfc_num >= 70.0;
  const salario_atual_cents = Math.max(0, Math.round(base.salario_atual_cents || 540000));
  
  // Reajuste de 10% (Art. 17 da Lei 1.704/2006)
  const percentual_reajuste = elegivel ? 10 : 0;
  const diferenca_mensal_cents = elegivel ? Math.round(salario_atual_cents * 0.10) : 0;
  const salario_projetado_cents = salario_atual_cents + diferenca_mensal_cents;

  // Impacto anual com 12 meses + 13º salário + 1/3 de férias (13,3333 parcelas)
  // Fórmula exata: diferenca_mensal_cents * 13 + Math.round(diferenca_mensal_cents / 3)
  const impacto_anual_cents = elegivel
    ? diferenca_mensal_cents * 13 + Math.round(diferenca_mensal_cents / 3)
    : 0;

  let conceito = base.conceito;
  if (!conceito) {
    if (nfc_num >= 90) conceito = 'Excelente';
    else if (nfc_num >= 80) conceito = 'Bom';
    else if (nfc_num >= 70) conceito = 'Regular';
    else conceito = 'Insuficiente (PMD)';
  }

  return {
    servidor_id: base.servidor_id,
    matricula: base.matricula,
    nome: base.nome,
    cpf: base.cpf,
    cargo: base.cargo || 'Cargo não informado',
    regime: base.regime || 'estatutario',
    secretaria: base.secretaria || 'Administração Geral',
    departamento: base.departamento || 'Sede Geral',
    nfc: base.nfc,
    nfc_num,
    elegivel,
    conceito,
    salario_atual_cents,
    diferenca_mensal_cents,
    salario_projetado_cents,
    impacto_anual_cents,
    percentual_reajuste,
  };
}

/**
 * Calcula os indicadores executivos e orçamentários da folha de pagamento.
 */
export function calcularKpisFolhaExport(itens: ItemFolhaExport[]): KpisFolhaExport {
  const totalServidores = itens.length;
  if (totalServidores === 0) {
    return {
      totalServidores: 0,
      totalElegiveis: 0,
      totalRetidos: 0,
      percentualElegiveis: 0,
      folhaAtualMensalCents: 0,
      impactoMensalCents: 0,
      folhaProjetadaMensalCents: 0,
      impactoAnualProjetadoCents: 0,
    };
  }

  let totalElegiveis = 0;
  let folhaAtualMensalCents = 0;
  let impactoMensalCents = 0;
  let impactoAnualProjetadoCents = 0;

  itens.forEach((i) => {
    folhaAtualMensalCents += i.salario_atual_cents;
    if (i.elegivel) {
      totalElegiveis++;
      impactoMensalCents += i.diferenca_mensal_cents;
      impactoAnualProjetadoCents += i.impacto_anual_cents;
    }
  });

  const totalRetidos = totalServidores - totalElegiveis;
  const percentualElegiveis = Math.round((totalElegiveis / totalServidores) * 100);
  const folhaProjetadaMensalCents = folhaAtualMensalCents + impactoMensalCents;

  return {
    totalServidores,
    totalElegiveis,
    totalRetidos,
    percentualElegiveis,
    folhaAtualMensalCents,
    impactoMensalCents,
    folhaProjetadaMensalCents,
    impactoAnualProjetadoCents,
  };
}

/**
 * Filtra os itens da folha por múltiplos critérios compostos.
 */
export function filtrarServidoresFolha(
  itens: ItemFolhaExport[],
  filtros: FiltrosFolhaExport,
): ItemFolhaExport[] {
  const buscaNormalizada = filtros.termoBusca.trim().toLowerCase();
  const buscaNumerica = buscaNormalizada.replace(/\D/g, '');

  return itens.filter((item) => {
    // 1. Busca textual (Nome, Matrícula, Cargo, CPF, Secretaria ou Departamento)
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

    // 5. Situação de Homologação (Elegível vs Retido)
    if (filtros.situacao !== 'todos') {
      if (filtros.situacao === 'elegivel' && !item.elegivel) return false;
      if (filtros.situacao === 'retido' && item.elegivel) return false;
    }

    // 6. Regime Jurídico
    if (filtros.regime !== 'todos') {
      if (filtros.regime === 'estatutario' && item.regime !== 'estatutario') return false;
      if (filtros.regime === 'comissionado' && item.regime === 'estatutario') return false;
    }

    // 7. Faixa de Impacto Financeiro Mensal
    if (filtros.faixaImpacto !== 'todas') {
      const impactoReais = item.diferenca_mensal_cents / 100;
      switch (filtros.faixaImpacto) {
        case 'ate_500':
          if (impactoReais > 500) return false;
          break;
        case '500_a_1000':
          if (impactoReais <= 500 || impactoReais > 1000) return false;
          break;
        case 'acima_1000':
          if (impactoReais <= 1000) return false;
          break;
      }
    }

    return true;
  });
}

/**
 * Extrai opções exclusivas para preenchimento dos selects de filtros.
 */
export function extrairOpcoesFiltrosFolha(itens: ItemFolhaExport[]) {
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
    secretarias: Array.from(secretariasSet).sort((a, b) => a.localeCompare(b)),
    departamentos: Array.from(departamentosSet).sort((a, b) => a.localeCompare(b)),
    cargos: Array.from(cargosSet).sort((a, b) => a.localeCompare(b)),
    deptosPorSecretaria,
  };
}

/**
 * BOM UTF-8 para garantir abertura nativa no Excel e em ERPs sem corromper acentuação.
 */
const UTF8_BOM = '\uFEFF';

/**
 * Gerador de CSV Universal Delimitado com todas as variáveis cadastrais e financeiras.
 */
export function gerarCsvUniversal(itens: ItemFolhaExport[]): string {
  const cabecalho = [
    'Matrícula',
    'Nome Completo',
    'CPF',
    'Cargo Efetivo',
    'Regime Jurídico',
    'Secretaria',
    'Departamento',
    'NFC Trienal',
    'Situação',
    'Salário Atual (R$)',
    'Reajuste Concedido (%)',
    'Acréscimo Mensal (R$)',
    'Novo Salário Base (R$)',
    'Impacto Anual com Encargos (R$)',
  ].join(';');

  const linhas = itens.map((r) => {
    const salAtual = (r.salario_atual_cents / 100).toFixed(2).replace('.', ',');
    const difMensal = (r.diferenca_mensal_cents / 100).toFixed(2).replace('.', ',');
    const salProj = (r.salario_projetado_cents / 100).toFixed(2).replace('.', ',');
    const impAnual = (r.impacto_anual_cents / 100).toFixed(2).replace('.', ',');

    return [
      r.matricula,
      `"${r.nome}"`,
      r.cpf || '',
      `"${r.cargo}"`,
      `"${r.regime}"`,
      `"${r.secretaria}"`,
      `"${r.departamento}"`,
      r.nfc,
      r.elegivel ? 'HOMOLOGADO (+10%)' : 'RETIDO (PMD)',
      salAtual,
      r.elegivel ? '10%' : '0%',
      difMensal,
      salProj,
      impAnual,
    ].join(';');
  });

  return UTF8_BOM + [cabecalho, ...linhas].join('\r\n');
}

/**
 * Gerador de CSV formatado para o conector Betha Sistemas (Folha / Noガラ).
 * Leiaute: MATRICULA;EVENTO;PERCENTUAL;VALOR_NOVO;COMPETENCIA
 */
export function gerarCsvBetha(itens: ItemFolhaExport[], competencia = '01/2026'): string {
  const cabecalho = 'MATRICULA;COD_EVENTO;DESCRICAO_EVENTO;PERCENTUAL;VALOR_NOVO;COMPETENCIA';
  const linhas = itens
    .filter((r) => r.elegivel)
    .map((r) => {
      const salProj = (r.salario_projetado_cents / 100).toFixed(2).replace('.', ',');
      return `${r.matricula};101;EVOLUCAO FUNCIONAL ART 17;10,00;${salProj};${competencia}`;
    });

  return UTF8_BOM + [cabecalho, ...linhas].join('\r\n');
}

/**
 * Gerador de CSV formatado para o conector IPM Atende.Net.
 * Leiaute: Matrícula;Código Progressão;Acréscimo %;Novo Vencimento Base;Nota NFC
 */
export function gerarCsvIpm(itens: ItemFolhaExport[]): string {
  const cabecalho = 'MATRICULA;COD_PROGRESSAO;PERCENTUAL_ACRESCIMO;NOVO_VENCIMENTO;NOTA_NFC;STATUS';
  const linhas = itens.map((r) => {
    const salProj = (r.salario_projetado_cents / 100).toFixed(2).replace('.', ',');
    return `${r.matricula};PROG_TRIENAL_10;${r.elegivel ? '10,00' : '0,00'};${salProj};${r.nfc};${r.elegivel ? 'APTO' : 'INAPTO'}`;
  });

  return UTF8_BOM + [cabecalho, ...linhas].join('\r\n');
}

/**
 * Gerador de CSV formatado para os conectores Governa / CECAM.
 * Leiaute: MATRICULA;NOME;RUBRICA;VALOR_DIFERENCA;PERCENTUAL
 */
export function gerarCsvGoverna(itens: ItemFolhaExport[]): string {
  const cabecalho = 'MATRICULA;NOME_SERVIDOR;RUBRICA_VENCIMENTO;VALOR_DIFERENCA_MENSAL;PERCENTUAL_REAJUSTE';
  const linhas = itens
    .filter((r) => r.elegivel)
    .map((r) => {
      const difMensal = (r.diferenca_mensal_cents / 100).toFixed(2).replace('.', ',');
      return `${r.matricula};"${r.nome}";RUB_10_CAPD;${difMensal};10,00`;
    });

  return UTF8_BOM + [cabecalho, ...linhas].join('\r\n');
}
