import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CemiteriosProvider } from '../../CemiteriosContext';
import { OperacoesView } from '../OperacoesView';
import { ConcessoesView } from '../ConcessoesView';
import { FinanceiroView } from '../FinanceiroView';
import { VistoriaView } from '../VistoriaView';
import { EmpreiteirosView } from '../EmpreiteirosView';
import { cemiteriosApi, type Parque } from '../../api';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

const mockParques: Parque[] = [
  {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério da Paz',
    endereco: 'Rua Principal, 100',
    tipo: 'municipal',
    situacao: 'ativo',
    responsavel: 'Gestor da Paz',
    lat: -23.55,
    lng: -46.63,
  },
  {
    id: 2,
    codigo: 'CEM-02',
    nome: 'Cemitério da Saudade',
    endereco: 'Av Central, 200',
    tipo: 'municipal',
    situacao: 'ativo',
    responsavel: 'Gestor da Saudade',
    lat: -23.56,
    lng: -46.64,
  },
];

describe('Isolamento Contextual por Necrópole Ativa nas Abas Operacionais', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(cemiteriosApi, 'parques').mockResolvedValue(mockParques);
    vi.spyOn(cemiteriosApi, 'parque').mockResolvedValue(mockParques[0]);

    vi.spyOn(cemiteriosApi, 'ordens').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'inumacoes').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'exumacoes').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'concessoes').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'guias').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'inadimplencia').mockResolvedValue({
      total_centavos: 0,
      quantidade: 0,
      guias: [],
    });
    vi.spyOn(cemiteriosApi, 'vistorias').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'processos').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'empreiteiros').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
    vi.spyOn(cemiteriosApi, 'obras').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    });
  });

  it('isola consultas de ordens de serviço ao cemiterioAtivoId em OperacoesView', async () => {
    render(
      <CemiteriosProvider
        cemiteriosIniciais={mockParques}
        cemiterioAtivoIdInicial={1}
        modoVisaoInicial="gestao_necropole"
      >
        <OperacoesView />
      </CemiteriosProvider>
    );

    await waitFor(() => {
      expect(cemiteriosApi.ordens).toHaveBeenCalledWith(
        expect.objectContaining({
          park_id: 1,
        })
      );
    });
  });

  it('isola consultas de concessões ao cemiterioAtivoId em ConcessoesView', async () => {
    render(
      <CemiteriosProvider
        cemiteriosIniciais={mockParques}
        cemiterioAtivoIdInicial={1}
        modoVisaoInicial="gestao_necropole"
      >
        <ConcessoesView />
      </CemiteriosProvider>
    );

    await waitFor(() => {
      expect(cemiteriosApi.concessoes).toHaveBeenCalledWith(
        expect.objectContaining({
          park_id: 1,
        })
      );
    });
  });

  it('isola consultas de guias ao cemiterioAtivoId em FinanceiroView', async () => {
    render(
      <CemiteriosProvider
        cemiteriosIniciais={mockParques}
        cemiterioAtivoIdInicial={1}
        modoVisaoInicial="gestao_necropole"
      >
        <FinanceiroView />
      </CemiteriosProvider>
    );

    await waitFor(() => {
      expect(cemiteriosApi.guias).toHaveBeenCalledWith(
        expect.objectContaining({
          park_id: 1,
        })
      );
    });
  });

  it('isola consultas de vistorias e processos ao cemiterioAtivoId em VistoriaView', async () => {
    render(
      <CemiteriosProvider
        cemiteriosIniciais={mockParques}
        cemiterioAtivoIdInicial={1}
        modoVisaoInicial="gestao_necropole"
      >
        <VistoriaView />
      </CemiteriosProvider>
    );

    await waitFor(() => {
      expect(cemiteriosApi.vistorias).toHaveBeenCalledWith(
        expect.objectContaining({
          park_id: 1,
        })
      );
      expect(cemiteriosApi.processos).toHaveBeenCalledWith(
        expect.objectContaining({
          park_id: 1,
        })
      );
    });
  });

  it('isola consultas de obras ao cemiterioAtivoId em EmpreiteirosView', async () => {
    render(
      <CemiteriosProvider
        cemiteriosIniciais={mockParques}
        cemiterioAtivoIdInicial={1}
        modoVisaoInicial="gestao_necropole"
      >
        <EmpreiteirosView />
      </CemiteriosProvider>
    );

    await waitFor(() => {
      expect(cemiteriosApi.obras).toHaveBeenCalledWith(
        expect.objectContaining({
          park_id: 1,
        })
      );
    });
  });
});
