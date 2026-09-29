import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SucessaoKpis, calcularMetricasSucessao } from '../SucessaoKpis';
import type { DashboardPendentesResumo, DashboardRegularizacao } from '../../api';

const resumo: DashboardPendentesResumo = { total: 5, em_analise: 2, aguardando_documentos: 1, validada: 2 };

const regularizacao: DashboardRegularizacao = {
  total: 3,
  processos: [
    { id: 1, processo_referencia: 'P1', estado: 'validada', via: 'inventario_judicial', concessao: null, jazigo: null, cemiterio: null, titular_falecido: null, data_falecimento: null, dias_desde_falecimento: 400, dias_restantes_regularizacao: 0, prazo_vencido: true, herdeiros_count: 1, titular_indicado: null },
    { id: 2, processo_referencia: 'P2', estado: 'validada', via: 'inventario_judicial', concessao: null, jazigo: null, cemiterio: null, titular_falecido: null, data_falecimento: null, dias_desde_falecimento: 30, dias_restantes_regularizacao: 60, prazo_vencido: false, herdeiros_count: 1, titular_indicado: null },
  ],
};

describe('calcularMetricasSucessao', () => {
  it('agrega resumo de pendências, sucedidas e regularização vencida/no prazo', () => {
    const metricas = calcularMetricasSucessao(resumo, regularizacao, 7);

    expect(metricas.totalPendentes).toBe(5);
    expect(metricas.emAnalise).toBe(2);
    expect(metricas.aguardandoDocumentos).toBe(1);
    expect(metricas.validadas).toBe(2);
    expect(metricas.sucedidas).toBe(7);
    expect(metricas.totalRegularizacao).toBe(3);
    expect(metricas.regularizacaoVencida).toBe(1);
    expect(metricas.regularizacaoNoPrazo).toBe(1);
  });

  it('trata resumo/regularização ausentes com zeros', () => {
    const metricas = calcularMetricasSucessao(undefined, null, 0);
    expect(metricas.totalPendentes).toBe(0);
    expect(metricas.regularizacaoVencida).toBe(0);
  });
});

describe('SucessaoKpis', () => {
  it('renderiza os rótulos dos indicadores', () => {
    render(<SucessaoKpis resumoPendentes={resumo} regularizacao={regularizacao} sucedidas={7} />);

    expect(screen.getByText('Pendentes de Análise')).toBeInTheDocument();
    expect(screen.getByText('Em Análise')).toBeInTheDocument();
    expect(screen.getByText('Sucessões Concluídas')).toBeInTheDocument();
    expect(screen.getByText('Regularização Vencida')).toBeInTheDocument();
  });
});
