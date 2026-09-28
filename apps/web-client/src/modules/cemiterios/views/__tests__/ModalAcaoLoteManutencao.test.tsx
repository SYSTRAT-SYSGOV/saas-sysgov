import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalAcaoLoteManutencao } from '../ModalAcaoLoteManutencao';
import { cemiteriosApi, type Jazigo } from '../../api';

vi.mock('../../api', () => ({
  cemiteriosApi: {
    alterarEstado: vi.fn().mockResolvedValue({ id: 1, estado: 'manutencao' }),
  },
}));

const mockJazigos: Jazigo[] = [
  {
    id: 1,
    park_id: 1,
    sector_id: 10,
    codigo: 'JAZ-001',
    tipo: 'jazigo',
    capacidade: 3,
    ocupacao: 0,
    estado: 'disponivel',
    comprimento_m: 2.2,
    largura_m: 1.0,
    lat: null,
    lng: null,
    lock_version: 1,
  },
  {
    id: 2,
    park_id: 1,
    sector_id: 10,
    codigo: 'JAZ-002',
    tipo: 'jazigo',
    capacidade: 3,
    ocupacao: 1,
    estado: 'concedido',
    comprimento_m: 2.2,
    largura_m: 1.0,
    lat: null,
    lng: null,
    lock_version: 1,
  },
];

describe('ModalAcaoLoteManutencao Component', () => {
  it('renderiza o modal com as unidades selecionadas e valida justificativa', async () => {
    const onConcluido = vi.fn();
    render(
      <ModalAcaoLoteManutencao
        aberto={true}
        jazigos={mockJazigos}
        onFechar={vi.fn()}
        onConcluido={onConcluido}
      />
    );

    expect(screen.getByText(/Operação Coletiva de Manutenção/i)).toBeInTheDocument();
    expect(screen.getByText('JAZ-001')).toBeInTheDocument();
    expect(screen.getByText('JAZ-002')).toBeInTheDocument();

    const btnConfirmar = screen.getByRole('button', { name: /confirmar operação em lote/i });
    expect(btnConfirmar).toBeDisabled();

    // Preenche justificativa
    const textarea = screen.getByPlaceholderText(/Ex: Vistoria preventiva/i);
    fireEvent.change(textarea, { target: { value: 'Obras de saneamento e drenagem do setor' } });

    expect(btnConfirmar).not.toBeDisabled();
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(cemiteriosApi.alterarEstado).toHaveBeenCalledTimes(2);
      expect(onConcluido).toHaveBeenCalledTimes(1);
    });
  });
});
