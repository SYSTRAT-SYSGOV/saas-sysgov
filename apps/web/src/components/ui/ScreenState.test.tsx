import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ScreenState } from './ScreenState';

describe('ScreenState', () => {
  it('exibe estado de loading com mensagem configurada', () => {
    render(
      <ScreenState state="loading" loadingMessage="Carregando catálogo de módulos...">
        <div>Conteúdo Principal</div>
      </ScreenState>
    );

    expect(screen.getByText('Carregando catálogo de módulos...')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Principal')).not.toBeInTheDocument();
  });

  it('exibe estado de erro com mensagem e botão de ação de retry', () => {
    const handleRetry = vi.fn();

    render(
      <ScreenState
        state="error"
        errorMessage="Falha de conexão com a API."
        errorAction={{ label: 'Tentar novamente', onClick: handleRetry }}
      >
        <div>Conteúdo Principal</div>
      </ScreenState>
    );

    expect(screen.getByText('Falha de conexão com a API.')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Conteúdo Principal')).not.toBeInTheDocument();
  });

  it('exibe estado empty com mensagem e botão de ação opcional', () => {
    const handleAction = vi.fn();

    render(
      <ScreenState
        state="empty"
        emptyMessage="Nenhum módulo cadastrado na plataforma."
        emptyAction={{ label: 'Cadastrar Primeiro Módulo', onClick: handleAction }}
      >
        <div>Conteúdo Principal</div>
      </ScreenState>
    );

    expect(screen.getByText('Nenhum módulo cadastrado na plataforma.')).toBeInTheDocument();
    const actionBtn = screen.getByRole('button', { name: 'Cadastrar Primeiro Módulo' });
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renderiza os filhos corretamente quando state é ready', () => {
    render(
      <ScreenState state="ready">
        <div data-testid="ready-content">Dados Carregados com Sucesso</div>
      </ScreenState>
    );

    expect(screen.getByTestId('ready-content')).toBeInTheDocument();
    expect(screen.getByText('Dados Carregados com Sucesso')).toBeInTheDocument();
  });
});
