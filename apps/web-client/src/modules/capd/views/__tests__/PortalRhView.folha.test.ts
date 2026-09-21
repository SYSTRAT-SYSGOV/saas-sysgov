import { describe, it, expect } from 'vitest';
import {
  calcularItemFolha,
  calcularKpisFolhaExport,
  filtrarServidoresFolha,
  extrairOpcoesFiltrosFolha,
  formatarMoedaBrl,
  formatarNumeroBrl,
  gerarCsvUniversal,
  gerarCsvBetha,
  gerarCsvIpm,
  gerarCsvGoverna,
  FILTROS_INICIAIS_FOLHA,
  type ServidorBaseFolha,
} from '../PortalRhView.folha';

describe('PortalRhView.folha - Concessão de Reajuste Funcional (+10%) e Exportação ERP', () => {
  const mockServidores: ServidorBaseFolha[] = [
    {
      servidor_id: 1,
      matricula: '1001',
      nome: 'Carlos Silva',
      cpf: '123.456.789-01',
      cargo: 'Auditor Fiscal',
      regime: 'estatutario',
      secretaria: 'Secretaria de Finanças',
      departamento: 'Departamento de Tributação',
      nfc: '85.00',
      elegivel: true,
      conceito: 'Desempenho Excelente',
      salario_atual_cents: 600000, // R$ 6.000,00
    },
    {
      servidor_id: 2,
      matricula: '1002',
      nome: 'Ana Oliveira',
      cpf: '234.567.890-12',
      cargo: 'Analista de Gestão',
      regime: 'estatutario',
      secretaria: 'Secretaria de Administração',
      departamento: 'Departamento de Recursos Humanos',
      nfc: '92.50',
      elegivel: true,
      conceito: 'Desempenho Excelente',
      salario_atual_cents: 450000, // R$ 4.500,00
    },
    {
      servidor_id: 3,
      matricula: '1003',
      nome: 'Roberto Santos',
      cpf: '345.678.901-23',
      cargo: 'Assistente Administrativo',
      regime: 'estatutario',
      secretaria: 'Secretaria de Administração',
      departamento: 'Departamento de Recursos Humanos',
      nfc: '64.00',
      elegivel: false,
      conceito: 'Desempenho Regular',
      salario_atual_cents: 300000, // R$ 3.000,00 (Retido em PMD)
    },
    {
      servidor_id: 4,
      matricula: '1004',
      nome: 'Mariana Lima',
      cpf: '456.789.012-34',
      cargo: 'Médica Clínica',
      regime: 'estatutario',
      secretaria: 'Secretaria de Saúde',
      departamento: 'Diretoria de Atenção Básica',
      nfc: '75.00',
      elegivel: true,
      conceito: 'Bom Desempenho',
      salario_atual_cents: 1200000, // R$ 12.000,00
    },
    {
      servidor_id: 5,
      matricula: '1005',
      nome: 'Daniel Souza',
      cargo: 'Assessor Especial',
      regime: 'comissionado',
      secretaria: 'Gabinete do Prefeito',
      departamento: 'Assessoria de Comunicação',
      nfc: '80.00',
      elegivel: true,
      conceito: 'Bom Desempenho',
      salario_atual_cents: 500000, // R$ 5.000,00
    },
  ];

  describe('Cálculos monetários e elegibilidade (calcularItemFolha)', () => {
    it('calcula evolução de +10% e impacto anual para servidor elegível', () => {
      const servidor = mockServidores[0]; // Carlos Silva: 600000 cents (R$ 6.000,00)
      const item = calcularItemFolha(servidor);

      expect(item.elegivel).toBe(true);
      expect(item.salario_atual_cents).toBe(600000);
      expect(item.diferenca_mensal_cents).toBe(60000); // 10% de 6.000,00 = 600,00
      expect(item.salario_projetado_cents).toBe(660000); // R$ 6.600,00
      // Impacto anual: 60000 * 13 + Math.round(60000 / 3) = 780000 + 20000 = 800000 (R$ 8.000,00)
      expect(item.impacto_anual_cents).toBe(800000);
      expect(item.percentual_reajuste).toBe(10);
    });

    it('mantém diferença zero e sem impacto para servidor retido (NFC < 70)', () => {
      const servidor = mockServidores[2]; // Roberto Santos: NFC 64.00, elegivel false
      const item = calcularItemFolha(servidor);

      expect(item.elegivel).toBe(false);
      expect(item.salario_atual_cents).toBe(300000);
      expect(item.diferenca_mensal_cents).toBe(0);
      expect(item.salario_projetado_cents).toBe(300000);
      expect(item.impacto_anual_cents).toBe(0);
      expect(item.percentual_reajuste).toBe(0);
    });

    it('atribui salário padrão de R$ 5.400,00 se salario_atual_cents for omitido', () => {
      const item = calcularItemFolha({
        servidor_id: 99,
        matricula: '9999',
        nome: 'Servidor Sem Salário',
        nfc: '80.00',
        elegivel: true,
      });

      expect(item.salario_atual_cents).toBe(540000);
      expect(item.diferenca_mensal_cents).toBe(54000);
      expect(item.salario_projetado_cents).toBe(594000);
    });
  });

  describe('Formatação de valores (formatarMoedaBrl e formatarNumeroBrl)', () => {
    it('formata valores monetários em padrão Real com R$', () => {
      expect(formatarMoedaBrl(600000)).toMatch(/R\$\s?6\.000,00/);
      expect(formatarMoedaBrl(60000)).toMatch(/R\$\s?600,00/);
      expect(formatarMoedaBrl(0)).toMatch(/R\$\s?0,00/);
    });

    it('formata valores decimais simples', () => {
      expect(formatarNumeroBrl(600000)).toBe('6.000,00');
      expect(formatarNumeroBrl(60000)).toBe('600,00');
    });
  });

  describe('Consolidação de KPIs Executivos (calcularKpisFolhaExport)', () => {
    it('consolida totais, percentuais e impacto orçamentário agregado', () => {
      const itens = mockServidores.map(calcularItemFolha);
      const kpis = calcularKpisFolhaExport(itens);

      expect(kpis.totalServidores).toBe(5);
      expect(kpis.totalElegiveis).toBe(4); // 4 aptos
      expect(kpis.totalRetidos).toBe(1); // 1 retido
      expect(kpis.percentualElegiveis).toBe(80.0); // 4 / 5 = 80.0%

      // Folha atual total: 600000 + 450000 + 300000 + 1200000 + 500000 = 3050000 (R$ 30.500,00)
      expect(kpis.folhaAtualMensalCents).toBe(3050000);

      // Impacto mensal: 60000 + 45000 + 0 + 120000 + 50000 = 275000 (R$ 2.750,00)
      expect(kpis.impactoMensalCents).toBe(275000);

      // Folha projetada: 3050000 + 275000 = 3325000 (R$ 33.250,00)
      expect(kpis.folhaProjetadaMensalCents).toBe(3325000);

      // Impacto anual:
      // Carlos: 800000
      // Ana: 45000 * 13 + round(45000/3) = 585000 + 15000 = 600000
      // Roberto: 0
      // Mariana: 120000 * 13 + round(120000/3) = 1560000 + 40000 = 1600000
      // Daniel: 50000 * 13 + round(50000/3) = 650000 + 16667 = 666667
      // Total impacto anual: 800000 + 600000 + 1600000 + 666667 = 3666667
      expect(kpis.impactoAnualProjetadoCents).toBe(3666667);
    });

    it('retorna zeros ao receber lista vazia', () => {
      const kpis = calcularKpisFolhaExport([]);
      expect(kpis.totalServidores).toBe(0);
      expect(kpis.totalElegiveis).toBe(0);
      expect(kpis.totalRetidos).toBe(0);
      expect(kpis.percentualElegiveis).toBe(0);
      expect(kpis.folhaAtualMensalCents).toBe(0);
      expect(kpis.impactoMensalCents).toBe(0);
      expect(kpis.folhaProjetadaMensalCents).toBe(0);
      expect(kpis.impactoAnualProjetadoCents).toBe(0);
    });
  });

  describe('Filtragem multifacetada (filtrarServidoresFolha)', () => {
    const itens = mockServidores.map(calcularItemFolha);

    it('retorna todos os itens quando filtros são os padrão', () => {
      const filtrados = filtrarServidoresFolha(itens, FILTROS_INICIAIS_FOLHA);
      expect(filtrados).toHaveLength(5);
    });

    it('filtra por termo de busca (nome)', () => {
      const filtrados = filtrarServidoresFolha(itens, {
        ...FILTROS_INICIAIS_FOLHA,
        termoBusca: 'Mariana',
      });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].nome).toBe('Mariana Lima');
    });

    it('filtra por termo de busca (matrícula)', () => {
      const filtrados = filtrarServidoresFolha(itens, {
        ...FILTROS_INICIAIS_FOLHA,
        termoBusca: '1003',
      });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].matricula).toBe('1003');
    });

    it('filtra por situação de concessão (elegível)', () => {
      const filtrados = filtrarServidoresFolha(itens, {
        ...FILTROS_INICIAIS_FOLHA,
        situacao: 'elegivel',
      });
      expect(filtrados).toHaveLength(4);
      expect(filtrados.every((i) => i.elegivel)).toBe(true);
    });

    it('filtra por situação de concessão (retido)', () => {
      const filtrados = filtrarServidoresFolha(itens, {
        ...FILTROS_INICIAIS_FOLHA,
        situacao: 'retido',
      });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].matricula).toBe('1003');
    });

    it('filtra por secretaria e departamento', () => {
      const filtrados = filtrarServidoresFolha(itens, {
        ...FILTROS_INICIAIS_FOLHA,
        secretaria: 'Secretaria de Administração',
        departamento: 'Departamento de Recursos Humanos',
      });
      expect(filtrados).toHaveLength(2);
      expect(filtrados.map((i) => i.nome)).toEqual(['Ana Oliveira', 'Roberto Santos']);
    });

    it('filtra por faixa de impacto salarial mensal (acima_1000)', () => {
      const filtrados = filtrarServidoresFolha(itens, {
        ...FILTROS_INICIAIS_FOLHA,
        faixaImpacto: 'acima_1000',
      });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].nome).toBe('Mariana Lima'); // 1.200,00 de aumento
    });

    it('filtra por regime jurídico (estatutario)', () => {
      const filtrados = filtrarServidoresFolha(itens, {
        ...FILTROS_INICIAIS_FOLHA,
        regime: 'estatutario',
      });
      expect(filtrados).toHaveLength(4);
    });
  });

  describe('Extração de opções dinâmicas para filtros (extrairOpcoesFiltrosFolha)', () => {
    it('extrai secretarias, departamentos contextuais e cargos únicos', () => {
      const itens = mockServidores.map(calcularItemFolha);
      const opcoes = extrairOpcoesFiltrosFolha(itens);

      expect(opcoes.secretarias).toContain('Secretaria de Administração');
      expect(opcoes.secretarias).toContain('Secretaria de Finanças');
      expect(opcoes.secretarias).toContain('Secretaria de Saúde');

      // Departamentos agrupados por secretaria
      const deptosAdmin = Array.from(opcoes.deptosPorSecretaria.get('Secretaria de Administração') || []);
      expect(deptosAdmin).toEqual(['Departamento de Recursos Humanos']);

      expect(opcoes.cargos).toContain('Analista de Gestão');
      expect(opcoes.cargos).toContain('Auditor Fiscal');
    });
  });

  describe('Geradores de CSV para ERPs de Folha', () => {
    const itens = mockServidores.map(calcularItemFolha);

    it('gerarCsvUniversal produz cabeçalho padronizado e inicia com BOM UTF-8', () => {
      const csv = gerarCsvUniversal(itens);
      expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM UTF-8
      expect(csv).toContain('Matrícula;Nome Completo;CPF;Cargo Efetivo;Regime Jurídico;Secretaria;Departamento;NFC Trienal;Situação;Salário Atual (R$);Reajuste Concedido (%);Acréscimo Mensal (R$);Novo Salário Base (R$);Impacto Anual com Encargos (R$)');
      expect(csv).toContain('1001;"Carlos Silva";123.456.789-01;"Auditor Fiscal"');
      expect(csv).toContain('HOMOLOGADO (+10%)');
      expect(csv).toContain('RETIDO (PMD)');
    });

    it('gerarCsvBetha produz formato com evento 101 e competência', () => {
      const csv = gerarCsvBetha(itens, '01/2026');
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('MATRICULA;COD_EVENTO;DESCRICAO_EVENTO;PERCENTUAL;VALOR_NOVO;COMPETENCIA');
      expect(csv).toContain('1001;101;EVOLUCAO FUNCIONAL ART 17;10,00;6600,00;01/2026');
    });

    it('gerarCsvIpm produz formato com evento PROG_TRIENAL_10 e status', () => {
      const csv = gerarCsvIpm(itens);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('MATRICULA;COD_PROGRESSAO;PERCENTUAL_ACRESCIMO;NOVO_VENCIMENTO;NOTA_NFC;STATUS');
      expect(csv).toContain('1001;PROG_TRIENAL_10;10,00;6600,00;85.00;APTO');
      expect(csv).toContain('1003;PROG_TRIENAL_10;0,00;3000,00;64.00;INAPTO');
    });

    it('gerarCsvGoverna produz formato Governa/CECAM com rubrica RUB_10_CAPD', () => {
      const csv = gerarCsvGoverna(itens);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('MATRICULA;NOME_SERVIDOR;RUBRICA_VENCIMENTO;VALOR_DIFERENCA_MENSAL;PERCENTUAL_REAJUSTE');
      expect(csv).toContain('1001;"Carlos Silva";RUB_10_CAPD;600,00;10,00');
    });
  });
});
