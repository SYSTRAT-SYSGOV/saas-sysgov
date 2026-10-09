import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PainelIndicadoresView } from '../PainelIndicadoresView';
import { meioAmbienteApi, type IndicadoresAmbientais, type PainelMapaAmbiental } from '../../api';

const indicadoresMock: IndicadoresAmbientais = {
  periodo: { data_inicio: '2026-08-01', data_fim: '2026-08-31' },
  licencas_emitidas: { total: 3, por_fase: { LP: 2, LO: 1 } },
  multas: { valor_aplicado_centavos: 5_000_000, valor_arrecadado_centavos: 3_000_000 },
  queimadas: { area_queimada_km2: 2.5, ocorrencias: 1, evolucao_mensal: [{ mes: '2026-08', area_km2: 2.5 }] },
  coleta_seletiva: { coleta_seletiva_toneladas: 12, evolucao_mensal: [{ mes: '2026-08', toneladas: 12 }] },
};

const mapaMock: PainelMapaAmbiental = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'queimada-1',
      geometry: { type: 'Point', coordinates: [-49.27, -25.43] },
      properties: { camada: 'queimada', data_ocorrencia: '2026-08-12', area_queimada_ha: 250, situacao: 'responsavel_nao_identificado' },
    },
  ],
};

describe('PainelIndicadoresView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(meioAmbienteApi, 'obterIndicadoresAmbientais').mockResolvedValue(indicadoresMock);
    vi.spyOn(meioAmbienteApi, 'obterMapaPainelAmbiental').mockResolvedValue(mapaMock);
  });

  it('exibe os indicadores de licenças, multas, queimadas e coleta seletiva', async () => {
    render(<PainelIndicadoresView />);

    await waitFor(() => expect(screen.getByText('Licenças Emitidas')).toBeInTheDocument());

    expect(screen.getByText('3')).toBeInTheDocument();
    // toLocaleString pt-BR usa espaço não separável entre "R$" e o valor.
    expect(screen.getByText(/R\$\s50\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/Arrecadado: R\$\s30\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('2,5 km²')).toBeInTheDocument();
    expect(screen.getByText('12 t')).toBeInTheDocument();
    expect(screen.getByText('Mapa de Queimadas e Licenças Emitidas')).toBeInTheDocument();
  });

  it('reconsulta o painel ao alterar o período', async () => {
    render(<PainelIndicadoresView />);

    await waitFor(() => expect(meioAmbienteApi.obterIndicadoresAmbientais).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-02-01' } });

    await waitFor(() => expect(meioAmbienteApi.obterIndicadoresAmbientais).toHaveBeenCalledTimes(2));
    expect(meioAmbienteApi.obterIndicadoresAmbientais).toHaveBeenLastCalledWith(expect.objectContaining({ data_inicio: '2026-02-01' }));
  });

  it('mostra estados vazios quando não há queimadas nem coleta seletiva no período', async () => {
    vi.spyOn(meioAmbienteApi, 'obterIndicadoresAmbientais').mockResolvedValue({
      ...indicadoresMock,
      queimadas: { area_queimada_km2: 0, ocorrencias: 0, evolucao_mensal: [] },
      coleta_seletiva: { coleta_seletiva_toneladas: 0, evolucao_mensal: [] },
    });
    vi.spyOn(meioAmbienteApi, 'obterMapaPainelAmbiental').mockResolvedValue({ type: 'FeatureCollection', features: [] });

    render(<PainelIndicadoresView />);

    await waitFor(() => expect(screen.getByText('Sem ocorrências de queimada no período')).toBeInTheDocument());
    expect(screen.getByText('Sem coleta seletiva no período')).toBeInTheDocument();
  });
});
