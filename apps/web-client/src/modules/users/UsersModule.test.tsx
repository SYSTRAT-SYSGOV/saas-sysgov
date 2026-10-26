import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { acionarMenu } from '@/test-utils/acoesMenu';

const hooks = vi.hoisted(() => ({
  usuarios: [] as unknown[],
  desativar: vi.fn(),
  reativar: vi.fn(),
}));
const permissoes = vi.hoisted(() => ({ gerencia: true }));

vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ data: hooks.usuarios, isLoading: false, isFetching: false }),
  useCreateUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeactivateUser: () => ({ mutateAsync: hooks.desativar, isPending: false }),
  useReactivateUser: () => ({ mutateAsync: hooks.reativar, isPending: false }),
}));
vi.mock('@/core/tenant/useTenant', () => ({ useTenant: () => ({ tenant: { name: 'Prefeitura de Teste' } }) }));
vi.mock('@/core/rbac/useCan', () => ({ useCan: () => ({ can: (p?: string) => (p === 'users.manage' ? permissoes.gerencia : false) }) }));

import { UsersModule } from './UsersModule';

const usuario = (id: number, nome: string, extra: Record<string, unknown> = {}) => ({
  id, name: nome, email: `${nome.split(' ')[0].toLowerCase()}@prefeitura.gov.br`, is_active: true, mfa_enabled: false, created_at: '2026-01-01',
  role_slug: 'gestor', ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  permissoes.gerencia = true;
  hooks.usuarios = [usuario(1, 'Ana Souza', { mfa_enabled: true }), usuario(2, 'Bruno Lima', { is_active: false, role_slug: 'fiscal' })];
  hooks.reativar.mockResolvedValue({});
});

describe('Usuários do município (DataTable padrão)', () => {
  it('lista com role, MFA e status, e exporta', () => {
    render(<UsersModule />);
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('ana@prefeitura.gov.br')).toBeInTheDocument();
    const tabela = within(screen.getByRole('table'));
    expect(tabela.getByText('gestor')).toBeInTheDocument(); // 'gestor' também é opção do filtro de roles
    expect(screen.getByText('Ativado')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
  });

  it('usuário ativo oferece Editar e Desativar; o inativo, Editar e Reativar', async () => {
    render(<UsersModule />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Ações de Ana Souza' }), { key: 'Enter' });
    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Desativar' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Reativar' })).not.toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    await acionarMenu(/Ações de Bruno Lima/, 'Reativar');
    await waitFor(() => expect(hooks.reativar).toHaveBeenCalledWith(2));
  });

  it('Desativar abre o pedido de motivo', async () => {
    render(<UsersModule />);
    await acionarMenu(/Ações de Ana Souza/, 'Desativar');
    expect(await screen.findByText(/Motivo/i)).toBeInTheDocument();
  });

  it('sem permissão de gerenciar não há menu de ações nem botão de novo usuário', () => {
    permissoes.gerencia = false;
    render(<UsersModule />);
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo Usuário/ })).not.toBeInTheDocument();
  });
});
