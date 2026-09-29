import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SancoesOperador } from '../../components/SancoesOperador';
import { cemiteriosApi } from '../../api';

describe('SancoesOperador Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cemiteriosApi, 'penalidadesOperador').mockResolvedValue([
      { id: 1, operator_id: 10, tipo: 'advertencia', inicio: '2020-01-01', fim: null, motivo: 'Atraso reiterado.', arquivo: null, created_at: '2020-01-01T10:00:00Z' },
      {
        id: 2, operator_id: 10, tipo: 'suspensao', inicio: '2099-01-01', fim: '2099-01-15',
        motivo: 'Descumprimento de norma de segurança.', arquivo: null, created_at: '2099-01-01T10:00:00Z',
      },
    ]);
    vi.spyOn(cemiteriosApi, 'sancionarOperador').mockResolvedValue({
      id: 3, operator_id: 10, tipo: 'advertencia', inicio: '2026-01-01', fim: null, motivo: 'Nova advertência.', arquivo: null, created_at: '2026-01-01T10:00:00Z',
    });
  });

  it('lista as sanções e destaca a que está vigente', async () => {
    render(<SancoesOperador operadorId={10} podeGerenciar={true} />);

    await waitFor(() => {
      expect(screen.getByText('Advertência')).toBeInTheDocument();
      expect(screen.getByText('Suspensão Temporária')).toBeInTheDocument();
      expect(screen.getByText('Vigente')).toBeInTheDocument();
    });
  });

  it('oculta o botão de registrar sanção quando o usuário não pode gerenciar', async () => {
    render(<SancoesOperador operadorId={10} podeGerenciar={false} />);

    await waitFor(() => expect(screen.getByText('Advertência')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Registrar Sanção/i })).not.toBeInTheDocument();
  });

  it('permite registrar uma nova sanção', async () => {
    render(<SancoesOperador operadorId={10} podeGerenciar={true} />);

    await waitFor(() => expect(screen.getByText('Advertência')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Registrar Sanção/i }));
    fireEvent.change(screen.getByLabelText(/Início da Vigência/i), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/^Motivo$/i), { target: { value: 'Nova advertência.' } });
    fireEvent.click(screen.getByRole('button', { name: /^Registrar$/i }));

    await waitFor(() => {
      expect(cemiteriosApi.sancionarOperador).toHaveBeenCalledWith(
        10,
        { tipo: 'advertencia', inicio: '2026-01-01', fim: undefined, motivo: 'Nova advertência.' },
        null
      );
    });
  });
});
