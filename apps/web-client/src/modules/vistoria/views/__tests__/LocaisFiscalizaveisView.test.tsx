import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LocaisFiscalizaveisView } from '../LocaisFiscalizaveisView';
import { vistoriaApi, type LocalFiscalizavel, type PaginatedResponse } from '../../api';

const mockLocais: PaginatedResponse<LocalFiscalizavel> = {
  data: [
    {
      id: 1,
      tenant_id: 1,
      proprietario_pessoa_id: 10,
      nome: 'Fazenda Boa Vista',
      tipo: 'propriedade_rural',
      classificacao_atividade: null,
      latitude: -25.4284,
      longitude: -49.2733,
      endereco: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      proprietario: { id: 10, nome: 'Proprietário Teste' },
    },
  ],
  current_page: 1,
  last_page: 1,
  per_page: 200,
  from: 1,
  to: 1,
  total: 1,
};

describe('LocaisFiscalizaveisView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(vistoriaApi, 'listarLocais').mockResolvedValue({ data: mockLocais } as any);
  });

  it('lista os locais fiscalizáveis carregados', async () => {
    render(<MemoryRouter><LocaisFiscalizaveisView /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Fazenda Boa Vista')).toBeInTheDocument();
    });
    expect(screen.getByText('Proprietário Teste')).toBeInTheDocument();
  });

  it('abre o formulário de criação ao clicar em Novo Local', async () => {
    render(<MemoryRouter><LocaisFiscalizaveisView /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Fazenda Boa Vista')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Novo Local/i }));

    expect(await screen.findByText('Novo Local Fiscalizável')).toBeInTheDocument();
  });
});
