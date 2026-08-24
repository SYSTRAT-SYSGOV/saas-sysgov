import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { useCan } from './useCan';

describe('useCan Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('deve validar permissões concedidas e negadas', () => {
    const { result } = renderHook(() => useCan(), { wrapper });

    expect(result.current.can('procurement.view')).toBe(true);
    expect(result.current.can('finance.view')).toBe(true);
    expect(result.current.can('admin.unauthorized_feature')).toBe(false);
  });

  it('deve validar módulos ativos', () => {
    const { result } = renderHook(() => useCan(), { wrapper });

    expect(result.current.hasModule('dashboard')).toBe(true);
    expect(result.current.hasModule('procurement')).toBe(true);
    expect(result.current.hasModule('contracts')).toBe(true);
    expect(result.current.hasModule('non_existent_module')).toBe(false);
  });

  it('deve checar roles do usuário autenticado', () => {
    const { result } = renderHook(() => useCan(), { wrapper });

    expect(result.current.hasRole('Secretário de Finanças')).toBe(true);
    expect(result.current.hasRole('Super Admin')).toBe(false);
    expect(result.current.hasAnyRole(['Super Admin', 'Secretário de Finanças'])).toBe(true);
  });
});
