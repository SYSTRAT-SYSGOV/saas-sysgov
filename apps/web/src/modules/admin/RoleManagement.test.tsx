import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleManagement } from './RoleManagement';
import { adminApi } from './api';
import type { Permission, Role } from './types';

vi.mock('./api', () => ({
  adminApi: {
    getRoles: vi.fn(),
    getPermissions: vi.fn(),
    updateRole: vi.fn(),
    createRole: vi.fn(),
    deleteRole: vi.fn(),
  },
}));

const orgView: Permission = { id: 1, name: 'Visualizar Organograma', slug: 'org.view', module: 'org', module_enabled: true };
const financeView: Permission = { id: 2, name: 'Visualizar Financeiro', slug: 'finance.view', module: 'finance', module_enabled: false };

const perfil: Role = {
  id: 10, tenant_id: null, name: 'Gestor', slug: 'gestor', scope: 'systrat', is_system: false,
  permissions: [orgView, financeView], created_at: '2026-10-27T00:00:00Z',
};

describe('RoleManagement — permissões de módulo desligado', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getRoles).mockResolvedValue({ data: [perfil] } as never);
    vi.mocked(adminApi.getPermissions).mockResolvedValue([orgView, financeView]);
    vi.mocked(adminApi.updateRole).mockResolvedValue(perfil);
  });

  it('conta e detalha só as permissões de módulos ativos', async () => {
    render(<RoleManagement />);

    expect(await screen.findByText('1 permissões')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Gestor'));

    expect(await screen.findByText('org.view')).toBeInTheDocument();
    expect(screen.queryByText('finance.view')).not.toBeInTheDocument();
  });

  it('não mostra a permissão na grade do editor, mas salvar o perfil não a revoga', async () => {
    render(<RoleManagement />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar role' }));

    expect(await screen.findAllByRole('checkbox')).toHaveLength(1);
    expect(screen.queryByTitle('finance.view')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));

    await waitFor(() => expect(adminApi.updateRole).toHaveBeenCalled());
    expect(vi.mocked(adminApi.updateRole).mock.calls[0][0]).toBe(10);
    expect(vi.mocked(adminApi.updateRole).mock.calls[0][1].permission_ids).toEqual([1, 2]);
  });

  it('sem o flag module_enabled (API antiga) tudo continua visível', async () => {
    const semFlag = { ...financeView, module_enabled: undefined };
    vi.mocked(adminApi.getRoles).mockResolvedValue({ data: [{ ...perfil, permissions: [orgView, semFlag] }] } as never);

    render(<RoleManagement />);

    expect(await screen.findByText('2 permissões')).toBeInTheDocument();
  });
});
