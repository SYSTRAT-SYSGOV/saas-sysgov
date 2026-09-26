import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdministracaoGeralView } from '../AdministracaoGeralView';
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

describe('AdministracaoGeralView', () => {
  it('renderiza os KPIs municipais consolidados', () => {
    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={mockParques}
        isGestorMunicipal={true}
        modoVisaoInicial="administracao_geral"
      >
        <AdministracaoGeralView />
      </CemiteriosNavigationProvider>
    );

    expect(screen.getByText('Administração Geral de Cemitérios Municipais')).toBeInTheDocument();
    expect(screen.getByText('Cemitérios Ativos')).toBeInTheDocument();
    expect(screen.getByText('Jazigos Totais')).toBeInTheDocument();
    expect(screen.getByText('2.050')).toBeInTheDocument(); // 1200 + 850
  });

  it('permite alternar entre as abas internas de gestão consolidada', () => {
    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={mockParques}
        isGestorMunicipal={true}
        modoVisaoInicial="administracao_geral"
      >
        <AdministracaoGeralView />
      </CemiteriosNavigationProvider>
    );

    // Inicialmente na aba de Comparativo de Necrópoles
    expect(screen.getByText('Quadro Geral de Necrópoles Municipais')).toBeInTheDocument();

    // Alternar para Financeiro Consolidado
    const btnFinanceiro = screen.getByRole('button', { name: /Financeiro Consolidado/i });
    fireEvent.click(btnFinanceiro);

    expect(screen.getByText(/Arrecadação Municipal Acumulada/i)).toBeInTheDocument();
    expect(screen.getByText('R$ 142.850,00')).toBeInTheDocument();

    // Alternar para Manutenções Municipais
    const btnManutencoes = screen.getByRole('button', { name: /Manutenções Municipais/i });
    fireEvent.click(btnManutencoes);

    expect(screen.getByText('Ordens de Serviço e Manutenções Municipais')).toBeInTheDocument();
    expect(screen.getByText('OS-2026/041')).toBeInTheDocument();
  });

  it('dispara seleção do cemitério ao clicar em Acessar Gestão', () => {
    const onSelecionarMock = vi.fn();

    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={mockParques}
        isGestorMunicipal={true}
        modoVisaoInicial="administracao_geral"
      >
        <AdministracaoGeralView onSelecionarCemiterio={onSelecionarMock} />
      </CemiteriosNavigationProvider>
    );

    const botoes = screen.getAllByRole('button', { name: /Acessar Gestão/i });
    fireEvent.click(botoes[0]);

    expect(onSelecionarMock).toHaveBeenCalledWith(1);
  });

  it('permite retornar para a seleção de cemitérios', () => {
    const onVoltarMock = vi.fn();

    render(
      <CemiteriosNavigationProvider
        cemiteriosIniciais={mockParques}
        isGestorMunicipal={true}
        modoVisaoInicial="administracao_geral"
      >
        <AdministracaoGeralView onVoltar={onVoltarMock} />
      </CemiteriosNavigationProvider>
    );

    const btnVoltar = screen.getByRole('button', { name: /Voltar à Seleção/i });
    fireEvent.click(btnVoltar);

    expect(onVoltarMock).toHaveBeenCalled();
  });
});
