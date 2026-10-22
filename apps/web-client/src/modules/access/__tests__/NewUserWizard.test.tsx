import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('../AccessApi', () => ({
  accessApi: {
    cargos: vi.fn().mockResolvedValue([]),
    groups: vi.fn().mockResolvedValue([]),
    createUser: vi.fn(),
  },
}));

import { NewUserWizard } from '../evolution/NewUserWizard';

const montar = async (onClose = vi.fn()) => {
  render(
    <NewUserWizard
      modules={[]}
      units={[]}
      isGlobalAdmin
      myManagedModules={[]}
      onCreated={vi.fn()}
      onClose={onClose}
      notify={vi.fn()}
    />,
  );
  await act(async () => {}); // deixa cargos e grupos (mock assíncrono) resolverem
};

describe('Novo usuário em modal', () => {
  it('abre como diálogo com o stepper de 4 etapas', async () => {
    await montar();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Dados pessoais')).toBeInTheDocument();
    expect(screen.getByText('Acessos por módulo')).toBeInTheDocument();
  });

  it('só avança com nome e e-mail válidos', async () => {
    await montar();
    const avancar = screen.getByRole('button', { name: /Avançar/i });
    expect(avancar).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Ex.: Maria da Silva'), { target: { value: 'Maria da Silva' } });
    fireEvent.change(screen.getByPlaceholderText('email@prefeitura.gov.br'), { target: { value: 'maria@prefeitura.gov.br' } });

    expect(avancar).toBeEnabled();
    fireEvent.click(avancar);
    expect(screen.getByText('Papel no vínculo')).toBeInTheDocument();
  });

  it('Cancelar fecha o modal', async () => {
    const onClose = vi.fn();
    await montar(onClose);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
