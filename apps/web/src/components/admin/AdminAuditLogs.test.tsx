import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AdminAuditLogs } from './AdminAuditLogs';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('AdminAuditLogs', () => {
  const mockOnAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o cabeçalho e carrega logs da API com sucesso', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 1,
          tenant_id: 1,
          user_id: 10,
          module: 'admin',
          action: 'user.login',
          resource: 'auth_session:10',
          before: null,
          after: null,
          ip: '192.168.1.50',
          created_at: '2026-09-07T12:00:00Z',
        },
      ],
    });

    render(<AdminAuditLogs onAddToast={mockOnAddToast} />);

    expect(screen.getByText('Trilha de Auditoria & Logs de Segurança')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('user.login')).toBeInTheDocument();
      expect(screen.getByText('auth_session:10')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.50')).toBeInTheDocument();
    });
  });

  it('filtra logs via campo de busca', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 1,
          module: 'admin',
          action: 'user.login',
          resource: 'auth_session:1',
          ip: '192.168.1.1',
          created_at: '2026-09-07T10:00:00Z',
        },
        {
          id: 2,
          module: 'billing',
          action: 'invoice.paid',
          resource: 'invoice:99',
          ip: '10.0.0.5',
          created_at: '2026-09-07T11:00:00Z',
        },
      ],
    });

    render(<AdminAuditLogs onAddToast={mockOnAddToast} />);

    await waitFor(() => {
      expect(screen.getByText('user.login')).toBeInTheDocument();
      expect(screen.getByText('invoice.paid')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por evento/i);
    fireEvent.change(searchInput, { target: { value: 'invoice' } });

    expect(screen.queryByText('user.login')).not.toBeInTheDocument();
    expect(screen.getByText('invoice.paid')).toBeInTheDocument();
  });

  it('abre modal de payload JSON ao clicar no botão correspondente', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 1,
          module: 'admin',
          action: 'module.activated',
          resource: 'module:frota',
          before: { enabled: false },
          after: { enabled: true },
          hash: 'hmac-sha256-abc12345',
          ip: '127.0.0.1',
          created_at: '2026-09-07T14:00:00Z',
        },
      ],
    });

    render(<AdminAuditLogs onAddToast={mockOnAddToast} />);

    await waitFor(() => {
      expect(screen.getByText('module.activated')).toBeInTheDocument();
    });

    const jsonBtn = screen.getByRole('button', { name: /^JSON$/ });
    fireEvent.click(jsonBtn);

    expect(screen.getByText(/Payload: module.activated/i)).toBeInTheDocument();
    expect(screen.getByText(/hmac-sha256-abc12345/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Fechar' });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Payload: module.activated/i)).not.toBeInTheDocument();
  });
});
