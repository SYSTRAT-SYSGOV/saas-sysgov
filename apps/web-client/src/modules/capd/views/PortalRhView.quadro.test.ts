import { describe, it, expect } from 'vitest';
import type { ApiServidor } from '@sysgov/sdk';
import {
  filtrarServidoresQuadro,
  calcularKpisQuadroServidores,
  FILTROS_INICIAIS_QUADRO,
  type FiltrosQuadroServidores,
  filtrarServidoresEstagio,
  calcularKpisEstagioProbatorio,
  FILTROS_INICIAIS_ESTAGIO,
  type FiltrosEstagioProbatorio,
} from './PortalRhView.quadro';

function criarServidor(partial: Partial<ApiServidor> & Pick<ApiServidor, 'id' | 'nome_completo' | 'matricula'>): ApiServidor {
  return {
    tenant_id: 1,
    cpf: '000.000.000-00',
    cargo_efetivo: 'Assistente Administrativo',
    regime_juridico: 'estatutario',
    regime_previdenciario: 'rpps',
    carga_horaria_semanal: 40,
    orgao_lotacao: 'Prefeitura',
    situacao_funcional: 'ativo',
    estagio_probatorio: false,
    ...partial,
  };
}

describe('PortalRhView.quadro — Funções puras de filtragem e KPIs', () => {
  const s1 = criarServidor({
    id: 1,
    nome_completo: 'Ana Silva',
    matricula: '1001',
    cpf: '111.222.333-44',
    cargo_efetivo: 'Analista de RH',
    regime_juridico: 'estatutario',
    estagio_probatorio: true,
    estagio_fase_atual: 2,
    situacao_funcional: 'ativo',
  });

  const s2 = criarServidor({
    id: 2,
    nome_completo: 'Carlos Eduardo',
    matricula: '1002',
    cpf: '222.333.444-55',
    cargo_efetivo: 'Técnico em Informática',
    regime_juridico: 'estatutario',
    estagio_probatorio: false,
    situacao_funcional: 'ativo',
  });

  const s3 = criarServidor({
    id: 3,
    nome_completo: 'Beatriz Costa',
    matricula: '1003',
    cpf: '333.444.555-66',
    cargo_efetivo: 'Diretora de Divisão',
    regime_juridico: 'comissionado',
    funcao_gratificada: 'Diretoria Executiva',
    estagio_probatorio: false,
    situacao_funcional: 'ativo',
  });

  const s4 = criarServidor({
    id: 4,
    nome_completo: 'Daniel Rocha',
    matricula: '1004',
    cpf: '444.555.666-77',
    cargo_efetivo: 'Professor',
    regime_juridico: 'estatutario',
    estagio_probatorio: true,
    estagio_fase_atual: 1,
    situacao_funcional: 'afastado_saude',
  });

  const servidoresLista: ApiServidor[] = [s1, s2, s3, s4];

  const classificacaoMap = new Map<number, { secretaria: string; departamento: string }>([
    [1, { secretaria: 'Secretaria de Administração', departamento: 'Depto de Recursos Humanos' }],
    [2, { secretaria: 'Secretaria de Administração', departamento: 'Depto de Tecnologia da Informação' }],
    [3, { secretaria: 'Secretaria de Educação', departamento: 'Depto de Ensino Fundamental' }],
    // s4 propositalmente sem classificação para testar servidores não classificados
  ]);

  const avaliacoesMap = new Map<number, unknown>([
    [1, { id: 101, ciclo_id: 1, nota_final: 85 }],
    [2, { id: 102, ciclo_id: 1, nota_final: 90 }],
  ]);

  describe('filtrarServidoresQuadro', () => {
    it('retorna todos os servidores com filtros padrão/iniciais', () => {
      const res = filtrarServidoresQuadro(servidoresLista, FILTROS_INICIAIS_QUADRO, classificacaoMap);
      expect(res).toHaveLength(4);
    });

    it('filtra por busca textual (nome, matrícula e CPF)', () => {
      let res = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, termoBusca: 'Ana' },
        classificacaoMap,
      );
      expect(res.map((s) => s.id)).toEqual([1]);

      res = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, termoBusca: '1003' },
        classificacaoMap,
      );
      expect(res.map((s) => s.id)).toEqual([3]);

      res = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, termoBusca: '333.444.555' },
        classificacaoMap,
      );
      expect(res.map((s) => s.id)).toEqual([3]);
    });

    it('filtra por secretaria e departamento contextual', () => {
      const resSec = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, secretaria: 'Secretaria de Administração' },
        classificacaoMap,
      );
      expect(resSec.map((s) => s.id)).toEqual([1, 2]);

      const resDep = filtrarServidoresQuadro(
        servidoresLista,
        {
          ...FILTROS_INICIAIS_QUADRO,
          secretaria: 'Secretaria de Administração',
          departamento: 'Depto de Recursos Humanos',
        },
        classificacaoMap,
      );
      expect(resDep.map((s) => s.id)).toEqual([1]);
    });

    it('filtra servidores sem lotação definida (__sem_lotacao__)', () => {
      const res = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, secretaria: '__sem_lotacao__' },
        classificacaoMap,
      );
      expect(res.map((s) => s.id)).toEqual([4]);
    });

    it('filtra por condição probatória (estágio vs estável)', () => {
      const emEstagio = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, condicaoEstagio: 'estagio' },
        classificacaoMap,
      );
      expect(emEstagio.map((s) => s.id)).toEqual([1, 4]);

      const estaveis = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, condicaoEstagio: 'estavel' },
        classificacaoMap,
      );
      expect(estaveis.map((s) => s.id)).toEqual([2, 3]);
    });

    it('filtra por fase do estágio probatório', () => {
      const fase2 = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, condicaoEstagio: 'estagio', faseEstagio: '2' },
        classificacaoMap,
      );
      expect(fase2.map((s) => s.id)).toEqual([1]);

      const fase1 = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, condicaoEstagio: 'estagio', faseEstagio: '1' },
        classificacaoMap,
      );
      expect(fase1.map((s) => s.id)).toEqual([4]);
    });

    it('filtra por regime jurídico (estatutário vs comissionado)', () => {
      const comissionados = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, regime: 'comissionado' },
        classificacaoMap,
      );
      expect(comissionados.map((s) => s.id)).toEqual([3]);

      const estatutarios = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, regime: 'estatutario' },
        classificacaoMap,
      );
      expect(estatutarios.map((s) => s.id)).toEqual([1, 2, 4]);
    });

    it('filtra por situação funcional (ativo vs afastado)', () => {
      const ativos = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, situacao: 'ativo' },
        classificacaoMap,
      );
      expect(ativos.map((s) => s.id)).toEqual([1, 2, 3]);

      const afastados = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, situacao: 'afastado' },
        classificacaoMap,
      );
      expect(afastados.map((s) => s.id)).toEqual([4]);
    });

    it('filtra por presença de avaliação no ciclo ativo', () => {
      const comAvaliacao = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, avaliacaoCiclo: 'com_avaliacao' },
        classificacaoMap,
        avaliacoesMap,
      );
      expect(comAvaliacao.map((s) => s.id)).toEqual([1, 2]);

      const semAvaliacao = filtrarServidoresQuadro(
        servidoresLista,
        { ...FILTROS_INICIAIS_QUADRO, avaliacaoCiclo: 'sem_avaliacao' },
        classificacaoMap,
        avaliacoesMap,
      );
      expect(semAvaliacao.map((s) => s.id)).toEqual([3, 4]);
    });
  });

  describe('calcularKpisQuadroServidores', () => {
    it('retorna zeros para lista vazia', () => {
      const kpis = calcularKpisQuadroServidores([], new Map());
      expect(kpis).toEqual({
        total: 0,
        totalEstagio: 0,
        percentualEstagio: 0,
        totalEstaveis: 0,
        percentualEstaveis: 0,
        totalAlocados: 0,
        totalNaoClassificados: 0,
        totalComAvaliacao: 0,
      });
    });

    it('calcula corretamente totais e percentuais com dados populados', () => {
      const kpis = calcularKpisQuadroServidores(servidoresLista, classificacaoMap, avaliacoesMap);
      expect(kpis.total).toBe(4);
      expect(kpis.totalEstagio).toBe(2); // s1 e s4
      expect(kpis.percentualEstagio).toBe(50); // 2/4 = 50%
      expect(kpis.totalEstaveis).toBe(2); // s2 e s3
      expect(kpis.percentualEstaveis).toBe(50); // 2/4 = 50%
      expect(kpis.totalAlocados).toBe(3); // s1, s2, s3
      expect(kpis.totalNaoClassificados).toBe(1); // s4
      expect(kpis.totalComAvaliacao).toBe(2); // s1 e s2
    });
  });

  describe('filtrarServidoresEstagio', () => {
    const s5 = criarServidor({
      id: 5,
      nome_completo: 'Eduarda Lima',
      matricula: '1005',
      cpf: '555.666.777-88',
      cargo_efetivo: 'Contadora',
      regime_juridico: 'estatutario',
      estagio_probatorio: true,
      estagio_fase_atual: 3,
      estagio_status: 'aprovado',
      situacao_funcional: 'ativo',
    });

    const servidoresEstagioCompleto = [...servidoresLista, s5];
    const mapaClassificacaoComS5 = new Map(classificacaoMap);
    mapaClassificacaoComS5.set(5, {
      secretaria: 'Secretaria de Fazenda',
      departamento: 'Depto de Contabilidade',
    });
    const mapaAvaliacoesComS5 = new Map(avaliacoesMap);
    mapaAvaliacoesComS5.set(5, { id: 103, ciclo_id: 1, nota_final: 95 });

    it('retorna apenas servidores com estagio_probatorio === true', () => {
      const res = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        FILTROS_INICIAIS_ESTAGIO,
        mapaClassificacaoComS5,
      );
      // Apenas s1, s4 e s5 são estagio_probatorio: true
      expect(res.map((s) => s.id)).toEqual([1, 4, 5]);
    });

    it('filtra por busca textual (nome, matrícula, cargo e CPF)', () => {
      let res = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, termoBusca: 'Eduarda' },
        mapaClassificacaoComS5,
      );
      expect(res.map((s) => s.id)).toEqual([5]);

      res = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, termoBusca: 'Contadora' },
        mapaClassificacaoComS5,
      );
      expect(res.map((s) => s.id)).toEqual([5]);

      res = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, termoBusca: '1004' },
        mapaClassificacaoComS5,
      );
      expect(res.map((s) => s.id)).toEqual([4]);
    });

    it('filtra por fase do estágio (1ª, 2ª e 3ª fase)', () => {
      const f1 = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, faseEstagio: '1' },
        mapaClassificacaoComS5,
      );
      expect(f1.map((s) => s.id)).toEqual([4]);

      const f2 = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, faseEstagio: '2' },
        mapaClassificacaoComS5,
      );
      expect(f2.map((s) => s.id)).toEqual([1]);

      const f3 = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, faseEstagio: '3' },
        mapaClassificacaoComS5,
      );
      expect(f3.map((s) => s.id)).toEqual([5]);
    });

    it('filtra por secretaria e departamento', () => {
      const fazenda = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, secretaria: 'Secretaria de Fazenda' },
        mapaClassificacaoComS5,
      );
      expect(fazenda.map((s) => s.id)).toEqual([5]);

      const semLotacao = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, secretaria: '__sem_lotacao__' },
        mapaClassificacaoComS5,
      );
      expect(semLotacao.map((s) => s.id)).toEqual([4]);
    });

    it('filtra por status do estágio e situação funcional', () => {
      const aprovados = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, statusEstagio: 'aprovado' },
        mapaClassificacaoComS5,
      );
      expect(aprovados.map((s) => s.id)).toEqual([5]);

      const emAndamento = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, statusEstagio: 'em_andamento' },
        mapaClassificacaoComS5,
      );
      expect(emAndamento.map((s) => s.id)).toEqual([1, 4]);

      const afastados = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, situacao: 'afastado' },
        mapaClassificacaoComS5,
      );
      expect(afastados.map((s) => s.id)).toEqual([4]);
    });

    it('filtra por presença de avaliação no ciclo ativo', () => {
      const comAvaliacao = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, avaliacaoCiclo: 'com_avaliacao' },
        mapaClassificacaoComS5,
        mapaAvaliacoesComS5,
      );
      expect(comAvaliacao.map((s) => s.id)).toEqual([1, 5]);

      const semAvaliacao = filtrarServidoresEstagio(
        servidoresEstagioCompleto,
        { ...FILTROS_INICIAIS_ESTAGIO, avaliacaoCiclo: 'sem_avaliacao' },
        mapaClassificacaoComS5,
        mapaAvaliacoesComS5,
      );
      expect(semAvaliacao.map((s) => s.id)).toEqual([4]);
    });
  });

  describe('calcularKpisEstagioProbatorio', () => {
    it('retorna zeros para lista sem nenhum servidor em estágio', () => {
      const kpis = calcularKpisEstagioProbatorio([s2, s3]);
      expect(kpis).toEqual({
        totalEstagio: 0,
        totalFase1: 0,
        percentualFase1: 0,
        totalFase2: 0,
        percentualFase2: 0,
        totalFase3: 0,
        percentualFase3: 0,
        totalComAvaliacao: 0,
        percentualComAvaliacao: 0,
      });
    });

    it('calcula métricas de estágio, fases e avaliações com precisão', () => {
      const s5 = criarServidor({
        id: 5,
        nome_completo: 'Eduarda Lima',
        matricula: '1005',
        estagio_probatorio: true,
        estagio_fase_atual: 3,
      });

      const servidores = [s1, s2, s3, s4, s5]; // 3 em estágio: s1 (fase 2), s4 (fase 1), s5 (fase 3)
      const mapaAvaliacoes = new Map<number, unknown>([
        [1, { id: 101 }],
        [5, { id: 103 }],
      ]);

      const kpis = calcularKpisEstagioProbatorio(servidores, mapaAvaliacoes);
      expect(kpis.totalEstagio).toBe(3);
      expect(kpis.totalFase1).toBe(1);
      expect(kpis.percentualFase1).toBe(33);
      expect(kpis.totalFase2).toBe(1);
      expect(kpis.percentualFase2).toBe(33);
      expect(kpis.totalFase3).toBe(1);
      expect(kpis.percentualFase3).toBe(33);
      expect(kpis.totalComAvaliacao).toBe(2);
      expect(kpis.percentualComAvaliacao).toBe(67);
    });
  });
});

