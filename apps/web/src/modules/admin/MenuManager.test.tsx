import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MenuManager } from './MenuManager';

describe('MenuManager', () => {
  it('renderiza sem erros em modo standalone quando a prop groups é undefined', () => {
    // Esse teste garante que ao carregar /admin/menus como componente isolado,
    // não ocorre o erro "Cannot read properties of undefined (reading 'filter')".
    render(<MenuManager />);

    expect(screen.getByText('Gerenciador de Menus Dinâmico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar grupo ou item de menu...')).toBeInTheDocument();
    expect(screen.getByText('PAINEL PRINCIPAL')).toBeInTheDocument();
    expect(screen.getByText('Visão Geral & KPIs')).toBeInTheDocument();
  });

  it('filtra grupos e itens dinamicamente pelo campo de busca sem quebras', () => {
    render(<MenuManager />);

    const searchInput = screen.getByPlaceholderText('Buscar grupo ou item de menu...');
    fireEvent.change(searchInput, { target: { value: 'Contratos' } });

    expect(screen.getByText('Gestão de Contratos')).toBeInTheDocument();
    expect(screen.queryByText('Visão Geral & KPIs')).not.toBeInTheDocument();
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
        items: [
          {
            id: 101,
            label: 'Item de Teste',
            route: '/admin/teste',
            icon: 'Layers',
            order: 1,
            is_active: true,
          },
        ],
      },
    ];

    render(<MenuManager groups={customGroups} />);

    expect(screen.getByText('GRUPO TESTE')).toBeInTheDocument();
    expect(screen.getByText('Item de Teste')).toBeInTheDocument();
  });
});
