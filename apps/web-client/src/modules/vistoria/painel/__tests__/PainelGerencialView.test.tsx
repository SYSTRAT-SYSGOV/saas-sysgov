import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PainelGerencialView } from '../PainelGerencialView';
import { vistoriaApi, type PainelMapaResponse, type PainelProdutividadeResponse, type PainelIndicadoresResponse } from '../../api';

const mapaMock: PainelMapaResponse = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'ordem-1',
      geometry: { type: 'Point', coordinates: [-49.2733, -25.4284] },
      properties: {
        ordem_servico_id: 1,
        local_nome: 'Fazenda Teste',
        tipo_acao: 'vistoria_rotina',
        status: 'concluida',
        situacao: 'realizada',
        data_prevista: '2026-10-01',
      },
    },
    {
      type: 'Feature',
      id: 'ordem-2',
      geometry: { type: 'Point', coordinates: [-49.28, -25.43] },
      properties: {
        ordem_servico_id: 2,
        local_nome: 'Fazenda Pendente',
        tipo_acao: 'vistoria_rotina',
        status: 'agendada',
        situacao: 'pendente',
        data_prevista: '2026-10-05',
      },
    },
  ],
};

const produtividadeMock: PainelProdutividadeResponse = {
  periodo: { data_inicio: '2026-09-08', data_fim: '2026-10-07' },
  fiscais: [{ fiscal_id: 1, fiscal_nome: 'Fiscal Teste', total_concluidas: 3 }],
};

const indicadoresMock: PainelIndicadoresResponse = {
  periodo: { data_inicio: '2026-09-08', data_fim: '2026-10-07' },
  autuacoes_por_tipo: { auto_infracao: 2, notificacao: 1 },
  taxa_regularizacao: 0.75,
  tempo_medio_dias_vistoria_ate_conclusao_processo: 12.5,
};

describe('PainelGerencialView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(vistoriaApi, 'obterPainelMapa').mockResolvedValue({ data: mapaMock } as any);
    vi.spyOn(vistoriaApi, 'obterPainelProdutividade').mockResolvedValue({ data: produtividadeMock } as any);
    vi.spyOn(vistoriaApi, 'obterPainelIndicadores').mockResolvedValue({ data: indicadoresMock } as any);
  });

  it('carrega e exibe os KPIs, a produtividade e o mapa', async () => {
    render(<PainelGerencialView />);

    await waitFor(() => expect(screen.getByText('Vistorias Pendentes')).toBeInTheDocument());

    expect(screen.getAllByText('1')).toHaveLength(2); // 1 pendente + 1 realizada
    expect(screen.getByText('75.0%')).toBeInTheDocument(); // taxa de regularização
    expect(screen.getByText('12.5 dias')).toBeInTheDocument(); // tempo médio
    // recharts só mede o SVG via ResizeObserver (ausente no jsdom), então os
    // ticks dos eixos não chegam a renderizar — verificamos que a seção
    // montou sem quebrar, não o conteúdo interno do gráfico.
    expect(screen.getByText('Produtividade por Fiscal')).toBeInTheDocument();
    expect(screen.getByText('Autuações por Tipo')).toBeInTheDocument();
    expect(screen.getByText('Mapa de Vistorias')).toBeInTheDocument();
  });

  it('reconsulta o painel ao alterar o período', async () => {
    render(<PainelGerencialView />);

    await waitFor(() => expect(vistoriaApi.obterPainelIndicadores).toHaveBeenCalledTimes(1));

    const campoData = screen.getByLabelText('Até');
    fireEvent.change(campoData, { target: { value: '2026-09-01' } });

    await waitFor(() => expect(vistoriaApi.obterPainelIndicadores).toHaveBeenCalledTimes(2));
  });

  it('mostra estado vazio quando não há autuações no período', async () => {
    vi.spyOn(vistoriaApi, 'obterPainelIndicadores').mockResolvedValue({
      data: { ...indicadoresMock, autuacoes_por_tipo: {} },
    } as any);

    render(<PainelGerencialView />);

    await waitFor(() => expect(screen.getByText('Sem autuações no período')).toBeInTheDocument());
  });
});
