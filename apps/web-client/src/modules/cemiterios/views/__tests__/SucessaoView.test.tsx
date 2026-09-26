import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SucessaoView } from '../SucessaoView';
import { cemiteriosApi, type Concessao, type ProcessoSucessao, type TermoSucessaoDados } from '../../api';
import { CemiteriosNavigationProvider } from '../../CemiteriosContext';

vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    cannot: () => false,
  }),
}));

const mockPendencias: any = {
  data: [
    {
      id: 1,
      numero: 'CON-2024-001',
      plot_id: 101,
      holder_id: 501,
      modalidade: 'perpetua',
      inicio: '1995-01-01',
      situacao: 'vigente',
      pendencia_regularizacao: true,
      motivo_pendencia: 'sucessao_hereditaria',
      jazigo: {
        id: 101,
        park_id: 1,
        sector_id: 10,
        codigo: 'JAZ-A-01',
        tipo: 'jazigo',
        capacidade: 3,
        ocupacao: 1,
        estado: 'concedido',
        lock_version: 1,
        cemiterio: {
          id: 1,
          codigo: 'CEM-01',
          nome: 'Cemitério Municipal Central',
          endereco: 'Rua Central, 100',
          tipo: 'publico',
          situacao: 'ativo',
          responsavel: 'Gestor',
          lat: null,
          lng: null,
        },
      },
      concessionario: {
        id: 501,
        nome: 'João Silva (Falecido)',
        tipo_doc: 'cpf',
        documento_mascarado: '***.123.456-**',
        titular_falecido: true,
      },
    },
  ],
  total: 1,
  current_page: 1,
  last_page: 1,
};

const mockProcessos: any = {
  data: [
    {
      id: 10,
      concession_id: 1,
      numero_processo: 'PROC-SUC-2026-0001',
      tipo_documento: 'inventario_judicial',
      vara_ou_cartorio: '1ª Vara Cível',
      situacao: 'deferido',
      despacho_fundamentacao: 'Homologado nos autos.',
      novo_titular_id: 502,
      termo_numero: 'TERMO-SUC-2026-00001',
      deferido_em: '2026-09-10T10:00:00Z',
      deferido_por_id: 1,
      created_at: '2026-09-01T10:00:00Z',
      concessao: mockPendencias.data[0],
      herdeiros: [
        {
          id: 1,
          process_id: 10,
          nome: 'Maria da Silva',
          parentesco: 'filho',
          documento: '123.456.789-00',
          telefone: '(11) 98888-7777',
          email: 'maria@exemplo.com',
          titular_indicado: true,
        },
      ],
      novo_titular: {
        id: 502,
        nome: 'Maria da Silva',
        tipo_doc: 'cpf',
        documento_mascarado: '***.456.789-**',
      },
    },
  ],
  total: 1,
  current_page: 1,
  last_page: 1,
};

const mockTermoDados: TermoSucessaoDados = {
  termo_numero: 'TERMO-SUC-2026-00001',
  processo_numero: 'PROC-SUC-2026-0001',
  tipo_documento: 'inventario_judicial',
  vara_ou_cartorio: '1ª Vara Cível',
  deferido_em: '10/09/2026',
  deferido_por: 'Administrador Municipal',
  despacho_fundamentacao: 'Homologado nos autos.',
  titular_anterior: {
    nome: 'João Silva (Falecido)',
    documento: '***.123.456-**',
  },
  novo_titular: {
    nome: 'Maria da Silva',
    documento: '***.456.789-**',
    telefone: '(11) 98888-7777',
    endereco: 'Rua das Flores, 50',
  },
  jazigo: {
    codigo: 'JAZ-A-01',
    tipo: 'jazigo',
    quadra: 'Quadra 1',
    necropole: 'Cemitério Municipal Central',
  },
  herdeiros: [
    {
      nome: 'Maria da Silva',
      parentesco: 'filho',
      documento: '123.456.789-00',
      titular_indicado: true,
    },
  ],
};

describe('SucessaoView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cemiteriosApi, 'sucessoesPendencias').mockResolvedValue(mockPendencias);
    vi.spyOn(cemiteriosApi, 'sucessoes').mockResolvedValue(mockProcessos);
    vi.spyOn(cemiteriosApi, 'termoSucessao').mockResolvedValue(mockTermoDados);
  });

  const renderComponent = () =>
    render(
      <CemiteriosNavigationProvider>
        <SucessaoView />
      </CemiteriosNavigationProvider>
    );

  it('renderiza os cards informativos de KPIs de regularização', async () => {
    renderComponent();

    expect(screen.getByText('Concessões c/ Titular Falecido')).toBeInTheDocument();
    expect(screen.getByText('Processos em Análise')).toBeInTheDocument();
    expect(screen.getByText('Sucessões Regularizadas')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/CON-2024-001/i).length).toBeGreaterThan(0);
      expect(screen.getByText('João Silva (Falecido)')).toBeInTheDocument();
    });
  });

  it('permite alternar para a aba de Processos Autuados e listar processos', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Processos Autuados/i })).toBeInTheDocument();
    });

    const tabProcessos = screen.getByRole('tab', { name: /Processos Autuados/i });
    fireEvent.click(tabProcessos);

    await waitFor(() => {
      expect(screen.getByText('PROC-SUC-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('TERMO-SUC-2026-00001')).toBeInTheDocument();
      expect(screen.getByText('Maria da Silva')).toBeInTheDocument();
    });
  });

  it('abre o modal de autuação de processo de sucessão a partir de uma concessão pendente', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/CON-2024-001/i).length).toBeGreaterThan(0);
    });

    const btnAutuar = screen.getByRole('button', { name: /Autuar Regularização/i });
    fireEvent.click(btnAutuar);

    expect(screen.getByText('Autuar Processo de Sucessão Hereditária')).toBeInTheDocument();
    expect(screen.getAllByText(/CON-2024-001/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/JAZ-A-01/i).length).toBeGreaterThan(0);
  });

  it('exibe o termo oficial de sucessão quando solicitado para um processo deferido', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Processos Autuados/i })).toBeInTheDocument();
    });

    const tabProcessos = screen.getByRole('tab', { name: /Processos Autuados/i });
    fireEvent.click(tabProcessos);

    await waitFor(() => {
      expect(screen.getByText('PROC-SUC-2026-0001')).toBeInTheDocument();
    });

    const btnTermo = screen.getByRole('button', { name: /Termo/i });
    await act(async () => {
      fireEvent.click(btnTermo);
    });

    await waitFor(() => {
      expect(screen.getByText(/Termo Oficial de Transferência/i)).toBeInTheDocument();
      expect(screen.getAllByText('TERMO-SUC-2026-00001').length).toBeGreaterThan(0);
    });
  });
});
