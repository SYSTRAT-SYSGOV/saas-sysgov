import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrdensServicoView } from '../OrdensServicoView';
import { vistoriaApi, type OrdemServico, type PaginatedResponse } from '../../api';

vi.mock('@/core/orgunit', () => ({
  useOrgUnit: () => ({ unitList: [], loading: false }),
}));

const mockOrdens: PaginatedResponse<OrdemServico> = {
  data: [
    {
      id: 1,
      tenant_id: 1,
      local_id: 1,
      org_unit_id: 1,
      fiscal_id: 5,
      tipo_acao: 'inspecao_sanitaria',
      criticidade: 'media',
      status: 'agendada',
      resultado: null,
      data_prevista: '2026-12-11T03:00:00.000000Z',
      roteiro_deslocamento: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      local: { id: 1, nome: 'Fazenda Boa Vista' },
      org_unit: { id: 1, name: 'Secretaria de Agricultura' },
      fiscal: { id: 5, name: 'Fiscal Teste' },
    },
  ],
  current_page: 1,
  last_page: 1,
  per_page: 200,
  from: 1,
  to: 1,
  total: 1,
};

describe('OrdensServicoView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(vistoriaApi, 'listarOrdensServico').mockResolvedValue({ data: mockOrdens } as any);
  });

  it('lista as ordens de serviço carregadas, sem quebrar a data (regressão do Invalid Date)', async () => {
    render(<MemoryRouter><OrdensServicoView /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Fazenda Boa Vista')).toBeInTheDocument();
    });
    expect(screen.getByText('Secretaria de Agricultura')).toBeInTheDocument();
    expect(screen.getByText('11/12/2026')).toBeInTheDocument();
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();
  });

  it('abre o formulário de criação ao clicar em Nova Ordem de Serviço', async () => {
    render(<MemoryRouter><OrdensServicoView /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Fazenda Boa Vista')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Nova Ordem de Serviço/i }));

    expect(await screen.findByText('Nova Ordem de Serviço')).toBeInTheDocument();
  });
});
