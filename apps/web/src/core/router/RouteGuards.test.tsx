import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, ModuleRoute } from './AppRouter';
import * as AuthContextModule from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof AuthContextModule>('@/contexts/AuthContext');
  return {
    ...actual,
    useAuthContext: vi.fn(),
  };
});

describe('RouteGuards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ProtectedRoute', () => {
    it('renderiza o conteúdo protegido quando o usuário está autenticado', () => {
      vi.mocked(AuthContextModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        authRole: 'EMPRESA_MASTER',
        setAuthRole: vi.fn(),
        currentUser: null,
        setCurrentUser: vi.fn(),
        login: vi.fn(),
        loginTenantSession: vi.fn(),
        loginAdminSession: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/admin/protected']}>
          <Routes>
            <Route
              path="/admin/protected"
              element={
                <ProtectedRoute>
                  <div>Área Administrativa Segura</div>
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<div>Página de Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Área Administrativa Segura')).toBeInTheDocument();
      expect(screen.queryByText('Página de Login')).not.toBeInTheDocument();
    });

    it('redireciona para /admin/login quando o usuário não está autenticado', () => {
      vi.mocked(AuthContextModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        authRole: 'EMPRESA_MASTER',
        setAuthRole: vi.fn(),
        currentUser: null,
        setCurrentUser: vi.fn(),
        login: vi.fn(),
        loginTenantSession: vi.fn(),
        loginAdminSession: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/admin/protected']}>
          <Routes>
            <Route
              path="/admin/protected"
              element={
                <ProtectedRoute>
                  <div>Área Administrativa Segura</div>
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<div>Página de Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Área Administrativa Segura')).not.toBeInTheDocument();
      expect(screen.getByText('Página de Login')).toBeInTheDocument();
    });
  });

  describe('ModuleRoute', () => {
    it('redireciona para /admin/dashboard se o caminho do módulo não for encontrado', () => {
      render(
        <MemoryRouter initialEntries={['/admin/inexistente']}>
          <Routes>
            <Route path="/admin/inexistente" element={<ModuleRoute path="/admin/modulo-fantasma" />} />
            <Route path="/admin/dashboard" element={<div>Dashboard Principal</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard Principal')).toBeInTheDocument();
    });
  });
});
