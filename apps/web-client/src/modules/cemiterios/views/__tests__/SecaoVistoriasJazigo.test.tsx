import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecaoVistoriasJazigo } from '../SecaoVistoriasJazigo';
import type { Vistoria } from '../../api';

const mockVistorias: Vistoria[] = [
  {
    id: 1,
    plot_id: 101,
    data: '2026-04-15',
    estado_conservacao: 'ruim',
    risco: 'alto',
    observacoes: 'Rachadura profunda na parede lateral direita com risco de desabamento.',
    fotos: [
      { id: 10, capturada_em: '2026-04-15', url: 'https://exemplo.gov.br/foto1.jpg' } as any,
    ],
  },
];

describe('SecaoVistoriasJazigo Component', () => {
  it('renderiza o histórico de vistorias com badges de risco e conservação', () => {
    const onNova = vi.fn();
    render(
      <SecaoVistoriasJazigo
        vistorias={mockVistorias}
        onNovaVistoria={onNova}
        podeEditar={true}
      />
    );

    expect(screen.getByText(/Vistorias e Laudos de Conservação/i)).toBeInTheDocument();
    expect(screen.getByText('15/04/2026')).toBeInTheDocument();
    expect(screen.getByText('Risco Alto')).toBeInTheDocument();
    expect(screen.getByText(/Conservação: ruim/i)).toBeInTheDocument();
    expect(screen.getByText(/Rachadura profunda/i)).toBeInTheDocument();

    const btnNova = screen.getByRole('button', { name: /nova vistoria/i });
    fireEvent.click(btnNova);
    expect(onNova).toHaveBeenCalledTimes(1);
  });

  it('exibe estado vazio quando não há vistorias', () => {
    render(
      <SecaoVistoriasJazigo
        vistorias={[]}
        onNovaVistoria={vi.fn()}
        podeEditar={true}
      />
    );

    expect(screen.getByText(/Nenhuma vistoria técnica registrada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar primeira vistoria/i })).toBeInTheDocument();
  });
});
