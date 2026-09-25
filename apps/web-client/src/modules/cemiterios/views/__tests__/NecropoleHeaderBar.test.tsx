import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NecropoleHeaderBar } from '../NecropoleHeaderBar';
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

describe('NecropoleHeaderBar', () => {
  it('renderiza os dados da necrópole ativa', () => {
    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={mockParques}
        isGestorMunicipal={false}
        modoVisaoInicial="gestao_necropole"
        cemiterioAtivoIdInicial={1}
      >
        <NecropoleHeaderBar />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByText('Cemitério Municipal Central')).toBeInTheDocument();
    expect(screen.getByText('CEM-01')).toBeInTheDocument();
    expect(screen.getByText(/1.200/)).toBeInTheDocument();
  });

  it('permite alternar de cemitério através do dropdown', () => {
    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={mockParques}
        isGestorMunicipal={false}
        modoVisaoInicial="gestao_necropole"
        cemiterioAtivoIdInicial={1}
      >
        <NecropoleHeaderBar />
      </CemiteriosNavigationProvider>
    );

    // Clicar no botão para abrir o dropdown
    const btnTrocar = screen.getByRole('button', { name: /Alternar Cemitério/i });
    fireEvent.click(btnTrocar);

    // Deve exibir o outro cemitério na lista
    expect(screen.getByText('Alternar Necrópole')).toBeInTheDocument();
    const outroCemiterioBtn = screen.getByRole('button', { name: /Cemitério da Saudade/i });
    expect(outroCemiterioBtn).toBeInTheDocument();

    // Clicar para alternar
    fireEvent.click(outroCemiterioBtn);

    // O cabeçalho deve atualizar para o novo cemitério
    expect(screen.getByText('Cemitério da Saudade')).toBeInTheDocument();
    expect(screen.getByText('CEM-02')).toBeInTheDocument();
  });

  it('não exibe botão de trocar cemitério quando o perfil possui apenas 1 cemitério', () => {
    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={[mockParques[0]]}
        isGestorMunicipal={false}
        modoVisaoInicial="gestao_necropole"
      >
        <NecropoleHeaderBar />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByText('Cemitério Municipal Central')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Alternar Cemitério/i })).not.toBeInTheDocument();
  });

  it('exibe atalho de Administração Geral para gestor municipal', () => {
    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={mockParques}
        isGestorMunicipal={true}
        modoVisaoInicial="gestao_necropole"
        cemiterioAtivoIdInicial={1}
      >
        <NecropoleHeaderBar />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByRole('button', { name: /Administração Geral/i })).toBeInTheDocument();
  });
});
