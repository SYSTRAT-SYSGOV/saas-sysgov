import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('não renderiza quando open é false', () => {
    render(
      <ConfirmDialog
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Excluir Módulo"
        message="Tem certeza que deseja excluir este registro?"
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza corretamente com título, mensagem e botões padrão quando open é true', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirmar Ação"
        message="Deseja prosseguir com a operação?"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Confirmar Ação')).toBeInTheDocument();
    expect(screen.getByText('Deseja prosseguir com a operação?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('aciona onConfirm ao clicar no botão de confirmação', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Ativar Módulo"
        message="Confirma a ativação?"
        confirmText="Sim, Ativar"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sim, Ativar' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('aciona onClose ao clicar no botão cancelar ou no botão fechar', () => {
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Atenção"
        message="Deseja cancelar?"
        cancelText="Voltar"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('fecha o modal ao pressionar a tecla Escape', () => {
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Aviso"
        message="Pressione ESC para sair."
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('desabilita botões e exibe estado de loading', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Processando"
        message="Aguarde a liquidação..."
        loading={true}
      />
    );

    expect(screen.getByText('Processando...')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    const actionButtons = buttons.filter((b) => b.getAttribute('aria-label') !== 'Fechar');
    actionButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('aplica estilo destrutivo quando variant é destructive', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Remover Tenant"
        message="Ação irreversível."
        variant="destructive"
        confirmText="Excluir Permanentemente"
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Excluir Permanentemente' });
    expect(confirmBtn.className).toContain('bg-rose-600');
  });
});
