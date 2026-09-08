import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLoginPage } from './AdminLoginPage';
import * as apiModule from '../services/api';
import * as AuthContextModule from '../contexts/AuthContext';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof apiModule>('../services/api');
  return {
    ...actual,
    loginAdminMaster: vi.fn(),
  };
});

vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof AuthContextModule>('../contexts/AuthContext');
  return {
    ...actual,
    useAuthContext: vi.fn(),
  };
});

describe('AdminLoginPage', () => {
  const mockLoginAdminSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthContextModule.useAuthContext).mockReturnValue({
      isAuthenticated: false,
      authRole: 'EMPRESA_MASTER',
      setAuthRole: vi.fn(),
      currentUser: null,
      setCurrentUser: vi.fn(),
      login: vi.fn(),
      loginTenantSession: vi.fn(),
      loginAdminSession: mockLoginAdminSession,
      logout: vi.fn(),
    });
  });

  it('redireciona para /admin/dashboard se o usuário já estiver autenticado', () => {
    vi.mocked(AuthContextModule.useAuthContext).mockReturnValue({
      isAuthenticated: true,
      authRole: 'EMPRESA_MASTER',
      setAuthRole: vi.fn(),
      currentUser: null,
      setCurrentUser: vi.fn(),
      login: vi.fn(),
      loginTenantSession: vi.fn(),
      loginAdminSession: mockLoginAdminSession,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    );

    expect(mockedNavigate).toHaveBeenCalledWith('/admin/dashboard', { replace: true });
  });

  it('realiza login e navega para /admin/dashboard ao submeter credenciais válidas', async () => {
    vi.mocked(apiModule.loginAdminMaster).mockResolvedValueOnce({
      success: true,
      token: 'jwt-token-123',
      user: {
        id: '143',
        nome: 'Administrador Master SYSTRAT',
        email: 'admin@sgfiscal.com.br',
        role: 'EMPRESA_MASTER',
      },
      message: 'Login realizado com sucesso.',
    });

    const handleLoginSuccess = vi.fn();

    render(
      <MemoryRouter>
        <AdminLoginPage onLoginSuccess={handleLoginSuccess} />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('admin@sgfiscal.com.br');
    const passInput = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /Entrar no Backoffice Master/i });

    fireEvent.change(emailInput, { target: { value: 'admin@sgfiscal.com.br' } });
    fireEvent.change(passInput, { target: { value: 'admin123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiModule.loginAdminMaster).toHaveBeenCalledWith('admin@sgfiscal.com.br', 'admin123');
      expect(mockLoginAdminSession).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'admin@sgfiscal.com.br' }),
        'jwt-token-123'
      );
      expect(handleLoginSuccess).toHaveBeenCalledTimes(1);
      expect(mockedNavigate).toHaveBeenCalledWith('/admin/dashboard', { replace: true });
    });
  });

  it('exibe mensagem de erro quando o backend rejeita as credenciais', async () => {
    vi.mocked(apiModule.loginAdminMaster).mockRejectedValueOnce(
      new Error('Credenciais inválidas.')
    );

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('admin@sgfiscal.com.br');
    const passInput = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /Entrar no Backoffice Master/i });

    fireEvent.change(emailInput, { target: { value: 'admin@sgfiscal.com.br' } });
    fireEvent.change(passInput, { target: { value: 'senha-errada' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas.')).toBeInTheDocument();
      expect(mockedNavigate).not.toHaveBeenCalled();
    });
  });
});
