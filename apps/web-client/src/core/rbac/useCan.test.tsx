import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { useCan } from './useCan';

describe('useCan Hook', () => {
  beforeEach(() => {
    localStorage.clear();
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
