import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthProvider';

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('deve inicializar com o estado padrão/demonstração quando não há storage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.user?.name).toBe('Administrador da Prefeitura de Araucária');
    expect(result.current.tenant?.slug).toBe('araucaria-pr');
    expect(result.current.tenants.length).toBeGreaterThan(0);
    expect(result.current.navigation.length).toBeGreaterThan(0);
  });

  it('deve alternar o tenant ativo via switchTenant', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.switchTenant(1);
    });

    expect(result.current.tenant?.id).toBe(1);
    expect(result.current.tenant?.slug).toBe('systrat');
  });

  it('deve limpar os dados ao executar logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock seguro para window.location.href
    delete (window as any).location;
    window.location = { href: '' } as any;

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.tenant).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
