import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, Modal, Drawer } from '@sysgov/ui';

describe('@sysgov/ui - Dialog, Modal e Drawer', () => {
  it('Dialog fecha pelo botão "X" chamando onClose', () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose} title="Teste de Dialog" description="Subtítulo do dialog">
        <p>Conteúdo interno</p>
      </Dialog>
    );

    expect(screen.getByText('Teste de Dialog')).toBeInTheDocument();
    expect(screen.getByText('Subtítulo do dialog')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo interno')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /fechar/i });
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Dialog fecha pelo botão "X" chamando onOpenChange(false) se onClose for omitido', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange} title="Teste onOpenChange">
        <p>Conteúdo</p>
      </Dialog>
    );

    const closeButton = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Modal é alias de Dialog e aceita props equivalentes', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Teste Modal">
        <p>Corpo do Modal</p>
      </Modal>
    );

    expect(screen.getByText('Teste Modal')).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Drawer renderiza com size="lg" e fecha pelo botão "X"', () => {
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose} size="lg" title="Detalhe Lateral">
        <p>Informações detalhadas</p>
      </Drawer>
    );

    expect(screen.getByText('Detalhe Lateral')).toBeInTheDocument();
    expect(screen.getByText('Informações detalhadas')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
