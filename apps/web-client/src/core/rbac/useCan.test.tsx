import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { apiClient } from '@/core/api/client';
import { useCan } from './useCan';

describe('useCan Hook', () => {
  // Sessão autenticada de teste (a antiga sessão de demonstração automática foi removida
  // por segurança — ver AuthProvider): restaurada do storage e confirmada via /auth/me.
  const tenant = { id: 131, name: 'MUNICIPIO DE ARAUCARIA', slug: 'araucaria-pr', type: 'prefeitura', settings: {} };
  const sessao = {
    token: 'token-teste',
    user: { id: 133, name: 'Admin Prefeitura', email: 'admin@araucaria.pr.gov.br', roles: ['admin_tenant'], is_platform_admin: false },
    tenant,
    tenants: [tenant],
    modules: ['dashboard', 'procurement', 'contracts', 'finance'],
    permissions: ['procurement.view', 'finance.view'],
    navigation: [],
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('sysgov_auth_token', sessao.token);
    localStorage.setItem('sysgov_auth_state', JSON.stringify(sessao));
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { ...sessao, token: '' } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('deve validar permissões concedidas e negadas', async () => {
    const { result } = renderHook(() => useCan(), { wrapper });

    await waitFor(() => {
      expect(result.current.userPermissions.length).toBeGreaterThan(0);
    });

    expect(result.current.can('procurement.view')).toBe(true);
    expect(result.current.can('finance.view')).toBe(true);
    expect(result.current.can('admin.unauthorized_feature')).toBe(false);
  });

  it('deve validar módulos ativos', async () => {
    const { result } = renderHook(() => useCan(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeModules.length).toBeGreaterThan(0);
    });

    expect(result.current.hasModule('dashboard')).toBe(true);
    expect(result.current.hasModule('procurement')).toBe(true);
    expect(result.current.hasModule('contracts')).toBe(true);
    expect(result.current.hasModule('non_existent_module')).toBe(false);
  });

  it('deve checar roles do usuário autenticado', async () => {
    const { result } = renderHook(() => useCan(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeModules.length).toBeGreaterThan(0);
    });

    expect(result.current.hasRole('admin_tenant')).toBe(true);
    expect(result.current.hasRole('Super Admin')).toBe(false);
    expect(result.current.hasAnyRole(['Super Admin', 'admin_tenant'])).toBe(true);
  });
});
