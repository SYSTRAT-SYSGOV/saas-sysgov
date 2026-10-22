import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MenuManager } from './MenuManager';
import { adminApi } from './api';

vi.mock('./api', () => ({
  adminApi: { getMenus: vi.fn() },
}));

const apiGroups = [
  {
    id: 1,
    name: 'PAINEL PRINCIPAL',
    slug: 'painel-principal',
    icon: 'LayoutDashboard',
    order: 1,
    is_active: true,
    items: [{ id: 10, label: 'Visão Geral & KPIs', route: '/admin/dashboard', icon: 'LayoutDashboard', order: 1, is_active: true }],
  },
  {
    id: 2,
    name: 'FINANCEIRO',
    slug: 'financeiro',
    icon: 'CreditCard',
    order: 2,
    is_active: true,
    items: [{ id: 20, label: 'Faturamento & Invoices', route: '/admin/billing', icon: 'CreditCard', order: 1, is_active: true }],
  },
];

describe('MenuManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('em modo standalone mostra os menus vindos da API', async () => {
    vi.mocked(adminApi.getMenus).mockResolvedValue(apiGroups as any);

    render(<MenuManager />);

    expect(screen.getByText('Gerenciador de Menus Dinâmico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar grupo ou item de menu...')).toBeInTheDocument();
    expect(await screen.findByText('PAINEL PRINCIPAL')).toBeInTheDocument();
    expect(screen.getByText('Visão Geral & KPIs')).toBeInTheDocument();
  });

  it('filtra grupos e itens pelo campo de busca', async () => {
    vi.mocked(adminApi.getMenus).mockResolvedValue(apiGroups as any);

    render(<MenuManager />);
    await screen.findByText('PAINEL PRINCIPAL');

    fireEvent.change(screen.getByPlaceholderText('Buscar grupo ou item de menu...'), { target: { value: 'Faturamento' } });

    expect(screen.getByText('Faturamento & Invoices')).toBeInTheDocument();
    expect(screen.queryByText('Visão Geral & KPIs')).not.toBeInTheDocument();
  });

  it('quando a API falha mostra o erro e NÃO exibe menu de exemplo', async () => {
    vi.mocked(adminApi.getMenus).mockRejectedValue(new Error('Servidor indisponível'));

    render(<MenuManager />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível');
    expect(screen.queryByText('PAINEL PRINCIPAL')).not.toBeInTheDocument();
    expect(screen.queryByText('Registros & Tabelas')).not.toBeInTheDocument();
  });

  it('permite tentar novamente depois de uma falha', async () => {
    vi.mocked(adminApi.getMenus).mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce(apiGroups as any);

    render(<MenuManager />);
    fireEvent.click(await screen.findByText('Tentar novamente'));

    expect(await screen.findByText('PAINEL PRINCIPAL')).toBeInTheDocument();
    await waitFor(() => expect(adminApi.getMenus).toHaveBeenCalledTimes(2));
  });

  it('funciona com groups customizados passados via props', () => {
    const customGroups = [
      {
        id: 99,
        name: 'GRUPO TESTE',
        slug: 'grupo-teste',
        icon: 'FolderTree',
        order: 1,
        is_active: true,
        items: [{ id: 101, label: 'Item de Teste', route: '/admin/teste', icon: 'Layers', order: 1, is_active: true }],
      },
    ];

    render(<MenuManager groups={customGroups} />);

    expect(screen.getByText('GRUPO TESTE')).toBeInTheDocument();
    expect(screen.getByText('Item de Teste')).toBeInTheDocument();
    expect(adminApi.getMenus).not.toHaveBeenCalled();
  });
});
