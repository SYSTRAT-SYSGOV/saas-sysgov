import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AdminTenantManagement } from './AdminTenantManagement';
import { adminApi } from '../../modules/admin/api';

vi.mock('../../modules/admin/api', () => ({
  adminApi: {
    getTenants: vi.fn(),
    getModules: vi.fn(),
    listTenantAdmins: vi.fn(),
    createTenantAdmin: vi.fn(),
    updateTenantAdmin: vi.fn(),
    deactivateTenantAdmin: vi.fn(),
  },
}));

const tenant = {
  id: 7,
  name: 'Prefeitura Teste',
  slug: 'pref-teste',
  cnpj: '12345678000199',
  type: 'prefeitura',
  status: 'active',
  plan: 'standard',
  max_users: 10,
  storage_limit_mb: 100,
  monthly_fee_cents: 0,
  setup_fee_cents: 0,
  custom_domain_enabled: false,
  custom_domain_fee_cents: 0,
  created_at: '2026-01-01T00:00:00Z',
};

const admin = (id: number, email: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Admin ${id}`,
  email,
  is_systrat: false,
  is_active: true,
  is_platform_admin: false,
  mfa_enabled: false,
  created_at: '2026-01-01T00:00:00Z',
  tenants: [{ id: 7, name: 'Prefeitura Teste', slug: 'pref-teste', status: 'active' }],
  roles: [{ slug: 'admin_tenant' }],
  ...extra,
});

const openAdminsModal = async () => {
  render(<AdminTenantManagement onAddToast={vi.fn()} />);
  await abrirAdmins();
};

// O menu de ações (Radix) abre com Enter no gatilho; o clique simples não dispara o pointerdown no jsdom.
const abrirAdmins = async () => {
  const gatilho = await screen.findByRole('button', { name: /^Ações de / });
  fireEvent.keyDown(gatilho, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('menuitem', { name: /Administradores do tenant/ }));
};

describe('AdminTenantManagement — administradores do tenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getTenants).mockResolvedValue({ data: [tenant] } as any);
    vi.mocked(adminApi.getModules).mockResolvedValue([] as any);
  });

  it('lista todos os administradores do tenant', async () => {
    vi.mocked(adminApi.listTenantAdmins).mockResolvedValue([admin(1, 'a1@t.test'), admin(2, 'a2@t.test', { mfa_enabled: true })] as any);

    await openAdminsModal();

    expect(await screen.findByText('a1@t.test')).toBeTruthy();
    expect(screen.getByText('a2@t.test')).toBeTruthy();
    expect(screen.getByText('MFA ativo')).toBeTruthy();
    expect(screen.getByText('MFA pendente')).toBeTruthy();
    expect(adminApi.listTenantAdmins).toHaveBeenCalledWith(7);
  });

  it('sem administradores abre direto o formulário de cadastro', async () => {
    vi.mocked(adminApi.listTenantAdmins).mockResolvedValue([] as any);

    await openAdminsModal();

    expect(await screen.findByText('Novo administrador')).toBeTruthy();
  });

  it('permite adicionar mais um administrador mesmo já existindo outro', async () => {
    vi.mocked(adminApi.listTenantAdmins).mockResolvedValue([admin(1, 'a1@t.test')] as any);
    vi.mocked(adminApi.createTenantAdmin).mockResolvedValue(admin(2, 'a2@t.test') as any);

    await openAdminsModal();
    fireEvent.click(await screen.findByText('Adicionar administrador'));

    fireEvent.change(screen.getByPlaceholderText('admin@araucaria.pr.gov.br'), { target: { value: 'a2@t.test' } });
    fireEvent.click(screen.getByText('Cadastrar Administrador'));

    await waitFor(() => expect(adminApi.createTenantAdmin).toHaveBeenCalledTimes(1));
    expect(vi.mocked(adminApi.createTenantAdmin).mock.calls[0][0]).toBe(7);
    expect(vi.mocked(adminApi.createTenantAdmin).mock.calls[0][1]).toMatchObject({ email: 'a2@t.test' });
  });

  it('desativa um administrador informando o motivo', async () => {
    vi.mocked(adminApi.listTenantAdmins).mockResolvedValue([admin(1, 'a1@t.test'), admin(2, 'a2@t.test')] as any);
    vi.mocked(adminApi.deactivateTenantAdmin).mockResolvedValue(undefined as any);

    await openAdminsModal();
    const buttons = await screen.findAllByText('Desativar');
    fireEvent.click(buttons[1]);

    fireEvent.change(screen.getByPlaceholderText('Ex: Servidor desligado do órgão'), { target: { value: 'Saiu do órgão e perdeu acesso' } });
    fireEvent.click(screen.getByText('Desativar Administrador'));

    await waitFor(() => expect(adminApi.deactivateTenantAdmin).toHaveBeenCalledWith(7, 2, 'Saiu do órgão e perdeu acesso'));
  });

  it('mostra a mensagem do backend quando a salvaguarda do último administrador bloqueia', async () => {
    const onAddToast = vi.fn();
    vi.mocked(adminApi.listTenantAdmins).mockResolvedValue([admin(1, 'a1@t.test')] as any);
    vi.mocked(adminApi.deactivateTenantAdmin).mockRejectedValue(new Error('O tenant precisa manter ao menos um administrador ativo.'));

    render(<AdminTenantManagement onAddToast={onAddToast} />);
    await abrirAdmins();
    fireEvent.click(await screen.findByText('Desativar'));
    fireEvent.change(screen.getByPlaceholderText('Ex: Servidor desligado do órgão'), { target: { value: 'Teste da salvaguarda' } });
    fireEvent.click(screen.getByText('Desativar Administrador'));

    await waitFor(() =>
      expect(onAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: 'O tenant precisa manter ao menos um administrador ativo.' })
      )
    );
  });
});
