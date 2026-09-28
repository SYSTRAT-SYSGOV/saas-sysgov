import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SelecaoNecropoleView } from '../SelecaoNecropoleView';
import { CemiteriosNavigationProvider } from '../../CemiteriosContext';
import type { Parque } from '../../api';

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

describe('SelecaoNecropoleView', () => {
  it('renderiza por padrão a visualização em DataTable', () => {
    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques} isGestorMunicipal={false}>
        <SelecaoNecropoleView />
      </CemiteriosNavigationProvider>
    );

    // Tabela e cabeçalhos
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Nome da Necrópole')).toBeInTheDocument();
    expect(screen.getByText('Cemitério Municipal Central')).toBeInTheDocument();
    expect(screen.getByText('Cemitério da Saudade')).toBeInTheDocument();
    expect(screen.getByText('CEM-01')).toBeInTheDocument();
    expect(screen.getByText('CEM-02')).toBeInTheDocument();
  });

  it('permite alternar entre visualização em DataTable e Cards', () => {
    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques} isGestorMunicipal={false}>
        <SelecaoNecropoleView />
      </CemiteriosNavigationProvider>
    );

    // Inicialmente com tabela
    expect(screen.getByRole('table')).toBeInTheDocument();

    // Clicar no botão Cards
    const btnCards = screen.getByRole('button', { name: /Visualização em Cards/i });
    fireEvent.click(btnCards);

    // Tabela não deve estar mais visível
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Cemitério Municipal Central')).toBeInTheDocument();

    // Retornar para Listagem
    const btnListagem = screen.getByRole('button', { name: /Visualização em Listagem/i });
    fireEvent.click(btnListagem);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('exibe banner de Administração Geral para gestor municipal', () => {
    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques} isGestorMunicipal={true}>
        <SelecaoNecropoleView />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByText('Painel de Administração Geral Municipal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acessar Administração Geral/i })).toBeInTheDocument();
  });

  it('filtra cemitérios em tempo real pela busca avançada', () => {
    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques} isGestorMunicipal={false}>
        <SelecaoNecropoleView />
      </CemiteriosNavigationProvider>
    );

    const inputBusca = screen.getByPlaceholderText(/Buscar por nome, código, bairro ou responsável/i);
    fireEvent.change(inputBusca, { target: { value: 'Saudade' } });

    expect(screen.queryByText('Cemitério Municipal Central')).not.toBeInTheDocument();
    expect(screen.getByText('Cemitério da Saudade')).toBeInTheDocument();
  });

  it('dispara a seleção de necrópole ao clicar no botão de acesso', () => {
    const onSelecionarMock = vi.fn();

    render(
      <CemiteriosNavigationProvider cemiteriosIniciais={mockParques} isGestorMunicipal={false}>
        <SelecaoNecropoleView onSelecionar={onSelecionarMock} />
      </CemiteriosNavigationProvider>
    );

    const botoes = screen.getAllByRole('button', { name: /Acessar Gestão/i });
    fireEvent.click(botoes[0]);

    expect(onSelecionarMock).toHaveBeenCalledWith(1);
  });
});
