import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const auth = { permissions: [] as string[] };
vi.mock('@/core/auth/AuthProvider', () => ({ useAuth: () => auth }));

const minhasEscolas = vi.fn();
vi.mock('./api', () => ({
  escolaApi: { minhasEscolas: (...args: unknown[]) => minhasEscolas(...args) },
  erroApi: (e: unknown) => ({ mensagem: String(e) }),
}));

vi.mock('@/core/escola/escolaAtiva', () => ({
  definirEscolaAtiva: vi.fn(),
  obterEscolaAtiva: () => null,
}));

vi.mock('./components/AdminPainel', () => ({ default: () => <div>Painel administrativo</div> }));

// Simula o cadastro da primeira escola: ao clicar, chama onAlterado (como o EscolasAdmin real faz ao salvar).
vi.mock('./components/EscolasAdmin', () => ({
  default: ({ onAlterado }: { onAlterado?: () => void }) => (
    <div>
      <button onClick={() => onAlterado?.()}>Nova escola</button>
    </div>
  ),
}));

import { EscolaModule } from './EscolaModule';

describe('EscolaModule — primeira escola', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = [];
  });

  it('quem gerencia escolas consegue cadastrar a primeira quando não há nenhuma', async () => {
    auth.permissions = ['escola.escolas.manage'];
    minhasEscolas.mockResolvedValueOnce([]);

    render(<EscolaModule />);

    expect(await screen.findByText(/Nenhuma escola cadastrada ainda/)).toBeTruthy();
    expect(screen.getByText('Nova escola')).toBeTruthy();
    expect(screen.queryByText(/Peça ao administrador/)).toBeNull();
  });

  it('o admin geral (*) também vê o cadastro da primeira escola', async () => {
    auth.permissions = ['*'];
    minhasEscolas.mockResolvedValueOnce([]);

    render(<EscolaModule />);

    expect(await screen.findByText('Nova escola')).toBeTruthy();
  });

  it('quem não gerencia escolas continua vendo a mensagem padrão', async () => {
    auth.permissions = ['escola.view'];
    minhasEscolas.mockResolvedValueOnce([]);

    render(<EscolaModule />);

    expect(await screen.findByText('Nenhuma escola disponível')).toBeTruthy();
    expect(screen.queryByText('Nova escola')).toBeNull();
  });

  it('depois de cadastrar a primeira escola, recarrega e abre o painel', async () => {
    auth.permissions = ['escola.escolas.manage'];
    minhasEscolas
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, nome: 'Escola Teste', inep: null, ativa: true, org_unit_id: 5 }]);

    render(<EscolaModule />);
    fireEvent.click(await screen.findByText('Nova escola'));

    expect(await screen.findByText('Painel administrativo')).toBeTruthy();
    await waitFor(() => expect(minhasEscolas).toHaveBeenCalledTimes(2));
  });
});
