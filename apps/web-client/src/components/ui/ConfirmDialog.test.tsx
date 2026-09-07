import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirmar exclusão',
    description: 'Tem certeza que deseja excluir este item?',
    confirmLabel: 'Excluir',
    destructive: true,
    requireReason: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Confirmar exclusão')).toBeInTheDocument();
    expect(screen.getByText('Tem certeza que deseja excluir este item?')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Confirmar exclusão')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} requireReason={false} />);
    fireEvent.click(screen.getByText('Excluir'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows reason textarea when requireReason is true', () => {
    render(<ConfirmDialog {...defaultProps} requireReason={true} />);
    expect(screen.getByPlaceholderText('Justificativa legal ou motivo administrativo...')).toBeInTheDocument();
  });

  it('does not call onConfirm when requireReason is true and reason is empty', () => {
    render(<ConfirmDialog {...defaultProps} requireReason={true} reasonPlaceholder="Motivo..." />);
    fireEvent.click(screen.getByText('Excluir'));
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with reason when requireReason is true and reason is filled', () => {
    render(<ConfirmDialog {...defaultProps} requireReason={true} reasonPlaceholder="Motivo..." />);
    const textarea = screen.getByPlaceholderText('Motivo...');
    fireEvent.change(textarea, { target: { value: 'Motivo válido' } });
    fireEvent.click(screen.getByText('Excluir'));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('Motivo válido');
  });

  it('displays custom confirm and cancel labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Confirmar ação"
        cancelLabel="Voltar"
      />
    );
    expect(screen.getByText('Confirmar ação')).toBeInTheDocument();
    expect(screen.getByText('Voltar')).toBeInTheDocument();
  });
});
