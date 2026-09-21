import { describe, it, expect } from 'vitest';
import {
  ordenarEIdentificarDesempates,
  filtrarRankingDesempate,
  calcularKpisRankingDesempate,
  FILTROS_INICIAIS_DESEMPATE,
  type ServidorBaseDesempate,
} from '../PortalRhView.desempate';

describe('PortalRhView.desempate - Regramento do Art. 39 da Lei nº 1.704/2006', () => {
  const mockServidores: ServidorBaseDesempate[] = [
    {
      servidor_id: 1,
      nome: 'Carlos Silva',
      matricula: '1001',
      cargo: 'Auditor Fiscal',
      secretaria: 'Secretaria de Finanças',
      departamento: 'Departamento de Tributação',
      nfc: '85.00',
      dias_servico: 1500,
      idade_anos: 40,
    },
    {
      servidor_id: 2,
      nome: 'Ana Oliveira',
      matricula: '1002',
      cargo: 'Analista de Gestão',
      secretaria: 'Secretaria de Administração',
      departamento: 'Departamento de Recursos Humanos',
      nfc: '92.50',
      dias_servico: 1000,
      idade_anos: 35,
    },
    {
      servidor_id: 3,
      nome: 'Beatriz Santos',
      matricula: '1003',
      cargo: 'Auditor Fiscal',
      secretaria: 'Secretaria de Finanças',
      departamento: 'Departamento de Tributação',
      nfc: '85.00',
      dias_servico: 2200, // Mesma NFC de Carlos, porém mais dias de serviço
      idade_anos: 32,
    },
    {
      servidor_id: 4,
      nome: 'Daniel Souza',
      matricula: '1004',
      cargo: 'Assistente Técnico',
      secretaria: 'Secretaria de Saúde',
      departamento: 'Diretoria de Atenção Básica',
      nfc: '85.00',
      dias_servico: 1500, // Mesma NFC e mesmos dias de Carlos, porém mais velho (52 anos)
      idade_anos: 52,
    },
    {
      servidor_id: 5,
      nome: 'Eduardo Pereira',
      matricula: '1005',
      cargo: 'Técnico Administrativo',
      secretaria: 'Secretaria de Saúde',
      departamento: 'Diretoria de Vigilância',
      nfc: '64.00', // Insuficiente (PMD)
      dias_servico: 800,
      idade_anos: 28,
    },
  ];

  it('ordena corretamente pelos critérios sucessivos do Art. 39', () => {
    const ranqueados = ordenarEIdentificarDesempates(mockServidores);

    expect(ranqueados).toHaveLength(5);

    // 1º Lugar: Ana Oliveira (NFC 92.50)
    expect(ranqueados[0].nome).toBe('Ana Oliveira');
    expect(ranqueados[0].posicao).toBe(1);
    expect(ranqueados[0].possuiEmpatePontuacao).toBe(false);
    expect(ranqueados[0].conceito).toBe('Excelente');

    // 2º Lugar: Beatriz Santos (NFC 85.00, 2200 dias)
    expect(ranqueados[1].nome).toBe('Beatriz Santos');
    expect(ranqueados[1].posicao).toBe(2);
    expect(ranqueados[1].possuiEmpatePontuacao).toBe(true);
    expect(ranqueados[1].criterioDesempate).toBe('dias_servico');

    // 3º Lugar: Daniel Souza (NFC 85.00, 1500 dias, 52 anos)
    expect(ranqueados[2].nome).toBe('Daniel Souza');
    expect(ranqueados[2].posicao).toBe(3);
    expect(ranqueados[2].possuiEmpatePontuacao).toBe(true);
    expect(ranqueados[2].criterioDesempate).toBe('dias_servico');

    // 4º Lugar: Carlos Silva (NFC 85.00, 1500 dias, 40 anos -> desempatou por idade com Daniel)
    expect(ranqueados[3].nome).toBe('Carlos Silva');
    expect(ranqueados[3].posicao).toBe(4);
    expect(ranqueados[3].possuiEmpatePontuacao).toBe(true);
    expect(ranqueados[3].criterioDesempate).toBe('dias_servico');

    // 5º Lugar: Eduardo Pereira (NFC 64.00 -> PMD)
    expect(ranqueados[4].nome).toBe('Eduardo Pereira');
    expect(ranqueados[4].posicao).toBe(5);
    expect(ranqueados[4].possuiEmpatePontuacao).toBe(false);
    expect(ranqueados[4].elegivel).toBe(false);
    expect(ranqueados[4].conceito).toBe('Insuficiente (PMD)');
  });

  it('detecta desempate por idade quando os dias de serviço forem rigorosamente iguais', () => {
    const servidoresIguaisDias: ServidorBaseDesempate[] = [
      {
        servidor_id: 10,
        nome: 'Jovem',
        matricula: '2001',
        nfc: '80.00',
        dias_servico: 1000,
        idade_anos: 25,
      },
      {
        servidor_id: 11,
        nome: 'Senior',
        matricula: '2002',
        nfc: '80.00',
        dias_servico: 1000,
        idade_anos: 50,
      },
    ];

    const resultado = ordenarEIdentificarDesempates(servidoresIguaisDias);
    expect(resultado[0].nome).toBe('Senior');
    expect(resultado[0].criterioDesempate).toBe('idade');
    expect(resultado[1].nome).toBe('Jovem');
    expect(resultado[1].criterioDesempate).toBe('idade');
  });

  describe('filtrarRankingDesempate', () => {
    const ranqueados = ordenarEIdentificarDesempates(mockServidores);

    it('filtra por busca textual (nome, matrícula ou cargo)', () => {
      const filtradosNome = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        termoBusca: 'beatriz',
      });
      expect(filtradosNome).toHaveLength(1);
      expect(filtradosNome[0].nome).toBe('Beatriz Santos');

      const filtradosMatricula = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        termoBusca: '1004',
      });
      expect(filtradosMatricula).toHaveLength(1);
      expect(filtradosMatricula[0].nome).toBe('Daniel Souza');
    });

    it('filtra por secretaria e departamento', () => {
      const filtradosSec = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        secretaria: 'Secretaria de Finanças',
      });
      expect(filtradosSec).toHaveLength(2);

      const filtradosDep = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        secretaria: 'Secretaria de Saúde',
        departamento: 'Diretoria de Vigilância',
      });
      expect(filtradosDep).toHaveLength(1);
      expect(filtradosDep[0].nome).toBe('Eduardo Pereira');
    });

    it('filtra por faixa de conceito', () => {
      const excelentes = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        faixaConceito: 'excelente',
      });
      expect(excelentes).toHaveLength(1);
      expect(excelentes[0].nome).toBe('Ana Oliveira');

      const pmd = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        faixaConceito: 'pmd',
      });
      expect(pmd).toHaveLength(1);
      expect(pmd[0].nome).toBe('Eduardo Pereira');
    });

    it('filtra por elegibilidade (Aptos vs PMD)', () => {
      const elegiveis = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        elegibilidade: 'elegivel',
      });
      expect(elegiveis).toHaveLength(4);

      const naoElegiveis = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        elegibilidade: 'nao_elegivel',
      });
      expect(naoElegiveis).toHaveLength(1);
      expect(naoElegiveis[0].nome).toBe('Eduardo Pereira');
    });

    it('filtra apenas servidores com empate no Art. 39', () => {
      const apenasEmpates = filtrarRankingDesempate(ranqueados, {
        ...FILTROS_INICIAIS_DESEMPATE,
        apenasEmpates: true,
      });
      // Beatriz, Daniel e Carlos empataram na nota 85.00
      expect(apenasEmpates).toHaveLength(3);
      expect(apenasEmpates.every((s) => s.possuiEmpatePontuacao)).toBe(true);
    });
  });

  describe('calcularKpisRankingDesempate', () => {
    it('calcula métricas consolidadas com precisão', () => {
      const ranqueados = ordenarEIdentificarDesempates(mockServidores);
      const kpis = calcularKpisRankingDesempate(ranqueados);

      expect(kpis.totalRanqueados).toBe(5);
      expect(kpis.aptosProgressao).toBe(4);
      expect(kpis.percentualAptos).toBe(80);
      expect(kpis.emPmd).toBe(1);
      expect(kpis.totalEmpatesDesempatados).toBe(3);
      // Média: (92.5 + 85 + 85 + 85 + 64) / 5 = 411.5 / 5 = 82.3
      expect(kpis.mediaNfc).toBe(82.3);
    });

    it('retorna zeros com segurança para listas vazias', () => {
      const kpis = calcularKpisRankingDesempate([]);
      expect(kpis.totalRanqueados).toBe(0);
      expect(kpis.aptosProgressao).toBe(0);
      expect(kpis.percentualAptos).toBe(0);
      expect(kpis.mediaNfc).toBe(0);
      expect(kpis.totalEmpatesDesempatados).toBe(0);
    });
  });
});
