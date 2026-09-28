import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CemiteriosModule } from '../CemiteriosModule';
import { CemiteriosNavigationProvider } from '../CemiteriosContext';
import type { Parque } from '../api';

// Mock de useCan
vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    hasModule: () => true,
    hasRole: () => true,
    hasAnyRole: () => true,
    userPermissions: ['*'],
    activeModules: ['cemiterios'],
  }),
}));

// Mock dos componentes pesados de views filhas
vi.mock('../views/InventarioView', () => ({
  InventarioView: () => <div data-testid="inventario-view">Conteúdo do Inventário</div>,
}));
vi.mock('../views/MapaView', () => ({
  MapaView: () => <div data-testid="mapa-view">Conteúdo do Mapa</div>,
}));
vi.mock('../views/OperacoesView', () => ({
  OperacoesView: () => <div data-testid="operacoes-view">Conteúdo de Operações</div>,
}));
vi.mock('../views/ConcessoesView', () => ({
  ConcessoesView: () => <div data-testid="concessoes-view">Conteúdo de Concessões</div>,
}));
vi.mock('../views/FinanceiroView', () => ({
  FinanceiroView: () => <div data-testid="financeiro-view">Conteúdo Financeiro</div>,
}));
vi.mock('../views/EmpreiteirosView', () => ({
  EmpreiteirosView: () => <div data-testid="empreiteiros-view">Conteúdo de Empreiteiros</div>,
}));
vi.mock('../views/VistoriaView', () => ({
  VistoriaView: () => <div data-testid="vistoria-view">Conteúdo de Vistorias</div>,
}));

const mockParques: Parque[] = [
  {
    id: 1,
    codigo: 'CEM-01',
    nome: 'Cemitério Municipal Central',
    endereco: 'Rua da Paz, 100 - Centro',
    tipo: 'publico',
    situacao: 'ativo',
    responsavel: 'João Silva',
    lat: -23.55,
    lng: -46.63,
    setores_count: 5,
    jazigos_count: 1200,
  },
  {
    id: 2,
    codigo: 'CEM-02',
    nome: 'Cemitério da Saudade',
    endereco: 'Av. das Flores, 500 - Jardim Esperança',
    tipo: 'publico',
    situacao: 'ativo',
    responsavel: 'Maria Souza',
    lat: -23.58,
    lng: -46.65,
    setores_count: 3,
    jazigos_count: 850,
  },
];

describe('CemiteriosModule Orquestração', () => {
  it('renderiza tela de seleção de necrópole quando há múltiplos cemitérios', () => {
    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques}>
        <CemiteriosModule />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByText('Gestão de Cemitérios Municipais')).toBeInTheDocument();
    expect(screen.getByText('Selecione o Cemitério para Gestão')).toBeInTheDocument();
    expect(screen.getByText('Cemitério Municipal Central')).toBeInTheDocument();
    expect(screen.getByText('Cemitério da Saudade')).toBeInTheDocument();
  });

  it('redireciona diretamente para a gestão da necrópole quando há apenas 1 cemitério', () => {
    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={[mockParques[0]]}>
        <CemiteriosModule />
      </CemiteriosNavigationProvider>
    );

    // Deve pular a tela de seleção e ir direto para o cabeçalho e abas
    expect(screen.queryByText('Selecione o Cemitério para Gestão')).not.toBeInTheDocument();
    expect(screen.getByText('Cemitério Municipal Central')).toBeInTheDocument();
    expect(screen.getByTestId('inventario-view')).toBeInTheDocument();
  });

  it('permite selecionar um cemitério e navegar para suas abas operacionais', () => {
    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques}>
        <CemiteriosModule />
      </CemiteriosNavigationProvider>
    );

    // Clica para acessar o segundo cemitério
    const botoesAcesso = screen.getAllByRole('button', { name: /Acessar Gestão/i });
    fireEvent.click(botoesAcesso[1]);

    // Agora deve exibir o cabeçalho do cemitério 2 e a view de inventário
    expect(screen.getByText('Cemitério da Saudade')).toBeInTheDocument();
    expect(screen.getByTestId('inventario-view')).toBeInTheDocument();
  });

  it('renderiza o painel de Administração Geral quando ativado', () => {
    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={mockParques}
        isGestorMunicipal={true}
        modoVisaoInicial="administracao_geral"
      >
        <CemiteriosModule />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByText('Administração Geral de Cemitérios Municipais')).toBeInTheDocument();
    expect(screen.getByText('Cemitérios Ativos')).toBeInTheDocument();
  });
});
