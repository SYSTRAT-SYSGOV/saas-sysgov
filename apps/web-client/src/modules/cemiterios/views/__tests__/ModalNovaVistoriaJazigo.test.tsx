import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalNovaVistoriaJazigo } from '../ModalNovaVistoriaJazigo';
import { cemiteriosApi } from '../../api';

vi.mock('../../api', () => ({
  cemiteriosApi: {
    registrarVistoria: vi.fn().mockResolvedValue({ id: 1 }),
  },
}));

describe('ModalNovaVistoriaJazigo Component', () => {
  it('renderiza o formulário de nova vistoria e submete dados', async () => {
    const onSucesso = vi.fn();
    render(
      <ModalNovaVistoriaJazigo
        aberto={true}
        jazigo={{ id: 42, codigo: 'JAZ-42' }}
        onFechar={vi.fn()}
        onSucesso={onSucesso}
      />
    );

    expect(screen.getByText(/Nova Vistoria Técnica — Unidade JAZ-42/i)).toBeInTheDocument();
    expect(screen.getByText(/Classificação de Risco:/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Descreva detalhes estruturais/i);
    fireEvent.change(textarea, { target: { value: 'Infiltração na base' } });

    const btnSalvar = screen.getByRole('button', { name: /salvar vistoria/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(cemiteriosApi.registrarVistoria).toHaveBeenCalled();
      expect(onSucesso).toHaveBeenCalledTimes(1);
    });
  });
});
