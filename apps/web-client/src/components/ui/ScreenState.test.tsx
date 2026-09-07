import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScreenState } from './ScreenState';

describe('ScreenState', () => {
  it('renders loading state', () => {
    render(<ScreenState type="loading" title="Carregando..." />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders error state with description', () => {
    render(<ScreenState type="error" title="Erro ao carregar" description="Tente novamente mais tarde." />);
    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
    expect(screen.getByText('Tente novamente mais tarde.')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<ScreenState type="empty" title="Nenhum registro encontrado" />);
    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });

  it('renders action button when actionLabel and onAction are provided', () => {
    const onAction = vi.fn();
    render(
      <ScreenState
        type="error"
        title="Erro"
        actionLabel="Tentar novamente"
        onAction={onAction}
      />
    );
    const button = screen.getByText('Tentar novamente');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when onAction is missing', () => {
    render(<ScreenState type="error" title="Erro" actionLabel="Tentar novamente" />);
    expect(screen.queryByText('Tentar novamente')).not.toBeInTheDocument();
  });

  it('uses default title for loading state when title is not provided', () => {
    render(<ScreenState type="loading" />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('uses default title for error state when title is not provided', () => {
    render(<ScreenState type="error" />);
    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
  });

  it('uses default title for empty state when title is not provided', () => {
    render(<ScreenState type="empty" />);
    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });
});
