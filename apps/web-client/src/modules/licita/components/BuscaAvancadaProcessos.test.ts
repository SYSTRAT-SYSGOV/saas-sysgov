import { describe, it, expect } from 'vitest';
import { aplicarFiltrosAvancados, type FiltroAvancado } from './BuscaAvancadaProcessos';
import type { Processo } from '@sysgov/sdk';

const processoBase: Processo = {
  id: 1,
  tenant_id: 1,
  numero: '001',
  ano: 2026,
  objeto: 'Aquisição de veículos',
  fase_atual: 'dfd',
  status_geral: 'em_andamento',
  licitacao_id: null,
  criado_por: null,
  dfd: null,
  created_at: '2026-01-15T10:00:00.000000Z',
  updated_at: '2026-01-15T10:00:00.000000Z',
};

const processos: Processo[] = [
  processoBase,
  {
    ...processoBase,
    id: 2,
    numero: '002',
    objeto: 'Contratação de serviços de limpeza',
    fase_atual: 'etp',
    created_at: '2026-02-20T10:00:00.000000Z',
    dfd: {
      id: 1,
      tenant_id: 1,
      processo_id: 2,
      data_previsao: '2026-03-01',
      grau_prioridade: 'alta',
      justificativa: '',
      objeto: '',
      previsao_pca: false,
      numero_pca: 'PCA-2026-010',
      area_requisitante: 'Secretaria de Obras',
      equipe_planejamento: null,
      campos_extras: null,
      itens: null,
      status: 'aprovado',
      gerado_por_ia: false,
      elaborado_por: 1,
      aprovado_por: null,
      aprovado_em: null,
      elaborador: null,
      aprovador: null,
      versoes: [],
      created_at: '2026-02-20T10:00:00.000000Z',
      updated_at: '2026-02-20T10:00:00.000000Z',
    },
  },
];

describe('aplicarFiltrosAvancados', () => {
  it('returns everything unchanged when there are no filters', () => {
    expect(aplicarFiltrosAvancados(processos, [])).toEqual(processos);
  });

  it('ignores filter rows with an empty value (not yet filled in)', () => {
    const filtros: FiltroAvancado[] = [{ campo: 'numero', valor: '' }];
    expect(aplicarFiltrosAvancados(processos, filtros)).toEqual(processos);
  });

  it('filters by a text field (case-insensitive substring)', () => {
    const filtros: FiltroAvancado[] = [{ campo: 'objeto', valor: 'LIMPEZA' }];
    const resultado = aplicarFiltrosAvancados(processos, filtros);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(2);
  });

  it('filters by a select field on the process itself (exact match)', () => {
    const filtros: FiltroAvancado[] = [{ campo: 'fase_atual', valor: 'etp' }];
    const resultado = aplicarFiltrosAvancados(processos, filtros);
    expect(resultado.map((p) => p.id)).toEqual([2]);
  });

  it('filters by a nested DFD field, excluding processos without DFD', () => {
    const filtros: FiltroAvancado[] = [{ campo: 'dfd_status', valor: 'aprovado' }];
    const resultado = aplicarFiltrosAvancados(processos, filtros);
    expect(resultado.map((p) => p.id)).toEqual([2]);
  });

  it('filters by dfd_area_requisitante (nested text field)', () => {
    const filtros: FiltroAvancado[] = [{ campo: 'dfd_area_requisitante', valor: 'obras' }];
    const resultado = aplicarFiltrosAvancados(processos, filtros);
    expect(resultado.map((p) => p.id)).toEqual([2]);
  });

  it('filters by criado_em comparing only the date portion of created_at', () => {
    const filtros: FiltroAvancado[] = [{ campo: 'criado_em', valor: '2026-01-15' }];
    const resultado = aplicarFiltrosAvancados(processos, filtros);
    expect(resultado.map((p) => p.id)).toEqual([1]);
  });

  it('combines multiple active filters with AND', () => {
    const filtros: FiltroAvancado[] = [
      { campo: 'fase_atual', valor: 'etp' },
      { campo: 'dfd_grau_prioridade', valor: 'alta' },
    ];
    expect(aplicarFiltrosAvancados(processos, filtros).map((p) => p.id)).toEqual([2]);

    const filtrosSemMatch: FiltroAvancado[] = [
      { campo: 'fase_atual', valor: 'etp' },
      { campo: 'dfd_grau_prioridade', valor: 'baixa' },
    ];
    expect(aplicarFiltrosAvancados(processos, filtrosSemMatch)).toEqual([]);
  });
});
