import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthProvider';
import { apiClient } from '@/core/api/client';

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('NÃO abre sessão de demonstração quando não há storage e o backend está inacessível', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 6000 }
    );

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.tenant).toBeNull();
  });

  it('NÃO cai em sessão de demonstração quando o login falha por erro de rede', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 6000 });

    const post = vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Network Error'));
    await act(async () => {
      await expect(result.current.login({ email: 'qualquer@x.com', password: 'x' })).rejects.toThrow();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('sysgov_auth_token')).toBeNull();
    post.mockRestore();
  });

  it('deve alternar o tenant ativo via switchTenant', async () => {
    const systrat = { id: 1, name: 'SYSTRAT (Sistema)', slug: 'systrat', type: 'interno', settings: {} };
    const outro = { id: 2, name: 'Outro', slug: 'outro', type: 'prefeitura', settings: {} };
    localStorage.setItem('sysgov_auth_token', 'token-salvo');
    localStorage.setItem('sysgov_auth_state', JSON.stringify({
      token: 'token-salvo', user: { id: 1, name: 'Admin' }, tenant: outro, tenants: [outro, systrat],
      modules: ['dashboard'], permissions: ['*'], navigation: [],
    }));
    const me = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { tenant: outro } });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { token: 'token-salvo', user: { id: 1, name: 'Admin' }, tenant: systrat, tenants: [outro, systrat], modules: ['dashboard'], permissions: ['*'], navigation: [] },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.tenant?.id).toBe(2));

    await act(async () => {
      await result.current.switchTenant(1);
    });

    expect(result.current.tenant?.id).toBe(1);
    expect(result.current.tenant?.slug).toBe('systrat');
    me.mockRestore();
    post.mockRestore();
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

  it('atualiza módulos e menu com o /auth/me ao restaurar a sessão, mantendo o token salvo', async () => {
    const tenant = { id: 1, name: 'SYSTRAT (Sistema)', slug: 'systrat', type: 'interno', settings: {} };
    localStorage.setItem('sysgov_auth_token', 'token-salvo');
    localStorage.setItem('sysgov_auth_state', JSON.stringify({
      token: 'token-salvo', user: { id: 1, name: 'Admin' }, tenant, tenants: [tenant],
      modules: ['dashboard'], permissions: ['*'], navigation: [],
    }));
    const me = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        token: '', user: { id: 1, name: 'Admin' }, tenant, tenants: [tenant],
        modules: ['dashboard', 'cursos'], permissions: ['*'],
        navigation: [{ id: 2, name: 'GESTÃO SETORIAL', items: [{ id: 99, label: 'Cursos e Formações', route: '/cursos', module: 'cursos' }] }],
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // isLoading vira false assim que a sessão salva é restaurada (pra não dar flash de
    // loading), ANTES do /auth/me em segundo plano terminar de atualizar módulos/menu —
    // esperar só por isLoading é uma condição de corrida; espera pelo efeito real do
    // /auth/me (modules atualizado) em vez disso.
    await waitFor(() => expect(result.current.modules).toContain('cursos'));
    expect(result.current.isLoading).toBe(false);
    expect(me).toHaveBeenCalledWith('/auth/me', expect.anything());
    expect(result.current.navigation[0].items[0].route).toBe('/cursos');
    expect(result.current.token).toBe('token-salvo');
    expect(localStorage.getItem('sysgov_auth_token')).toBe('token-salvo');
    expect(JSON.parse(localStorage.getItem('sysgov_auth_state') as string).modules).toContain('cursos');
    me.mockRestore();
  });
});
