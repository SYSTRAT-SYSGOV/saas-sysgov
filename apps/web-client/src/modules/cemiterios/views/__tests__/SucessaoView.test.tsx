import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SucessaoView } from '../SucessaoView';
import {
  cemiteriosApi,
  type DashboardPendentes,
  type SucessaoPaginado,
} from '../../api';
import { CemiteriosNavigationProvider } from '../../CemiteriosContext';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

const mockPendentes: DashboardPendentes = {
  resumo: {
    total: 3,
    em_analise: 2,
    aguardando_documentos: 1,
    validada: 0,
  },
  processos: [
    {
      id: 1,
      processo_referencia: 'PROC-SUC-2026-0001',
      estado: 'solicitada',
      via: 'inventario_judicial',
      concessao: {
        id: 101,
        numero: 'CON-2024-001',
      },
      jazigo: {
        id: 201,
        codigo: 'JAZ-A-01',
      },
      cemiterio: {
        id: 1,
        nome: 'Cemitério Central',
      },
      titular_falecido: {
        id: 301,
        nome: 'João Silva (Falecido)',
      },
      data_falecimento: '2026-01-01',
      dias_em_analise: 5,
      herdeiros_count: 1,
      documentos_count: 1,
      documentos_pendentes: [],
    },
  ],
};

const mockRegularizacao: any = {
  total: 1,
  processos: [
    {
      id: 2,
      processo_referencia: 'PROC-SUC-2026-0002',
      estado: 'aguardando_documentos',
      via: 'inventario_extrajudicial',
      created_at: '2026-09-02T10:00:00Z',
      data_falecimento: '2026-08-01',
      dias_desde_falecimento: 30,
      prazo_vencido: false,
      concessao: {
        id: 102,
        numero: 'CON-2024-002',
      },
      jazigo: {
        id: 202,
        codigo: 'JAZ-A-02',
      },
    },
  ],
};

const mockProcessos: SucessaoPaginado = {
  total: 1,
  per_page: 50,
  current_page: 1,
  last_page: 1,
  from: 1,
  to: 1,
  data: [
    {
      id: 1,
      tenant_id: 1,
      park_id: 1,
      concession_id: 101,
      plot_id: 201,
      via: 'inventario_judicial',
      estado: 'solicitada',
      requerente_id: null,
      titular_falecido_id: 301,
      data_falecimento: '2026-01-01',
      processo_referencia: 'PROC-SUC-2026-0001',
      parecer: 'Processo regular',
      lock_version: 1,
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
      deleted_at: null,
      concessao: {
        id: 101,
        numero: 'CON-2024-001',
      },
      herdeiros: [
        {
          id: 11,
          tenant_id: 1,
          sucessao_id: 1,
          nome: 'Maria da Silva',
          parentesco: 'filho',
          documento: '123.456.789-00',
          ordem: 1,
          direito_representacao: false,
          titular_indicado: true,
          herdeiro_representado_id: null,
          created_at: '2026-09-01T10:00:00Z',
          updated_at: '2026-09-01T10:00:00Z',
        },
      ],
      documentos: [],
      historico: [],
    },
  ],
};

describe('SucessaoView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cemiteriosApi, 'pendentes').mockResolvedValue(mockPendentes);
    vi.spyOn(cemiteriosApi, 'regularizacao').mockResolvedValue(mockRegularizacao);
    vi.spyOn(cemiteriosApi, 'sucessoes').mockResolvedValue(mockProcessos);
    vi.spyOn(cemiteriosApi, 'sucessao').mockResolvedValue(mockProcessos.data[0]);
  });

  const renderComponent = () =>
    render(
      <CemiteriosNavigationProvider>
        <SucessaoView />
      </CemiteriosNavigationProvider>
    );

  it('renderiza os cards de resumo e abas de sucessão', async () => {
    renderComponent();

    expect(screen.getByText('Pendentes de Análise')).toBeInTheDocument();
    expect(screen.getAllByText('Em Análise').length).toBeGreaterThan(0);
    expect(screen.getByText('Sucessões Concluídas')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/PROC-SUC-2026-0001/i)).toBeInTheDocument();
      expect(screen.getByText(/CON-2024-001/i)).toBeInTheDocument();
    });
  });

  it('permite alternar para a aba de Processos e listar os registros', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Processos/i })).toBeInTheDocument();
    });

    const tabProcessos = screen.getByRole('tab', { name: /Processos/i });
    fireEvent.click(tabProcessos);

    await waitFor(() => {
      expect(screen.getAllByText('PROC-SUC-2026-0001').length).toBeGreaterThan(0);
    });
  });

  it('permite alternar para a aba de Regularização e listar pendências', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Regularização/i })).toBeInTheDocument();
    });

    const tabRegularizacao = screen.getByRole('tab', { name: /Regularização/i });
    fireEvent.click(tabRegularizacao);

    await waitFor(() => {
      expect(screen.getByText('PROC-SUC-2026-0002')).toBeInTheDocument();
    });
  });

  it('abre o modal de abertura de processo de sucessão ao clicar no botão de ação', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir Processo de Sucessão/i })).toBeInTheDocument();
    });

    const btnAbrir = screen.getByRole('button', { name: /Abrir Processo de Sucessão/i });
    fireEvent.click(btnAbrir);

    await waitFor(() => {
      expect(screen.getByText('Abrir Processo de Sucessão Hereditária')).toBeInTheDocument();
    });
  });
});
