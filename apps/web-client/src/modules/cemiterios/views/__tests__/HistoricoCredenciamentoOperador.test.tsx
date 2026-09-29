import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoricoCredenciamentoOperador } from '../../components/HistoricoCredenciamentoOperador';
import { cemiteriosApi } from '../../api';

describe('HistoricoCredenciamentoOperador Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cemiteriosApi, 'licencasOperador').mockResolvedValue([
      { id: 1, operator_id: 10, numero: 'ALV-2026/010', validade: '2026-12-31', arquivo: null, hash: 'abcdef1234567890', created_at: '2026-01-10T10:00:00Z' },
    ]);
    vi.spyOn(cemiteriosApi, 'credenciarOperador').mockResolvedValue({
      id: 2, operator_id: 10, numero: 'ALV-2027/001', validade: '2027-12-31', arquivo: null, hash: null, created_at: '2027-01-01T10:00:00Z',
    });
  });

  it('lista o histórico de credenciamentos do operador', async () => {
    render(<HistoricoCredenciamentoOperador operadorId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Alvará ALV-2026/010')).toBeInTheDocument();
    });
  });

  it('permite registrar um novo credenciamento', async () => {
    render(<HistoricoCredenciamentoOperador operadorId={10} />);

    await waitFor(() => expect(screen.getByText('Alvará ALV-2026/010')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Novo Credenciamento/i }));
    fireEvent.change(screen.getByLabelText(/Número do Alvará/i), { target: { value: 'ALV-2027/001' } });
    fireEvent.change(screen.getByLabelText(/Validade/i), { target: { value: '2027-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: /^Registrar$/i }));

    await waitFor(() => {
      expect(cemiteriosApi.credenciarOperador).toHaveBeenCalledWith(10, { numero: 'ALV-2027/001', validade: '2027-12-31' }, null);
    });
  });
});
